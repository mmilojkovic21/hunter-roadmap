namespace Hunter.Core.Progress;

/// <summary>One unfinished step that can go into the daily quest, with an estimated duration.</summary>
public sealed record QuestCandidate(string ChapterId, Step Step, int Minutes);

/// <summary>
/// Daily quest: 3–4 next steps every day, sized to the daily goal in minutes.
/// It is picked once a day and locked (the service stores it), so the list does not change while you work on it,
/// and tomorrow it is certain whether yesterday's quest was finished (the basis for the penalty quest).
/// </summary>
public static class DailyQuestRules
{
    public const int MinTasks = 3;
    public const int MaxTasks = 4;

    /// <summary>Free points for a finished daily quest (see FreePointRules).</summary>
    public const int RewardPoints = 1;

    // Share of each step in the chapter's duration. The pack only gives total minutes per chapter,
    // so they are split by weight: lesson and exercise take the most, the test is the shortest.
    private static int Weight(Step step) => step switch
    {
        Step.Lesson => 4,
        Step.Deeper => 2,
        Step.Exercise => 4,
        Step.Test => 1,
        _ => 1
    };

    /// <summary>Estimated minutes for one step: the chapter's minutes in proportion to the step's weight, at least 5.</summary>
    public static int StepMinutes(Step step, IReadOnlyList<Step> chapterSteps, int chapterMinutes)
    {
        if (!chapterSteps.Contains(step)) throw new ArgumentException($"Poglavlje nema korak {step}.", nameof(step));
        var total = chapterSteps.Sum(Weight);
        return Math.Max(5, (int)Math.Round(chapterMinutes * (double)Weight(step) / total));
    }

    /// <summary>
    /// Picks tasks in order from the next steps (map order is kept, nothing is skipped).
    /// The first 3 always go in, so the day makes sense even with a short goal; the 4th only if it fits the goal.
    /// </summary>
    public static IReadOnlyList<QuestCandidate> Pick(IEnumerable<QuestCandidate> nextSteps, int goalMinutes)
    {
        var picked = new List<QuestCandidate>();
        var minutes = 0;
        foreach (var c in nextSteps)
        {
            if (picked.Count == MaxTasks) break;
            if (picked.Count >= MinTasks && minutes + c.Minutes > goalMinutes) break;
            picked.Add(c);
            minutes += c.Minutes;
        }
        return picked;
    }
}
