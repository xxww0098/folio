const { Plugin, Notice, PluginSettingTab, Setting, SuggestModal, requestUrl, normalizePath, TFile } =
  require("obsidian");

const MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

const DEFAULT_SETTINGS = { sites: [] };

function trimSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

function sameUrl(a, b) {
  return trimSlash(a).toLowerCase() === trimSlash(b).toLowerCase();
}

function isRemote(src) {
  return /^(https?:|data:|app:)/i.test(src) || src.startsWith("/api/files/");
}

function extOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return (match ? match[1] : "").toLowerCase();
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function parseFrontMatter(source) {
  const text = String(source || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return { meta: {}, body: text };
  const end = text.indexOf("\n---", 4);
  if (end < 0) return { meta: {}, body: text };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, "");
  const meta = {};
  let section = "";
  for (const line of raw.split("\n")) {
    const nested = /^(folio|halo):\s*$/.exec(line);
    if (nested) {
      section = nested[1];
      if (!meta.folio) meta.folio = {};
      continue;
    }
    const nestedPair = /^\s{2}([\w-]+):\s*(.*)$/.exec(line);
    if (section && nestedPair) {
      const value = nestedPair[2].replace(/^["']|["']$/g, "").trim();
      if (nestedPair[1] === "publish") meta.folio[nestedPair[1]] = value === "true";
      else meta.folio[nestedPair[1]] = value;
      continue;
    }
    section = "";
    const pair = /^([\w-]+):\s*(.*)$/.exec(line);
    if (pair) meta[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  return { meta, body };
}

function collectImages(markdown) {
  const found = [];
  const md = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = md.exec(markdown))) {
    found.push({ raw: match[0], alt: match[1], src: match[2].trim(), wiki: false });
  }
  const wiki = /!\[\[([^\]]+)\]\]/g;
  while ((match = wiki.exec(markdown))) {
    const inner = match[1];
    const src = inner.split("|")[0].trim();
    const alt = inner.split("|")[1] || src;
    found.push({ raw: match[0], alt, src, wiki: true });
  }
  return found;
}

class PickModal extends SuggestModal {
  constructor(app, placeholder, items, getText, getSub) {
    super(app);
    this.items = items;
    this.getText = getText;
    this.getSub = getSub;
    this.setPlaceholder(placeholder);
    this.promise = new Promise((resolve) => {
      this._resolve = resolve;
    });
    this.chosen = false;
  }

  getSuggestions(query) {
    const q = query.toLowerCase();
    return this.items.filter((item) => this.getText(item).toLowerCase().includes(q));
  }

  renderSuggestion(item, el) {
    el.createEl("div", { text: this.getText(item) });
    if (this.getSub) {
      el.createEl("small", { text: this.getSub(item), cls: "folio-muted" });
    }
  }

  onChooseSuggestion(item) {
    this.chosen = true;
    this._resolve(item);
  }

  onClose() {
    if (!this.chosen) this._resolve(null);
  }
}

class FolioClient {
  constructor(site) {
    this.site = site;
  }

  async request(path, options = {}) {
    const url = `${trimSlash(this.site.url)}${path}`;
    const res = await requestUrl({
      url,
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${this.site.token}`,
        "Content-Type": "application/json",
      },
      body: options.body,
      throw: false,
    });
    let data = null;
    try {
      data = res.json;
    } catch {
      data = null;
    }
    if (res.status === 401) throw new Error("令牌无效，请到折页控制台重新签发");
    if (res.status >= 400) {
      const message = (data && (data.error || data.message)) || res.text || `请求失败 ${res.status}`;
      throw new Error(message);
    }
    return data;
  }

  me() {
    return this.request("/api/obsidian/me");
  }

  listPosts() {
    return this.request("/api/obsidian/posts");
  }

  publish(markdown) {
    return this.request("/api/obsidian/posts", {
      method: "PUT",
      body: JSON.stringify({ markdown }),
    });
  }

  pull(slug) {
    return this.request(`/api/obsidian/posts/${encodeURIComponent(slug)}`);
  }

  uploadImage(filename, mimeType, dataBase64) {
    return this.request("/api/obsidian/images", {
      method: "POST",
      body: JSON.stringify({ filename, mimeType, dataBase64 }),
    });
  }
}

module.exports = class FolioPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("paper-plane", "发布到折页", () => {
      void this.publishCommand();
    });

    this.addCommand({
      id: "publish",
      name: "发布到折页",
      callback: () => this.publishCommand(),
    });
    this.addCommand({
      id: "publish-with-defaults",
      name: "发布到折页（使用默认站点）",
      callback: () => this.publishWithDefaults(),
    });
    this.addCommand({
      id: "upload-images",
      name: "上传图片到折页",
      callback: () => this.uploadImagesCommand(),
    });
    this.addCommand({
      id: "update-post",
      name: "从折页更新内容",
      editorCallback: () => this.updatePostCommand(),
    });
    this.addCommand({
      id: "pull-post",
      name: "从折页拉取文章",
      callback: () => this.pullPostCommand(),
    });

    this.addSettingTab(new FolioSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!Array.isArray(this.settings.sites)) this.settings.sites = [];
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getActiveFile() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new Notice("请先打开一篇 Markdown 笔记");
      return null;
    }
    return file;
  }

  async pickSite(preferredUrl) {
    if (this.settings.sites.length === 0) {
      new Notice("请先在设置里添加折页站点与个人令牌");
      return null;
    }
    if (preferredUrl) {
      const matched = this.settings.sites.find((site) => sameUrl(site.url, preferredUrl));
      if (matched) return matched;
      new Notice("笔记里的站点地址和设置不匹配");
      return null;
    }
    if (this.settings.sites.length === 1) return this.settings.sites[0];
    const modal = new PickModal(
      this.app,
      "选择折页站点",
      this.settings.sites,
      (site) => site.name || site.url,
      (site) => site.url,
    );
    modal.open();
    return modal.promise;
  }

  async publishCommand() {
    const file = this.getActiveFile();
    if (!file) return;
    const markdown = await this.app.vault.read(file);
    const { meta } = parseFrontMatter(markdown);
    const site = await this.pickSite(meta.folio && meta.folio.site);
    if (!site) return;
    await this.publishToSite(file, site, markdown);
  }

  async publishWithDefaults() {
    const file = this.getActiveFile();
    if (!file) return;
    const site = this.settings.sites.find((item) => item.default) || this.settings.sites[0];
    if (!site) {
      new Notice("没有默认站点");
      return;
    }
    const markdown = await this.app.vault.read(file);
    const { meta } = parseFrontMatter(markdown);
    if (meta.folio && meta.folio.site && !sameUrl(meta.folio.site, site.url)) {
      new Notice("这篇笔记已经绑定了另一个站点");
      return;
    }
    await this.publishToSite(file, site, markdown);
  }

  async publishToSite(file, site, markdown) {
    try {
      const client = new FolioClient(site);
      const uploaded = await this.uploadLocalImages(file, client, markdown, true);
      if (!uploaded.ok) return;
      new Notice("正在发布到折页…");
      const result = await client.publish(uploaded.markdown);
      if (result && result.markdown) {
        await this.app.vault.modify(file, result.markdown);
      }
      new Notice(result.created ? `已发布：${result.slug}` : `已更新：${result.slug}`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "发布失败");
    }
  }

  async uploadImagesCommand() {
    const file = this.getActiveFile();
    if (!file) return;
    const markdown = await this.app.vault.read(file);
    const { meta } = parseFrontMatter(markdown);
    const site = await this.pickSite(meta.folio && meta.folio.site);
    if (!site) return;
    try {
      const result = await this.uploadLocalImages(file, new FolioClient(site), markdown, false);
      if (result.ok && result.replaced) new Notice(`已上传 ${result.uploaded} 张图片`);
      else if (result.ok) new Notice("没有需要上传的本地图片");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "上传失败");
    }
  }

  async uploadLocalImages(file, client, markdown, silent) {
    const images = collectImages(markdown).filter((item) => !isRemote(item.src));
    if (!images.length) return { ok: true, markdown, replaced: false, uploaded: 0 };
    const unique = [];
    const seen = new Set();
    for (const image of images) {
      if (seen.has(image.src)) continue;
      seen.add(image.src);
      unique.push(image);
    }
    let next = markdown;
    let uploaded = 0;
    for (const image of unique) {
      const local = this.resolveLocalFile(file, image.src);
      if (!local) {
        new Notice(`找不到图片：${image.src}`);
        return { ok: false, markdown, replaced: false, uploaded };
      }
      const binary = await this.app.vault.readBinary(local);
      const mime = MIME[extOf(local.name)] || "image/jpeg";
      const payload = await client.uploadImage(local.name, mime, toBase64(binary));
      const permalink = payload.permalink || payload.url;
      if (!permalink) {
        new Notice(`上传失败：${local.name}`);
        return { ok: false, markdown: next, replaced: false, uploaded };
      }
      const escaped = image.src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      next = next.replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, "g"), `![${image.alt || local.basename}](${permalink})`);
      next = next.replace(new RegExp(`!\\[\\[${escaped}(?:\\|[^\\]]*)?\\]\\]`, "g"), `![${image.alt || local.basename}](${permalink})`);
      uploaded += 1;
    }
    if (next !== markdown) await this.app.vault.modify(file, next);
    if (!silent && uploaded) new Notice(`已上传 ${uploaded} 张图片`);
    return { ok: true, markdown: next, replaced: uploaded > 0, uploaded };
  }

  resolveLocalFile(source, link) {
    const clean = link.split(/[?#]/)[0].replace(/^<|>$/g, "").trim();
    const dest = this.app.metadataCache.getFirstLinkpathDest(clean, source.path);
    if (dest instanceof TFile) return dest;
    const folder = source.parent ? source.parent.path : "";
    const candidate = normalizePath(folder ? `${folder}/${clean}` : clean);
    const file = this.app.vault.getAbstractFileByPath(candidate);
    return file instanceof TFile ? file : null;
  }

  async updatePostCommand() {
    const file = this.getActiveFile();
    if (!file) return;
    const markdown = await this.app.vault.read(file);
    const { meta } = parseFrontMatter(markdown);
    const slug = (meta.folio && meta.folio.name) || meta.slug;
    if (!slug) {
      new Notice("这篇笔记还没有同步过，请先发布");
      return;
    }
    const site = await this.pickSite(meta.folio && meta.folio.site);
    if (!site) return;
    try {
      const result = await new FolioClient(site).pull(slug);
      if (!result || !result.markdown) throw new Error("找不到这篇文章");
      await this.app.vault.modify(file, result.markdown);
      new Notice("已从折页更新内容");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "更新失败");
    }
  }

  async pullPostCommand() {
    const site = await this.pickSite();
    if (!site) return;
    try {
      const payload = await new FolioClient(site).listPosts();
      const posts = (payload && payload.posts) || [];
      if (!posts.length) {
        new Notice("站点上还没有可拉取的文章");
        return;
      }
      const modal = new PickModal(
        this.app,
        "选择要拉取的文章",
        posts,
        (post) => post.title,
        (post) => `${post.slug} · ${post.status === "published" ? "已发布" : "草稿"}`,
      );
      modal.open();
      const picked = await modal.promise;
      if (!picked) return;
      const result = await new FolioClient(site).pull(picked.slug);
      const path = normalizePath(`${picked.slug}.md`);
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof TFile) {
        await this.app.vault.modify(existing, result.markdown);
        await this.app.workspace.getLeaf(true).openFile(existing);
      } else {
        const created = await this.app.vault.create(path, result.markdown);
        await this.app.workspace.getLeaf(true).openFile(created);
      }
      new Notice(`已拉取：${picked.title}`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "拉取失败");
    }
  }
};

class FolioSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "折页" });
    containerEl.createEl("p", {
      text: "添加站点地址和个人令牌。令牌在折页控制台的 Obsidian 页签发，只显示一次。",
      cls: "folio-muted",
    });

    new Setting(containerEl).setName("添加站点").addButton((button) => {
      button.setButtonText("添加").setCta().onClick(async () => {
        this.plugin.settings.sites.push({
          name: "折页",
          url: "",
          token: "",
          default: this.plugin.settings.sites.length === 0,
        });
        await this.plugin.saveSettings();
        this.display();
      });
    });

    this.plugin.settings.sites.forEach((site, index) => {
      const wrap = containerEl.createDiv({ cls: "folio-site-card" });
      new Setting(wrap)
        .setName("站点名称")
        .addText((text) =>
          text.setPlaceholder("折页").setValue(site.name || "").onChange(async (value) => {
            site.name = value;
            await this.plugin.saveSettings();
          }),
        );
      new Setting(wrap)
        .setName("站点地址")
        .setDesc("折页站点的网址，不要末尾斜杠。")
        .addText((text) =>
          text.setPlaceholder("https://example.com").setValue(site.url || "").onChange(async (value) => {
            site.url = value.trim();
            await this.plugin.saveSettings();
          }),
        );
      new Setting(wrap)
        .setName("个人令牌")
        .setDesc("以 folio_ 开头，来自折页控制台。")
        .addText((text) =>
          text.setPlaceholder("folio_…").setValue(site.token || "").onChange(async (value) => {
            site.token = value.trim();
            await this.plugin.saveSettings();
          }),
        );
      new Setting(wrap).setName("设为默认").addToggle((toggle) =>
        toggle.setValue(Boolean(site.default)).onChange(async (value) => {
          this.plugin.settings.sites.forEach((item, i) => {
            item.default = value && i === index;
          });
          await this.plugin.saveSettings();
          this.display();
        }),
      );
      new Setting(wrap)
        .addButton((button) => {
          button.setButtonText("测试连接").onClick(async () => {
            try {
              const me = await new FolioClient(site).me();
              new Notice(`已连接：${me.name || me.userId}`);
            } catch (error) {
              new Notice(error instanceof Error ? error.message : "连接失败");
            }
          });
        })
        .addButton((button) => {
          button.setButtonText("删除").setWarning().onClick(async () => {
            this.plugin.settings.sites.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          });
        });
    });
  }
}
