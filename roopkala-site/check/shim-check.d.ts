declare module 'astro' { export type APIRoute = (ctx: { request: Request; url: URL }) => Response | Promise<Response>; }
declare module 'node:test' { export const test: (name: string, fn: () => unknown) => void; }
declare module 'node:assert/strict' { const a: any; export default a; }
declare const Buffer: { from(s: string): { toString(enc: string): string } };
declare module "node:fs" { export function readFileSync(p: string, enc: string): string; export function existsSync(p: string): boolean; }
