import type { AccessMode } from "@/lib/membership/access";
import type { Topic } from "./types";

export type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  coverAlt: string;
  topic: Topic;
  featured: boolean;
  publishedAt: string;
  accessMode?: AccessMode;
  exclusiveDays?: number;
};

export const EDITORIAL_USER_ID = "folio-desk";
export const EDITORIAL_NAME = "折页编辑部";
/** Old literary slugs → new technical slugs, used to migrate existing rows. */
export const SEED_SLUG_MIGRATIONS = {
  "zhi-bian-de-guang": "ts-discriminated-unions",
  "yu-tian-de-shi-jie": "rust-ownership",
  "man-bian-yi": "go-select",
  "yi-wan-tang-de-wen-du": "python-protocol",
  "ye-jian-bian-ji-shi": "sql-explain",
  "chuang-tai-shang-de-jue": "zig-comptime",
  "wei-fa-chu-de-xin": "hono-typed-routes"
};
export const SEED_POST_TAGS = {
  "ts-discriminated-unions": [
    "TypeScript",
    "类型系统",
    "判别联合"
  ],
  "rust-ownership": [
    "Rust",
    "所有权",
    "生命周期"
  ],
  "go-select": [
    "Go",
    "并发",
    "channel"
  ],
  "python-protocol": [
    "Python",
    "typing",
    "Protocol"
  ],
  "sql-explain": [
    "PostgreSQL",
    "索引",
    "EXPLAIN"
  ],
  "zig-comptime": [
    "Zig",
    "comptime",
    "编译期"
  ],
  "hono-typed-routes": [
    "Hono",
    "RPC",
    "架构"
  ]
};
export const SEED_POSTS: SeedPost[] = [
  {
    slug: "ts-discriminated-unions",
    title: "判别联合：让非法状态无法表示",
    excerpt: "TypeScript 最有用的技巧不是 any 的对立面，而是把运行时才会炸的分支，提前写成编译器能穷尽的类型。",
    coverImage: "/covers/01-ts.jpg",
    coverAlt: "夜间书桌上微微发亮的笔记本",
    topic: "TypeScript",
    featured: true,
    publishedAt: "2026-09-12T08:00:00.000Z",
    accessMode: "early",
    exclusiveDays: 7,
    body: `类型系统不是为了让你多写几个尖括号。它真正擅长的事只有一件：**把不可能发生的状态，从 API 里删掉。**

最常见的失败写法，是把一堆可选字段扔进同一个对象，然后在运行时互相猜。

\`\`\`ts:src/upload.ts {3-5}
type Upload = {
  status: "idle" | "loading" | "ok" | "error";
  progress?: number;
  url?: string;
  error?: string;
};

function filename(file: Upload) {
  // url 在 loading 时也“可能”存在，于是每次都要可选链
  return file.url?.split("/").at(-1);
}
\`\`\`

这段代码能通过编译，但 \`status === "error"\` 时 \`url\` 仍可能残留旧值。调用方必须记住一组口头约定。口头约定不是类型。

## 写成互斥的形状

判别联合把每个状态收成自己的字段集。切换状态时，旧字段直接消失。

\`\`\`ts:src/upload.ts {1-5,14-16}
type Upload =
  | { status: "idle" }
  | { status: "loading"; progress: number }
  | { status: "ok"; url: string }
  | { status: "error"; error: string };

function filename(file: Upload): string | undefined {
  if (file.status !== "ok") return undefined;
  return file.url.split("/").at(-1);
}

function assertNever(value: never): never {
  throw new Error(\`unexpected: \${String(value)}\`);
}

function label(file: Upload): string {
  switch (file.status) {
    case "idle":
      return "未开始";
    case "loading":
      return \`上传中 \${file.progress}%\`;
    case "ok":
      return file.url;
    case "error":
      return file.error;
    default:
      return assertNever(file);
  }
}
\`\`\`

\`assertNever\` 是穷尽检查。哪天有人加了 \`"canceled"\`，\`switch\` 会在编译期裂开，而不是在线上用 \`undefined%\` 糊弄过去。

## 和 \`Result\` 是同一件事

远程调用也一样。不要同时返回 \`data\` 和 \`error\`，再让调用方猜哪边是真的。

\`\`\`ts:src/result.ts
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function loadPost(slug: string): Promise<Result<Post>> {
  const post = await db.posts.find(slug);
  if (!post) return { ok: false, error: "not_found" };
  return { ok: true, value: post };
}
\`\`\`

> 好的类型不是描述数据有哪些字段，而是描述数据**此刻不可能是什么**。

同一思路在 [[rust-ownership|Rust 所有权]] 里是「非法的别名不该通过编译」，在 [[python-protocol|Protocol]] 里是「鸭子必须先把嘴的形状写进合同」。路由表那一侧，见 [[hono-typed-routes]]。编译期把类型当值传来传去，则是 [[zig-comptime#类型也是值]]。

折页的 TypeScript 栏只谈这种能立刻改代码的技巧。下一步通常是：把 UI 状态机也改成联合，而不是 \`isLoading && data && !error\`。想先看互斥形状本身，从 [[#写成互斥的形状]] 开始。`
  },
  {
    slug: "rust-ownership",
    title: "所有权：借用检查器到底在查什么",
    excerpt: "Rust 的报错看起来像在跟你吵架。把它翻译成人话之后，它其实只问两个问题：这块内存谁说了算，以及引用能活多久。",
    coverImage: "/covers/02-rust.jpg",
    coverAlt: "胡桃木上氧化的铜齿轮",
    topic: "Rust",
    featured: false,
    publishedAt: "2026-09-08T10:00:00.000Z",
    accessMode: "early",
    exclusiveDays: 7,
    body: `很多人把 Rust 的难度理解成语法。真正难的是：**值只有一个主人。** 其余的 \`&\`、\`&mut\`、生命周期，都是在给这句话加注解。

\`\`\`rust:src/main.rs {8-10}
fn take(name: String) {
    println!("owned {name}");
}

fn main() {
    let title = String::from("折页");
    take(title);
    // println!("{title}"); // value borrowed here after move
}
\`\`\`

\`take\` 吃掉了 \`title\`。再打印一次，编译器不是矫情，是在阻止你读一块已经不属于你的栈槽。

## 借用，而不是复制

多数时候你并不想转移所有权，只想临时看看。那就借。

\`\`\`rust:src/borrow.rs
fn longest<'a>(left: &'a str, right: &'a str) -> &'a str {
    if left.len() >= right.len() { left } else { right }
}

fn pick<'a>(hay: &'a str, needle: &str) -> Option<&'a str> {
    hay.find(needle).map(|index| &hay[index..index + needle.len()])
}
\`\`\`

\`'a\` 读作：返回值不能比两个输入里较短的那个活得更久。它不是魔法标记，是在函数签名里把「别把局部变量的地址带出栈帧」写成类型。

可变借用更严：同一时刻，\`&mut T\` 只能有一个。这不是风格问题，是为了让数据竞争在编译期破产。

\`\`\`rust:src/mut.rs
fn main() {
    let mut buf = String::from("fn main");
    let view = &buf;
    // buf.push('!'); // cannot borrow as mutable because it is also borrowed as immutable
    println!("{view}");
}
\`\`\`

## 什么时候该 \`clone\`

\`clone\` 能让程序通过编译，也能把热路径变成复印件工厂。经验法则很短：

1. 跨线程、要拥有数据 → \`clone\` / \`Arc\`
2. 函数只读 → \`&T\`
3. 函数要改、且调用方不再用 → 直接拿走
4. 循环里 \`clone\` 之前，先问能不能改签名

> 借用检查器查的不是你聪不聪明，是这块字节之后还会不会有人读。 ^ledger

把所有权想成账本，Rust 就没那么神秘。账本记不清的语言，把同样的问题推迟到了 core dump。Go 不靠类型拦住数据竞争，它把所有权交给 channel，见 [[go-select#超时不要睡死|select 与超时]]。类型层把非法状态删掉的做法，和 [[ts-discriminated-unions|判别联合]] 是同一类约束。编译期能确定的事，Zig 会直接算掉，见 [[zig-comptime]]。`
  },
  {
    slug: "go-select",
    title: "select：一个 goroutine 如何同时等很多件事",
    excerpt: "Go 的并发模型不是「多开几个线程」。核心原语其实是：channel 传递所有权，select 决定此刻听谁。",
    coverImage: "/covers/03-go.jpg",
    coverAlt: "混凝土桌上的青绿玻璃球",
    topic: "Go",
    featured: false,
    publishedAt: "2026-09-02T11:30:00.000Z",
    body: `Goroutine 便宜，并不等于你可以随便 \`go func\`。泄漏的 goroutine 和泄漏的 \`setInterval\` 是同一类问题：没有人负责停下来。

\`select\` 把「等数据、等取消、等超时」写成一个分支表。

\`\`\`go:internal/worker/worker.go {12-20}
func run(ctx context.Context, jobs <-chan Job) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case job, ok := <-jobs:
            if !ok {
                return nil
            }
            if err := job.Do(ctx); err != nil {
                return err
            }
        }
    }
}
\`\`\`

\`ctx.Done()\` 优先退出，channel 关闭则收尾。没有 \`default\` 的 \`select\` 会阻塞，这通常是你想要的；加上 \`default\` 就变成轮询，CPU 会先抗议。

## 超时不要睡死

超时是取消的一种。用 \`context.WithTimeout\`，不要在业务里 \`time.Sleep\` 然后祈祷。

\`\`\`go:internal/fetch/fetch.go
func fetch(parent context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(parent, 3*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }
    res, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer res.Body.Close()
    return io.ReadAll(res.Body)
}
\`\`\`

## 只关闭你拥有的 channel

发送方关闭，接收方判断 \`ok\`。反过来关，是 \`panic\` 的经典现场。需要广播结束时，关的是 \`ctx\`，不是所有人的 channel。

\`\`\`go
select {
case jobs <- job:
case <-ctx.Done():
    return ctx.Err()
}
\`\`\`

> 并发代码的可读性，取决于退出路径是否和进入路径一样显式。

Go 不靠类型系统拦住数据竞争（\`-race\` 是运行时的）。它靠的是：**不要共享内存，用通信来共享。** \`select\` 就是那张通信日程表。Rust 用 [[rust-ownership#^ledger|所有权账本]] 在编译期做同样的事。取消信号从 HTTP 传到 worker，见 [[hono-typed-routes]]。`
  },
  {
    slug: "python-protocol",
    title: "Protocol：鸭子类型也可以有接口",
    excerpt: "Python 的类型提示不消灭动态性。Protocol 只是把「长得像文件的东西」写成静态可检查的形状。",
    coverImage: "/covers/04-python.jpg",
    coverAlt: "键盘旁的绿色玻璃卷曲雕塑",
    topic: "Python",
    featured: false,
    publishedAt: "2026-08-26T09:00:00.000Z",
    accessMode: "paid",
    exclusiveDays: 7,
    body: `ABC 要求继承。鸭子类型要求你别问品种。\`Protocol\` 站在中间：不强迫继承，但让 type checker 能验证方法在不在。

\`\`\`python:app/storage.py {1-8}
from typing import Protocol

class Blob(Protocol):
    def read(self, n: int = -1) -> bytes: ...
    def write(self, data: bytes) -> int: ...

def persist(dst: Blob, payload: bytes) -> None:
    dst.write(payload)
\`\`\`

\`persist\` 不关心你传的是 \`BufferedWriter\`、\`S3File\` 还是测试里的 \`BytesIO\`。只要有 \`write\`，mypy / pyright 就放行。没有继承树，也没有 \`runtime_checkable\` 的意外 \`isinstance\`。

## 和 \`TypedDict\` 的分工

\`Protocol\` 描述行为。\`TypedDict\` 描述数据结构。JSON 进来的那一层用后者，服务边界用前者。

\`\`\`python:app/posts.py
from typing import TypedDict

class PostDraft(TypedDict):
    title: str
    body: str
    topic: str

def slug_for(draft: PostDraft) -> str:
    return draft["title"].lower().replace(" ", "-")
\`\`\`

## 别把 \`Any\` 当胶水

\`Any\` 会让检查器闭嘴。真正该用的是 \`TypeVar\` 和 \`Generic\`。一个最小的 Result：

\`\`\`python:app/result.py
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")
E = TypeVar("E")

@dataclass(frozen=True, slots=True)
class Ok(Generic[T]):
    value: T

@dataclass(frozen=True, slots=True)
class Err(Generic[E]):
    error: E

Result = Ok[T] | Err[E]
\`\`\`

> 类型提示在 Python 里不是运行时的法律，是给同事和 CI 的合同。合同写清楚，鸭子才能被安全地喂养。

判别联合在 TypeScript 里把状态写成互斥形状，见 [[ts-discriminated-unions#写成互斥的形状]]。这和《所有权：借用检查器到底在查什么》不是同一层，但都在消灭口头约定。

如果你的代码库还在用 \`Dict[str, Any]\` 穿过三层函数，先把边界上的那一层换成 \`Protocol\` 或 \`TypedDict\`。收益通常立刻可见。`
  },
  {
    slug: "sql-explain",
    title: "索引不是魔法：一次 PostgreSQL 的 EXPLAIN",
    excerpt: "慢查询很少死在 SQL 写得不够炫。它们死在规划器只能顺序扫表，而你以为主键能保佑所有 WHERE。",
    coverImage: "/covers/05-sql.jpg",
    coverAlt: "蓝光边缘下的层叠透明圆盘",
    topic: "SQL",
    featured: false,
    publishedAt: "2026-08-18T13:00:00.000Z",
    body: `先看规划，再谈感觉。\`EXPLAIN (ANALYZE, BUFFERS)\` 是唯一诚实的读者。

假设博客要按栏目列出已发布文章：

\`\`\`sql:migrations/0006_posts_topic.sql
create table posts (
  id            bigserial primary key,
  slug          text not null unique,
  topic         text not null,
  status        text not null,
  published_at  timestamptz
);

explain (analyze, buffers)
select id, slug, title
from posts
where topic = 'TypeScript'
  and status = 'published'
order by published_at desc
limit 20;
\`\`\`

如果输出是 \`Seq Scan on posts\`，意思是：每一行都看一遍。一千行你感觉不到，一百万行时它会变成一次全表散步。

## 让索引覆盖过滤条件

BTree 索引的左前缀规则很实际：\`(status, topic, published_at)\` 能服务「已发布 + 某栏目 + 按时间倒序」。把最常等于的列放前面，把排序列放最后。

\`\`\`sql {1-3}
create index posts_feed_idx
  on posts (status, topic, published_at desc)
  where deleted_at is null;
\`\`\`

部分索引把回收站排除在外。规划器一旦选中它，你应看到 \`Index Scan using posts_feed_idx\`。

## 函数会毁掉索引

\`where lower(slug) = lower($1)\` 让索引变成摆设，除非你建的是表达式索引。能把数据规范化就规范化：存小写 slug，查询就直接等值。

\`\`\`sql
-- 坏：函数包在列上
select * from posts where lower(slug) = 'ts-discriminated-unions';

-- 好：列保持可索引的形状
select * from posts where slug = 'ts-discriminated-unions';
\`\`\`

> 索引是给**已经想清楚的访问路径**准备的，不是给所有 WHERE 的护身符。

栏目过滤能走索引之后，列表页才撑得住。应用层怎么把查询收成类型安全的路由，见 [[hono-typed-routes]]。

看 \`EXPLAIN\` 时盯三件事：节点类型、实际行数、是否从缓存读。行数估计差一个数量级，规划器就会选错路。那才是该建统计信息、该改写法的信号。`
  },
  {
    slug: "zig-comptime",
    title: "comptime：把循环从运行时拿掉",
    excerpt: "Zig 没有宏系统的剧场，却把编译期计算做成了普通语法。能在编译期结束的循环，就不该留到用户的 CPU 上。",
    coverImage: "/covers/06-zig.jpg",
    coverAlt: "深色背景上的橙色几何金属雕塑",
    topic: "Zig",
    featured: false,
    publishedAt: "2026-08-09T08:40:00.000Z",
    body: `\`comptime\` 不是注解糖。它是在说：这段代码在编译器里跑，结果变成常量、类型或内联后的机器码。

最直观的例子是查找表。与其启动后再算 256 个入口，不如让编译器算完。

\`\`\`zig:src/nibble.zig {1-8}
fn nibbleCount(byte: u8) u8 {
    var n: u8 = 0;
    var value = byte;
    inline while (value != 0) : (value >>= 1) {
        n += @as(u8, @intCast(value & 1));
    }
    return n;
}

const popcount_table: [256]u8 = blk: {
    var table: [256]u8 = undefined;
    for (&table, 0..) |*slot, i| {
        slot.* = nibbleCount(@intCast(i));
    }
    break :blk table;
};

pub fn popcount(byte: u8) u8 {
    return popcount_table[byte];
}
\`\`\`

\`inline while\` 把循环在编译期展开。\`blk:\` 是一个立即执行的常量块。运行时的 \`popcount\` 只剩一次数组取值。

## 类型也是值

Zig 的类型可以当作 \`comptime\` 参数传来传去。这比 C++ 模板读起来更像普通函数。

\`\`\`zig:src/max.zig
pub fn max(comptime T: type, a: T, b: T) T {
    return if (a > b) a else b;
}

test "max ints" {
    try std.testing.expectEqual(@as(u32, 9), max(u32, 3, 9));
}
\`\`\`

没有泛型关键字。\`T\` 就是一个编译期的类型值。错误会指向你写的那一行，而不是展开后三百行的模板地狱。

> 把能确定的事情提前到编译期，运行时才能只做还不确定的事情。

编译期把类型当值传来传去，和 [[ts-discriminated-unions|判别联合]] 一样，都是把决策提前。内存谁说了算，则要看 [[rust-ownership]]。

Zig 对「没有隐藏控制流」偏执得很有用。\`comptime\` 是少数被允许的魔法，而且它把魔法写在明面上。`
  },
  {
    slug: "hono-typed-routes",
    title: "Hono RPC：博客不需要自研网关",
    excerpt: "内容站的主路径是请求-响应。把双向流式 RPC 的复杂度搬过来，是在用导弹打钉子。",
    coverImage: "/covers/07-arch.jpg",
    coverAlt: "海军蓝桌上的嵌套黑色模型盒",
    topic: "架构",
    featured: false,
    publishedAt: "2026-07-30T12:00:00.000Z",
    body: `内容型 Web 的主路径是：请求进来，查询数据库，返回 HTML 或 JSON。偶尔有一条评论通知。这跟「流式对话、对称 RPC」不是同一个问题。

Hono 把路由本身当成类型来源。注册过的路径，客户端能直接推出来。

\`\`\`ts:src/server.ts {1-16}
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const app = new Hono()
  .get("/api/posts", async (c) => {
    const posts = await listPublished();
    return c.json({ posts });
  })
  .get("/api/posts/:slug", async (c) => {
    const post = await getBySlug(c.req.param("slug"));
    if (!post) return c.notFound();
    return c.json({ post });
  })
  .post(
    "/api/posts",
    zValidator("json", z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      topic: z.string(),
    })),
    async (c) => {
      const input = c.req.valid("json");
      const post = await createPost(input);
      return c.json({ post }, 201);
    },
  );

export type AppType = typeof app;
\`\`\`

前端不必再手写路径字符串：

\`\`\`ts:src/lib/api.ts
import { hc } from "hono/client";
import type { AppType } from "../server";

export const api = hc<AppType>("/");

const { posts } = await (await api.api.posts.$get()).json();
\`\`\`

## 什么时候不要用它

纯静态 Markdown 博客连 API 层都可以省。强 SEO 的站点，页面壳和 \`/api\` 可以分开。需要两端互相流式调函数，再考虑更重的 RPC。

\`\`\`diff
- export const gateway = createCustomRpc(host)
- client.invoke("write_post", payload)
+ const res = await api.api.posts.$post({ json: payload })
+ if (!res.ok) throw new Error(await res.text())
\`\`\`

> 类型安全不等于协议升级。能用 HTTP 说清楚的事，就用 HTTP 说。

请求进来后仍要会查库。慢查询怎么看规划，见 [[sql-explain]]。前端状态机用 [[ts-discriminated-unions|判别联合]] 收口，比在组件里猜 \`data && !error\` 干净。取消从路由传到 goroutine，Go 的写法在 [[go-select]]。

请求-响应的站点，显式 HTTP 路由就够。类型安全来自路由表，不必再发明一层协议。`
  }
];
