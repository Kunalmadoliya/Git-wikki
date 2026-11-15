import { inngest } from "../index.js";
import { getRepoFiles, parseRepo } from "../../services/github.js";
import { chunkText } from "../../services/chunker.js";
import { upsertDocuments } from "../../services/vectorStore.js";
import {
  getIndexToken,
  updateIndexJob,
} from "../../services/indexJobs.js";

// Max documents per Inngest step — keeps step payloads small and avoids timeouts
const STEP_BATCH_SIZE = 500;

/**
 * Inngest function: "index-repo"
 *
 * Triggered by the event { name: "repo/index", data: { repoUrl, jobId } }.
 *
 * The large file and document arrays stay inside one step. Returning either
 * array from a step would make Inngest serialize it into the next request and
 * can exceed the dev server's request limit.
 */
const indexRepo = inngest.createFunction(
  { id: "index-repo", triggers: [{ event: "repo/index" }] },
  async ({ event, step }) => {
    const { repoUrl, jobId } = event.data;
    const githubToken = getIndexToken(jobId);

    console.log(`Starting indexing for repo: ${repoUrl}`);

    if (!repoUrl) throw new Error("event.data.repoUrl is required");
    if (!jobId) throw new Error("event.data.jobId is required");
    if (!githubToken) {
      updateIndexJob(jobId, {
        status: "failed",
        phase: "failed",
        error: "Indexing job credentials are unavailable",
      });
      throw new Error("Indexing job credentials are unavailable");
    }

    updateIndexJob(jobId, { status: "running", phase: "fetching" });

    try {
      const summary = await step.run("index-repository", async () => {
        const { owner, repo, repoKey } = parseRepo(repoUrl);
        const files = await getRepoFiles(githubToken, owner, repo);
        updateIndexJob(jobId, {
          phase: "chunking",
          filesIndexed: files.length,
        });
        console.log(`Fetched ${files.length} files from repo: ${repoKey}`);

        const documents = await chunkText(files, repoKey);
        updateIndexJob(jobId, {
          phase: "embedding",
          chunksTotal: documents.length,
        });
        console.log(`Chunked ${documents.length} documents from ${files.length} files`);

        let totalUpserted = 0;
        for (let i = 0; i < documents.length; i += STEP_BATCH_SIZE) {
          const batch = documents.slice(i, i + STEP_BATCH_SIZE);
          const result = await upsertDocuments(batch, repoKey);
          totalUpserted += result.upserted;
          updateIndexJob(jobId, {
            phase: "storing",
            chunksUpserted: totalUpserted,
          });
          console.log(`[indexRepo] upserted ${totalUpserted}/${documents.length} chunks`);
        }

        return {
          repoKey,
          filesIndexed: files.length,
          chunksUpserted: totalUpserted,
        };
      });

      updateIndexJob(jobId, {
        status: "completed",
        phase: "completed",
        ...summary,
      });
      return summary;
    } catch (error) {
      updateIndexJob(jobId, {
        status: "failed",
        phase: "failed",
        error: error instanceof Error ? error.message : "Indexing failed",
      });
      throw error;
    }
  }
);

export { indexRepo };
