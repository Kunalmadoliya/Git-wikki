import { randomUUID } from "node:crypto";

const jobs = new Map();

export function createIndexJob({ repoKey, token }) {
  const jobId = randomUUID();
  jobs.set(jobId, {
    jobId,
    repoKey,
    token,
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

export function getLatestIndexJob(repoKey) {
  return [...jobs.values()]
    .filter((job) => job.repoKey === repoKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function getIndexToken(jobId) {
  return jobs.get(jobId)?.token;
}

export function updateIndexJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (!job) return;

  Object.assign(job, updates, { updatedAt: new Date().toISOString() });
}

export function publicIndexJob(job) {
  if (!job) return null;
  const { token, ...safeJob } = job;
  return safeJob;
}
