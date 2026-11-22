using System.Collections.Concurrent;
using System.Text.Json;
using Hunter.Api.Data;
using Hunter.Core.Packs;
using Microsoft.EntityFrameworkCore;

namespace Hunter.Api.Services;

/// <summary>
/// Drži učitane pakete u memoriji da se JSON ne parsira pri svakom zahtevu.
/// Singleton je, pa ne sme da drži DbContext (scoped): to bi bila captive dependency (vodič, pogl. 9).
/// Zato za svako čitanje pravi svoj scope.
/// </summary>
public sealed class PackCatalog(IServiceScopeFactory scopes)
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ConcurrentDictionary<string, LoadedPack> _cache = new();

    public async Task<LoadedPack?> GetAsync(string packId, CancellationToken ct)
    {
        if (_cache.TryGetValue(packId, out var hit)) return hit;

        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HunterDb>();
        var pack = await db.Packs.AsNoTracking().FirstOrDefaultAsync(p => p.Id == packId, ct);
        if (pack is null) return null;

        var chapters = await db.Chapters.AsNoTracking()
            .Where(c => c.PackId == packId).OrderBy(c => c.Order)
            .Select(c => c.ContentJson).ToListAsync(ct);

        var loaded = new LoadedPack(
            JsonSerializer.Deserialize<PackFile>(pack.PackJson, Json)!,
            chapters.Select(j => JsonSerializer.Deserialize<ChapterFile>(j, Json)!).ToList());
        _cache[packId] = loaded;
        return loaded;
    }

    public void Invalidate(string packId) => _cache.TryRemove(packId, out _);
}
