using System.Text.Json;
using Hunter.Api.Data;
using Hunter.Core.Packs;
using Microsoft.EntityFrameworkCore;

namespace Hunter.Api.Services;

public sealed class PackImporter(HunterDb db, PackCatalog catalog, TimeProvider clock, ILogger<PackImporter> log)
{
    /// <summary>
    /// Upisuje paket (novi ili nova verzija postojećeg). Napredak korisnika se ne dira:
    /// vezan je za id paketa i id poglavlja, pa ostaje i kad se sadržaj izmeni.
    /// </summary>
    public async Task<PackEntity> ImportAsync(LoadedPack loaded, CancellationToken ct)
    {
        var (pack, chapters) = (loaded.Pack, loaded.Chapters);
        var order = pack.Regions.SelectMany(r => r.Levels).SelectMany(l => l.Chapters)
            .Select((id, i) => (id, i)).ToDictionary(x => x.id, x => x.i);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var existing = await db.Packs.Include(p => p.Chapters).FirstOrDefaultAsync(p => p.Id == pack.Id, ct);
        if (existing is not null)
        {
            db.Chapters.RemoveRange(existing.Chapters);
            db.Packs.Remove(existing);
            await db.SaveChangesAsync(ct);
        }

        var entity = new PackEntity
        {
            Id = pack.Id,
            Title = pack.Title,
            Description = pack.Description,
            Language = pack.Language,
            Version = pack.Version,
            Author = pack.Author,
            ChapterCount = chapters.Count,
            PackJson = JsonSerializer.Serialize(pack, PackCatalog.Json),
            ImportedAt = clock.GetUtcNow(),
            Chapters = chapters.Select(c => new ChapterEntity
            {
                PackId = pack.Id,
                Id = c.Id,
                Order = order[c.Id],
                Title = c.Title,
                ContentJson = JsonSerializer.Serialize(c, PackCatalog.Json)
            }).ToList()
        };
        db.Packs.Add(entity);

        var settings = await db.Settings.SingleAsync(s => s.Id == 1, ct);
        settings.ActivePackId ??= pack.Id;   // prvi uvezen paket postaje aktivan

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        catalog.Invalidate(pack.Id);

        log.LogInformation("Uvezen paket {PackId} v{Version}: {Count} poglavlja", pack.Id, pack.Version, chapters.Count);
        return entity;
    }

    /// <summary>Pri pokretanju uvozi sve pakete iz foldera (npr. /packs u kontejneru) čija verzija nije već u bazi.</summary>
    public async Task SeedFromFolderAsync(string root, CancellationToken ct)
    {
        if (!Directory.Exists(root))
        {
            log.LogWarning("Folder sa paketima {Root} ne postoji, preskačem seed", root);
            return;
        }
        foreach (var dir in Directory.GetDirectories(root).Order())
        {
            var result = PackReader.FromDirectory(dir);
            if (!result.Success)
            {
                log.LogError("Paket u {Dir} nije ispravan: {Errors}", dir, string.Join(" | ", result.Errors));
                continue;
            }
            var p = result.Pack!.Pack;
            var current = await db.Packs.AsNoTracking().Where(x => x.Id == p.Id).Select(x => x.Version).FirstOrDefaultAsync(ct);
            if (current == p.Version) continue;
            await ImportAsync(result.Pack, ct);
        }
    }
}
