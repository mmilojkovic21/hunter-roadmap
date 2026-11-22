using System.IO.Compression;
using System.Text.Json;

namespace Hunter.Core.Packs;

/// <summary>Čita paket iz foldera ili iz .zip arhive i proverava ga pre upisa u bazu.</summary>
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
            // Fajlovi mogu biti u korenu ili u jednom podfolderu (kad se zipuje ceo folder).
            var pack = archive.Entries.FirstOrDefault(e => e.Name == PackFileName);
            var chapters = archive.Entries.FirstOrDefault(e => e.Name == ChaptersFileName);
            if (pack is null || chapters is null)
                return PackResult.Fail($"Zip mora da sadrži {PackFileName} i {ChaptersFileName}.");

            using var p = pack.Open();
            using var c = chapters.Open();
            return Parse(p, c);
        }
        // Nevažeći zip ne javlja uvek InvalidDataException: nad upload streamom (IFormFile) ZipArchive
        // pokuša da skoči van kraja kratkog fajla i baci ArgumentOutOfRangeException. Oba su „nije zip”, ne 500.
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
