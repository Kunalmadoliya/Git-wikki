import { ChatOpenAI } from "@langchain/openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function extractText(files) {
  const selected = files.filter(({path}) =>
    /(^|\/)(readme|package\.json)$/i.test(path),
  );
  return selected
    .slice(0, 4)
    .map(({path, content}) => `FILE: ${path}\n${content.slice(0, 12_000)}`)
    .join("\n\n");
}

export async function generateRepositorySummary(files) {
  const sourceText = extractText(files);
  if (!sourceText) return null;

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: MODEL,
    temperature: 0,
  });
  const response = await model.invoke([
    [
      "system",
      "Return only valid JSON with keys overview, primaryLanguages, and suggestedQueries. " +
        "overview must be exactly three concise sentences. " +
        "primaryLanguages and suggestedQueries must each contain exactly three strings.",
    ],
    [
      "human",
      `Summarize this repository using only these files:\n\n${sourceText}`,
    ],
  ]);
  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  const json = content.replace(/^```json\s*|\s*```$/g, "").trim();
  const summary = JSON.parse(json);

  if (
    typeof summary.overview !== "string" ||
    !Array.isArray(summary.primaryLanguages) ||
    !Array.isArray(summary.suggestedQueries)
  ) {
    throw new Error("Summary response did not match the expected shape");
  }
  return {
    overview: summary.overview,
    primaryLanguages: summary.primaryLanguages.slice(0, 3),
    suggestedQueries: summary.suggestedQueries.slice(0, 3),
  };
}
