import { randomUUID } from "node:crypto";

const jobs = new Map();
const tokensBySourceId = new Map();

export function createIndexJob({ sourceId, repoKey, token }) {
  const jobId = randomUUID();
  if (sourceId && token) {
    tokensBySourceId.set(sourceId, token);
  }
  jobs.set(jobId, {
    jobId,
    sourceId,
    repoKey,
    status: "queued",
    phase: "queued",
    filesIndexed: 0,
    chunksUpserted: 0,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return jobId;
}

export function getIndexJob(jobId) {
  return jobs.get(jobId);
}

export function getIndexJobBySourceId(sourceId) {
  return [...jobs.values()].find((job) => job.sourceId === sourceId);
}

export function getLatestIndexJob(repoKey) {
  return [...jobs.values()]
    .filter((job) => job.repoKey === repoKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function getIndexToken(sourceId) {
  return tokensBySourceId.get(sourceId) || process.env.GITHUB_TOKEN;
}

export function removeIndexToken(sourceId) {
  tokensBySourceId.delete(sourceId);
}

export function updateIndexJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (!job) return;

  Object.assign(job, updates, { updatedAt: new Date().toISOString() });
}

export function publicIndexJob(job) {
  if (!job) return null;
  return { ...job };
}
