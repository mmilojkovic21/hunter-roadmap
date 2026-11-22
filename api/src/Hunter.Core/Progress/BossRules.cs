namespace Hunter.Core.Progress;

/// <summary>Jedno pitanje iz testa poglavlja: koje poglavlje i koje pitanje po redu.</summary>
public sealed record QuestionRef(string ChapterId, int Index);

public enum BossState { Locked, Ready, Cleared }

/// <summary>
/// Boss test regiona: kad su sva poglavlja regiona očišćena, 20–25 nasumičnih pitanja iz svih njegovih testova,
/// prolaz 80%. Prvi prolaz daje Boss XP iz paketa (podrazumevano 500) i oznaku na mapi.
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
    /// Nasumično bira 20–25 različitih pitanja (manji region daje sva svoja). <paramref name="rng"/> se ubacuje
    /// da bi test mogao da koristi seme i dobije uvek isti izbor.
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
