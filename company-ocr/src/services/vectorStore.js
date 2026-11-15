import "dotenv/config";
import {createHash} from "node:crypto";
import {OpenAIEmbeddings} from "@langchain/openai";
import {PineconeStore} from "@langchain/pinecone";

import {Pinecone as PineconeClient} from "@pinecone-database/pinecone";

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: "text-embedding-3-large",
});

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY,
});

const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX ?? "ocr");

/**
 * Upsert LangChain Document chunks into Pinecone, namespaced by repo.
 * Each vector id is a SHA-256 hash of (repoKey + chunk content) so
 * re-indexing the same file is idempotent.
 *
 * @param {import("@langchain/core/documents").Document[]} documents
 * @param {string} repoKey  e.g. "owner/repo"
 */
// Pinecone recommends ≤ 100 vectors per upsert batch
const UPSERT_BATCH_SIZE = 100;

export async function upsertDocuments(documents, repoKey) {
  if (!documents.length) {
    console.warn(`[upsertDocuments] No documents to upsert for ${repoKey}. Skipping.`);
    return { upserted: 0, namespace: repoKey.replace("/", "-") };
  }

  // Namespace per repo so different repos don't collide
  const namespace = repoKey.replace("/", "-");

  // Assign stable, deterministic ids so re-runs are idempotent
  const ids = documents.map((doc) =>
    createHash("sha256")
      .update(`${repoKey}:${doc.pageContent}`)
      .digest("hex")
      .slice(0, 64), // Pinecone id max length
  );

  const vectorStore = new PineconeStore(embeddings, {
    pineconeIndex,
    namespace,
  });

  // Upsert in batches to avoid Pinecone payload limits on large repos
  let upserted = 0;
  for (let i = 0; i < documents.length; i += UPSERT_BATCH_SIZE) {
    const docBatch = documents.slice(i, i + UPSERT_BATCH_SIZE);
    const idBatch = ids.slice(i, i + UPSERT_BATCH_SIZE);
    await vectorStore.addDocuments(docBatch, { ids: idBatch });
    upserted += docBatch.length;
    console.log(`[vectorStore] upserted ${upserted}/${documents.length} chunks`);
  }

  return { upserted, namespace };
}

/**
 * Run a similarity search against a repo namespace.
 *
 * @param {string} query        Natural-language question
 * @param {string} repoKey      e.g. "owner/repo"
 * @param {number} [topK=5]     Number of results to return
 * @returns {Promise<import("@langchain/core/documents").Document[]>}
 */
export async function similaritySearch(query, repoKey, topK = 5) {
  const namespace = repoKey.replace("/", "-");

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace,
  });

  return vectorStore.similaritySearch(query, topK);
}
