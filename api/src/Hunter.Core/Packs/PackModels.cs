namespace Hunter.Core.Packs;

// Format paketa „hunter-pack/1”. Isti format važi za bilo koju oblast učenja:
// programiranje, medicina, jezik... Struktura je u pack.json, sadržaj u chapters.json.

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

/// <summary>Statistika (npr. STR = Backend). Svaki paket definiše svoje.</summary>
public sealed record StatDef(string Key, string Name, string Color);

public sealed record RegionDef(string Code, string Title, string Stat, IReadOnlyList<LevelDef> Levels);

public sealed record LevelDef(string Name, IReadOnlyList<string> Chapters);

public sealed record ChapterFile(
    string Id,
    string Title,
    string? Subtitle,
    int Minutes,
    string? ExternalRef,          // npr. „PDF vodič, poglavlje 9” kad je lekcija van aplikacije
    string? Intro,
    string? LessonMarkdown,
    string? DeeperMarkdown,
    ExerciseDef? Exercise,        // lab za programiranje, slučaj za medicinu, esej za filozofiju...
    IReadOnlyList<CardDef>? Cards,
    IReadOnlyList<QuestionDef>? Test,
    IReadOnlyList<SourceDef>? Sources);

public sealed record ExerciseDef(IReadOnlyList<string> Steps, string Done);

public sealed record CardDef(string Q, string A);

public sealed record QuestionDef(string Text, string? Code, IReadOnlyList<string> Options, int Correct, string Why);

public sealed record SourceDef(string Title, string Url);

/// <summary>Ceo učitan paket: struktura + poglavlja.</summary>
public sealed record LoadedPack(PackFile Pack, IReadOnlyList<ChapterFile> Chapters);
