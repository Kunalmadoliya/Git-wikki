import "dotenv/config";
import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/index.js";
import { functions } from "./inngest/index.js";

const app = express();
app.use(express.json());

app.use("/api/inngest", serve({ client: inngest, functions }));


app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port http://localhost:${process.env.PORT || 3000}`);
})