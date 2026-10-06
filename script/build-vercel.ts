// Build script for Vercel deploys.
//
// Vercel's Node function builder only auto-bundles the entry file it finds
// under api/ -- it does not trace relative imports into ../server or
// ../shared, so a plain `api/index.ts` deploy fails at runtime with
// ERR_MODULE_NOT_FOUND. This script bundles api/index.ts (and everything it
// imports: server/routes, server/storage, server/auth, shared/schema) into
// one self-contained file, so Vercel has nothing left to resolve at runtime.
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, mkdir } from "node:fs/promises";

// Native/binary deps that must stay external (esbuild can't bundle native
// bindings, and some packages assume they're loaded via require() from
// node_modules rather than inlined).
const external = ["ws", "@supabase/supabase-js", "postgres", "better-sqlite3"];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });
  await rm("api", { recursive: true, force: true });
  await mkdir("api", { recursive: true });

  console.log("building client...");
  await viteBuild();

  console.log("bundling api function...");
  await esbuild({
    entryPoints: ["server-fn/index.ts"],
    platform: "node",
    format: "esm",
    bundle: true,
    outfile: "api/index.js",
    banner: {
      // esbuild's ESM output needs createRequire for any transitive
      // CommonJS dependency that still does `require(...)` internally.
      js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    external,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
