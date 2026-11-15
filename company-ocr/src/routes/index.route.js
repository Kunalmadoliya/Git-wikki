import { Router } from "express";
import { randomUUID } from "node:crypto";
import { inngest } from "../inngest/index.js";
import { createIndexJob, getIndexJob, publicIndexJob } from "../services/indexJobs.js";
import { createSource, getSource, transitionSource } from "../store/sourceStore.js";
import { parseRepositoryUrl } from "./sources.route.js";

const router = Router();

/**
 * POST /api/index
 * Body: { repoUrl: "https://github.com/owner/repo", githubToken: "ghp_..." }
 *
 * Sends a "repo/index" event to Inngest which triggers the full
 * fetch → chunk → upsert pipeline asynchronously.
 */
router.post("/", async (req, res) => {
  const { repoUrl, githubToken } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }

  const token = githubToken || process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(400).json({ error: "githubToken is required (not provided and GITHUB_TOKEN not set in environment)" });
  }

  const parsed = parseRepositoryUrl(repoUrl);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid GitHub repo URL" });
  }

  const source = createSource({
    sourceId: `src_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    ...parsed,
  });
  const jobId = createIndexJob({
    sourceId: source.sourceId,
    repoKey: parsed.repoKey,
    token,
  });

  try {
    await inngest.send({
      name: "repo/index",
      data: { sourceId: source.sourceId },
    });
  } catch (error) {
    console.error("[index] Failed to dispatch Inngest job:", error);
    transitionSource(source.sourceId, "FAILED", {
      errorCode: "DISPATCH_FAILED",
      errorMessage: "Failed to dispatch indexing job",
      stageDescription: "Failed to dispatch indexing job.",
    });
    return res.status(502).json({ error: "Failed to start repository indexing" });
  }

  return res.status(202).json({
    message: "Indexing queued",
    jobId,
    sourceId: source.sourceId,
    repoKey: parsed.repoKey,
    status: "queued",
  });
});

router.get("/status/:jobId", (req, res) => {
  const job = getIndexJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Indexing job not found" });
  }

  const source = job.sourceId ? getSource(job.sourceId) : null;
  return res.json({ ...publicIndexJob(job), source });
});

export default router;
