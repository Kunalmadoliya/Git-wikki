import {Octokit} from "@octokit/rest";

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

// Max individual file size to index (bytes). Files larger than this are skipped.
const MAX_FILE_SIZE = 500_000; // 500 KB

// How many blob fetches to run in parallel. Higher = faster but more API load.
const BLOB_CONCURRENCY = 10;

function shouldSkipFile(path, size) {
  const parts = path.split("/");
  const fileName = parts[parts.length - 1];

  if (parts.some((part) => SKIP_DIRS.includes(part))) return true;
  if (SKIP_FILES.includes(fileName)) return true;
  if (typeof size === "number" && size > MAX_FILE_SIZE) return true;
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

export async function getRepoDetails(token, owner, repo) {
  const octokit = new Octokit({auth: token});
  const {data: repoInfo} = await octokit.rest.repos.get({owner, repo});

  // Empty repositories have no commits yet — git/trees would 404
  if (repoInfo.size === 0) {
    return {
      repoInfo,
      defaultBranch: repoInfo.default_branch,
      commitSha: null,
    };
  }

  const defaultBranch = repoInfo.default_branch;
  const {data: branch} = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: defaultBranch,
  });

  return {
    repoInfo,
    defaultBranch,
    commitSha: branch.commit.sha,
  };
}

export async function getRepoFiles(
  token,
  owner,
  repo,
  {details, onFilesDiscovered, onFilesFetched} = {},
) {
  const octokit = new Octokit({auth: token});
  const repoDetails = details || await getRepoDetails(token, owner, repo);
  const {repoInfo, defaultBranch, commitSha} = repoDetails;

  if (repoInfo.size === 0) {
    console.warn(
      `Repository ${owner}/${repo} is empty (no commits). Nothing to index.`,
    );
    onFilesDiscovered?.(0);
    return [];
  }

  console.log(`Fetching tree for ${owner}/${repo} on branch: ${defaultBranch}`);

  const {data: tree} = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: commitSha || defaultBranch,
    recursive: true,
  });

  const blobs = tree.tree.filter(
    (file) => file.type === "blob" && !shouldSkipFile(file.path, file.size),
  );

  console.log(
    `[github] ${blobs.length} files to fetch (of ${tree.tree.length} total tree entries)`,
  );
  onFilesDiscovered?.(blobs.length);

  const fileArray = [];

  // Fetch blobs in parallel batches to speed up large repos
  for (let i = 0; i < blobs.length; i += BLOB_CONCURRENCY) {
    const batch = blobs.slice(i, i + BLOB_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (file) => {
        const { data: blob } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: file.sha,
        });
        return {
          path: file.path,
          content: Buffer.from(blob.content, "base64").toString("utf-8"),
        };
      }),
    );
    fileArray.push(...results);
    onFilesFetched?.(fileArray.length);
    console.log(`[github] fetched ${Math.min(i + BLOB_CONCURRENCY, blobs.length)}/${blobs.length} files`);
  }

  return fileArray;
}
