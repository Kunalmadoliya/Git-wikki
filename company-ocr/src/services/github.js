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

//this function is used to parse the repo url and return the owner and repo name
//for example, if the input is "https://github.com/owner/repo", it will return {owner: "owner", repo: "repo" , repoKey: "owner/repo"}

export function parseRepo(input) {
  const clean = input
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(/\.git$/, "");

  const [owner, repo] = clean.split("/");
  return {owner, repo, repoKey: `${owner}/${repo}`};
}

export async function getRepoFiles(token, owner, repo) {
  const octokit = new Octokit({auth: token});

  const {data: files} = await octokit.rest.repos
    .get({
      owner,
      repo,
    })
    .catch((error) => {
      console.error(`Error fetching repo ${owner}/${repo}:`, error);
      return {data: []};
    });

  const {data: tree} = await octokit.rest.git.getTree({
    owner,
    repo,
    sha: files.default_branch,
    recursive: true,
  });

  const fileArray = [];

  for (const file of tree.tree) {
    if (file.type !== "blob") {
      continue;
    }
    if (shouldSkipFile(file.path, file.size)) {
      continue;
    }

    const {data : blob} = await octokit.rest.git.getBlob({
      owner,
      repo,
      file_sha: file.sha,
    });
    fileArray.push({path: file.path, content: Buffer.from(blob.content, "base64").toString("utf-8")});

    if (fileArray.length >= 200) {
      break;
    }
  }
  return fileArray;
}
