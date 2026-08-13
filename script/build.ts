import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { access, rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Bundle autocontenido para Netlify Functions (sin node_modules en Lambda)
  console.log("building netlify api bundle...");
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/netlify-api.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    packages: "bundle",
    external: ["bufferutil", "utf-8-validate", "pg-native", "cpu-features"],
    logLevel: "info",
  });

  for (const file of ["dist/public/index.html", "dist/netlify-api.cjs"]) {
    await access(file);
  }
  console.log("build ok: dist/public + dist/netlify-api.cjs");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
