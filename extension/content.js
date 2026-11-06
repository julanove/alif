(() => {
  const POPUP_ID = "avdict-popup-root";
  const MAX_SELECTION_LENGTH = 80;
  const MAX_SPEAK_LENGTH = 200;
  const MAX_TRANSLATE_LENGTH = 4500;
  const TRANSLATE_DELAY_MS = 350;
  const SITE_URL = "https://your-api-domain.example";
  const API_URL = `${SITE_URL}/api`;
  const DICTIONARY = typeof AVDICT_DATA !== "undefined" ? AVDICT_DATA : [];
  const ARABIC_RE = /[؀-ۿ]/;
  const SPEAKER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
  const WORD_CHAR_RE = /[\p{L}\p{M}\p{N}]/u;
  let justOpenedPopup = false;
  function normalize(text) {
    if (!text) return "";
    return text.toLowerCase().replace(ARABIC_DIACRITICS, "").trim();
  }
  function fold(text) {
    return text.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
  }
  const MAX_LOCAL_RESULTS = 20;
  function matchRank(entry, q, stem) {
    const ar = fold(normalize(entry.ar));
    const vi = normalize(entry.vi);
    const head = ar.split(/[\[(:،–]/)[0].trim();
    if (head === q || head === stem) return 0;
    if (vi.split(/[,;]/).some((meaning) => meaning.trim() === q)) return 0;
    if (ar.startsWith(q) || vi.startsWith(q)) return 1;
    if (ar.includes(q) || vi.includes(q)) return 2;
    return stem && ar.startsWith(stem) ? 2 : null;
  }
  function searchLocal(query) {
    const q = fold(normalize(query));
    if (!q) return [];
    const stem = /^ال[ء-ي]{2,}$/.test(q) ? q.slice(2) : null;
    const matches = [];
    for (const entry of DICTIONARY) {
      const rank = matchRank(entry, q, stem);
      if (rank !== null) matches.push({ entry, rank });
    }
    return matches.sort((a, b) => a.rank - b.rank || (a.entry.vi ?? "").length - (b.entry.vi ?? "").length).slice(0, MAX_LOCAL_RESULTS).map((m) => m.entry);
  }
  function hasLetters(text) {
    return /[\p{L}]/u.test(text);
  }
  function isSpeakable(text) {
    return ARABIC_RE.test(text) && text.length <= MAX_SPEAK_LENGTH;
  }
  let playingButton = null;
  function send(message) {
    try {
      return chrome.runtime.sendMessage(message).catch(() => ({ ok: false }));
    } catch {
      return Promise.resolve({ ok: false });
    }
  }
  function setPlaying(button) {
    playingButton?.classList.remove("avdict-speak--playing");
    playingButton = button;
    button?.classList.add("avdict-speak--playing");
  }
  function speakFrom(button) {
    if (button === playingButton) {
      send({ type: "avdict:stop" });
      setPlaying(null);
      return;
    }
    setPlaying(button);
    button.classList.remove("avdict-speak--error");
    send({ type: "avdict:play", url: button.dataset.src }).then((result) => {
      if (playingButton !== button) return;
      setPlaying(null);
      if (!result?.ok) button.classList.add("avdict-speak--error");
    });
  }
  function speakButton(src, title) {
    return `<button type="button" class="avdict-speak" data-src="${src}" title="${title}" aria-label="${title}">${SPEAKER_ICON}</button>`;
  }
  function getCaretRangeFromPoint(x, y) {
    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(x, y);
    }
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (!pos || !pos.offsetNode) return null;
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      return range;
    }
    return null;
  }
  function expandToWord(caretRange) {
    const node = caretRange.startContainer;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    const text = node.textContent;
    let start = caretRange.startOffset;
    let end = caretRange.startOffset;
    while (start > 0 && WORD_CHAR_RE.test(text[start - 1])) start--;
    while (end < text.length && WORD_CHAR_RE.test(text[end])) end++;
    if (start === end) return null;
    const wordRange = document.createRange();
    wordRange.setStart(node, start);
    wordRange.setEnd(node, end);
    return wordRange;
  }
  function removePopup() {
    const existing = document.getElementById(POPUP_ID);
    if (existing) existing.remove();
    if (playingButton) {
      send({ type: "avdict:stop" });
      setPlaying(null);
    }
  }
  function buildPopup(rect, state) {
    removePopup();
    const popup = document.createElement("div");
    popup.id = POPUP_ID;
    popup.className = "avdict-popup";
    popup.innerHTML = renderContent(state);
    popup.addEventListener("click", (event) => {
      const speaker = event.target.closest(".avdict-speak");
      if (speaker) {
        speakFrom(speaker);
        return;
      }
      if (event.target.closest(".avdict-popup__translate-btn")) {
        requestTranslation(popup, state.query);
        return;
      }
      const item = event.target.closest(".avdict-popup__item");
      if (!item || event.target.closest("a, button") || window.getSelection().toString()) return;
      window.open(item.dataset.href, "_blank", "noopener,noreferrer");
    });
    const closeBtn = document.createElement("button");
    closeBtn.className = "avdict-popup__close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", removePopup);
    popup.appendChild(closeBtn);
    document.body.appendChild(popup);
    popup.avdictAnchor = { left: rect.left, top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY };
    placePopup(popup);
    return popup;
  }
  function placePopup(popup) {
    const MARGIN = 8;
    const MIN_ROOM = 100;
    const rect = popup.avdictAnchor;
    const selectionTop = rect.top - window.scrollY;
    const selectionBottom = rect.bottom - window.scrollY;
    const roomBelow = window.innerHeight - selectionBottom - MARGIN * 2;
    const roomAbove = selectionTop - MARGIN * 2;
    popup.style.maxHeight = "";
    const { width, height: fullHeight } = popup.getBoundingClientRect();
    const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - width - MARGIN));
    let top;
    if (Math.max(roomBelow, roomAbove) < MIN_ROOM) {
      top = Math.max(MARGIN, Math.min(selectionBottom + MARGIN, window.innerHeight - fullHeight - MARGIN));
    } else {
      const useBelow = roomBelow >= fullHeight || roomBelow >= roomAbove;
      const room = useBelow ? roomBelow : roomAbove;
      const height = Math.min(fullHeight, room);
      popup.style.maxHeight = `${room}px`;
      top = useBelow ? selectionBottom + MARGIN : selectionTop - height - MARGIN;
    }
    popup.style.left = `${window.scrollX + left}px`;
    popup.style.top = `${window.scrollY + top}px`;
  }
  function renderTranslation(state) {
    const cut = state.query.length > MAX_TRANSLATE_LENGTH;
    const note = cut ? `<div class="avdict-popup__note">Chỉ dịch ${MAX_TRANSLATE_LENGTH} ký tự đầu tiên.</div>` : "";
    if (state.status === "offer") {
      return `<button type="button" class="avdict-popup__translate-btn">Dịch sang tiếng Ả Rập</button>`;
    }
    if (state.status === "loading") {
      return `<div class="avdict-popup__status">Đang dịch...</div>`;
    }
    if (state.status === "failed") {
      const google = `https://translate.google.com/?sl=auto&tl=${ARABIC_RE.test(state.query) ? "vi" : "ar"}&op=translate&text=${encodeURIComponent(
        state.query.slice(0, 2e3)
      )}`;
      return `<div class="avdict-popup__status">Chưa dịch được lúc này.</div>
        <button type="button" class="avdict-popup__translate-btn">Thử lại</button>
        <a class="avdict-popup__link" href="${google}" target="_blank" rel="noopener noreferrer">Mở Google Dịch →</a>`;
    }
    const toArabic = state.target === "ar";
    const speaker = toArabic && isSpeakable(state.translation) ? speakButton(`${API_URL}/tts/text/${encodeURIComponent(state.translation)}`, "Nghe bản dịch") : "";
    return `<div class="avdict-popup__label">Bản dịch tự động</div>
      <div class="avdict-popup__translated-row">
        ${speaker}
        <div class="avdict-popup__translated" dir="${toArabic ? "rtl" : "ltr"}">${escapeHtml(state.translation)}</div>
      </div>${note}`;
  }
  function showTranslation(popup, state) {
    const slot = popup.querySelector(".avdict-popup__translation");
    if (!slot) return;
    slot.innerHTML = renderTranslation({ ...state, query: popup.dataset.query });
    placePopup(popup);
  }
  async function requestTranslation(popup, query) {
    popup.dataset.query = query;
    showTranslation(popup, { status: "loading" });
    await new Promise((resolve) => setTimeout(resolve, TRANSLATE_DELAY_MS));
    if (!popup.isConnected) return;
    const result = await send({ type: "avdict:translate", text: query.slice(0, MAX_TRANSLATE_LENGTH) });
    if (!popup.isConnected) return;
    if (result?.ok) showTranslation(popup, { status: "done", translation: result.translation, target: result.target });
    else showTranslation(popup, { status: "failed" });
  }
  function renderContent(state) {
    const selection = isSpeakable(state.query) ? `<div class="avdict-popup__selection">
          ${speakButton(`${API_URL}/tts/text/${encodeURIComponent(state.query)}`, "Nghe đoạn đã chọn")}
          <div class="avdict-popup__selection-text" dir="rtl">${escapeHtml(state.query)}</div>
        </div>` : "";
    const translation = state.translate ? `<div class="avdict-popup__translation"></div>` : "";
    const items = state.results.slice(0, 4).map(
      (w) => `
        <div class="avdict-popup__item" data-href="${SITE_URL}/#/word/${encodeURIComponent(w.slug || w.id)}">
          <div class="avdict-popup__head">
            ${speakButton(`${API_URL}/tts/word/${encodeURIComponent(w.id)}`, "Nghe phát âm")}
            <div class="avdict-popup__ar" dir="rtl">${escapeHtml(w.ar)}</div>
          </div>
          <div class="avdict-popup__vi">${w.vi ? escapeHtml(w.vi) : "(mục tham chiếu)"}</div>
          <a class="avdict-popup__link" href="${SITE_URL}/#/word/${encodeURIComponent(w.slug || w.id)}" target="_blank" rel="noopener noreferrer">Xem chi tiết →</a>
        </div>`
    ).join("");
    return `${selection}${translation}${items ? `<div class="avdict-popup__list">${items}</div>` : ""}`;
  }
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function lookupRange(range) {
    const text = range.toString().replace(/\s+/g, " ").trim();
    if (!hasLetters(text)) return false;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const results = text.length <= MAX_SELECTION_LENGTH ? searchLocal(text) : [];
    const translate = results.length === 0 || /\s/.test(text);
    const popup = buildPopup(rect, { results, query: text, translate });
    if (translate) {
      popup.dataset.query = text;
      if (ARABIC_RE.test(text)) requestTranslation(popup, text);
      else showTranslation(popup, { status: "offer" });
    }
    return true;
  }
  function handleMouseUp(event) {
    const openPopup = document.getElementById(POPUP_ID);
    if (openPopup && openPopup.contains(event.target)) return;
    if (event.target.closest?.("input, textarea, select") || event.target.isContentEditable) return;
    if (event.detail === 2) {
      const caretRange = getCaretRangeFromPoint(event.clientX, event.clientY);
      const wordRange = caretRange && expandToWord(caretRange);
      if (wordRange) {
        const selection2 = window.getSelection();
        selection2.removeAllRanges();
        selection2.addRange(wordRange);
        justOpenedPopup = lookupRange(wordRange);
        return;
      }
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    justOpenedPopup = lookupRange(selection.getRangeAt(0));
  }
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("click", (event) => {
    if (justOpenedPopup) {
      justOpenedPopup = false;
      return;
    }
    const popup = document.getElementById(POPUP_ID);
    if (popup && !event.composedPath().includes(popup)) removePopup();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") removePopup();
  });
})();
