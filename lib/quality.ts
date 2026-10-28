import type { Article } from "./types";
export function evaluateQuality(article: Article) {
  const ids = new Set(article.sources.map(s => s.id));
  const checks = [
    { label: "공식 출처 연결", ok: article.sources.length > 0 && article.sources.every(s => s.reachable === true), weight: 30 },
    { label: "문단별 근거 표시", ok: article.sections.length >= 2 && article.sections.every(s => s.sourceIds.length > 0 && s.sourceIds.every(id => ids.has(id))), weight: 25 },
    { label: "요약·본문 완성도", ok: article.description.length >= 30 && article.takeaways.length >= 2 && article.sections.every(s => s.text.length >= 40), weight: 20 },
    { label: "사실·수치 편집 확인", ok: article.checks.facts, weight: 10 },
    { label: "맥락·편향 편집 확인", ok: article.checks.context, weight: 10 },
    { label: "AI 작성·해설 고지", ok: article.checks.disclosure, weight: 5 },
  ];
  return { checks, score: checks.reduce((v,c) => v + (c.ok ? c.weight : 0), 0), canApprove: checks.every(c => c.ok) };
}
export function canTransition(article: Article, action: string) {
  if (action === "approve") return ["review", "changes"].includes(article.status) && evaluateQuality(article).canApprove;
  if (action === "publish") return article.status === "approved" && evaluateQuality(article).canApprove;
  if (action === "changes" || action === "reject") return article.status !== "rejected";
  return false;
}
