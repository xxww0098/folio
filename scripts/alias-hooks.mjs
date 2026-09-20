import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcHref = `${pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "src")).href}/`;

function withExt(url) {
  if (/\.(?:[cm]?js|ts|tsx|json|mjs)$/.test(url)) return url;
  try {
    const path = fileURLToPath(url);
    if (existsSync(`${path}.ts`)) return `${url}.ts`;
    if (existsSync(`${path}.tsx`)) return `${url}.tsx`;
    if (existsSync(join(path, "index.ts"))) return `${url}/index.ts`;
  } catch {
    return url;
  }
  return url;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(withExt(`${srcHref}${specifier.slice(2)}`), context);
  }
  if (specifier.startsWith(".") && context.parentURL) {
    return nextResolve(withExt(new URL(specifier, context.parentURL).href), context);
  }
  return nextResolve(specifier, context);
}
