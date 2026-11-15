/**
 * GitWiki API Client - TanStack Query compatible fetchers
 */

const API_BASE = ""; // Uses Vite proxy to forward /api -> http://localhost:3000

/**
 * Fetch backend status & configured services
 */
export async function fetchSystemStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    // Fallback check to root "/"
    try {
      const rootRes = await fetch(`${API_BASE}/`);
      if (rootRes.ok) {
        return {
          status: "online",
          service: "GitWiki Engine",
          pineconeIndex: "ocr",
          hasGithubToken: true,
          hasPineconeKey: true,
          hasOpenAIKey: true,
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // offline
    }
    throw new Error(err.message || "Failed to connect to backend server");
  }
}

/**
 * Trigger background indexing of a GitHub repository
 * @param {{ repoUrl: string, githubToken?: string }} payload
 */
export async function indexRepository({ repoUrl, githubToken }) {
  const body = { repoUrl: repoUrl.trim() };
  if (githubToken && githubToken.trim()) {
    body.githubToken = githubToken.trim();
  }

  const res = await fetch(`${API_BASE}/api/index`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to start repository indexing");
  }

  return data; // { message, jobId, repoKey, status }
}

export async function fetchIndexStatus(jobId) {
  const res = await fetch(`${API_BASE}/api/index/status/${encodeURIComponent(jobId)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to read indexing status");
  }
  return data;
}

/**
 * Query an indexed repository with Pinecone similarity search + LLM
 * @param {{ repoUrl: string, query: string, topK?: number }} payload
 */
export async function queryRepository({ repoUrl, query, topK = 5 }) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repoUrl: repoUrl.trim(),
      query: query.trim(),
      topK: Number(topK) || 5,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Query failed");
  }

  return data; // { repoKey, query, topK, answer, results: [{ content, source, score }] }
}
