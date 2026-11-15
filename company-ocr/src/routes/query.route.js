import { Router } from "express";
import {
  QueryValidationError,
  prepareQuery,
  runRepositoryQuery,
} from "../services/query.js";
import {
  findLatestSourceByRepoKey,
  getSource,
} from "../store/sourceStore.js";

const router = Router();

/**
 * POST /api/query
 * Body: { sourceId: "src_...", query: "...", topK?: number }
 *
 * repoUrl selects the Pinecone namespace populated by /api/index.
 */
router.post("/", async (req, res) => {
  try {
    let source;
    if (typeof req.body?.sourceId === "string" && req.body.sourceId.trim()) {
      source = getSource(req.body.sourceId.trim());
    } else if (typeof req.body?.repoUrl === "string") {
      console.warn(
        "[query] repoUrl is deprecated; use sourceId from POST /api/sources",
      );
      const preparedLegacy = prepareQuery(req.body);
      source = findLatestSourceByRepoKey(preparedLegacy.repoKey);
    }

    if (!source) {
      return res.status(404).json({
        code: "SOURCE_NOT_FOUND",
        stage: "UNKNOWN",
        message: "The requested repository source does not exist.",
      });
    }
    if (source.stage !== "READY") {
      return res.status(409).json({
        code: "SOURCE_NOT_READY",
        stage: source.stage,
        message: `Source is not ready for querying; current stage is ${source.stage}.`,
      });
    }

    const result = await runRepositoryQuery({
      ...req.body,
      sourceId: source.sourceId,
      repoUrl: source.repoUrl,
      namespace: source.namespace,
    });

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
