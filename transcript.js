import { fetchTranscript as ytFetch } from "youtube-transcript";

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function deduplicateSegments(snippets) {
  const seen = new Set();
  const result = [];

  for (const snippet of snippets) {
    const text = snippet.text.trim();
    if (!text) continue;

    const normalized = text.toLowerCase().replace(/[^\w\s]/g, "");
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(snippet);
    }
  }

  return result;
}

function formatPlainText(snippets) {
  const deduped = deduplicateSegments(snippets);
  return deduped.map((s) => s.text).join("\n");
}

export async function fetchTranscript(url) {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw new Error(
      "Invalid YouTube URL. Expected format: https://www.youtube.com/watch?v=VIDEO_ID"
    );
  }

  let transcript;
  try {
    transcript = await ytFetch(url);
  } catch (err) {
    throw new Error(
      `Failed to fetch transcript. The video may not have English subtitles available.`
    );
  }

  if (!transcript || transcript.length === 0) {
    throw new Error("Transcript is empty.");
  }

  return {
    videoId,
    text: formatPlainText(transcript),
    segments: transcript.length,
  };
}

export { extractVideoId };
