import express from "express";
import * as archiver from "archiver";
import { fetchTranscript } from "./transcript.js";
import { formatWithLLM } from "./formatter.js";

const app = express();
const PORT = 3002;

app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

app.post("/api/fetch", async (req, res) => {
  try {
    const { url, lang = "en" } = req.body;

    if (!url) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    const result = await fetchTranscript(url, lang);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/format", async (req, res) => {
  try {
    const { content, baseUrl, apiKey, model } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const overrides = {};
    if (baseUrl) overrides.baseUrl = baseUrl;
    if (apiKey) overrides.apiKey = apiKey;
    if (model) overrides.model = model;

    const formatted = await formatWithLLM(content, overrides);
    res.json({ formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/download", async (req, res) => {
  try {
    const { content, filename, format = "md" } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const safeName = (filename || "transcript")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 80);

    if (format === "zip") {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}.zip"`
      );

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);
      archive.append(content.txt || "", { name: `${safeName}.txt` });
      archive.append(content.md || "", { name: `${safeName}.md` });
      await archive.finalize();
      return;
    }

    const ext = format === "txt" ? "txt" : "md";
    const mime = format === "txt" ? "text/plain" : "text/markdown";

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.${ext}"`
    );
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
