import { parseRepo } from "./github.js";
import { similaritySearch } from "./vectorStore.js";
import { ChatOpenAI } from "@langchain/openai";

export const DEFAULT_TOP_K = 5;
export const MAX_TOP_K = 20;
const DEFAULT_MODEL = "gpt-4o-mini";

export class QueryValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "QueryValidationError";
  }
}

/**
 * Validate and normalise a repository query request.
 *
 * The repository URL is required because it maps to the Pinecone namespace
 * created during indexing.
 */
export function prepareQuery({
  repoUrl,
  sourceId,
  namespace,
  query,
  topK = DEFAULT_TOP_K,
} = {}) {
  if (typeof repoUrl !== "string" || !repoUrl.trim()) {
    throw new QueryValidationError("repoUrl is required");
  }

  if (typeof query !== "string" || !query.trim()) {
    throw new QueryValidationError("query is required");
  }

  let parsed;
  try {
    parsed = parseRepo(repoUrl.trim());
  } catch {
    throw new QueryValidationError("Invalid GitHub repo URL");
  }

  if (!parsed.owner || !parsed.repo || !parsed.repoKey) {
    throw new QueryValidationError("Invalid GitHub repo URL");
  }

  const normalisedTopK = Number(topK);
  if (
    !Number.isInteger(normalisedTopK) ||
    normalisedTopK < 1 ||
    normalisedTopK > MAX_TOP_K
  ) {
    throw new QueryValidationError(
      `topK must be an integer between 1 and ${MAX_TOP_K}`,
    );
  }

  return {
    sourceId: sourceId || null,
    repoKey: parsed.repoKey,
    namespace: namespace || parsed.repoKey.replace("/", "-"),
    query: query.trim(),
    topK: normalisedTopK,
  };
}

export async function runRepositoryQuery(input) {
  const prepared = prepareQuery(input);
  const results = await similaritySearch(
    prepared.query,
    prepared.repoKey,
    prepared.topK,
    prepared.namespace,
  );
  const context = results
    .filter((result) => result.text)
    .map(
      (result, index) =>
        `[Source ${index + 1}: ${result.source || "unknown"}]\n${result.text}`,
    )
    .join("\n\n");

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    temperature: 0,
  });
  const response = await model.invoke([
    [
      "system",
      "Answer the user's question using only the repository context provided. " +
        "If the context does not contain enough information, say so clearly. " +
        "Do not invent repository details.",
    ],
    [
      "human",
      `Question:\n${prepared.query}\n\nRepository context:\n${
        context || "No relevant repository context was found."
      }`,
    ],
  ]);

  return {
    ...prepared,
    answer:
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content),
    results: results.map((result) => ({
      content: result.text,
      source: result.source || null,
      score: result.score,
    })),
  };
}
