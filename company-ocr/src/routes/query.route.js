import { Router } from "express";
import {
  QueryValidationError,
  prepareQuery,
  runRepositoryQuery,
} from "../services/query.js";
import { getLatestIndexJob } from "../services/indexJobs.js";

const router = Router();

/**
 * POST /api/query
 * Body: { repoUrl: "https://github.com/owner/repo", query: "...", topK?: number }
 *
 * repoUrl selects the Pinecone namespace populated by /api/index.
 */
router.post("/", async (req, res) => {
  try {
    const prepared = prepareQuery(req.body);
    const indexJob = getLatestIndexJob(prepared.repoKey);
    if (!indexJob || indexJob.status !== "completed") {
      return res.status(409).json({
        error: "Repository is not ready for querying",
        repoKey: prepared.repoKey,
        indexingStatus: indexJob?.status || "not_indexed",
        phase: indexJob?.phase || "unknown",
      });
    }

    const result = await runRepositoryQuery(req.body);

    return res.json(result);
  } catch (error) {
    if (error instanceof QueryValidationError) {
      return res.status(400).json({ error: error.message });
    }

    console.error("[query] Failed to search repository:", error);
    return res.status(500).json({ error: "Failed to query repository" });
  }
});

export default router;
