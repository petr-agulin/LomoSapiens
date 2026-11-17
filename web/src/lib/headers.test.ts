// The security headers Cloudflare Pages adds: web/public/_headers, read as Cloudflare reads it.
import { describe, expect, it } from "vitest";
import file from "../../public/_headers?raw";
import { headersFor, pathMatches, readHeadersFile } from "./headersFile.ts";

const all = readHeadersFile(file);
const everywhere = all.get("/*")!;
const policy = new Map(
  (everywhere.get("content-security-policy") ?? "")
    .split(";")
    .map((part) => part.trim().split(/\s+/))
    .filter((words) => words[0])
    .map(([name, ...sources]) => [name, sources] as const),
);

describe("the security headers", () => {
  it("cover every page, the offline support and the app's own files", () => {
    expect([...all.keys()]).toEqual(["/*", "/sw.js", "/assets/*"]);
  });

  it("let the app load and contact only its own address, with the phone's own photos and backups beside it", () => {
    expect(policy.get("default-src")).toEqual(["'self'"]);
    expect(policy.get("script-src")).toEqual(["'self'"]);
    expect(policy.get("connect-src")).toEqual(["'self'", "data:"]);
    expect(policy.get("img-src")).toEqual(["'self'", "blob:", "data:"]);
    expect(policy.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    for (const name of ["font-src", "manifest-src", "worker-src"]) expect(policy.get(name), name).toEqual(["'self'"]);
  });

  it("name no other address, and allow no code written as text", () => {
    const sources = [...policy.values()].flat();
    expect(sources.filter((source) => /^(https?:|\*|wss?:)|\.[a-z]{2,}$/i.test(source))).toEqual([]);
    expect(sources).not.toContain("'unsafe-eval'");
    expect(policy.get("script-src")).not.toContain("'unsafe-inline'");
  });

  it("forbid plugins, a changed base address, sending forms and being shown inside another site", () => {
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'none'"]);
    expect(policy.get("form-action")).toEqual(["'none'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(everywhere.get("x-frame-options")).toBe("DENY");
  });

  it("send no address on to other sites, guess no file types, and turn off location and the microphone", () => {
    expect(everywhere.get("referrer-policy")).toBe("no-referrer");
    expect(everywhere.get("x-content-type-options")).toBe("nosniff");
    const permissions = everywhere.get("permissions-policy") ?? "";
    expect(permissions).toContain("geolocation=()");
    expect(permissions).toContain("microphone=()");
    // Photos come through the phone's file picker, which the camera permission doesn't govern: left alone.
    expect(permissions).not.toContain("camera");
  });

  it("check the offline support for updates at every visit, and keep the app's fingerprinted files for good", () => {
    expect(all.get("/sw.js")!.get("cache-control")).toBe("no-cache");
    expect(all.get("/assets/*")!.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });
});

describe("reading the file as Cloudflare does", () => {
  it("matches paths with * standing for anything", () => {
    expect(pathMatches("/*", "/")).toBe(true);
    expect(pathMatches("/*", "/test")).toBe(true);
    expect(pathMatches("/assets/*", "/assets/index-B6.js")).toBe(true);
    expect(pathMatches("/assets/*", "/sw.js")).toBe(false);
    expect(pathMatches("/sw.js", "/sw.js")).toBe(true);
    expect(pathMatches("/sw.js", "/swxjs")).toBe(false);
  });

  it("gives a file every matching rule's headers: the policy everywhere, the caching where it applies", () => {
    expect([...headersFor(all, "/").keys()]).not.toContain("cache-control");
    expect(headersFor(all, "/sw.js").get("cache-control")).toBe("no-cache");
    expect(headersFor(all, "/assets/index-B6.js").get("content-security-policy")).toBe(everywhere.get("content-security-policy"));
  });

  it("refuses a header that belongs to no path", () => {
    expect(() => readHeadersFile("  X-Thing: 1")).toThrow(/outside a path/);
  });
});
