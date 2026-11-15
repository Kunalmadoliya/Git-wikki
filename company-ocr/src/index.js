import "dotenv/config";
import express from "express";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import indexRouter from "./routes/index.route.js";
import queryRouter from "./routes/query.route.js";

const app = express();
app.use(express.json({ limit: "256kb" }));

// Enable CORS for frontend clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Inngest webhook (handles background jobs)
app.use("/api/inngest", serve({ client: inngest, functions }));

// REST API routes
app.use("/api/index", indexRouter);
app.use("/api/query", queryRouter);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "company-ocr API is running" });
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    service: "GitWiki Semantic Knowledge Engine",
    pineconeIndex: process.env.PINECONE_INDEX || "ocr",
    hasGithubToken: Boolean(process.env.GITHUB_TOKEN),
    hasPineconeKey: Boolean(process.env.PINECONE_API_KEY),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});