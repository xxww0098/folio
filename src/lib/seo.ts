export function pageDescription(text: string, max = 160) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}

export function articleJsonLd(input: {
  title: string;
  excerpt: string;
  slug: string;
  authorName: string;
  publishedAt: string | null;
  coverImage: string | null;
  origin?: string;
}) {
  const url = `${input.origin ?? ""}/posts/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: pageDescription(input.excerpt),
    datePublished: input.publishedAt || undefined,
    author: { "@type": "Person", name: input.authorName },
    image: input.coverImage || undefined,
    mainEntityOfPage: url,
    inLanguage: "zh-CN",
  };
}

export function likeContains(query: string) {
  return `%${query.replace(/[%_\\]/g, "")}%`;
}
