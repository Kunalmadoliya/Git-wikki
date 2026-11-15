/**
 * GitWiki API Client - TanStack Query compatible fetchers
 */

const API_BASE = ""; // Uses Vite proxy to forward /api -> http://localhost:3000

/**
 * Fetch backend status & configured services
 */
export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) {
    throw new Error(`Server returned ${res.status}: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchSources() {
  const res = await fetch(`${API_BASE}/api/sources`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load repository sources");
  }
  return data.sources || [];
}

export async function createSource({ repoUrl, githubToken }) {
  const body = { repoUrl: repoUrl.trim() };
  if (githubToken?.trim()) body.githubToken = githubToken.trim();

  const res = await fetch(`${API_BASE}/api/sources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to start repository indexing");
  }
  return data;
}

export async function fetchSourceStatus(sourceId) {
  const res = await fetch(`${API_BASE}/api/sources/${encodeURIComponent(sourceId)}/status`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to read source status");
  }
  return data;
}

export async function retrySource(sourceId, githubToken) {
  const body = githubToken?.trim() ? { githubToken: githubToken.trim() } : {};
  const res = await fetch(`${API_BASE}/api/sources/${encodeURIComponent(sourceId)}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to retry indexing");
  return data;
}

export async function deleteSource(sourceId) {
  const res = await fetch(`${API_BASE}/api/sources/${encodeURIComponent(sourceId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Failed to delete source");
  }
}

export async function queryRepository({ sourceId, query }) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceId,
      query: query.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Query failed");
  }

  return data;
}
