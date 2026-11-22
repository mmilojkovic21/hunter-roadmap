using System.IO.Compression;
using System.Text;
using Hunter.Core.Packs;
using Xunit;

namespace Hunter.Core.Tests;

public class PackTests
{
    private static string RepoPacks()
    {
        // Testovi se pokreću iz bin/..., pa tražimo folder packs/ naviše.
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "packs"))) dir = dir.Parent;
        return Path.Combine(dir?.FullName ?? throw new DirectoryNotFoundException("packs/"), "packs");
    }

    private const string MinimalPack = """
        { "format": "hunter-pack/1", "id": "filozofija-uvod", "title": "Uvod u filozofiju", "description": "",
          "language": "sr-Latn", "version": "1.0.0", "author": null, "passPct": 70,
          "xp": { "lesson": 50, "deeper": 30, "lab": 100, "test": 80, "boss": 500 },
          "stats": [ { "key": "LOG", "name": "Logika", "color": "#A78BFA" } ],
          "regions": [ { "code": "I", "title": "Antika", "stat": "LOG",
                         "levels": [ { "name": "TEMELJI", "chapters": ["1"] } ] } ] }
        """;

    private const string MinimalChapters = """
        [ { "id": "1", "title": "Sokrat", "subtitle": null, "minutes": 20, "externalRef": null, "intro": "",
            "lessonMarkdown": "Znam da ništa ne znam.", "deeperMarkdown": "",
            "exercise": { "steps": ["Napiši dijalog", "Pročitaj naglas", "Ispravi"], "done": "Dijalog ima 10 replika." },
            "cards": [], "sources": [],
            "test": [ { "text": "Ko je napisao Apologiju?", "code": null, "options": ["Platon", "Sokrat"], "correct": 0, "why": "Sokrat nije pisao." } ] } ]
        """;

    private static PackResult Parse(string pack, string chapters) =>
        PackReader.Parse(new MemoryStream(Encoding.UTF8.GetBytes(pack)), new MemoryStream(Encoding.UTF8.GetBytes(chapters)));

    [Fact]
    public void FullstackPack_InRepo_IsValid()
    {
        var r = PackReader.FromDirectory(Path.Combine(RepoPacks(), "fullstack-dotnet"));
        Assert.True(r.Success, string.Join("\n", r.Errors));
        Assert.Equal(80, r.Pack!.Chapters.Count);
        Assert.Equal(10, r.Pack.Pack.Regions.Count);
    }

    [Fact]
    public void NonItPack_IsValid() => Assert.True(Parse(MinimalPack, MinimalChapters).Success);

    [Fact]
    public void UnknownStat_IsReported()
    {
        var r = Parse(MinimalPack.Replace("\"stat\": \"LOG\"", "\"stat\": \"XYZ\""), MinimalChapters);
        Assert.False(r.Success);
        Assert.Contains(r.Errors, e => e.Contains("XYZ"));
    }

    [Fact]
    public void CorrectOutOfRange_IsReported()
    {
        var r = Parse(MinimalPack, MinimalChapters.Replace("\"correct\": 0", "\"correct\": 5"));
        Assert.Contains(r.Errors, e => e.Contains("nepostojeću opciju"));
    }

    [Fact]
    public void ChapterNotInStructure_IsReported()
    {
        var r = Parse(MinimalPack.Replace("[\"1\"]", "[]"), MinimalChapters);
        Assert.Contains(r.Errors, e => e.Contains("nije ni u jednom regionu"));
    }

    [Fact]
    public void BadId_IsReported()
    {
        var r = Parse(MinimalPack.Replace("filozofija-uvod", "Filozofija Uvod!"), MinimalChapters);
        Assert.False(r.Success);
    }

    [Fact]
    public void FromZip_FilesInSubfolder_Works()
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            Write(zip, "filozofija/pack.json", MinimalPack);
            Write(zip, "filozofija/chapters.json", MinimalChapters);
        }
        ms.Position = 0;
        Assert.True(PackReader.FromZip(ms).Success);
    }

    [Fact]
    public void FromZip_NotAZip_FailsCleanly()
    {
        var r = PackReader.FromZip(new MemoryStream(Encoding.UTF8.GetBytes("nije zip")));
        Assert.False(r.Success);
    }

    private static void Write(ZipArchive zip, string name, string content)
    {
        using var w = new StreamWriter(zip.CreateEntry(name).Open());
        w.Write(content);
    }
}
