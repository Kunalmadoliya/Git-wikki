import "dotenv/config";
import { createHash } from "node:crypto";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY,
});
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX ?? "ocr");
const UPSERT_BATCH_SIZE = 96;

export async function upsertDocuments(
  documents,
  repoKey,
  namespace = repoKey.replace("/", "-"),
) {
  if (!documents.length) {
    return { upserted: 0, namespace };
  }

  const records = documents.map((document) => ({
    _id: createHash("sha256")
      .update(`${repoKey}:${document.pageContent}`)
      .digest("hex")
      .slice(0, 64),
    chunk_text: document.pageContent,
    source: document.metadata?.source ?? "",
    repo: repoKey,
  }));
  const scopedIndex = pineconeIndex.namespace(namespace);
  let upserted = 0;

  for (let index = 0; index < records.length; index += UPSERT_BATCH_SIZE) {
    const batch = records.slice(index, index + UPSERT_BATCH_SIZE);
    const response = await scopedIndex.upsertDocuments({ documents: batch });
    upserted += response.upsertedCount ?? batch.length;
  }

  return { upserted, namespace };
}

export async function similaritySearch(
  query,
  repoKey,
  topK = 5,
  namespace = repoKey.replace("/", "-"),
) {
  const response = await pineconeIndex.namespace(namespace).searchDocuments({
    scoreBy: [{ type: "embed", field: "chunk_text", query }],
    topK,
    includeFields: ["chunk_text", "source", "repo"],
  });

  return (response.matches || []).map((match) => ({
    text: match.chunk_text ?? match.fields?.chunk_text ?? "",
    source: match.source ?? match.fields?.source ?? "",
    score: match._score,
  }));
}

export async function verifyNamespace(namespace) {
  const stats = await pineconeIndex.describeIndexStats();
  const namespaceStats = stats.namespaces?.[namespace];
  return Boolean(namespaceStats && namespaceStats.recordCount > 0);
}

export async function deleteNamespace(namespace) {
  await pineconeIndex.namespace(namespace).documents.delete({ deleteAll: true });
}
