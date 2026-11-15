import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters"

export async function chunkText(
  files,
  repo,
  chunkSize = 2000,
  chunkOverlap = 400,
  onFileProcessed,
) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const documents = []

  for (const [fileIndex, file] of files.entries()) {
    // Skip files with no content — createDocuments('') returns 0 chunks
    // which causes Pinecone to throw "Must pass in at least 1 record"
    if (!file.content || file.content.trim().length === 0) {
      console.log(`[chunker] skipping empty file: ${file.path}`);
      onFileProcessed?.(fileIndex + 1, documents.length);
      continue;
    }

    const chunk = await textSplitter.createDocuments([file.content], [{source: `${repo}/${file.path}`}]);
    
    // Extra safety: skip if splitter returned nothing
    if (chunk.length === 0) {
      console.log(`[chunker] no chunks produced for: ${file.path}`);
      onFileProcessed?.(fileIndex + 1, documents.length);
      continue;
    }

    documents.push(...chunk);
    onFileProcessed?.(fileIndex + 1, documents.length);
  }

  console.log(`[chunker] produced ${documents.length} chunks from ${files.length} files`);
  return documents;
}
