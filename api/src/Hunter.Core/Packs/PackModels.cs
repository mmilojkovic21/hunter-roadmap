namespace Hunter.Core.Packs;

// The "hunter-pack/1" pack format. The same format works for any field of study:
// programming, medicine, languages... Structure is in pack.json, content in chapters.json.

public sealed record PackFile(
    string Format,
    string Id,
    string Title,
    string Description,
    string Language,
    string Version,
    string? Author,
    int PassPct,
    XpRules Xp,
    IReadOnlyList<StatDef> Stats,
    IReadOnlyList<RegionDef> Regions);

public sealed record XpRules(int Lesson = 50, int Deeper = 30, int Lab = 100, int Test = 80, int Boss = 500);

/// <summary>A stat (e.g. STR = Backend). Each pack defines its own.</summary>
public sealed record StatDef(string Key, string Name, string Color);

public sealed record RegionDef(string Code, string Title, string Stat, IReadOnlyList<LevelDef> Levels);

public sealed record LevelDef(string Name, IReadOnlyList<string> Chapters);

public sealed record ChapterFile(
    string Id,
    string Title,
    string? Subtitle,
    int Minutes,
    string? ExternalRef,          // e.g. "PDF guide, chapter 9" when the lesson is outside the app
    string? Intro,
    string? LessonMarkdown,
    string? DeeperMarkdown,
    ExerciseDef? Exercise,        // a lab for programming, a case for medicine, an essay for philosophy...
    IReadOnlyList<CardDef>? Cards,
    IReadOnlyList<QuestionDef>? Test,
    IReadOnlyList<SourceDef>? Sources);

public sealed record ExerciseDef(IReadOnlyList<string> Steps, string Done);

public sealed record CardDef(string Q, string A);

public sealed record QuestionDef(string Text, string? Code, IReadOnlyList<string> Options, int Correct, string Why);

public sealed record SourceDef(string Title, string Url);

/// <summary>A whole loaded pack: structure + chapters.</summary>
public sealed record LoadedPack(PackFile Pack, IReadOnlyList<ChapterFile> Chapters);
