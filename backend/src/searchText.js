export function foldArabic(text) {
  return text.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
}
export function escapeLike(text) {
  return text.replace(/[\\%_]/g, "\\$&");
}
export function withoutArticle(text) {
  return /^ال[ء-ي]{2,}$/.test(text) ? text.slice(2) : null;
}
