(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Elements
  const urlInput = $("#url-input");
  const fetchBtn = $("#fetch-btn");
  const fetchError = $("#fetch-error");
  const videoInfo = $("#video-info");
  const videoInfoText = $("#video-info-text");

  const transcriptSection = $("#transcript-section");
  const rawPreview = $("#raw-preview");
  const segmentCount = $("#segment-count");

  const formatSection = $("#format-section");
  const settingsToggle = $("#settings-toggle");
  const settingsPanel = $("#settings-panel");
  const baseUrlInput = $("#base-url");
  const apiKeyInput = $("#api-key");
  const modelInput = $("#model");
  const toggleKeyBtn = $("#toggle-key");
  const formatBtn = $("#format-btn");
  const formatError = $("#format-error");

  const outputSection = $("#output-section");
  const formattedPreview = $("#formatted-preview");
  const rawEditor = $("#raw-editor");
  const includeTxtToggle = $("#include-txt");
  const downloadBtn = $("#download-btn");

  // State
  let rawTranscript = "";
  let formattedMd = "";
  let currentVideoId = "";

  // --- LocalStorage for LLM creds ---
  function saveCreds() {
    localStorage.setItem("yt-formatter-creds", JSON.stringify({
      baseUrl: baseUrlInput.value,
      apiKey: apiKeyInput.value,
      model: modelInput.value,
    }));
  }

  function loadCreds() {
    try {
      const data = JSON.parse(localStorage.getItem("yt-formatter-creds"));
      if (data) {
        baseUrlInput.value = data.baseUrl || "";
        apiKeyInput.value = data.apiKey || "";
        modelInput.value = data.model || "";
      }
    } catch {}
  }

  [baseUrlInput, apiKeyInput, modelInput].forEach((el) => {
    el.addEventListener("input", saveCreds);
  });

  loadCreds();

  // --- Settings toggle ---
  settingsToggle.addEventListener("click", () => {
    settingsToggle.classList.toggle("open");
    settingsPanel.classList.toggle("hidden");
  });

  // --- Password visibility ---
  toggleKeyBtn.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
  });

  // --- Helpers ---
  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function hideError(el) {
    el.classList.add("hidden");
  }

  function setLoading(btn, loading) {
    const text = btn.querySelector(".btn-text");
    const loader = btn.querySelector(".btn-loader");
    if (loading) {
      btn.disabled = true;
      text.classList.add("hidden");
      loader.classList.remove("hidden");
    } else {
      btn.disabled = false;
      text.classList.remove("hidden");
      loader.classList.add("hidden");
    }
  }

  function renderMarkdown(text) {
    // Simple markdown → HTML for preview
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Unordered lists
    html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    // Paragraphs
    html = html.replace(/\n\n+/g, "</p><p>");
    html = "<p>" + html + "</p>";

    // Clean empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, "");
    html = html.replace(/<p>\s*(<h[1-4]>)/g, "$1");
    html = html.replace(/(<\/h[1-4]>)\s*<\/p>/g, "$1");
    html = html.replace(/<p>\s*(<ul>)/g, "$1");
    html = html.replace(/(<\/ul>)\s*<\/p>/g, "$1");

    return html;
  }

  // --- Tabs ---
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const which = tab.dataset.tab;
      if (which === "preview") {
        formattedPreview.classList.remove("hidden");
        rawEditor.classList.add("hidden");
      } else {
        formattedPreview.classList.add("hidden");
        rawEditor.classList.remove("hidden");
      }
    });
  });

  // --- Raw editor sync ---
  rawEditor.addEventListener("input", () => {
    formattedMd = rawEditor.value;
    formattedPreview.innerHTML = renderMarkdown(formattedMd);
  });

  // --- Fetch transcript ---
  fetchBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      showError(fetchError, "Enter a YouTube URL");
      return;
    }

    hideError(fetchError);
    setLoading(fetchBtn, true);

    try {
      const res = await fetch("/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch transcript");
      }

      rawTranscript = data.text;
      currentVideoId = data.videoId;

      rawPreview.textContent = rawTranscript;
      segmentCount.textContent = `${data.segments} segments`;

      videoInfoText.textContent = `Video ID: ${data.videoId} · ${data.segments} segments · ${rawTranscript.split(/\s+/).length} words`;

      transcriptSection.classList.remove("hidden");
      formatSection.classList.remove("hidden");

      // Check if LLM creds are filled
      updateFormatBtn();
    } catch (err) {
      showError(fetchError, err.message);
    } finally {
      setLoading(fetchBtn, false);
    }
  });

  // Enter key on URL input
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchBtn.click();
  });

  // --- Format with AI ---
  function updateFormatBtn() {
    formatBtn.disabled = !rawTranscript;
  }

  [baseUrlInput, apiKeyInput, modelInput].forEach((el) => {
    el.addEventListener("input", updateFormatBtn);
  });

  formatBtn.addEventListener("click", async () => {
    hideError(formatError);
    setLoading(formatBtn, true);

    try {
      const body = { content: rawTranscript };
      if (baseUrlInput.value.trim()) body.baseUrl = baseUrlInput.value.trim();
      if (apiKeyInput.value.trim()) body.apiKey = apiKeyInput.value.trim();
      if (modelInput.value.trim()) body.model = modelInput.value.trim();

      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Formatting failed");
      }

      formattedMd = data.formatted;
      formattedPreview.innerHTML = renderMarkdown(formattedMd);
      rawEditor.value = formattedMd;

      outputSection.classList.remove("hidden");

      // Switch to preview tab
      $$(".tab").forEach((t) => t.classList.remove("active"));
      $('[data-tab="preview"]').classList.add("active");
      formattedPreview.classList.remove("hidden");
      rawEditor.classList.add("hidden");
    } catch (err) {
      showError(formatError, err.message);
    } finally {
      setLoading(formatBtn, false);
    }
  });

  // --- Download ---
  downloadBtn.addEventListener("click", async () => {
    const content = formattedMd || rawTranscript;
    if (!content) return;

    const includeTxt = includeTxtToggle.checked;
    const filename = currentVideoId
      ? `youtube-${currentVideoId}`
      : "transcript";

    if (includeTxt && formattedMd) {
      // Download zip with both .txt and .md
      try {
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { txt: rawTranscript, md: formattedMd },
            filename,
            format: "zip",
          }),
        });

        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${filename}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (err) {
        showError(formatError, "Download failed: " + err.message);
      }
    } else {
      // Single file
      const format = formattedMd ? "md" : "txt";
      try {
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, filename, format }),
        });

        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${filename}.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (err) {
        showError(formatError, "Download failed: " + err.message);
      }
    }
  });

  // Focus URL input on load
  urlInput.focus();
})();
