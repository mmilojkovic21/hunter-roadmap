namespace Hunter.Core.Progress;

/// <summary>Dnevni zadatak nekog ranijeg dana: dan i da li je završen tog dana.</summary>
public sealed record PastQuest(DateOnly Day, bool Completed);

/// <summary>
/// Kazneni zadatak: ako jučerašnji dnevni zadatak nije završen, današnji počinje ponavljanjem
/// slabih tačaka (oko 20 min) pre nove lekcije. Uključuje se u podešavanjima (PenaltyEnabled).
/// </summary>
public static class PenaltyRules
{
    public const int ReviewMinutes = 20;

    /// <param name="past">Dnevni zadaci paketa pre danas (redosled nije bitan).</param>
    public static bool IsDue(DateOnly today, IEnumerable<PastQuest> past)
    {
        var earlier = past.Where(q => q.Day < today).ToList();
        var yesterday = earlier.FirstOrDefault(q => q.Day == today.AddDays(-1));
        if (yesterday is not null) return !yesterday.Completed;

        // Juče nije ni otvorena aplikacija, a ranije jeste: propušten dan se računa kao nezavršen zadatak,
        // inače bi se kazna izbegavala tako što se aplikacija ne otvori. Prvi dan korišćenja nema kazne.
        return earlier.Count > 0;
    }

    /// <summary>
    /// Bira testove za ponavljanje redom kojim stižu (slabe tačke prvo, to određuje servis),
    /// dok zbir ne dostigne <see cref="ReviewMinutes"/>. Najmanje jedan, ako ima kandidata.
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
