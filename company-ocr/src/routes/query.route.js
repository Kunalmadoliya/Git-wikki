import { Router } from "express";
import { similaritySearch } from "../services/vectorStore.js";
import { parseRepo } from "../services/github.js";

const router = Router();

/**
 * POST /api/query
 * Body: { repoUrl: "https://github.com/owner/repo", query: "...", topK?: number }
 *
 * Returns the most relevant code/document chunks for the given query.
 */
router.post("/", async (req, res) => {
  const { repoUrl, query, topK = 5 } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  let repoKey;
  try {
    ({ repoKey } = parseRepo(repoUrl));
    if (!repoKey) throw new Error("Invalid repo URL");
  } catch {
    return res.status(400).json({ error: "Invalid GitHub repo URL" });
  }

  const results = await similaritySearch(query.trim(), repoKey, Number(topK));

  return res.json({
    repoKey,
    query: query.trim(),
    results: results.map((doc) => ({
      content: doc.pageContent,
      source: doc.metadata?.source ?? null,
    })),
  });
});

export default router;
