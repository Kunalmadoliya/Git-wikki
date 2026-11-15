import { inngest } from "../client.js";
import { runRepositoryQuery } from "../../services/query.js";

/**
 * Triggered by:
 * {
 *   name: "repo/query",
 *   data: { repoUrl, query, topK? }
 * }
 *
 * The result is returned to Inngest and can be consumed by an Inngest
 * workflow or webhook caller. The HTTP endpoint uses the same service
 * directly so callers receive search results without waiting for a job.
 *
 */
const queryRepo = inngest.createFunction(
  { id: "query-repo", triggers: [{ event: "repo/query" }] },
  async ({ event, step }) => {
    const { repoUrl, query, topK } = event.data ?? {};

    return step.run("search-repository", () =>
      runRepositoryQuery({ repoUrl, query, topK }),
    );
  },
);

export { queryRepo };
