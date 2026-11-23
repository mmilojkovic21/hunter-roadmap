namespace Hunter.Core.Progress;

/// <summary>One question from a chapter test: which chapter and which question in order.</summary>
public sealed record QuestionRef(string ChapterId, int Index);

public enum BossState { Locked, Ready, Cleared }

/// <summary>
/// Region boss test: once every chapter of a region is cleared, 20–25 random questions from all of its tests,
/// pass mark 80%. The first win gives the pack's boss XP (500 by default) and a mark on the map.
/// </summary>
public static class BossRules
{
    public const int PassPct = 80;
    public const int MinQuestions = 20;
    public const int MaxQuestions = 25;

    public static BossState State(IReadOnlyCollection<ChapterStatus> regionChapters, bool cleared) =>
        cleared ? BossState.Cleared
        : regionChapters.Count > 0 && regionChapters.All(s => s == ChapterStatus.Done) ? BossState.Ready
        : BossState.Locked;

    /// <summary>
    /// Picks 20–25 distinct random questions (a smaller region gives all of its own). <paramref name="rng"/> is injected
    /// so a test can use a seed and always get the same pick.
    /// </summary>
    public static IReadOnlyList<QuestionRef> PickQuestions(IReadOnlyList<QuestionRef> pool, Random rng)
    {
        var count = Math.Min(pool.Count, rng.Next(MinQuestions, MaxQuestions + 1));
        var shuffled = pool.ToArray();
        for (var i = shuffled.Length - 1; i > 0; i--)   // Fisher–Yates
        {
            var j = rng.Next(i + 1);
            (shuffled[i], shuffled[j]) = (shuffled[j], shuffled[i]);
        }
        return shuffled.Take(count).ToList();
    }
}
