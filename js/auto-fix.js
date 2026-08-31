/* ThuChi Auto Fix client - only reports runtime errors to your own backend. */
(function () {
  const AUTO_FIX_ENDPOINT = localStorage.getItem("THUCHI_AUTOFIX_ENDPOINT") || "http://localhost:8787/api/auto-fix";
  let sending = false;

  function toast(message) {
    if (typeof window.showToast === "function") return window.showToast(message);
    console.warn("[AutoFix]", message);
  }

  function snippetFor(filename, line) {
    try {
      const known = ["app.js", "home.js", "statistics.js", "statistics-premium.js", "history.js", "restaurant.js", "cod.js", "enhancements.js"];
      if (!filename || !known.some(x => String(filename).includes(x))) return [];
      return [];
    } catch { return []; }
  }

  async function report(payload) {
    if (sending) return;
    sending = true;
    try {
      const response = await fetch(AUTO_FIX_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (result.ok && result.result) {
        const r = result.result;
        toast(r.fixed ? `🤖 Đã phân tích lỗi: ${r.reason || "Có bản sửa đề xuất."}` : `🤖 AI chưa đủ dữ liệu để tự sửa: ${r.reason || "hãy xem console."}`);
        window.dispatchEvent(new CustomEvent("thuchi:autofix-result", { detail: result }));
      }
    } catch (e) {
      console.warn("[AutoFix] Không kết nối được server:", e);
    } finally {
      sending = false;
    }
  }

  window.addEventListener("error", function (event) {
    report({
      error: event.message || "Unknown error",
      source: event.filename || "",
      line: event.lineno || null,
      column: event.colno || null,
      stack: event.error?.stack || "",
      snippets: snippetFor(event.filename, event.lineno)
    });
  });

  window.addEventListener("unhandledrejection", function (event) {
    const reason = event.reason;
    report({
      error: reason?.message || String(reason || "Unhandled promise rejection"),
      source: "",
      line: null,
      column: null,
      stack: reason?.stack || "",
      snippets: []
    });
  });

  window.setAutoFixEndpoint = function (url) {
    localStorage.setItem("THUCHI_AUTOFIX_ENDPOINT", String(url || "").trim());
  };
})();
