import { inngest } from "../index.js";
import { getRepoFiles, parseRepo } from "../../services/github.js";
import { chunkText } from "../../services/chunker.js";
import { upsertDocuments } from "../../services/vectorStore.js";

// Max documents per Inngest step — keeps step payloads small and avoids timeouts
const STEP_BATCH_SIZE = 500;

/**
 * Inngest function: "index-repo"
 *
 * Triggered by the event  { name: "repo/index", data: { repoUrl, githubToken } }
 *
 * Steps:
 *  1. fetchFiles        – pull every relevant file from GitHub (parallel batches)
 *  2. chunkFiles        – split content into LangChain Documents
 *  3. upsertVectors-N   – embed + store in Pinecone in STEP_BATCH_SIZE chunks
 */
const indexRepo = inngest.createFunction(
  { id: "index-repo", triggers: [{ event: "repo/index" }] },
  async ({ event, step }) => {
    const { repoUrl, githubToken } = event.data;

    console.log(`Starting indexing for repo: ${repoUrl}`);

    if (!repoUrl) throw new Error("event.data.repoUrl is required");
    if (!githubToken) throw new Error("event.data.githubToken is required");

    // ── Step 1: Parse repo URL & fetch raw files from GitHub ───────────────
    const { repoKey, files } = await step.run("fetch-files", async () => {
      const { owner, repo, repoKey } = parseRepo(repoUrl);
      const files = await getRepoFiles(githubToken, owner, repo);
      console.log(`Fetched ${files.length} files from repo: ${repoKey}`);
      return { repoKey, files };
    });

    // ── Step 2: Chunk files into LangChain Documents ───────────────────────
    const documents = await step.run("chunk-files", () =>
      chunkText(files, repoKey)
    );

    console.log(`Chunked ${documents.length} documents from ${files.length} files`);

    // ── Step 3: Upsert in batched steps so large repos don't time out ──────
    // Each step handles STEP_BATCH_SIZE documents independently,
    // so Inngest can retry individual batches on failure.
    let totalUpserted = 0;
    for (let i = 0; i < documents.length; i += STEP_BATCH_SIZE) {
      const batch = documents.slice(i, i + STEP_BATCH_SIZE);
      const batchIndex = Math.floor(i / STEP_BATCH_SIZE);
      const result = await step.run(`upsert-vectors-batch-${batchIndex}`, () =>
        upsertDocuments(batch, repoKey)
      );
      totalUpserted += result.upserted;
      console.log(`[indexRepo] upserted ${totalUpserted}/${documents.length} chunks`);
    }

    return {
      repoKey,
      filesIndexed: files.length,
      chunksUpserted: totalUpserted,
    };
  }
);

export { indexRepo };
