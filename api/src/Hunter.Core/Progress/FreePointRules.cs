namespace Hunter.Core.Progress;

/// <summary>
/// Free points: earned for every new level and every finished daily quest, and assigned to the stat
/// you focus on. Like XP, they are not stored as a number: earned points come from levels and finished quests,
/// spent points from recorded allocations, so the balance can never drift from the history.
/// </summary>
public static class FreePointRules
{
    public const int PerLevelUp = 1;

    /// <summary>How much one assigned point raises a stat (design: +2 per point).</summary>
    public const int StatBonusPerPoint = 2;

    public static int Earned(int level, int completedQuests)
    {
        if (level < 1) throw new ArgumentOutOfRangeException(nameof(level));
        if (completedQuests < 0) throw new ArgumentOutOfRangeException(nameof(completedQuests));
        return (level - 1) * PerLevelUp + completedQuests * DailyQuestRules.RewardPoints;
    }

    public static int Available(int earned, int spent) => Math.Max(0, earned - spent);

    /// <summary>
    /// Stat value shown on the card: percentage of the area's cleared chapters plus the point bonus, at most 100.
    /// Rank still depends only on cleared chapters (RankRules), so points cannot "buy" a rank.
    /// </summary>
    public static int StatValue(int completionPct, int points) =>
        Math.Min(100, completionPct + points * StatBonusPerPoint);
}
