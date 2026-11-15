import { Router } from "express";
import { inngest } from "../inngest/index.js";
import { parseRepo } from "../services/github.js";
import {
  createIndexJob,
  getIndexJob,
  publicIndexJob,
  updateIndexJob,
} from "../services/indexJobs.js";

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

  // Validate the URL is parseable before firing the event
  let parsed;
  try {
    parsed = parseRepo(repoUrl);
    if (!parsed.owner || !parsed.repo) throw new Error("Invalid repo URL");
  } catch {
    return res.status(400).json({ error: "Invalid GitHub repo URL" });
  }

  const jobId = createIndexJob({ repoKey: parsed.repoKey, token });

  try {
    await inngest.send({
      name: "repo/index",
      data: { repoUrl: repoUrl.trim(), jobId },
    });
  } catch (error) {
    console.error("[index] Failed to dispatch Inngest job:", error);
    updateIndexJob(jobId, {
      status: "failed",
      phase: "failed",
      error: "Failed to dispatch indexing job",
    });
    return res.status(502).json({ error: "Failed to start repository indexing" });
  }

  return res.status(202).json({
    message: "Indexing queued",
    jobId,
    repoKey: parsed.repoKey,
    status: "queued",
  });
});

router.get("/status/:jobId", (req, res) => {
  const job = getIndexJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Indexing job not found" });
  }

  return res.json(publicIndexJob(job));
});

export default router;
