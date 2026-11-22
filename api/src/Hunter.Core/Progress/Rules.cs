using Hunter.Core.Packs;

namespace Hunter.Core.Progress;

// Čista pravila igre: bez baze, bez HTTP-a. Zato se lako testiraju (vodič, pogl. 17; dodatak 0.4).

public enum Step { Lesson, Deeper, Exercise, Test }

public enum ChapterStatus { New, InProgress, Done }

public sealed record LevelInfo(int Level, int XpIntoLevel, int XpForNextLevel, int TotalXp)
{
    public int Percent => XpForNextLevel == 0 ? 100 : (int)Math.Floor(XpIntoLevel * 100.0 / XpForNextLevel);
}

public static class LevelRules
{
    /// <summary>XP potreban da se sa nivoa <paramref name="level"/> pređe na sledeći: 100, 150, 200...</summary>
    public static int XpToNext(int level) => 100 + 50 * (level - 1);

    public static LevelInfo FromTotalXp(int totalXp)
    {
        if (totalXp < 0) throw new ArgumentOutOfRangeException(nameof(totalXp));
        int level = 1, rest = totalXp;
        while (rest >= XpToNext(level))
        {
            rest -= XpToNext(level);
            level++;
        }
        return new LevelInfo(level, rest, XpToNext(level), totalXp);
    }
}

public static class RankRules
{
    // Rang zavisi od procenta završenih poglavlja paketa, ne od XP-a:
    // XP se može „farmovati”, završena poglavlja ne mogu.
    private static readonly (int MinPct, string Rank)[] Ranks =
        [(85, "S"), (65, "A"), (45, "B"), (25, "C"), (10, "D"), (0, "E")];

    public static string FromCompletion(int donePct) => Ranks.First(r => donePct >= r.MinPct).Rank;

    public static (string Next, int AtPct)? NextRank(int donePct)
    {
        var higher = Ranks.Where(r => r.MinPct > donePct).OrderBy(r => r.MinPct).FirstOrDefault();
        return higher == default ? null : (higher.Rank, higher.MinPct);
    }
}

public static class ChapterRules
{
    /// <summary>Koraci koje poglavlje ima, zavisno od toga šta paket sadrži.</summary>
    public static IReadOnlyList<Step> StepsOf(ChapterFile c)
    {
        var steps = new List<Step> { Step.Lesson };
        if (!string.IsNullOrWhiteSpace(c.DeeperMarkdown)) steps.Add(Step.Deeper);
        if (c.Exercise is { Steps.Count: > 0 }) steps.Add(Step.Exercise);
        if (c.Test is { Count: > 0 }) steps.Add(Step.Test);
        return steps;
    }

    public static ChapterStatus Status(IReadOnlyList<Step> required, IReadOnlySet<Step> completed)
    {
        if (completed.Count == 0) return ChapterStatus.New;
        return required.All(completed.Contains) ? ChapterStatus.Done : ChapterStatus.InProgress;
    }

    public static int XpFor(Step step, XpRules xp) => step switch
    {
        Step.Lesson => xp.Lesson,
        Step.Deeper => xp.Deeper,
        Step.Exercise => xp.Lab,
        Step.Test => xp.Test,
        _ => 0
    };
}

public sealed record QuestionResult(int Index, int Chosen, int Correct, bool IsCorrect, string Why);

public sealed record GradeResult(int CorrectCount, int Total, int Percent, bool Passed, IReadOnlyList<QuestionResult> Questions);

public static class QuizGrader
{
    /// <param name="answers">Za svako pitanje indeks izabrane opcije u ORIGINALNOM redosledu (-1 = bez odgovora).</param>
    public static GradeResult Grade(IReadOnlyList<QuestionDef> test, IReadOnlyList<int> answers, int passPct)
    {
        if (test.Count == 0) throw new ArgumentException("Poglavlje nema test.", nameof(test));
        if (answers.Count != test.Count) throw new ArgumentException($"Očekuje se {test.Count} odgovora, stiglo je {answers.Count}.", nameof(answers));

        var results = test.Select((q, i) => new QuestionResult(i, answers[i], q.Correct, answers[i] == q.Correct, q.Why)).ToList();
        var correct = results.Count(r => r.IsCorrect);
        var pct = (int)Math.Round(correct * 100.0 / test.Count);
        return new GradeResult(correct, test.Count, pct, pct >= passPct, results);
    }
}

public static class StreakRules
{
    /// <summary>Broj uzastopnih dana sa aktivnošću, zaključno sa danas (ili juče, ako danas još nije bilo učenja).</summary>
    public static int Current(IEnumerable<DateOnly> activeDays, DateOnly today)
    {
        var days = activeDays.ToHashSet();
        var day = days.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;
        while (days.Contains(day))
        {
            streak++;
            day = day.AddDays(-1);
        }
        return streak;
    }
}
