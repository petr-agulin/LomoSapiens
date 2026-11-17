// Reads web/public/_headers as Cloudflare Pages does: a path at the start of a line, then its
// indented "Name: value" headers; lines starting with # are comments. Shared by its test and by
// tools/serve-built.ts, which serves the built app with these headers on this computer. Not part of the app.

/** Each path's headers, in the file's order, names in lower case. */
export function readHeadersFile(text: string): Map<string, Map<string, string>> {
  const all = new Map<string, Map<string, string>>();
  let current: Map<string, string> | null = null;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = new Map();
      all.set(line.trim(), current);
      continue;
    }
    const colon = line.indexOf(":");
    if (!current || colon < 0) throw new Error(`A header outside a path, or without a colon: "${line}"`);
    current.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }
  return all;
}

/** Whether an address's path matches a rule's path, where * stands for anything, as in Cloudflare's rules. */
export function pathMatches(rule: string, path: string): boolean {
  const pattern = rule.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${pattern}$`).test(path);
}

/** Every header for one path: the rules that match it, merged in the file's order. */
export function headersFor(all: Map<string, Map<string, string>>, path: string): Map<string, string> {
  const merged = new Map<string, string>();
  for (const [rule, headers] of all) if (pathMatches(rule, path)) for (const [name, value] of headers) merged.set(name, value);
  return merged;
}
