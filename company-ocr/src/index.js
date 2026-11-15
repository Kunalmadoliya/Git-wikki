import "dotenv/config";
import express from "express";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import indexRouter from "./routes/index.route.js";
import queryRouter from "./routes/query.route.js";

const app = express();
app.use(express.json());

// Inngest webhook (handles background jobs)
app.use("/api/inngest", serve({ client: inngest, functions }));

// REST API routes
app.use("/api/index", indexRouter);
app.use("/api/query", queryRouter);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "company-ocr API is running" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});