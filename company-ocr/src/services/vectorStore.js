import "dotenv/config";
import { createHash } from "node:crypto";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

/**
 * NOTE: The Pinecone index uses a "document schema" (integrated inference).
 * Pinecone embeds text server-side, so we do NOT need OpenAI embeddings for
 * indexing. All writes go through the Documents API (/documents/upsert).
 * Reads go through searchDocuments().
 */

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY,
});

const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX ?? "ocr");

// Pinecone Documents API batch limit
const UPSERT_BATCH_SIZE = 96;

/**
 * Upsert text chunks into a document-schema Pinecone index.
 * Pinecone handles embedding server-side.
 *
 * @param {import("@langchain/core/documents").Document[]} documents
 * @param {string} repoKey  e.g. "owner/repo"
 */
export async function upsertDocuments(documents, repoKey) {
  if (!documents.length) {
    console.warn(`[upsertDocuments] No documents to upsert for ${repoKey}. Skipping.`);
    return { upserted: 0, namespace: repoKey.replace("/", "-") };
  }

  const namespace = repoKey.replace("/", "-");

  console.log(`[vectorStore] upserting ${documents.length} chunks for ${repoKey} into namespace: ${namespace}`);

  // Build document records — id + text field + metadata
  // The "text" field name must match the field your Pinecone index schema uses for embedding
  const docRecords = documents.map((doc) => ({
    _id: createHash("sha256")
      .update(`${repoKey}:${doc.pageContent}`)
      .digest("hex")
      .slice(0, 64),
    chunk_text: doc.pageContent,  // must match the index schema's embed field name
    source: doc.metadata?.source ?? "",
    repo: repoKey,
  }));

  const ns = pineconeIndex.namespace(namespace);

  let upserted = 0;
  for (let i = 0; i < docRecords.length; i += UPSERT_BATCH_SIZE) {
    const batch = docRecords.slice(i, i + UPSERT_BATCH_SIZE);
    await ns.upsertDocuments({ documents: batch });
    upserted += batch.length;
    console.log(`[vectorStore] upserted ${upserted}/${docRecords.length} chunks`);
  }

  return { upserted, namespace };
}

/**
 * Run a similarity search against a document-schema Pinecone index.
 *
 * @param {string} query        Natural-language question
 * @param {string} repoKey      e.g. "owner/repo"
 * @param {number} [topK=5]     Number of results to return
 * @returns {Promise<Array<{text: string, source: string, score: number}>>}
 */
export async function similaritySearch(query, repoKey, topK = 5) {
  const namespace = repoKey.replace("/", "-");
  const ns = pineconeIndex.namespace(namespace);

  const results = await ns.searchDocuments({
    scoreBy: [{ type: "embed", field: "chunk_text", query }],
    topK,
    includeFields: ["chunk_text", "source", "repo"],
  });

  // Normalise into a simple array for downstream use
  return results.matches.map((hit) => ({
    text: hit.chunk_text ?? hit.fields?.chunk_text ?? "",
    source: hit.source ?? hit.fields?.source ?? "",
    score: hit._score,
  }));
}
