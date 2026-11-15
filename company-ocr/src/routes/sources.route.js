import { Router } from "express";
import { randomUUID } from "node:crypto";
import { inngest } from "../inngest/index.js";
import { createIndexJob } from "../services/indexJobs.js";
import { subscribe } from "../services/telemetryHub.js";
import {
  cancelSource,
  createSource,
  findLatestSourceByRepoKey,
  getSource,
  listSources,
  resetSourceForRetry,
  updateSource,
} from "../store/sourceStore.js";

const router = Router();
const REPO_URL_PATTERN =
  /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/;

function parseRepositoryUrl(repoUrl) {
  if (typeof repoUrl !== "string") return null;
  const match = repoUrl.trim().match(REPO_URL_PATTERN);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2];
  const repoKey = `${owner}/${repo}`;
  return {
    owner,
    repo,
    repoKey,
    repoUrl: `https://github.com/${owner}/${repo}`,
    // Namespace is intentionally distinct from the legacy "owner-repo" form.
    namespace: `${owner}__${repo}`.toLowerCase(),
  };
}

function sendSourceError(res, status, code, stage, message) {
  return res.status(status).json({ code, stage, message });
}

async function dispatchIndex(source, token) {
  // Tokens stay in the process-local index job map; Inngest receives only IDs,
  // avoiding SQLite persistence and event/log exposure at the cost of retry
  // credentials being lost if this process restarts.
  const jobId = createIndexJob({
    repoKey: source.repoKey,
    token,
  });
  await inngest.send({
    name: "repo/index",
    data: {
      repoUrl: source.repoUrl,
      jobId,
      sourceId: source.sourceId,
    },
  });
}

router.post("/", async (req, res) => {
  const parsed = parseRepositoryUrl(req.body?.repoUrl);
  if (!parsed) {
    return sendSourceError(
      res,
      400,
      "INVALID_REPOSITORY_URL",
      "SUBMITTED",
      "Invalid GitHub repository URL",
    );
  }

  const existing = findLatestSourceByRepoKey(parsed.repoKey);
  if (
    existing &&
    !req.body?.force &&
    !["FAILED", "CANCELLED"].includes(existing.stage)
  ) {
    return res.status(200).json({ status: "EXISTS", ...existing });
  }

  const source = createSource({
    sourceId: `src_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    ...parsed,
  });
  const token = req.body?.githubToken || process.env.GITHUB_TOKEN;

  if (!token) {
    updateSource(source.sourceId, {
      stage: "FAILED",
      stageDescription: "A GitHub token is required to index this repository.",
      errorCode: "AUTH_REQUIRED",
      errorMessage: "Provide a GitHub token or configure GITHUB_TOKEN.",
    });
    return sendSourceError(
      res,
      400,
      "AUTH_REQUIRED",
      "SUBMITTED",
      "Provide a GitHub token or configure GITHUB_TOKEN.",
    );
  }

  try {
    await dispatchIndex(source, token);
  } catch (error) {
    console.error("[sources] Failed to dispatch indexing job:", error);
    updateSource(source.sourceId, {
      stage: "FAILED",
      stageDescription: "Could not dispatch the indexing worker.",
      errorCode: "DISPATCH_FAILED",
      errorMessage: "Could not dispatch the indexing worker.",
    });
    return sendSourceError(
      res,
      502,
      "DISPATCH_FAILED",
      "SUBMITTED",
      "Could not dispatch the indexing worker.",
    );
  }

  return res.status(201).json(source);
});

router.get("/", (_req, res) => res.json({ sources: listSources() }));

router.get("/:sourceId/status", (req, res) => {
  const source = getSource(req.params.sourceId);
  if (!source) {
    return sendSourceError(
      res,
      404,
      "SOURCE_NOT_FOUND",
      "UNKNOWN",
      "Source was not found.",
    );
  }
  return res.json(source);
});

router.get("/:sourceId/events", (req, res) => {
  const source = getSource(req.params.sourceId);
  if (!source) {
    return sendSourceError(
      res,
      404,
      "SOURCE_NOT_FOUND",
      "UNKNOWN",
      "Source was not found.",
    );
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(`event: source.updated\ndata: ${JSON.stringify(source)}\n\n`);

  if (["READY", "FAILED", "CANCELLED"].includes(source.stage)) {
    return res.end();
  }

  const unsubscribe = subscribe(req.params.sourceId, res);
  req.on("close", unsubscribe);
});

router.get("/:sourceId", (req, res) => {
  const source = getSource(req.params.sourceId);
  if (!source) {
    return sendSourceError(
      res,
      404,
      "SOURCE_NOT_FOUND",
      "UNKNOWN",
      "Source was not found.",
    );
  }
  return res.json(source);
});

router.post("/:sourceId/retry", async (req, res) => {
  const source = getSource(req.params.sourceId);
  if (!source) {
    return sendSourceError(
      res,
      404,
      "SOURCE_NOT_FOUND",
      "UNKNOWN",
      "Source was not found.",
    );
  }
  if (!["FAILED", "CANCELLED"].includes(source.stage)) {
    return sendSourceError(
      res,
      409,
      "SOURCE_NOT_RETRYABLE",
      source.stage,
      "Only failed or cancelled sources can be retried.",
    );
  }

  const retried = resetSourceForRetry(source.sourceId);
  const token = req.body?.githubToken || process.env.GITHUB_TOKEN;
  if (!token) {
    updateSource(source.sourceId, {
      stage: "FAILED",
      stageDescription: "A GitHub token is required to retry this repository.",
      errorCode: "AUTH_REQUIRED",
      errorMessage: "Provide a GitHub token or configure GITHUB_TOKEN.",
    });
    return sendSourceError(
      res,
      400,
      "AUTH_REQUIRED",
      "SUBMITTED",
      "Provide a GitHub token or configure GITHUB_TOKEN.",
    );
  }

  try {
    await dispatchIndex(retried, token);
  } catch (error) {
    console.error("[sources] Failed to dispatch retry:", error);
    updateSource(source.sourceId, {
      stage: "FAILED",
      stageDescription: "Could not dispatch the retry worker.",
      errorCode: "DISPATCH_FAILED",
      errorMessage: "Could not dispatch the retry worker.",
    });
    return sendSourceError(
      res,
      502,
      "DISPATCH_FAILED",
      "SUBMITTED",
      "Could not dispatch the retry worker.",
    );
  }

  return res.status(202).json(retried);
});

router.post("/:sourceId/cancel", (req, res) => {
  const source = getSource(req.params.sourceId);
  if (!source) {
    return sendSourceError(
      res,
      404,
      "SOURCE_NOT_FOUND",
      "UNKNOWN",
      "Source was not found.",
    );
  }
  if (["READY", "FAILED", "CANCELLED"].includes(source.stage)) {
    return sendSourceError(
      res,
      409,
      "SOURCE_NOT_CANCELLABLE",
      source.stage,
      "Only an active source can be cancelled.",
    );
  }
  return res.json(cancelSource(source.sourceId));
});

router.delete("/:sourceId", (req, res) => {
  const source = getSource(req.params.sourceId);
  if (!source) {
    return sendSourceError(
      res,
      404,
      "SOURCE_NOT_FOUND",
      "UNKNOWN",
      "Source was not found.",
    );
  }
  return res.json(cancelSource(source.sourceId));
});

export { parseRepositoryUrl };
export default router;
