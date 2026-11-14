import { createHash } from "node:crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";


const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
const pinecone = new Pinecone({ apiKey: process.env.PINCONE_DB, environment: "us-east1-gcp" });


function getIndex(namespace) {
   const indexName = process.env.PINECONE_INDEX;
   if (!indexName) {
     throw new Error("PINECONE_INDEX environment variable is not set");
   }

   if (!namespace) {
     throw new Error("PINECONE_NAMESPACE environment variable is not set");
   }

   return pinecone.Index(indexName).namespace(namespace);
} 