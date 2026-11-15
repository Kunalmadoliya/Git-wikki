import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { publishUpdate } from "../services/telemetryHub.js";

const dataDirectory = path.resolve(process.cwd(), "data");
const databasePath =
  process.env.GITWIKI_DB_PATH || path.join(dataDirectory, "gitwiki.db");
const TERMINAL_STAGES = new Set(["READY", "FAILED", "CANCELLED"]);
const STAGE_PROGRESS = {
  SUBMITTED: { percentage: 0, currentStep: 0 },
  VALIDATING: { percentage: 5, currentStep: 1 },
  VERIFYING: { percentage: 95, currentStep: 5 },
  READY: { percentage: 100, currentStep: 5 },
};
let database;

function now() {
  return new Date().toISOString();
}

function deriveProgress(row) {
  if (STAGE_PROGRESS[row.stage]) return STAGE_PROGRESS[row.stage];

  if (row.stage === "FETCHING") {
    const ratio = row.filesCount
      ? Math.min(row.filesProcessed / row.filesCount, 1)
      : 0;
    return { percentage: Math.round(10 + ratio * 30), currentStep: 2 };
  }

  if (row.stage === "PARSING_CHUNKING") {
    const ratio = row.filesCount
      ? Math.min(row.filesProcessed / row.filesCount, 1)
      : 0;
    return { percentage: Math.round(40 + ratio * 20), currentStep: 3 };
  }

  if (row.stage === "EMBEDDING_UPSERTING") {
    const ratio = row.chunksCount
      ? Math.min(row.chunksUpserted / row.chunksCount, 1)
      : 0;
    return { percentage: Math.round(60 + ratio * 35), currentStep: 4 };
  }

  return {
    percentage: row.stageProgress,
    currentStep: row.currentStep,
  };
}

function toApiSource(row) {
  if (!row) return null;

  const summary = row.summary ? JSON.parse(row.summary) : null;
  const derivedProgress = deriveProgress(row);
  const error = row.errorCode || row.errorMessage
    ? {
        code: row.errorCode,
        message: row.errorMessage,
        stage: row.stage,
      }
    : null;

  return {
    sourceId: row.sourceId,
    repoUrl: row.repoUrl,
    repoKey: row.repoKey,
    namespace: row.namespace,
    stage: row.stage,
    isReady: row.stage === "READY",
    progress: {
      percentage: derivedProgress.percentage,
      currentStep: derivedProgress.currentStep,
      totalSteps: 5,
      stageDescription: row.stageDescription,
      filesCount: row.filesCount,
      filesProcessed: row.filesProcessed,
      chunksCount: row.chunksCount,
      chunksUpserted: row.chunksUpserted,
    },
    summary,
    error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function requireDatabase() {
  if (!database) {
    throw new Error("Source store has not been initialized");
  }
  return database;
}

export function initSourceStore() {
  if (database) return;

  fs.mkdirSync(dataDirectory, { recursive: true });
  database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      sourceId TEXT PRIMARY KEY,
      repoUrl TEXT NOT NULL,
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      repoKey TEXT NOT NULL,
      namespace TEXT NOT NULL,
      stage TEXT NOT NULL,
      stageProgress INTEGER NOT NULL DEFAULT 0,
      currentStep INTEGER NOT NULL DEFAULT 0,
      stageDescription TEXT NOT NULL,
      filesCount INTEGER NOT NULL DEFAULT 0,
      filesProcessed INTEGER NOT NULL DEFAULT 0,
      chunksCount INTEGER NOT NULL DEFAULT 0,
      chunksUpserted INTEGER NOT NULL DEFAULT 0,
      errorCode TEXT,
      errorMessage TEXT,
      summary TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sources_repo_key
      ON sources (repoKey, createdAt DESC);
  `);

  const restartMessage = "Server restarted during processing. Click Retry to re-index.";
  const staleSources = database
    .prepare(
      `SELECT sourceId FROM sources
       WHERE stage NOT IN ('READY', 'FAILED', 'CANCELLED')`,
    )
    .all();

  for (const source of staleSources) {
    transitionSource(source.sourceId, "FAILED", {
      stage: "FAILED",
      stageProgress: 0,
      stageDescription: restartMessage,
      errorCode: "SERVER_RESTARTED",
      errorMessage: restartMessage,
    });
  }

}

export function deleteSource(sourceId) {
  requireDatabase()
    .prepare("DELETE FROM sources WHERE sourceId = ?")
    .run(sourceId);
}

export function closeSourceStore() {
  database?.close();
  database = undefined;
}

export function createSource({
  sourceId,
  repoUrl,
  owner,
  repo,
  repoKey,
  namespace,
}) {
  const timestamp = now();
  requireDatabase()
    .prepare(
      `INSERT INTO sources (
        sourceId, repoUrl, owner, repo, repoKey, namespace, stage,
        stageProgress, currentStep, stageDescription, createdAt, updatedAt
      ) VALUES (
        @sourceId, @repoUrl, @owner, @repo, @repoKey, @namespace, 'SUBMITTED',
        0, 0, 'Repository accepted and queued for indexing.', @createdAt, @updatedAt
      )`,
    )
    .run({
      sourceId,
      repoUrl,
      owner,
      repo,
      repoKey,
      namespace,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

  return getSource(sourceId);
}

export function getSource(sourceId) {
  return toApiSource(getSourceRecord(sourceId));
}

export function getSourceRecord(sourceId) {
  return requireDatabase()
    .prepare("SELECT * FROM sources WHERE sourceId = ?")
    .get(sourceId);
}

export function listSources() {
  return requireDatabase()
    .prepare("SELECT * FROM sources ORDER BY updatedAt DESC")
    .all()
    .map(toApiSource);
}

export function findLatestSourceByRepoKey(repoKey) {
  const row = requireDatabase()
    .prepare(
      "SELECT * FROM sources WHERE repoKey = ? ORDER BY createdAt DESC LIMIT 1",
    )
    .get(repoKey);
  return toApiSource(row);
}

export function updateSource(sourceId, updates, options = {}) {
  const current = requireDatabase()
    .prepare("SELECT stage FROM sources WHERE sourceId = ?")
    .get(sourceId);
  if (!current) return null;
  if ("stage" in updates && !options.internal) {
    throw new Error("Status changes must use transitionSource");
  }
  if (TERMINAL_STAGES.has(current.stage) && !options.allowTerminalUpdate) {
    throw new Error(
      `Cannot update terminal source ${sourceId} in ${current.stage}`,
    );
  }

  const allowedFields = new Set([
    "stage",
    "stageProgress",
    "currentStep",
    "stageDescription",
    "filesCount",
    "filesProcessed",
    "chunksCount",
    "chunksUpserted",
    "errorCode",
    "errorMessage",
    "summary",
  ]);
  const changes = Object.entries(updates).filter(([key]) =>
    allowedFields.has(key),
  );
  if (changes.length === 0) return getSource(sourceId);

  const values = Object.fromEntries(changes);
  if (values.summary && typeof values.summary !== "string") {
    values.summary = JSON.stringify(values.summary);
  }
  values.sourceId = sourceId;
  values.updatedAt = now();
  const assignments = changes
    .map(([key]) => `${key} = @${key}`)
    .concat("updatedAt = @updatedAt")
    .join(", ");

  requireDatabase()
    .prepare(`UPDATE sources SET ${assignments} WHERE sourceId = @sourceId`)
    .run(values);

  const source = getSource(sourceId);
  if (source) publishUpdate(sourceId, source);
  return source;
}

export function transitionSource(sourceId, stage, updates = {}, options = {}) {
  const current = requireDatabase()
    .prepare("SELECT stage FROM sources WHERE sourceId = ?")
    .get(sourceId);
  if (!current) return null;

  if (
    TERMINAL_STAGES.has(current.stage) &&
    !options.allowTerminalTransition
  ) {
    throw new Error(
      `Cannot transition terminal source ${sourceId} from ${current.stage}`,
    );
  }

  return updateSource(sourceId, {
    ...updates,
    stage,
  }, { internal: true });
}

export function resetSourceForRetry(sourceId) {
  return transitionSource(sourceId, "SUBMITTED", {
    stageProgress: 0,
    currentStep: 0,
    stageDescription: "Retry accepted and queued for indexing.",
    filesCount: 0,
    filesProcessed: 0,
    chunksCount: 0,
    chunksUpserted: 0,
    errorCode: null,
    errorMessage: null,
    summary: null,
  }, { allowTerminalTransition: true });
}

export function cancelSource(sourceId) {
  return transitionSource(sourceId, "CANCELLED", {
    stageDescription: "Indexing cancelled by the user.",
    errorCode: "CANCELLED_BY_USER",
    errorMessage: "Indexing was cancelled by the user.",
  });
}

