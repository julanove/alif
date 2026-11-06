const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
export function normalizeArabic(text) {
  return text.replace(DIACRITICS, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[^ء-ي\s]/g, " ").replace(/\s+/g, " ").trim();
}
function tokenize(text) {
  return text.split(/\s+/).map((original) => ({ original, norm: normalizeArabic(original) })).filter((t) => t.norm);
}
function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length];
}
export function similarity(a, b) {
  if (!a && !b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
const WORD_MATCH = 0.75;
function alignWords(target, heard) {
  const n = target.length;
  const m = heard.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = similarity(target[i].norm, heard[j].norm) >= WORD_MATCH ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (similarity(target[i].norm, heard[j].norm) >= WORD_MATCH && dp[i][j] === dp[i + 1][j + 1] + 1) {
      matched[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return matched;
}
function scoreOne(targetText, transcript) {
  const target = tokenize(targetText);
  const heard = tokenize(transcript);
  const matched = alignWords(target, heard);
  let score;
  if (target.length === 1) {
    score = Math.max(0, ...heard.map((h) => similarity(target[0].norm, h.norm)));
  } else {
    score = matched.filter(Boolean).length / target.length;
  }
  return {
    target: targetText,
    score: Math.round(score * 100),
    words: target.map((t, i) => ({ text: t.original, matched: matched[i] }))
  };
}
export function scoreReading(alternatives, transcript) {
  const best = alternatives.map((alt) => scoreOne(alt, transcript)).reduce((a, b) => b.score > a.score ? b : a);
  const verdict = best.score >= 85 ? "correct" : best.score >= 60 ? "close" : "wrong";
  return { ...best, transcript, verdict };
}
