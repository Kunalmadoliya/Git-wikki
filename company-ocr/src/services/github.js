import {Octokit} from "@octokit/rest";

const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});

const SKIP_DIRS = [
  // Dependencies
  "node_modules",
  "bower_components",
  "vendor",

  // Version control
  ".git",
  ".svn",
  ".hg",

  // Build outputs
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  ".vercel",
  ".netlify",
  "coverage",

  // Caches
  ".cache",
  ".turbo",
  ".parcel-cache",
  ".vite",
  ".webpack",
  ".eslintcache",

  // IDEs and editors
  ".idea",
  ".vscode",

  // Framework-specific
  ".angular",
  ".svelte-kit",
  ".astro",
  ".expo",

  // Temporary
  "tmp",
  "temp",
  "logs",
];

const SKIP_FILES = [
  // Package lock files
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "composer.lock",
  "Gemfile.lock",
  "Cargo.lock",
  "poetry.lock",

  // OS files
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",

  // Environment and secrets
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",

  // Logs
  "npm-debug.log",
  "yarn-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",

  // IDE files
  ".project",
  ".classpath",

  // Temporary files
  "*.tmp",
  "*.bak",
  "*.swp",
  "*.log",
];

function shouldSkipFile(path, size) {
  const parts = path.split("/");
  const fileName = parts[parts.length - 1];

  if (parts.some((part) => SKIP_DIRS.includes(part))) return true;
  if (SKIP_FILES.has(fileName)) return true;
  if (typeof size === "number" && size > 200_000) return true;

  if (fileName.endsWith(".min.js")) return true;

  return false;
}

export function parseRepo(input) {
  const clean = input
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(/\.git$/, "");

  const [owner, repo] = clean.split("/");
  return {owner, repo, repoKey: `${owner}/${repo}`};
}
 