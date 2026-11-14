import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters"

export async function chunkText(files , repo , chunkSize = 1000, chunkOverlap = 200) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const documents = []

  for (const file of files) {
    const chunk = await textSplitter.createDocuments([file.content], {metadata: {source: `${repo}/${file.path}`}});
    documents.push(...chunk);
  }

  return documents;
}