using System.IO.Compression;
using System.Text.Json;

namespace Hunter.Core.Packs;

/// <summary>Reads a pack from a folder or a .zip archive and validates it before it is saved.</summary>
public static class PackReader
{
    public const string PackFileName = "pack.json";
    public const string ChaptersFileName = "chapters.json";
    public const long MaxZipBytes = 20 * 1024 * 1024;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static PackResult FromDirectory(string path)
    {
        var packPath = Path.Combine(path, PackFileName);
        var chaptersPath = Path.Combine(path, ChaptersFileName);
        if (!File.Exists(packPath) || !File.Exists(chaptersPath))
            return PackResult.Fail($"Folder mora da sadrži {PackFileName} i {ChaptersFileName}.");

        using var p = File.OpenRead(packPath);
        using var c = File.OpenRead(chaptersPath);
        return Parse(p, c);
    }

    public static PackResult FromZip(Stream zip)
    {
        try
        {
            using var archive = new ZipArchive(zip, ZipArchiveMode.Read, leaveOpen: true);
            // Files can be at the root or in one subfolder (when the whole folder is zipped).
            var pack = archive.Entries.FirstOrDefault(e => e.Name == PackFileName);
            var chapters = archive.Entries.FirstOrDefault(e => e.Name == ChaptersFileName);
            if (pack is null || chapters is null)
                return PackResult.Fail($"Zip mora da sadrži {PackFileName} i {ChaptersFileName}.");

            using var p = pack.Open();
            using var c = chapters.Open();
            return Parse(p, c);
        }
        // An invalid zip does not always raise InvalidDataException: on an upload stream (IFormFile) ZipArchive
        // tries to seek past the end of a short file and throws ArgumentOutOfRangeException. Both mean "not a zip", not a 500.
        catch (Exception ex) when (ex is InvalidDataException or ArgumentOutOfRangeException)
        {
            return PackResult.Fail("Fajl nije ispravan zip.");
        }
    }

    public static PackResult Parse(Stream packJson, Stream chaptersJson)
    {
        PackFile? pack;
        List<ChapterFile>? chapters;
        try
        {
            pack = JsonSerializer.Deserialize<PackFile>(packJson, Json);
            chapters = JsonSerializer.Deserialize<List<ChapterFile>>(chaptersJson, Json);
        }
        catch (JsonException ex)
        {
            return PackResult.Fail($"Neispravan JSON: {ex.Message}");
        }

        if (pack is null || chapters is null)
            return PackResult.Fail("Prazan pack.json ili chapters.json.");

        var loaded = new LoadedPack(pack, chapters);
        var errors = PackValidator.Validate(loaded);
        return errors.Count == 0 ? PackResult.Ok(loaded) : new PackResult(null, errors);
    }
}

public sealed record PackResult(LoadedPack? Pack, IReadOnlyList<string> Errors)
{
    public bool Success => Pack is not null;
    public static PackResult Ok(LoadedPack pack) => new(pack, []);
    public static PackResult Fail(string error) => new(null, [error]);
}
