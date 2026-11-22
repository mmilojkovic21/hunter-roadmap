namespace Hunter.Core.Progress;

/// <summary>
/// Slobodni poeni: dobijaju se za svaki novi nivo i za svaki završen dnevni zadatak, a dodeljuju se statistici
/// na koju se fokusiraš. Kao i XP, ne čuvaju se kao broj: zarađeno se računa iz nivoa i završenih zadataka,
/// potrošeno iz upisanih dodela, pa stanje ne može da se raskorači sa istorijom.
/// </summary>
public static class FreePointRules
{
    public const int PerLevelUp = 1;

    /// <summary>Koliko jedan dodeljen poen podiže vrednost statistike (dizajn: +2 po poenu).</summary>
    public const int StatBonusPerPoint = 2;

    public static int Earned(int level, int completedQuests)
    {
        if (level < 1) throw new ArgumentOutOfRangeException(nameof(level));
        if (completedQuests < 0) throw new ArgumentOutOfRangeException(nameof(completedQuests));
        return (level - 1) * PerLevelUp + completedQuests * DailyQuestRules.RewardPoints;
    }

    public static int Available(int earned, int spent) => Math.Max(0, earned - spent);

    /// <summary>
    /// Vrednost statistike na kartici: procenat očišćenih poglavlja oblasti plus bonus od poena, najviše 100.
    /// Rang i dalje zavisi samo od očišćenih poglavlja (RankRules), pa poeni ne mogu da „kupe” rang.
    /// </summary>
    public static int StatValue(int completionPct, int points) =>
        Math.Min(100, completionPct + points * StatBonusPerPoint);
}
