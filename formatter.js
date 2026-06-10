import OpenAI from "openai";
import config from "./config.js";

const SYSTEM_PROMPT = `You are an expert document formatter. You receive a raw YouTube video transcript — a continuous stream of spoken text without any formatting.

Your task: restructure this transcript into a clean, well-organized Markdown document.

CONTENT-AWARE FORMATTING RULES:

1. ANALYZE the transcript's content first. Identify the major topics, themes, and logical sections the speaker covers.

2. CREATE HEADING HIERARCHY based on what the content is actually about:
   - Use H1 (\`#\`) for the overall video topic/title
   - Use H2 (\`##\`) for major topic shifts or sections the speaker covers
   - Use H3 (\`###\`) for subtopics within those sections
   - Headings must reflect the actual content — not generic labels

3. GROUP related sentences into paragraphs. Each paragraph should cover one idea or point.

4. USE LISTS when the speaker enumerates items, gives steps, or lists examples.

5. PRESERVE all original text exactly as spoken. Do not rewrite, paraphrase, add, or remove any content.

6. FIX transcription artifacts:
   - Remove repeated filler words ("um", "uh", "like", "you know") when they interrupt flow
   - Merge broken sentences that were split by the transcript API
   - Remove timestamp markers if present

7. OUTPUT: Return ONLY the formatted Markdown. No preamble, no explanation, no wrapper.

8. The headings and structure must be INFORMED BY THE CONTENT. If the video is about cooking pasta, the headings should be about pasta steps — not generic "Section 1", "Introduction", etc.`;

function resolveCredentials(overrides = {}) {
  if (overrides.baseUrl && overrides.apiKey && overrides.model) {
    return overrides;
  }

  const endpoint = config.endpoints[config.defaultEndpoint];
  if (!endpoint) {
    throw new Error(
      `Unknown endpoint "${config.defaultEndpoint}" — check config.js`
    );
  }

  return {
    baseUrl: overrides.baseUrl || endpoint.baseUrl,
    apiKey: overrides.apiKey || endpoint.apiKey,
    model: overrides.model || endpoint.model,
  };
}

export async function formatWithLLM(content, overrides = {}) {
  const { baseUrl, apiKey, model } = resolveCredentials(overrides);

  const client = new OpenAI({
    baseURL: baseUrl,
    apiKey: apiKey,
  });

  const response = await client.chat.completions.create({
    model: model,
    max_tokens: 8192,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: content },
    ],
  });

  return response.choices[0].message.content;
}
