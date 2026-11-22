// Tipovi prate ugovor iz api/src/Hunter.Api/Contracts.cs (vodič, pogl. 28: ugovor sa API-jem).

export type Step = "Lesson" | "Deeper" | "Exercise" | "Test";
export type ChapterStatus = "New" | "InProgress" | "Done";

export interface PackSummary {
  id: string; title: string; description: string; language: string; version: string;
  author: string | null; chapterCount: number; regionCount: number; isActive: boolean; importedAt: string;
}
export interface LevelInfo { level: number; xpIntoLevel: number; xpForNextLevel: number; totalXp: number; percent: number }
export interface StatView { key: string; name: string; color: string; percent: number; done: number; total: number }
export interface ChapterRef {
  id: string; title: string; subtitle: string | null; regionCode: string; level: string; status: ChapterStatus;
  stepsDone: number; stepsTotal: number; external: boolean; hasTest: boolean; minutes: number;
}
export interface NextStepView { chapterId: string; chapterTitle: string; step: Step; xp: number }
export interface WeakPointView { chapterId: string; chapterTitle: string; question: string }
export interface ActivityDay { day: string; xp: number }
export interface StatusView {
  pack: PackSummary; level: LevelInfo; rank: string; nextRank: string | null; nextRankAtPct: number;
  completionPct: number; doneChapters: number; totalChapters: number; streak: number; todayXp: number;
  dailyGoalMinutes: number; stats: StatView[]; current: ChapterRef | null; currentLevel: ChapterRef[];
  currentRegionTitle: string | null; nextSteps: NextStepView[]; weakPoints: WeakPointView[]; activity: ActivityDay[];
}
export interface LevelView { name: string; chapters: ChapterRef[] }
export interface RegionView { code: string; title: string; stat: string; statColor: string; percent: number; levels: LevelView[] }
export interface MapView { packId: string; packTitle: string; regions: RegionView[] }
export interface PublicQuestion { text: string; code: string | null; options: string[] }
export interface ChapterView {
  id: string; title: string; subtitle: string | null; minutes: number; externalRef: string | null;
  intro: string | null; lessonMarkdown: string | null; deeperMarkdown: string | null;
  exercise: { steps: string[]; done: string } | null; cards: { q: string; a: string }[];
  test: PublicQuestion[]; sources: { title: string; url: string }[];
  steps: Step[]; completed: Step[]; status: ChapterStatus; bestPercent: number | null; passPct: number;
  regionTitle: string; level: string; prevId: string | null; nextId: string | null;
}
export interface XpResult { xpAwarded: number; level: LevelInfo; levelUp: boolean }
export interface QuestionResult { index: number; chosen: number; correct: number; isCorrect: boolean; why: string }
export interface TestResultView {
  grade: { correctCount: number; total: number; percent: number; passed: boolean; questions: QuestionResult[] };
  xp: XpResult; firstPass: boolean;
}
export interface Settings { activePackId: string | null; theme: Theme; glow: boolean; reduceMotion: boolean; dailyGoalMinutes: number }
export type Theme = "sistem" | "monarh" | "crveni" | "zlatni";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    let message = res.statusText;
    const text = await res.text();
    try {
      const body = JSON.parse(text);
      // ValidationProblem iz API-ja: { errors: { pack: ["...", "..."] } }
      message = body.errors ? Object.values(body.errors).flat().join("\n") : (body.detail ?? body.title ?? text);
    } catch {
      if (text) message = text;
    }
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body: unknown): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

export const api = {
  status: () => request<StatusView>("/status"),
  map: () => request<MapView>("/map"),
  chapter: (id: string) => request<ChapterView>(`/chapters/${encodeURIComponent(id)}`),
  completeStep: (id: string, step: Step) => request<XpResult>(`/chapters/${encodeURIComponent(id)}/steps/${step}`, { method: "POST" }),
  submitTest: (id: string, answers: number[]) => request<TestResultView>(`/chapters/${encodeURIComponent(id)}/test`, json("POST", { answers })),
  packs: () => request<PackSummary[]>("/packs"),
  uploadPack: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<PackSummary>("/packs", { method: "POST", body: form });
  },
  activatePack: (id: string) => request<void>(`/packs/${encodeURIComponent(id)}/activate`, { method: "POST" }),
  settings: () => request<Settings>("/settings"),
  saveSettings: (s: Settings) => request<Settings>("/settings", json("PUT", s)),
};
