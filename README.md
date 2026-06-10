# YT Subtitle Formatter

Download YouTube transcripts and format them into clean, structured Markdown using AI.

## Run

```bash
npm install
npm start
```

Opens at `http://localhost:3002`

## What it does

1. Paste a YouTube URL
2. Fetches the English transcript (auto-deduplicated, artifacts cleaned)
3. Optionally formats with any OpenAI-compatible LLM (headings, subheadings, lists placed by content topic)
4. Download as `.txt`, `.md`, or both as `.zip`

## LLM Setup

Credentials are baked into `config.js` — formatting works out of the box with no setup.

To change provider, edit `config.js`:

```js
export default {
  defaultEndpoint: "openrouter",
  endpoints: {
    openrouter: {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-or-...",
      model: "google/gemma-4-31b-it:free",
    },
  },
};
```

Works with any OpenAI-compatible provider:
- **OpenRouter** — `https://openrouter.ai/api/v1`
- **GitHub Models** — `https://models.inference.ai.azure.com`
- **Ollama** — `http://localhost:11434/v1`
- **LM Studio** — `http://localhost:1234/v1`
- **OpenAI** — `https://api.openai.com/v1`

The web UI also has an optional LLM Settings panel to override credentials per-session (saved to localStorage).

## API

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/fetch` | `{ url }` → raw transcript text |
| `POST` | `/api/format` | `{ content }` → formatted markdown (uses config.js). Optional overrides: `{ content, baseUrl, apiKey, model }` |
| `POST` | `/api/download` | `{ content, filename, format }` → file download |
| `GET`  | `/api/health` | Health check |

## command_center integration

Registers as a `download_youtube_subtitles` tool. LLM credentials come from config.js automatically.

```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "md"
}
```

Optional overrides: `formatWithLLM: false`, `format: "txt"|"zip"|"raw"`.

The tool auto-spawns the subtitle server if it's not running.

## Dependencies

- `youtube-transcript` — pure JS, no yt-dlp binary needed
- `openai` — universal OpenAI-compatible client
- `express` — backend
- `archiver` — zip downloads
