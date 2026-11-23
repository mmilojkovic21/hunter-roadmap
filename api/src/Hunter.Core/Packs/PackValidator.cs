using System.Text.RegularExpressions;

namespace Hunter.Core.Packs;

/// <summary>
/// Rules a pack must meet. tools/build_content.py checks the same rules,
/// but they are checked again here because a pack can come from anyone (upload).
/// </summary>
public static partial class PackValidator
{
    public const string SupportedFormat = "hunter-pack/1";

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{1,62}$")]
    private static partial Regex PackIdRegex();

    public static List<string> Validate(LoadedPack loaded)
    {
        var (pack, chapters) = (loaded.Pack, loaded.Chapters);
        var e = new List<string>();

        if (pack.Format != SupportedFormat) e.Add($"Nepodržan format '{pack.Format}', očekuje se '{SupportedFormat}'.");
        if (string.IsNullOrWhiteSpace(pack.Id) || !PackIdRegex().IsMatch(pack.Id))
            e.Add("id paketa: mala slova, cifre i crtice, 2–63 znaka (npr. 'cybersecurity-osnove').");
        if (string.IsNullOrWhiteSpace(pack.Title)) e.Add("Paket nema naslov.");
        if (pack.PassPct is < 1 or > 100) e.Add("passPct mora biti između 1 i 100.");
        if (pack.Stats is null || pack.Stats.Count == 0) e.Add("Paket mora da definiše bar jednu statistiku.");
        if (pack.Regions is null || pack.Regions.Count == 0) e.Add("Paket nema nijedan region.");
        if (e.Count > 0) return e;

        var statKeys = pack.Stats!.Select(s => s.Key).ToHashSet();
        var ids = new HashSet<string>();
        foreach (var c in chapters)
            if (string.IsNullOrWhiteSpace(c.Id) || !ids.Add(c.Id))
                e.Add($"Poglavlje bez id-a ili sa duplim id-em: '{c.Id}'.");

        var referenced = new HashSet<string>();
        foreach (var r in pack.Regions!)
        {
            if (!statKeys.Contains(r.Stat)) e.Add($"Region {r.Code}: statistika '{r.Stat}' nije definisana.");
            foreach (var l in r.Levels)
            foreach (var id in l.Chapters)
            {
                if (!ids.Contains(id)) e.Add($"Region {r.Code}: poglavlje '{id}' ne postoji u chapters.json.");
                if (!referenced.Add(id)) e.Add($"Poglavlje '{id}' je navedeno više puta u strukturi.");
            }
        }
        foreach (var orphan in ids.Except(referenced))
            e.Add($"Poglavlje '{orphan}' nije ni u jednom regionu.");

        foreach (var c in chapters)
        {
            var hasContent = !string.IsNullOrWhiteSpace(c.LessonMarkdown) || !string.IsNullOrWhiteSpace(c.ExternalRef);
            if (!hasContent) e.Add($"Poglavlje {c.Id}: nema ni lekciju ni externalRef.");

            var test = c.Test ?? [];
            for (var i = 0; i < test.Count; i++)
            {
                var q = test[i];
                if (q.Options is null || q.Options.Count < 2)
                    e.Add($"Poglavlje {c.Id}, pitanje {i + 1}: treba bar 2 opcije.");
                else if (q.Correct < 0 || q.Correct >= q.Options.Count)
                    e.Add($"Poglavlje {c.Id}, pitanje {i + 1}: 'correct' pokazuje na nepostojeću opciju.");
                if (string.IsNullOrWhiteSpace(q.Why))
                    e.Add($"Poglavlje {c.Id}, pitanje {i + 1}: nema objašnjenje.");
            }
            foreach (var s in c.Sources ?? [])
                if (!Uri.TryCreate(s.Url, UriKind.Absolute, out var u) || (u.Scheme != "https" && u.Scheme != "http"))
                    e.Add($"Poglavlje {c.Id}: izvor '{s.Title}' nema ispravan http(s) link.");
        }
        return e;
    }
}
