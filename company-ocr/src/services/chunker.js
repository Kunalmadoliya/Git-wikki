import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters"

export async function chunkText(files , repo , chunkSize = 2000, chunkOverlap = 400) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const documents = []

  for (const file of files) {
    // Skip files with no content — createDocuments('') returns 0 chunks
    // which causes Pinecone to throw "Must pass in at least 1 record"
    if (!file.content || file.content.trim().length === 0) {
      console.log(`[chunker] skipping empty file: ${file.path}`);
      continue;
    }

    const chunk = await textSplitter.createDocuments([file.content], [{source: `${repo}/${file.path}`}]);
    
    // Extra safety: skip if splitter returned nothing
    if (chunk.length === 0) {
      console.log(`[chunker] no chunks produced for: ${file.path}`);
      continue;
    }

    documents.push(...chunk);
  }

  console.log(`[chunker] produced ${documents.length} chunks from ${files.length} files`);
  return documents;
}
