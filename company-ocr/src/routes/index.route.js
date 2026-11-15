import { Router } from "express";
import { inngest } from "../inngest/index.js";
import { parseRepo } from "../services/github.js";

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
  if (!githubToken) {
    return res.status(400).json({ error: "githubToken is required" });
  }

  // Validate the URL is parseable before firing the event
  let parsed;
  try {
    parsed = parseRepo(repoUrl);
    if (!parsed.owner || !parsed.repo) throw new Error("Invalid repo URL");
  } catch {
    return res.status(400).json({ error: "Invalid GitHub repo URL" });
  }

  // Fire-and-forget: Inngest handles the heavy lifting in the background
  await inngest.send({
    name: "repo/index",
    data: { repoUrl, githubToken },
  });

  return res.status(202).json({
    message: "Indexing started",
    repoKey: parsed.repoKey,
  });
});

export default router;
