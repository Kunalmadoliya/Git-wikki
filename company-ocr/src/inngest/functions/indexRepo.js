import { inngest } from "../index.js";
import { NonRetriableError } from "inngest";
import { getRepoDetails, getRepoFiles } from "../../services/github.js";
import { chunkText } from "../../services/chunker.js";
import {
  deleteNamespace,
  upsertDocuments,
  verifyNamespace,
} from "../../services/vectorStore.js";
import { generateRepositorySummary } from "../../services/summaryService.js";
import {
  getIndexToken,
  getIndexJobBySourceId,
  removeIndexToken,
  updateIndexJob,
} from "../../services/indexJobs.js";
import {
  getSourceRecord,
  transitionSource,
  updateSource,
} from "../../store/sourceStore.js";

const STEP_BATCH_SIZE = 500;
const MAX_ATTEMPTS = 4;

function isTerminal(source) {
  return !source || ["READY", "FAILED", "CANCELLED"].includes(source.stage);
}

function isCancelled(sourceId) {
  const source = getSourceRecord(sourceId);
  return !source || source.stage === "CANCELLED";
}

function pipelineError(code, message, { nonRetryable = false, stage } = {}) {
  const error = nonRetryable
    ? new NonRetriableError(`[${code}] ${message}`)
    : new Error(`[${code}] ${message}`);
  error.code = code;
  error.stage = stage;
  return error;
}

function retryDescription(sourceId) {
  const source = getSourceRecord(sourceId);
  const match = source?.stageDescription?.match(/attempt (\d+)\/\d+/);
  const attempt = match ? Math.min(Number(match[1]) + 1, MAX_ATTEMPTS) : 2;
  return `Retrying (attempt ${attempt}/${MAX_ATTEMPTS})`;
}

function errorCode(error) {
  return (
    error?.code ||
    error?.message?.match(/^\[([A-Z0-9_]+)\]/)?.[1] ||
    "INDEXING_FAILED"
  );
}

function errorMessage(error) {
  return error?.message?.replace(/^\[[A-Z0-9_]+\]\s*/, "") || "Indexing failed.";
}

async function verifyWithRetry(namespace) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await verifyNamespace(namespace)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
}

async function markFailed({ event, error }) {
  const sourceId =
    event?.data?.sourceId || event?.data?.event?.data?.sourceId;
  if (!sourceId) return;

  const source = getSourceRecord(sourceId);
  if (!source || ["READY", "FAILED", "CANCELLED"].includes(source.stage)) {
    return;
  }

  try {
    transitionSource(sourceId, "FAILED", {
      stageDescription: `Indexing failed: ${errorMessage(error)}`,
      errorCode: errorCode(error),
      errorMessage: errorMessage(error),
    });
    removeIndexToken(sourceId);
  } catch (transitionError) {
    console.error("[indexRepo] Failed to persist terminal failure:", transitionError);
  }
}

const indexRepo = inngest.createFunction(
  {
    id: "index-repo",
    triggers: [{ event: "repo/index" }],
    retries: 3,
    cancelOn: [
      {
        event: "repo/index.cancel",
        match: "data.sourceId",
      },
    ],
    onFailure: markFailed,
  },
  async ({ event, step }) => {
    const { sourceId } = event.data ?? {};
    const source = getSourceRecord(sourceId);
    if (!sourceId || !source) {
      throw new NonRetriableError("Source record is unavailable");
    }
    if (isTerminal(source)) return { skipped: true, stage: source.stage };

    const token = getIndexToken(sourceId);
    if (!token) {
      throw pipelineError(
        "AUTH_REQUIRED",
        "A GitHub token is required to index this repository.",
        { nonRetryable: true, stage: "VALIDATING" },
      );
    }

    const job = getIndexJobBySourceId(sourceId);
    updateIndexJob(job?.jobId, { status: "running", phase: "validating" });

    try {
      const result = await step.run("index-repository", async () => {
        if (isCancelled(sourceId)) return { cancelled: true };

        transitionSource(sourceId, "VALIDATING", {
          stageDescription: "Validating repository access and resolving branch.",
        });
        let details;
        try {
          details = await getRepoDetails(token, source.owner, source.repo);
        } catch (error) {
          const status = error?.status;
          if (status === 404 || status === 401) {
            throw pipelineError(
              "REPO_NOT_FOUND_OR_PRIVATE",
              "Repository was not found or is private.",
              { nonRetryable: true, stage: "VALIDATING" },
            );
          }
          if (status === 403) {
            throw pipelineError(
              "RATE_LIMITED",
              "GitHub denied the request, possibly because of rate limiting.",
              { nonRetryable: true, stage: "VALIDATING" },
            );
          }
          throw error;
        }
        if (isCancelled(sourceId)) return { cancelled: true };

        transitionSource(sourceId, "FETCHING", {
          stageDescription: "Fetching repository files from GitHub.",
          filesCount: 0,
          filesProcessed: 0,
        });
        const files = await getRepoFiles(token, source.owner, source.repo, {
          details,
          onFilesDiscovered: (filesCount) => {
            if (!isCancelled(sourceId)) {
              updateSource(sourceId, {
                filesCount,
                filesProcessed: 0,
                stageDescription: `Fetching files 0/${filesCount}.`,
              });
            }
          },
          onFilesFetched: (filesProcessed) => {
            if (!isCancelled(sourceId)) {
              updateSource(sourceId, {
                filesProcessed,
                stageDescription: `Fetching files ${filesProcessed}/${getSourceRecord(sourceId)?.filesCount || filesProcessed}.`,
              });
            }
          },
        });
        if (isCancelled(sourceId)) return { cancelled: true };

        transitionSource(sourceId, "PARSING_CHUNKING", {
          stageDescription: "Splitting files into semantic chunks.",
          filesCount: files.length,
          filesProcessed: 0,
          chunksCount: 0,
        });
        const documents = await chunkText(
          files,
          source.repoKey,
          2000,
          400,
          (filesProcessed, chunksCount) => {
            if (!isCancelled(sourceId)) {
              updateSource(sourceId, {
                filesProcessed,
                chunksCount,
                stageDescription: `Chunking files ${filesProcessed}/${files.length}.`,
              });
            }
          },
        );
        if (!documents.length) {
          throw pipelineError(
            "NO_INDEXABLE_FILES",
            "No non-empty indexable files were found.",
            { nonRetryable: true, stage: "PARSING_CHUNKING" },
          );
        }
        if (isCancelled(sourceId)) return { cancelled: true };

        transitionSource(sourceId, "EMBEDDING_UPSERTING", {
          stageDescription: "Embedding and upserting chunks into Pinecone.",
          chunksCount: documents.length,
          chunksUpserted: 0,
        });
        let chunksUpserted = 0;
        for (let i = 0; i < documents.length; i += STEP_BATCH_SIZE) {
          if (isCancelled(sourceId)) return { cancelled: true };
          const batch = documents.slice(i, i + STEP_BATCH_SIZE);
          const batchResult = await upsertDocuments(
            batch,
            source.repoKey,
            source.namespace,
          );
          chunksUpserted += batchResult.upserted;
          updateSource(sourceId, {
            chunksUpserted,
            stageDescription: `Upserting chunks ${chunksUpserted}/${documents.length}.`,
          });
        }
        if (isCancelled(sourceId)) return { cancelled: true };

        transitionSource(sourceId, "VERIFYING", {
          stageDescription: "Verifying Pinecone namespace...",
          chunksCount: documents.length,
          chunksUpserted,
        });
        if (!(await verifyWithRetry(source.namespace))) {
          throw pipelineError(
            "INDEX_NOT_QUERYABLE",
            "Pinecone namespace was not queryable after upsert.",
            { stage: "VERIFYING" },
          );
        }
        if (isCancelled(sourceId)) return { cancelled: true };

        transitionSource(sourceId, "READY", {
          stageDescription: "Repository indexed and ready to query.",
          filesCount: files.length,
          filesProcessed: files.length,
          chunksCount: documents.length,
          chunksUpserted,
        });

        try {
          const summary = await generateRepositorySummary(files);
          if (summary && getSourceRecord(sourceId)?.stage === "READY") {
            updateSource(sourceId, { summary }, { allowTerminalUpdate: true });
          }
        } catch (summaryError) {
          console.error("[indexRepo] Summary generation failed:", summaryError);
        }

        return {
          repoKey: source.repoKey,
          namespace: source.namespace,
          filesIndexed: files.length,
          chunksUpserted,
        };
      });

      if (result.cancelled) {
        updateIndexJob(job?.jobId, { status: "cancelled", phase: "cancelled" });
        removeIndexToken(sourceId);
        return result;
      }

      updateIndexJob(job?.jobId, {
        status: "completed",
        phase: "completed",
        ...result,
      });
      removeIndexToken(sourceId);
      return result;
    } catch (error) {
      const current = getSourceRecord(sourceId);
      if (!current || current.stage === "CANCELLED") {
        updateIndexJob(job?.jobId, { status: "cancelled", phase: "cancelled" });
        removeIndexToken(sourceId);
        return { cancelled: true };
      }

      updateSource(sourceId, {
        stageDescription: retryDescription(sourceId),
      });
      updateIndexJob(job?.jobId, {
        status: "retrying",
        phase: current.stage.toLowerCase(),
        error: errorMessage(error),
      });
      throw error;
    }
  },
);

export { indexRepo };
