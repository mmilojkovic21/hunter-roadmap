namespace Hunter.Core.Progress;

/// <summary>The daily quest of an earlier day: the day and whether it was finished that day.</summary>
public sealed record PastQuest(DateOnly Day, bool Completed);

/// <summary>
/// Penalty quest: if yesterday's daily quest was not finished, today's starts with a review
/// of weak spots (about 20 min) before any new lesson. Turned on in settings (PenaltyEnabled).
/// </summary>
public static class PenaltyRules
{
    public const int ReviewMinutes = 20;

    /// <param name="past">The pack's daily quests before today (order does not matter).</param>
    public static bool IsDue(DateOnly today, IEnumerable<PastQuest> past)
    {
        var earlier = past.Where(q => q.Day < today).ToList();
        var yesterday = earlier.FirstOrDefault(q => q.Day == today.AddDays(-1));
        if (yesterday is not null) return !yesterday.Completed;

        // The app was not even opened yesterday, but was earlier: a missed day counts as an unfinished quest,
        // otherwise the penalty could be dodged by not opening the app. The first day of use has no penalty.
        return earlier.Count > 0;
    }

    /// <summary>
    /// Picks review tests in the order they come (weak spots first, the service decides that),
    /// until the total reaches <see cref="ReviewMinutes"/>. At least one, if there are candidates.
    /// </summary>
    public static IReadOnlyList<QuestCandidate> PickReview(IEnumerable<QuestCandidate> candidates)
    {
        var picked = new List<QuestCandidate>();
        var minutes = 0;
        foreach (var c in candidates)
        {
            if (minutes >= ReviewMinutes) break;
            picked.Add(c);
            minutes += c.Minutes;
        }
        return picked;
    }
}
