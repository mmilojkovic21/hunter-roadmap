namespace Hunter.Core.Progress;

/// <summary>Jedan nezavršen korak koji može ući u dnevni zadatak, sa procenom trajanja.</summary>
public sealed record QuestCandidate(string ChapterId, Step Step, int Minutes);

/// <summary>
/// Dnevni zadatak: svakog dana 3–4 sledeća koraka, skrojena prema dnevnom cilju u minutima.
/// Bira se jednom dnevno i zaključava (servis ga čuva u bazi), pa se lista ne menja dok je rešavaš,
/// a sutra se pouzdano zna da li je jučerašnji zadatak završen (osnova za kazneni zadatak).
/// </summary>
public static class DailyQuestRules
{
    public const int MinTasks = 3;
    public const int MaxTasks = 4;

    // Udeo koraka u trajanju poglavlja. Paket daje samo ukupne minute poglavlja,
    // pa ih delimo po težini: lekcija i vežba nose najviše, test je najkraći.
    private static int Weight(Step step) => step switch
    {
        Step.Lesson => 4,
        Step.Deeper => 2,
        Step.Exercise => 4,
        Step.Test => 1,
        _ => 1
    };

    /// <summary>Procena minuta za jedan korak: deo minuta poglavlja srazmeran težini koraka, najmanje 5.</summary>
    public static int StepMinutes(Step step, IReadOnlyList<Step> chapterSteps, int chapterMinutes)
    {
        if (!chapterSteps.Contains(step)) throw new ArgumentException($"Poglavlje nema korak {step}.", nameof(step));
        var total = chapterSteps.Sum(Weight);
        return Math.Max(5, (int)Math.Round(chapterMinutes * (double)Weight(step) / total));
    }

    /// <summary>
    /// Bira zadatke redom iz sledećih koraka (redosled mape se poštuje, ništa se ne preskače).
    /// Prva 3 ulaze uvek, da dan ima smisla i kad je cilj kratak; 4. samo ako staje u cilj.
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
