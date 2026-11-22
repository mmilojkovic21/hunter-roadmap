using Hunter.Core.Packs;
using Hunter.Core.Progress;

namespace Hunter.Api;

// Ugovor sa frontendom (vodič, pogl. 28). Tačni odgovori NIKAD ne idu u odgovor pre predaje testa.

public sealed record PackSummary(string Id, string Title, string Description, string Language, string Version,
    string? Author, int ChapterCount, int RegionCount, bool IsActive, DateTimeOffset ImportedAt);

public sealed record StatView(string Key, string Name, string Color, int Percent, int Done, int Total);

public sealed record ChapterRef(string Id, string Title, string? Subtitle, string RegionCode, string Level,
    ChapterStatus Status, int StepsDone, int StepsTotal, bool External, bool HasTest, int Minutes);

/// <param name="Review">Kazneni zadatak: ponovo položi test ovog poglavlja.</param>
public sealed record DailyQuestTaskView(string ChapterId, string ChapterTitle, Step Step, int Minutes, int Xp, bool Done, bool Review);

/// <summary>Dnevni zadatak za danas. Null u statusu kad paket nema više nezavršenih koraka.</summary>
/// <param name="Penalty">Jučerašnji zadatak nije završen, pa današnji počinje ponavljanjem (kazneni zadatak).</param>
public sealed record DailyQuestView(DateOnly Day, IReadOnlyList<DailyQuestTaskView> Tasks, int DoneCount,
    int Minutes, bool Completed, int RewardPoints, bool Penalty);

public sealed record WeakPointView(string ChapterId, string ChapterTitle, string Question);

public sealed record ActivityDay(DateOnly Day, int Xp);

public sealed record StatusView(
    PackSummary Pack,
    LevelInfo Level,
    string Rank,
    string? NextRank,
    int NextRankAtPct,
    int CompletionPct,
    int DoneChapters,
    int TotalChapters,
    int Streak,
    int TodayXp,
    int DailyGoalMinutes,
    IReadOnlyList<StatView> Stats,
    ChapterRef? Current,
    IReadOnlyList<ChapterRef> CurrentLevel,
    string? CurrentRegionTitle,
    DailyQuestView? DailyQuest,
    IReadOnlyList<WeakPointView> WeakPoints,
    IReadOnlyList<ActivityDay> Activity);

public sealed record LevelView(string Name, IReadOnlyList<ChapterRef> Chapters);

public sealed record RegionView(string Code, string Title, string Stat, string StatColor, int Percent, IReadOnlyList<LevelView> Levels);

public sealed record MapView(string PackId, string PackTitle, IReadOnlyList<RegionView> Regions);

public sealed record PublicQuestion(string Text, string? Code, IReadOnlyList<string> Options);

public sealed record ChapterView(
    string Id, string Title, string? Subtitle, int Minutes, string? ExternalRef,
    string? Intro, string? LessonMarkdown, string? DeeperMarkdown, ExerciseDef? Exercise,
    IReadOnlyList<CardDef> Cards, IReadOnlyList<PublicQuestion> Test, IReadOnlyList<SourceDef> Sources,
    IReadOnlyList<Step> Steps, IReadOnlyList<Step> Completed, ChapterStatus Status, int? BestPercent,
    int PassPct, string RegionTitle, string Level, string? PrevId, string? NextId);

/// <param name="QuestCompleted">Ovaj korak je završio dnevni zadatak (okidač za poruku sistema na klijentu).</param>
public sealed record XpResult(int XpAwarded, LevelInfo Level, bool LevelUp, bool QuestCompleted);

public sealed record SubmitTestRequest(IReadOnlyList<int> Answers);

public sealed record TestResultView(GradeResult Grade, XpResult Xp, bool FirstPass);

public sealed record SettingsView(string? ActivePackId, string Theme, bool Glow, bool ReduceMotion, int DailyGoalMinutes, bool PenaltyEnabled);
