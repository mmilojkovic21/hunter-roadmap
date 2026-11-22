using Hunter.Api.Data;
using Hunter.Core.Packs;
using Hunter.Core.Progress;
using Microsoft.EntityFrameworkCore;
using Npgsql;

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

        var stats = await StatsAsync(ctx, ct);

        var current = refs.FirstOrDefault(r => r.Ref.Status != ChapterStatus.Done);
        List<ChapterRef> currentLevel = current.Place is null ? [] :
            refs.Where(r => r.Place.Region.Code == current.Place.Region.Code && r.Place.Level == current.Place.Level)
                .Select(r => r.Ref).ToList();

        var quest = await TodayQuestAsync(ctx, ct);

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
            settings.DailyGoalMinutes, stats, await FreePointsAsync(level, ct), current.Ref, currentLevel, current.Place?.Region.Title,
            quest is null ? null : await QuestViewAsync(ctx, quest, ct), weak, activity);
    }

    // ---------- statistike i slobodni poeni ----------

    private async Task<List<StatView>> StatsAsync(Ctx ctx, CancellationToken ct)
    {
        var points = await db.StatPoints.AsNoTracking().Where(p => p.PackId == ctx.Entity.Id)
            .GroupBy(p => p.StatKey).Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        return ctx.Loaded.Pack.Stats.Select(s =>
        {
            var mine = ctx.Places.Values.Where(p => p.Region.Stat == s.Key).ToList();
            var done = mine.Count(p => Ref(ctx, p).Status == ChapterStatus.Done);
            var pct = mine.Count == 0 ? 0 : (int)Math.Floor(done * 100.0 / mine.Count);
            var pts = points.GetValueOrDefault(s.Key);
            return new StatView(s.Key, s.Name, s.Color, pct, done, mine.Count, pts, FreePointRules.StatValue(pct, pts));
        }).ToList();
    }

    /// <summary>
    /// Slobodni poeni na raspolaganju: zarađeni (nivo + završeni dnevni zadaci) minus dodeljeni.
    /// Nivo je zajednički za sve pakete, pa je zajednički i fond poena.
    /// </summary>
    private async Task<int> FreePointsAsync(LevelInfo level, CancellationToken ct)
    {
        var quests = await db.DailyQuests.CountAsync(q => q.CompletedAt != null, ct);
        var spent = await db.StatPoints.CountAsync(ct);
        return FreePointRules.Available(FreePointRules.Earned(level.Level, quests), spent);
    }

    public async Task<(AllocatePointResult? Result, string? Error)> AllocatePointAsync(string statKey, CancellationToken ct)
    {
        var ctx = await LoadAsync(ct);
        if (ctx is null) return (null, "Nema aktivnog paketa.");
        if (ctx.Loaded.Pack.Stats.All(s => s.Key != statKey)) return (null, $"Paket nema statistiku '{statKey}'.");

        // Provera pa upis bez zaključavanja je dovoljna: aplikacija je lokalna, za jednog korisnika,
        // a dugme „+” je onemogućeno dok zahtev traje. Sa više korisnika ovde bi išla transakcija.
        var free = await FreePointsAsync(LevelRules.FromTotalXp(await TotalXpAsync(ct)), ct);
        if (free == 0) return (null, "Nema slobodnih poena.");

        db.StatPoints.Add(new StatPoint { PackId = ctx.Entity.Id, StatKey = statKey, CreatedAt = clock.GetUtcNow() });
        await db.SaveChangesAsync(ct);
        var stat = (await StatsAsync(ctx, ct)).Single(s => s.Key == statKey);
        return (new AllocatePointResult(free - 1, stat), null);
    }

    // ---------- dnevni zadatak ----------

    /// <summary>Nezavršeni koraci redom mape (završena poglavlja nemaju nijedan, pa se sama preskaču).</summary>
    private static IEnumerable<(ChapterPlace Place, Step Step)> PendingSteps(Ctx ctx) =>
        ctx.Places.Values.OrderBy(p => p.Order).SelectMany(p => ChapterRules.StepsOf(p.Chapter)
            .Where(s => !IsDone(ctx, p.Chapter.Id, s))
            .Select(s => (p, s)));

    private static bool IsDone(Ctx ctx, string chapterId, Step step) =>
        ctx.Done.GetValueOrDefault(chapterId)?.Contains(step) ?? false;

    // Zadatak čije je poglavlje izbacila nova verzija paketa računa se kao urađen, da dan ne ostane nezavršiv.
    // Kazneni zadatak (ponavljanje) je urađen kad je test tog poglavlja položen posle nastanka današnjeg zadatka.
    private static bool IsDone(Ctx ctx, DailyQuestTask t, IReadOnlySet<string> reviewed) =>
        !ctx.Places.ContainsKey(t.ChapterId) ||
        (t.IsReview ? reviewed.Contains(t.ChapterId) : IsDone(ctx, t.ChapterId, Enum.Parse<Step>(t.Step)));

    /// <summary>Poglavlja čiji je test položen od nastanka zadatka (za kaznene zadatke).</summary>
    private async Task<IReadOnlySet<string>> ReviewedAsync(Ctx ctx, DailyQuest q, CancellationToken ct) =>
        q.Tasks.Any(t => t.IsReview)
            ? (await db.TestAttempts.AsNoTracking()
                .Where(a => a.PackId == ctx.Entity.Id && a.Passed && a.CreatedAt >= q.CreatedAt)
                .Select(a => a.ChapterId).Distinct().ToListAsync(ct)).ToHashSet()
            : new HashSet<string>();

    /// <summary>Označava zadatak završenim kad je sve urađeno. True samo u trenutku završetka; čuva pozivalac.</summary>
    private async Task<bool> MarkQuestIfDoneAsync(Ctx ctx, DailyQuest? quest, DateTimeOffset now, CancellationToken ct)
    {
        if (quest is not { CompletedAt: null }) return false;
        var reviewed = await ReviewedAsync(ctx, quest, ct);
        if (!quest.Tasks.All(t => IsDone(ctx, t, reviewed))) return false;
        quest.CompletedAt = now;
        return true;
    }

    /// <summary>
    /// Testovi za kazneni zadatak, ako je kazna danas na snazi: prvo poglavlja sa slabim tačkama (najnovija prva),
    /// pa ostala sa već položenim testom (poslednja prva). Ponavlja se samo položen test; bez njih nema kazne.
    /// </summary>
    private async Task<IReadOnlyList<QuestCandidate>> PenaltyReviewAsync(Ctx ctx, DateOnly today, CancellationToken ct)
    {
        // Za odluku je dovoljan poslednji raniji zadatak: ili je jučerašnji, ili je juče propušteno.
        var past = await db.DailyQuests.AsNoTracking()
            .Where(q => q.PackId == ctx.Entity.Id && q.Day < today)
            .OrderByDescending(q => q.Day).Take(1)
            .Select(q => new PastQuest(q.Day, q.CompletedAt != null)).ToListAsync(ct);
        if (!PenaltyRules.IsDue(today, past)) return [];

        var attempts = await db.TestAttempts.AsNoTracking()
            .Where(a => a.PackId == ctx.Entity.Id)
            .OrderByDescending(a => a.CreatedAt).Take(200)
            .Select(a => new { a.ChapterId, a.WrongQuestions }).ToListAsync(ct);
        var weak = attempts.GroupBy(a => a.ChapterId).Select(g => g.First())   // GroupBy čuva redosled: najnoviji pokušaj
            .Where(a => a.WrongQuestions.Length > 0).Select(a => a.ChapterId);
        var passed = ctx.Places.Values.OrderByDescending(p => p.Order).Select(p => p.Chapter.Id);

        var candidates = weak.Concat(passed).Distinct()
            .Where(id => ctx.Places.ContainsKey(id) && IsDone(ctx, id, Step.Test))
            .Select(id => ctx.Places[id].Chapter)
            .Select(c => new QuestCandidate(c.Id, Step.Test, DailyQuestRules.StepMinutes(Step.Test, ChapterRules.StepsOf(c), c.Minutes)));
        return PenaltyRules.PickReview(candidates);
    }

    /// <summary>
    /// Današnji zadatak aktivnog paketa. Pravi se pri prvom pozivu u danu (status ili prvi završen korak)
    /// i posle se ne menja. Null kad paket nema više nezavršenih koraka.
    /// </summary>
    private async Task<DailyQuest?> TodayQuestAsync(Ctx ctx, CancellationToken ct)
    {
        var today = LocalDay(clock.GetUtcNow());
        var quest = await db.DailyQuests.Include(q => q.Tasks)
            .FirstOrDefaultAsync(q => q.PackId == ctx.Entity.Id && q.Day == today, ct);
        if (quest is not null) return quest;

        var settings = await db.Settings.AsNoTracking().SingleAsync(s => s.Id == 1, ct);
        var candidates = PendingSteps(ctx).Select(x => new QuestCandidate(x.Place.Chapter.Id, x.Step,
            DailyQuestRules.StepMinutes(x.Step, ChapterRules.StepsOf(x.Place.Chapter), x.Place.Chapter.Minutes)));
        var picked = DailyQuestRules.Pick(candidates, settings.DailyGoalMinutes);
        // Kazna se dodaje na redovne zadatke (+20 min) i ide prva: ponavljanje pre nove lekcije.
        var review = settings.PenaltyEnabled ? await PenaltyReviewAsync(ctx, today, ct) : [];
        if (picked.Count == 0 && review.Count == 0) return null;

        quest = new DailyQuest
        {
            PackId = ctx.Entity.Id, Day = today, CreatedAt = clock.GetUtcNow(),
            Tasks = review.Select(c => (c, IsReview: true)).Concat(picked.Select(c => (c, IsReview: false)))
                .Select((x, i) => new DailyQuestTask
                    { Order = i, ChapterId = x.c.ChapterId, Step = x.c.Step.ToString(), Minutes = x.c.Minutes, IsReview = x.IsReview })
                .ToList()
        };
        db.DailyQuests.Add(quest);
        try
        {
            await db.SaveChangesAsync(ct);
            return quest;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Dva zahteva su istovremeno pravila današnji zadatak; jedinstven indeks je pustio samo jedan. Koristi taj.
            db.ChangeTracker.Clear();
            return await db.DailyQuests.Include(q => q.Tasks).FirstAsync(q => q.PackId == ctx.Entity.Id && q.Day == today, ct);
        }
    }

    private async Task<DailyQuestView> QuestViewAsync(Ctx ctx, DailyQuest q, CancellationToken ct)
    {
        var reviewed = await ReviewedAsync(ctx, q, ct);
        var tasks = q.Tasks.OrderBy(t => t.Order).Select(t =>
        {
            var step = Enum.Parse<Step>(t.Step);
            var title = ctx.Places.GetValueOrDefault(t.ChapterId)?.Chapter.Title ?? t.ChapterId;
            var xp = t.IsReview ? 0 : ChapterRules.XpFor(step, ctx.Loaded.Pack.Xp);   // ponovljen test ne daje XP
            return new DailyQuestTaskView(t.ChapterId, title, step, t.Minutes, xp, IsDone(ctx, t, reviewed), t.IsReview);
        }).ToList();
        return new DailyQuestView(q.Day, tasks, tasks.Count(t => t.Done), tasks.Sum(t => t.Minutes),
            q.CompletedAt is not null, DailyQuestRules.RewardPoints, q.Tasks.Any(t => t.IsReview));
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
        var cleared = await ClearedRegionsAsync(ctx, ct);

        var regions = ctx.Loaded.Pack.Regions.Select(r =>
        {
            var levels = r.Levels.Select(l => new LevelView(l.Name, l.Chapters.Select(id => Ref(ctx, ctx.Places[id])).ToList())).ToList();
            var all = levels.SelectMany(l => l.Chapters).ToList();
            var pct = all.Count == 0 ? 0 : (int)Math.Floor(all.Count(c => c.Status == ChapterStatus.Done) * 100.0 / all.Count);
            var boss = BossRules.State(all.Select(c => c.Status).ToList(), cleared.Contains(r.Code));
            var questions = Math.Min(QuestionPool(RegionPlaces(ctx, r.Code)).Count, BossRules.MaxQuestions);
            return new RegionView(r.Code, r.Title, r.Stat, colors.GetValueOrDefault(r.Stat, "#4DA3FF"), pct, levels, boss, questions);
        }).ToList();

        return new MapView(ctx.Entity.Id, ctx.Entity.Title, regions, BossRules.PassPct, ctx.Loaded.Pack.Xp.Boss);
    }

    // ---------- boss test regiona ----------

    private static List<ChapterPlace> RegionPlaces(Ctx ctx, string code) =>
        ctx.Places.Values.Where(p => p.Region.Code == code).OrderBy(p => p.Order).ToList();

    private static List<QuestionRef> QuestionPool(IEnumerable<ChapterPlace> places) =>
        places.SelectMany(p => (p.Chapter.Test ?? []).Select((_, i) => new QuestionRef(p.Chapter.Id, i))).ToList();

    private async Task<HashSet<string>> ClearedRegionsAsync(Ctx ctx, CancellationToken ct) =>
        (await db.RegionClears.AsNoTracking().Where(c => c.PackId == ctx.Entity.Id)
            .Select(c => c.RegionCode).ToListAsync(ct)).ToHashSet();

    public async Task<(BossView? Result, string? Error)> StartBossAsync(string code, CancellationToken ct)
    {
        var ctx = await LoadAsync(ct);
        var region = ctx?.Loaded.Pack.Regions.FirstOrDefault(r => r.Code == code);
        if (ctx is null || region is null) return (null, "Region ne postoji u aktivnom paketu.");

        var places = RegionPlaces(ctx, code);
        var state = BossRules.State(places.Select(p => Ref(ctx, p).Status).ToList(), (await ClearedRegionsAsync(ctx, ct)).Contains(code));
        if (state == BossState.Locked) return (null, "Boss se otključava kad očistiš sva poglavlja regiona.");
        var pool = QuestionPool(places);
        if (pool.Count == 0) return (null, "Region nema pitanja za boss test.");

        // Server bira i pamti pitanja; klijent dobija samo tekst i opcije (vodič, pogl. 28).
        var picked = BossRules.PickQuestions(pool, Random.Shared);
        var attempt = new BossAttempt
        {
            PackId = ctx.Entity.Id, RegionCode = code, CreatedAt = clock.GetUtcNow(),
            ChapterIds = picked.Select(q => q.ChapterId).ToArray(),
            QuestionIndexes = picked.Select(q => q.Index).ToArray()
        };
        db.BossAttempts.Add(attempt);
        await db.SaveChangesAsync(ct);

        var questions = picked.Select(r => ctx.Places[r.ChapterId].Chapter.Test![r.Index])
            .Select(q => new PublicQuestion(q.Text, q.Code, q.Options)).ToList();
        return (new BossView(attempt.Id, code, region.Title, BossRules.PassPct, ctx.Loaded.Pack.Xp.Boss, questions), null);
    }

    public async Task<(BossResultView? Result, string? Error)> SubmitBossAsync(long attemptId, IReadOnlyList<int> answers, CancellationToken ct)
    {
        var ctx = await LoadAsync(ct);
        if (ctx is null) return (null, "Nema aktivnog paketa.");
        var attempt = await db.BossAttempts.FirstOrDefaultAsync(a => a.Id == attemptId && a.PackId == ctx.Entity.Id, ct);
        if (attempt is null) return (null, "Boss pokušaj ne postoji.");
        if (attempt.SubmittedAt is not null) return (null, "Ovaj boss pokušaj je već predat. Započni novi.");

        // Pitanja se čitaju iz zapamćenih referenci. Ako je paket u međuvremenu izmenjen, pokušaj više ne važi.
        var questions = new List<QuestionDef>();
        for (var i = 0; i < attempt.ChapterIds.Length; i++)
        {
            var test = ctx.Places.GetValueOrDefault(attempt.ChapterIds[i])?.Chapter.Test;
            if (test is null || attempt.QuestionIndexes[i] >= test.Count) return (null, "Paket je izmenjen posle početka. Započni boss ponovo.");
            questions.Add(test[attempt.QuestionIndexes[i]]);
        }
        if (answers.Count != questions.Count) return (null, $"Očekuje se {questions.Count} odgovora.");

        var grade = QuizGrader.Grade(questions, answers, BossRules.PassPct);
        var now = clock.GetUtcNow();
        attempt.SubmittedAt = now;
        attempt.Percent = grade.Percent;
        attempt.Passed = grade.Passed;

        var before = LevelRules.FromTotalXp(await TotalXpAsync(ct));
        var firstClear = grade.Passed && !await db.RegionClears.AnyAsync(c => c.PackId == ctx.Entity.Id && c.RegionCode == attempt.RegionCode, ct);
        var amount = firstClear ? ctx.Loaded.Pack.Xp.Boss : 0;
        if (firstClear)
        {
            db.RegionClears.Add(new RegionClear { PackId = ctx.Entity.Id, RegionCode = attempt.RegionCode, ClearedAt = now });
            db.XpEvents.Add(new XpEvent { PackId = ctx.Entity.Id, Reason = $"Boss:{attempt.RegionCode}", Amount = amount, CreatedAt = now });
        }
        await db.SaveChangesAsync(ct);

        var after = LevelRules.FromTotalXp(before.TotalXp + amount);
        return (new BossResultView(grade, new XpResult(amount, after, after.Level > before.Level, false), firstClear), null);
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

        // Današnji zadatak mora postojati PRE upisa pokušaja: ponovljen test se za kazneni zadatak
        // računa samo ako je položen posle nastanka zadatka.
        var quest = await TodayQuestAsync(ctx, ct);

        var grade = QuizGrader.Grade(test, answers, ctx.Loaded.Pack.PassPct);
        var now = clock.GetUtcNow();
        db.TestAttempts.Add(new TestAttempt
        {
            PackId = ctx.Entity.Id, ChapterId = id, CorrectCount = grade.CorrectCount, Total = grade.Total,
            Percent = grade.Percent, Passed = grade.Passed, CreatedAt = now,
            WrongQuestions = grade.Questions.Where(q => !q.IsCorrect).Select(q => q.Index).ToArray()
        });
        await db.SaveChangesAsync(ct);

        var firstPass = grade.Passed && !(ctx.Done.GetValueOrDefault(id)?.Contains(Step.Test) ?? false);
        if (firstPass) return (new TestResultView(grade, await AwardStepAsync(ctx, id, Step.Test, ct), true), null);

        // Ponovljen položen test ne daje XP, ali može da završi kazneni (pa i ceo dnevni) zadatak.
        var questCompleted = grade.Passed && await MarkQuestIfDoneAsync(ctx, quest, now, ct);
        if (questCompleted) await db.SaveChangesAsync(ct);
        var xp = new XpResult(0, LevelRules.FromTotalXp(await TotalXpAsync(ct)), false, questCompleted);
        return (new TestResultView(grade, xp, false), null);
    }

    private async Task<XpResult> AwardStepAsync(Ctx ctx, string chapterId, Step step, CancellationToken ct)
    {
        var before = LevelRules.FromTotalXp(await TotalXpAsync(ct));
        var already = await db.StepCompletions.AnyAsync(s =>
            s.PackId == ctx.Entity.Id && s.ChapterId == chapterId && s.Step == step.ToString(), ct);
        if (already) return new XpResult(0, before, false, false);   // idempotentno: drugi klik ne daje XP

        // Zadatak se pravi PRE upisa koraka, da korak koji upravo završavaš može biti deo današnjeg zadatka
        // i kad danas još nisi otvorio status.
        var quest = await TodayQuestAsync(ctx, ct);

        var amount = ChapterRules.XpFor(step, ctx.Loaded.Pack.Xp);
        var now = clock.GetUtcNow();
        db.StepCompletions.Add(new StepCompletion { PackId = ctx.Entity.Id, ChapterId = chapterId, Step = step.ToString(), CompletedAt = now });
        db.XpEvents.Add(new XpEvent { PackId = ctx.Entity.Id, ChapterId = chapterId, Reason = step.ToString(), Amount = amount, CreatedAt = now });

        if (!ctx.Done.TryGetValue(chapterId, out var doneSteps)) ctx.Done[chapterId] = doneSteps = [];
        doneSteps.Add(step);
        var questCompleted = await MarkQuestIfDoneAsync(ctx, quest, now, ct);   // isti SaveChanges: korak i završetak zadatka idu zajedno

        await db.SaveChangesAsync(ct);

        var after = LevelRules.FromTotalXp(before.TotalXp + amount);
        return new XpResult(amount, after, after.Level > before.Level, questCompleted);
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
