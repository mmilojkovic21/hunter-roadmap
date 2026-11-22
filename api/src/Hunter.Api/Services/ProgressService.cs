using Hunter.Api.Data;
using Hunter.Core.Packs;
using Hunter.Core.Progress;
using Microsoft.EntityFrameworkCore;

namespace Hunter.Api.Services;

public sealed class ProgressService(HunterDb db, PackCatalog catalog, TimeProvider clock, TimeZoneInfo zone)
{
    // ---------- zajedničko ----------

    private sealed record ChapterPlace(ChapterFile Chapter, RegionDef Region, string Level, int Order);

    private sealed record Ctx(LoadedPack Loaded, PackEntity Entity, Dictionary<string, ChapterPlace> Places,
        Dictionary<string, HashSet<Step>> Done);

    public async Task<string?> ActivePackIdAsync(CancellationToken ct) =>
        await db.Settings.AsNoTracking().Where(s => s.Id == 1).Select(s => s.ActivePackId).FirstOrDefaultAsync(ct);

    private async Task<Ctx?> LoadAsync(CancellationToken ct)
    {
        var packId = await ActivePackIdAsync(ct);
        if (packId is null) return null;
        var loaded = await catalog.GetAsync(packId, ct);
        var entity = await db.Packs.AsNoTracking().FirstOrDefaultAsync(p => p.Id == packId, ct);
        if (loaded is null || entity is null) return null;

        var byId = loaded.Chapters.ToDictionary(c => c.Id);
        var places = new Dictionary<string, ChapterPlace>();
        var order = 0;
        foreach (var r in loaded.Pack.Regions)
        foreach (var l in r.Levels)
        foreach (var id in l.Chapters)
            places[id] = new ChapterPlace(byId[id], r, l.Name, order++);

        var steps = await db.StepCompletions.AsNoTracking().Where(s => s.PackId == packId)
            .Select(s => new { s.ChapterId, s.Step }).ToListAsync(ct);
        var done = steps.GroupBy(s => s.ChapterId)
            .ToDictionary(g => g.Key, g => g.Select(s => Enum.Parse<Step>(s.Step)).ToHashSet());

        return new Ctx(loaded, entity, places, done);
    }

    private static ChapterRef Ref(Ctx ctx, ChapterPlace p)
    {
        var steps = ChapterRules.StepsOf(p.Chapter);
        var done = ctx.Done.GetValueOrDefault(p.Chapter.Id) ?? [];
        return new ChapterRef(p.Chapter.Id, p.Chapter.Title, p.Chapter.Subtitle, p.Region.Code, p.Level,
            ChapterRules.Status(steps, done), steps.Count(done.Contains), steps.Count,
            p.Chapter.ExternalRef is not null, p.Chapter.Test is { Count: > 0 }, p.Chapter.Minutes);
    }

    private PackSummary Summary(PackEntity e, LoadedPack l, bool active) =>
        new(e.Id, e.Title, e.Description, e.Language, e.Version, e.Author, e.ChapterCount, l.Pack.Regions.Count, active, e.ImportedAt);

    private async Task<int> TotalXpAsync(CancellationToken ct) =>
        await db.XpEvents.SumAsync(x => (int?)x.Amount, ct) ?? 0;

    private DateOnly LocalDay(DateTimeOffset t) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(t, zone).DateTime);

    // ---------- status (početna strana) ----------

    public async Task<StatusView?> GetStatusAsync(CancellationToken ct)
    {
        var ctx = await LoadAsync(ct);
        if (ctx is null) return null;

        var refs = ctx.Places.Values.OrderBy(p => p.Order).Select(p => (Place: p, Ref: Ref(ctx, p))).ToList();
        var doneCount = refs.Count(r => r.Ref.Status == ChapterStatus.Done);
        var pct = refs.Count == 0 ? 0 : (int)Math.Floor(doneCount * 100.0 / refs.Count);
        var next = RankRules.NextRank(pct);

        var stats = ctx.Loaded.Pack.Stats.Select(s =>
        {
            var mine = refs.Where(r => r.Place.Region.Stat == s.Key).ToList();
            var d = mine.Count(r => r.Ref.Status == ChapterStatus.Done);
            return new StatView(s.Key, s.Name, s.Color, mine.Count == 0 ? 0 : (int)Math.Floor(d * 100.0 / mine.Count), d, mine.Count);
        }).ToList();

        var current = refs.FirstOrDefault(r => r.Ref.Status != ChapterStatus.Done);
        List<ChapterRef> currentLevel = current.Place is null ? [] :
            refs.Where(r => r.Place.Region.Code == current.Place.Region.Code && r.Place.Level == current.Place.Level)
                .Select(r => r.Ref).ToList();

        // Sledeći koraci: prvi nezavršeni koraci od trenutnog poglavlja nadalje.
        var nextSteps = new List<NextStepView>();
        foreach (var r in refs.SkipWhile(r => r.Ref.Status == ChapterStatus.Done))
        {
            var done = ctx.Done.GetValueOrDefault(r.Place.Chapter.Id) ?? [];
            foreach (var st in ChapterRules.StepsOf(r.Place.Chapter).Where(s => !done.Contains(s)))
            {
                nextSteps.Add(new NextStepView(r.Place.Chapter.Id, r.Place.Chapter.Title, st, ChapterRules.XpFor(st, ctx.Loaded.Pack.Xp)));
                if (nextSteps.Count == 4) break;
            }
            if (nextSteps.Count == 4) break;
        }

        var now = clock.GetUtcNow();
        var events = await db.XpEvents.AsNoTracking().Where(x => x.CreatedAt >= now.AddDays(-400))
            .Select(x => new { x.CreatedAt, x.Amount }).ToListAsync(ct);
        var byDay = events.GroupBy(e => LocalDay(e.CreatedAt)).ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));
        var today = LocalDay(now);
        var activity = Enumerable.Range(0, 84).Select(i => today.AddDays(i - 83))
            .Select(d => new ActivityDay(d, byDay.GetValueOrDefault(d))).ToList();

        var weak = await WeakPointsAsync(ctx, ct);
        var settings = await db.Settings.AsNoTracking().SingleAsync(s => s.Id == 1, ct);
        var level = LevelRules.FromTotalXp(await TotalXpAsync(ct));

        return new StatusView(
            Summary(ctx.Entity, ctx.Loaded, true), level, RankRules.FromCompletion(pct), next?.Next, next?.AtPct ?? 100,
            pct, doneCount, refs.Count, StreakRules.Current(byDay.Keys, today), byDay.GetValueOrDefault(today),
            settings.DailyGoalMinutes, stats, current.Ref, currentLevel, current.Place?.Region.Title,
            nextSteps, weak, activity);
    }

    private async Task<IReadOnlyList<WeakPointView>> WeakPointsAsync(Ctx ctx, CancellationToken ct)
    {
        // Poslednji pokušaj po poglavlju; pitanja koja su tada bila netačna su „slabe tačke”.
        var attempts = await db.TestAttempts.AsNoTracking()
            .Where(a => a.PackId == ctx.Entity.Id)
            .OrderByDescending(a => a.CreatedAt).Take(50).ToListAsync(ct);
        return attempts.GroupBy(a => a.ChapterId).Select(g => g.First())
            .Where(a => ctx.Places.ContainsKey(a.ChapterId))
            .SelectMany(a => a.WrongQuestions.Select(i => (a.ChapterId, i)))
            .Select(x =>
            {
                var c = ctx.Places[x.ChapterId].Chapter;
                return c.Test is { } t && x.i < t.Count ? new WeakPointView(c.Id, c.Title, t[x.i].Text) : null;
            })
            .OfType<WeakPointView>().Take(5).ToList();
    }

    // ---------- mapa ----------

    public async Task<MapView?> GetMapAsync(CancellationToken ct)
    {
        var ctx = await LoadAsync(ct);
        if (ctx is null) return null;
        var colors = ctx.Loaded.Pack.Stats.ToDictionary(s => s.Key, s => s.Color);

        var regions = ctx.Loaded.Pack.Regions.Select(r =>
        {
            var levels = r.Levels.Select(l => new LevelView(l.Name, l.Chapters.Select(id => Ref(ctx, ctx.Places[id])).ToList())).ToList();
            var all = levels.SelectMany(l => l.Chapters).ToList();
            var pct = all.Count == 0 ? 0 : (int)Math.Floor(all.Count(c => c.Status == ChapterStatus.Done) * 100.0 / all.Count);
            return new RegionView(r.Code, r.Title, r.Stat, colors.GetValueOrDefault(r.Stat, "#4DA3FF"), pct, levels);
        }).ToList();

        return new MapView(ctx.Entity.Id, ctx.Entity.Title, regions);
    }

    // ---------- poglavlje ----------

    public async Task<ChapterView?> GetChapterAsync(string id, CancellationToken ct)
    {
        var ctx = await LoadAsync(ct);
        if (ctx is null || !ctx.Places.TryGetValue(id, out var p)) return null;
        var c = p.Chapter;
        var steps = ChapterRules.StepsOf(c);
        var done = ctx.Done.GetValueOrDefault(id) ?? [];
        var best = await db.TestAttempts.AsNoTracking().Where(a => a.PackId == ctx.Entity.Id && a.ChapterId == id)
            .MaxAsync(a => (int?)a.Percent, ct);
        var ordered = ctx.Places.Values.OrderBy(x => x.Order).ToList();

        return new ChapterView(c.Id, c.Title, c.Subtitle, c.Minutes, c.ExternalRef, c.Intro, c.LessonMarkdown, c.DeeperMarkdown,
            c.Exercise, c.Cards ?? [],
            (c.Test ?? []).Select(q => new PublicQuestion(q.Text, q.Code, q.Options)).ToList(),   // bez tačnih odgovora
            c.Sources ?? [], steps, steps.Where(done.Contains).ToList(), ChapterRules.Status(steps, done), best,
            ctx.Loaded.Pack.PassPct, p.Region.Title, p.Level,
            p.Order > 0 ? ordered[p.Order - 1].Chapter.Id : null,
            p.Order < ordered.Count - 1 ? ordered[p.Order + 1].Chapter.Id : null);
    }

    // ---------- napredak ----------

    public async Task<(XpResult? Result, string? Error)> CompleteStepAsync(string id, Step step, CancellationToken ct)
    {
        if (step == Step.Test) return (null, "Test se završava predajom odgovora, ne ručno.");
        var ctx = await LoadAsync(ct);
        if (ctx is null || !ctx.Places.TryGetValue(id, out var p)) return (null, "Poglavlje ne postoji u aktivnom paketu.");
        if (!ChapterRules.StepsOf(p.Chapter).Contains(step)) return (null, $"Poglavlje nema korak {step}.");

        var xp = await AwardStepAsync(ctx, id, step, ct);
        return (xp, null);
    }

    public async Task<(TestResultView? Result, string? Error)> SubmitTestAsync(string id, IReadOnlyList<int> answers, CancellationToken ct)
    {
        var ctx = await LoadAsync(ct);
        if (ctx is null || !ctx.Places.TryGetValue(id, out var p)) return (null, "Poglavlje ne postoji u aktivnom paketu.");
        if (p.Chapter.Test is not { Count: > 0 } test) return (null, "Poglavlje nema test.");
        if (answers.Count != test.Count) return (null, $"Očekuje se {test.Count} odgovora.");

        var grade = QuizGrader.Grade(test, answers, ctx.Loaded.Pack.PassPct);
        db.TestAttempts.Add(new TestAttempt
        {
            PackId = ctx.Entity.Id, ChapterId = id, CorrectCount = grade.CorrectCount, Total = grade.Total,
            Percent = grade.Percent, Passed = grade.Passed, CreatedAt = clock.GetUtcNow(),
            WrongQuestions = grade.Questions.Where(q => !q.IsCorrect).Select(q => q.Index).ToArray()
        });
        await db.SaveChangesAsync(ct);

        var firstPass = grade.Passed && !(ctx.Done.GetValueOrDefault(id)?.Contains(Step.Test) ?? false);
        var xp = firstPass
            ? await AwardStepAsync(ctx, id, Step.Test, ct)
            : new XpResult(0, LevelRules.FromTotalXp(await TotalXpAsync(ct)), false);
        return (new TestResultView(grade, xp, firstPass), null);
    }

    private async Task<XpResult> AwardStepAsync(Ctx ctx, string chapterId, Step step, CancellationToken ct)
    {
        var before = LevelRules.FromTotalXp(await TotalXpAsync(ct));
        var already = await db.StepCompletions.AnyAsync(s =>
            s.PackId == ctx.Entity.Id && s.ChapterId == chapterId && s.Step == step.ToString(), ct);
        if (already) return new XpResult(0, before, false);   // idempotentno: drugi klik ne daje XP

        var amount = ChapterRules.XpFor(step, ctx.Loaded.Pack.Xp);
        var now = clock.GetUtcNow();
        db.StepCompletions.Add(new StepCompletion { PackId = ctx.Entity.Id, ChapterId = chapterId, Step = step.ToString(), CompletedAt = now });
        db.XpEvents.Add(new XpEvent { PackId = ctx.Entity.Id, ChapterId = chapterId, Reason = step.ToString(), Amount = amount, CreatedAt = now });
        await db.SaveChangesAsync(ct);

        var after = LevelRules.FromTotalXp(before.TotalXp + amount);
        return new XpResult(amount, after, after.Level > before.Level);
    }

    public async Task<IReadOnlyList<PackSummary>> ListPacksAsync(CancellationToken ct)
    {
        var active = await ActivePackIdAsync(ct);
        var packs = await db.Packs.AsNoTracking().OrderBy(p => p.Title).ToListAsync(ct);
        var result = new List<PackSummary>();
        foreach (var p in packs)
        {
            var loaded = await catalog.GetAsync(p.Id, ct);
            if (loaded is not null) result.Add(Summary(p, loaded, p.Id == active));
        }
        return result;
    }
}
