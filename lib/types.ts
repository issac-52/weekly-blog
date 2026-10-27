// Extends the original weekly-blog Post model (260e703).
export const categories = ["전체", "경제·금융", "세계·정세", "IT·AI", "라이프·트렌드"] as const;
export type Category = Exclude<typeof categories[number], "전체">;
export type Status = "review" | "changes" | "approved" | "published" | "rejected";
export type Source = { id: string; title: string; publisher: string; url: string; date: string; verifiedAt?: string; reachable?: boolean; error?: string };
export type Section = { heading: string; text: string; sourceIds: string[]; kind?: "fact" | "analysis" };
export type Article = {
  id: string; slug: string; title: string; description: string; category: Category;
  issueId: string; status: Status; version: number; date: string; readMinutes: number;
  cover: "orbit" | "market" | "globe" | "chip" | "leaf" | "abstract";
  kicker: string; takeaways: string[]; sections: Section[]; sources: Source[];
  author: string; checks: { facts: boolean; context: boolean; disclosure: boolean };
  reviewNote: string; generatedBy: string; updatedAt: string;
};
export type Issue = { id: string; number: string; title: string; subtitle: string; start: string; end: string; label: string };
export type Run = { id: string; issueId: string; key: string; status: string; createdAt: string; articleIds: string[]; message: string };
export type ReviewEvent = { id: string; articleId: string; action: string; note: string; actor: string; createdAt: string };
export type State = { issues: Issue[]; articles: Article[]; runs: Run[]; events: ReviewEvent[]; bookmarks: string[]; storage: string; isAdmin?: boolean; isPrivate?: boolean };
