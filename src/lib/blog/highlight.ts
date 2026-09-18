export type TokenKind =
  | "plain"
  | "kw"
  | "type"
  | "fn"
  | "str"
  | "cmt"
  | "num"
  | "op"
  | "punct"
  | "prop"
  | "macro"
  | "bool";

export type Token = { kind: TokenKind; text: string };

export type LineKind = "ok" | "add" | "del" | "mark";

export type HighlightedLine = {
  tokens: Token[];
  kind: LineKind;
};

export type FenceMeta = {
  lang: string;
  filename?: string;
  highlights: number[];
  code: string;
};

export type LanguageInfo = {
  id: string;
  label: string;
  tone: string;
};

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "ts",
  typescript: "ts",
  tsx: "tsx",
  js: "js",
  javascript: "js",
  jsx: "jsx",
  mjs: "js",
  cjs: "js",
  rust: "rust",
  rs: "rust",
  go: "go",
  golang: "go",
  python: "python",
  py: "python",
  sql: "sql",
  postgresql: "sql",
  postgres: "sql",
  mysql: "sql",
  bash: "bash",
  sh: "bash",
  zsh: "bash",
  shell: "bash",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "css",
  html: "html",
  xml: "html",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  zig: "zig",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  java: "java",
  diff: "diff",
  text: "text",
  txt: "text",
  plaintext: "text",
};

const LANGUAGE_LABEL: Record<string, { label: string; tone: string }> = {
  ts: { label: "TypeScript", tone: "text-sky-400" },
  tsx: { label: "TSX", tone: "text-sky-400" },
  js: { label: "JavaScript", tone: "text-amber-300" },
  jsx: { label: "JSX", tone: "text-amber-300" },
  rust: { label: "Rust", tone: "text-orange-300" },
  go: { label: "Go", tone: "text-cyan-400" },
  python: { label: "Python", tone: "text-yellow-300" },
  sql: { label: "SQL", tone: "text-blue-300" },
  bash: { label: "Bash", tone: "text-emerald-400" },
  json: { label: "JSON", tone: "text-lime-300" },
  css: { label: "CSS", tone: "text-fuchsia-300" },
  html: { label: "HTML", tone: "text-rose-300" },
  yaml: { label: "YAML", tone: "text-teal-300" },
  toml: { label: "TOML", tone: "text-teal-300" },
  zig: { label: "Zig", tone: "text-amber-400" },
  c: { label: "C", tone: "text-slate-300" },
  cpp: { label: "C++", tone: "text-slate-300" },
  java: { label: "Java", tone: "text-red-300" },
  diff: { label: "Diff", tone: "text-emerald-300" },
  text: { label: "Text", tone: "text-slate-400" },
};

export const LANGUAGE_OPTIONS = [
  { id: "ts", label: "TypeScript" },
  { id: "tsx", label: "TSX" },
  { id: "js", label: "JavaScript" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "zig", label: "Zig" },
  { id: "bash", label: "Bash" },
  { id: "json", label: "JSON" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "yaml", label: "YAML" },
  { id: "diff", label: "Diff" },
] as const;

const SET = (words: string) => new Set(words.split(/\s+/).filter(Boolean));

const KEYWORDS: Record<string, Set<string>> = {
  ts: SET(
    "abstract as async await break case catch class const continue debugger declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface is keyof let module namespace new of override package private protected public readonly return satisfies set static super switch this throw try type typeof var void while with yield",
  ),
  js: SET(
    "async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield",
  ),
  rust: SET(
    "as async await become box break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true try type typeof unsafe unsized use virtual where while yield",
  ),
  go: SET(
    "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var",
  ),
  python: SET(
    "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield",
  ),
  sql: SET(
    "add alter and as asc begin between by case cast constraint create delete desc distinct drop else end except exists explain from full group having ilike in index inner insert intersect into is join left like limit not null offset on or order outer over partition primary references right select set table then union update values when where window with",
  ),
  bash: SET(
    "alias break case continue do done elif else esac export fi for function if in local readonly return select then until while",
  ),
  zig: SET(
    "align allowzero and anyframe anytype asm async await break catch comptime const continue defer else enum errdefer error export extern false fn for if inline noalias nosuspend null or orelse packed pub resume return struct suspend switch test threadlocal true try undefined union unreachable usingnamespace var volatile while",
  ),
  c: SET(
    "auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while",
  ),
  cpp: SET(
    "alignas alignof and and_eq asm auto bitand bitor bool break case catch char class compl concept const consteval constexpr constinit continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq",
  ),
  java: SET(
    "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record sealed permits non-sealed yield",
  ),
  css: SET(
    "and or not only from to important",
  ),
};

const TYPES: Record<string, Set<string>> = {
  ts: SET("string number boolean object symbol bigint never unknown any void Promise Array Record Map Set Date Error Readonly Partial Required Pick Omit ReturnType Parameters Awaited"),
  js: SET("Promise Array Map Set Date Error Object Function Boolean Number String Symbol BigInt"),
  rust: SET("Self Option Result String Vec Box Rc Arc Mutex HashMap HashSet Path PathBuf OsString Cow"),
  go: SET("string int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 uintptr float32 float64 bool byte rune error any comparable complex64 complex128"),
  python: SET("int str float bool bytes list dict tuple set Optional Union List Dict Tuple Set Callable Any NoneType Protocol TypedDict Literal TypeVar Self"),
  sql: SET("int integer bigint smallint serial bigserial text varchar char boolean bool numeric decimal real double float date timestamp timestamptz uuid json jsonb bytea"),
  zig: SET("i8 i16 i32 i64 i128 u8 u16 u32 u64 u128 isize usize f16 f32 f64 f128 bool void noreturn type anyerror comptime_int comptime_float"),
  java: SET("String Integer Long Boolean Double Float Optional List Map Set ArrayList HashMap void"),
};

const BUILTINS: Record<string, Set<string>> = {
  ts: SET("true false null undefined NaN Infinity console document window process"),
  js: SET("true false null undefined NaN Infinity console document window process"),
  rust: SET("true false Some None Ok Err"),
  go: SET("true false nil iota append cap close complex copy delete imag len make new panic print println real recover"),
  python: SET("True False None self cls print len range enumerate zip map filter abs min max sum open"),
  sql: SET("true false null count sum avg min max now coalesce nullif"),
  bash: SET("echo exit printf read cd pwd test true false"),
  zig: SET("true false null undefined"),
  json: SET("true false null"),
};

const CLIKE = new Set(["ts", "tsx", "js", "jsx", "rust", "go", "zig", "c", "cpp", "java", "css"]);
const HASH = new Set(["python", "bash", "yaml", "toml"]);
const JSX = new Set(["tsx", "jsx"]);

export function normalizeLang(lang: string): string {
  const key = lang.trim().toLowerCase();
  return LANGUAGE_ALIASES[key] ?? (key || "text");
}

export function languageInfo(lang: string): LanguageInfo {
  const id = normalizeLang(lang);
  const meta = LANGUAGE_LABEL[id] ?? { label: lang || "Text", tone: "text-slate-400" };
  return { id, label: meta.label, tone: meta.tone };
}

export function parseFence(block: string): FenceMeta {
  const closed = block.endsWith("```") && block.length > 3;
  const inner = closed ? block.slice(3, -3) : block.slice(3);
  const newline = inner.indexOf("\n");
  const metaLine = (newline >= 0 ? inner.slice(0, newline) : inner).trim();
  const code = (newline >= 0 ? inner.slice(newline + 1) : "").replace(/\n$/, "");
  return { ...parseFenceMeta(metaLine), code };
}

export function parseFenceMeta(raw: string): Omit<FenceMeta, "code"> {
  const text = raw.trim();
  if (!text) return { lang: "text", highlights: [] };
  const langMatch = /^([A-Za-z0-9_+-]+)/.exec(text);
  const lang = langMatch?.[1] ?? "text";
  let rest = text.slice(lang.length);
  let filename: string | undefined;
  if (rest.startsWith(":")) {
    const path = /^:(\S+)/.exec(rest);
    if (path) {
      filename = path[1];
      rest = rest.slice(path[0].length);
    }
  }
  const named = /\b(?:title|filename|file)=(?:"([^"]+)"|'([^']+)'|(\S+))/.exec(rest);
  if (named) filename = named[1] || named[2] || named[3];
  const highlights = parseHighlightSpec(
    /\{([0-9,\s-]+)\}/.exec(rest)?.[1] ??
      /\bhighlight=(?:"([^"]+)"|'([^']+)'|(\S+))/.exec(rest)?.slice(1).find(Boolean),
  );
  return { lang, filename, highlights };
}

function parseHighlightSpec(spec?: string): number[] {
  if (!spec) return [];
  const out: number[] = [];
  for (const part of spec.split(",")) {
    const [startRaw, endRaw] = part.trim().split("-");
    const start = Number(startRaw);
    if (!Number.isFinite(start)) continue;
    const end = Number(endRaw);
    const last = Number.isFinite(end) ? end : start;
    for (let n = Math.min(start, last); n <= Math.max(start, last); n += 1) out.push(n);
  }
  return out;
}

export function highlight(code: string, lang: string, marks: number[] = []): HighlightedLine[] {
  const id = normalizeLang(lang);
  const marked = new Set(marks);
  if (id === "diff") return highlightDiff(code, marked);
  const lines = tokenize(code, id);
  return lines.map((tokens, index) => ({
    tokens,
    kind: marked.has(index + 1) ? "mark" : "ok",
  }));
}

function highlightDiff(code: string, marked: Set<number>): HighlightedLine[] {
  return code.split("\n").map((line, index) => {
    let kind: LineKind = "ok";
    let tokens: Token[];
    if (line.startsWith("+")) {
      kind = "add";
      tokens = [{ kind: "str", text: line }];
    } else if (line.startsWith("-")) {
      kind = "del";
      tokens = [{ kind: "prop", text: line }];
    } else if (line.startsWith("@@") || line.startsWith("diff ") || line.startsWith("index ")) {
      tokens = [{ kind: "cmt", text: line }];
    } else {
      tokens = [{ kind: "plain", text: line }];
    }
    if (marked.has(index + 1) && kind === "ok") kind = "mark";
    return { tokens, kind };
  });
}

type ScanState = { mode: "normal" | "block" | "template" | "dstring" | "sstring" };

function tokenize(code: string, lang: string): Token[][] {
  const rows: Token[][] = [];
  const state: ScanState = { mode: "normal" };
  for (const line of code.split("\n")) {
    rows.push(tokenizeLine(line, lang, state));
  }
  return rows;
}

function tokenizeLine(line: string, lang: string, state: ScanState): Token[] {
  if (lang === "text") return [{ kind: "plain", text: line }];
  const tokens: Token[] = [];
  let i = 0;
  const push = (kind: TokenKind, text: string) => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind) last.text += text;
    else tokens.push({ kind, text });
  };

  const comments = commentStyle(lang);
  const keywords = KEYWORDS[lang === "tsx" ? "ts" : lang === "jsx" ? "js" : lang] ?? new Set<string>();
  const types = TYPES[lang === "tsx" ? "ts" : lang === "jsx" ? "js" : lang] ?? new Set<string>();
  const builtins = BUILTINS[lang === "tsx" ? "ts" : lang === "jsx" ? "js" : lang] ?? new Set<string>();

  while (i < line.length) {
    if (state.mode === "block") {
      const end = line.indexOf("*/", i);
      if (end < 0) {
        push("cmt", line.slice(i));
        return tokens;
      }
      push("cmt", line.slice(i, end + 2));
      i = end + 2;
      state.mode = "normal";
      continue;
    }
    if (state.mode === "template") {
      const next = scanTemplate(line, i, push);
      i = next.index;
      if (!next.closed) return tokens;
      state.mode = "normal";
      continue;
    }
    if (state.mode === "dstring" || state.mode === "sstring") {
      const quote = state.mode === "dstring" ? '"' : "'";
      const next = scanString(line, i, quote, lang);
      push("str", next.text);
      i = next.index;
      if (!next.closed) return tokens;
      state.mode = "normal";
      continue;
    }

    const ch = line[i];
    const next = line[i + 1];

    if (ch === " " || ch === "\t") {
      let j = i + 1;
      while (j < line.length && (line[j] === " " || line[j] === "\t")) j += 1;
      push("plain", line.slice(i, j));
      i = j;
      continue;
    }

    if (comments === "clike" && ch === "/" && next === "/") {
      push("cmt", line.slice(i));
      return tokens;
    }
    if (comments === "hash" && ch === "#") {
      push("cmt", line.slice(i));
      return tokens;
    }
    if (comments === "sql" && ch === "-" && next === "-") {
      push("cmt", line.slice(i));
      return tokens;
    }
    if (comments === "html" && line.startsWith("<!--", i)) {
      const end = line.indexOf("-->", i + 4);
      if (end < 0) {
        push("cmt", line.slice(i));
        return tokens;
      }
      push("cmt", line.slice(i, end + 3));
      i = end + 3;
      continue;
    }
    if ((comments === "clike" || comments === "sql" || comments === "css") && ch === "/" && next === "*") {
      const end = line.indexOf("*/", i + 2);
      if (end < 0) {
        push("cmt", line.slice(i));
        state.mode = "block";
        return tokens;
      }
      push("cmt", line.slice(i, end + 2));
      i = end + 2;
      continue;
    }

    if (ch === "`" && (lang === "ts" || lang === "tsx" || lang === "js" || lang === "jsx")) {
      push("str", "`");
      const scanned = scanTemplate(line, i + 1, push);
      i = scanned.index;
      if (!scanned.closed) {
        state.mode = "template";
        return tokens;
      }
      continue;
    }

    if (ch === '"' || (ch === "'" && lang !== "rust")) {
      const scanned = scanString(line, i + 1, ch, lang);
      push("str", ch + scanned.text);
      i = scanned.index;
      if (!scanned.closed) {
        state.mode = ch === '"' ? "dstring" : "sstring";
        return tokens;
      }
      continue;
    }

    if (ch === '"' && lang === "rust") {
      const scanned = scanString(line, i + 1, '"', lang);
      push("str", `"${scanned.text}`);
      i = scanned.index;
      continue;
    }

    if (JSX.has(lang) && ch === "<" && /[A-Za-z/!]/.test(next ?? "")) {
      push("punct", "<");
      i += 1;
      if (line[i] === "/") {
        push("punct", "/");
        i += 1;
      }
      const ident = readIdent(line, i);
      if (ident) {
        push("type", ident);
        i += ident.length;
      }
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(next ?? ""))) {
      let j = i + 1;
      while (j < line.length && /[0-9a-fA-FxXoObB._]/.test(line[j])) j += 1;
      push("num", line.slice(i, j));
      i = j;
      continue;
    }

    if (isIdentStart(ch)) {
      const ident = readIdent(line, i);
      i += ident.length;
      const after = skipSpace(line, i);
      if (lang === "rust" && line[after] === "!") {
        push("macro", ident);
        continue;
      }
      if (keywords.has(ident) || (lang === "sql" && keywords.has(ident.toLowerCase()))) {
        push("kw", ident);
      } else if (builtins.has(ident) || ident === "true" || ident === "false" || ident === "null" || ident === "undefined") {
        push("bool", ident);
      } else if (types.has(ident) || isTypeName(ident, lang)) {
        push("type", ident);
      } else if (line[after] === "(") {
        push("fn", ident);
      } else if (tokens.at(-1)?.text.endsWith(".") || (lang === "css" && tokens.at(-1)?.kind === "punct")) {
        push("prop", ident);
      } else {
        push("plain", ident);
      }
      continue;
    }

    if ("=+-*/%<>!&|^~?:".includes(ch)) {
      let j = i + 1;
      while (j < line.length && "=<>&|+-".includes(line[j])) j += 1;
      push("op", line.slice(i, j));
      i = j;
      continue;
    }

    push("punct", ch);
    i += 1;
  }

  return tokens;
}

function commentStyle(lang: string): "clike" | "hash" | "sql" | "html" | "css" | "none" {
  if (lang === "sql") return "sql";
  if (lang === "html") return "html";
  if (lang === "css") return "css";
  if (CLIKE.has(lang)) return "clike";
  if (HASH.has(lang)) return "hash";
  return "none";
}

function isIdentStart(ch: string) {
  return /[A-Za-z_$]/.test(ch);
}

function readIdent(line: string, start: number): string {
  let j = start;
  while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) j += 1;
  return line.slice(start, j);
}

function skipSpace(line: string, start: number) {
  let j = start;
  while (j < line.length && (line[j] === " " || line[j] === "\t")) j += 1;
  return j;
}

function isTypeName(ident: string, lang: string) {
  if (lang === "python" || lang === "sql" || lang === "bash") return false;
  return /^[A-Z]/.test(ident);
}

function scanString(line: string, start: number, quote: string, lang: string): { text: string; index: number; closed: boolean } {
  let i = start;
  let escaped = false;
  while (i < line.length) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      i += 1;
      continue;
    }
    if (ch === "\\" && lang !== "sql") {
      escaped = true;
      i += 1;
      continue;
    }
    if (ch === quote) return { text: line.slice(start, i + 1), index: i + 1, closed: true };
    i += 1;
  }
  return { text: line.slice(start), index: line.length, closed: false };
}

function scanTemplate(
  line: string,
  start: number,
  push: (kind: TokenKind, text: string) => void,
): { index: number; closed: boolean } {
  let i = start;
  let escaped = false;
  let buf = "";
  const flush = () => {
    if (buf) {
      push("str", buf);
      buf = "";
    }
  };
  while (i < line.length) {
    const ch = line[i];
    if (escaped) {
      buf += ch;
      escaped = false;
      i += 1;
      continue;
    }
    if (ch === "\\") {
      buf += ch;
      escaped = true;
      i += 1;
      continue;
    }
    if (ch === "`") {
      flush();
      push("str", "`");
      return { index: i + 1, closed: true };
    }
    if (ch === "$" && line[i + 1] === "{") {
      flush();
      push("op", "${");
      i += 2;
      let depth = 1;
      const innerStart = i;
      while (i < line.length && depth > 0) {
        if (line[i] === "{") depth += 1;
        else if (line[i] === "}") depth -= 1;
        if (depth > 0) i += 1;
      }
      push("plain", line.slice(innerStart, i));
      if (line[i] === "}") {
        push("op", "}");
        i += 1;
      }
      continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return { index: i, closed: false };
}
