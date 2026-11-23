using Hunter.Api.Data;
using Hunter.Api.Services;
using Hunter.Core.Packs;
using Hunter.Core.Progress;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace Hunter.Api;

public static class Endpoints
{
    private static readonly HashSet<string> Themes = ["sistem", "monarh", "crveni", "zlatni"];

    public static void MapHunterApi(this WebApplication app)
    {
        var api = app.MapGroup("/api");

        // ---------- paketi ----------
        api.MapGet("/packs", (ProgressService s, CancellationToken ct) => s.ListPacksAsync(ct));

        api.MapPost("/packs", async Task<Results<Ok<PackSummary>, ValidationProblem, BadRequest<string>>> (
            IFormFile file, PackImporter importer, ProgressService s, CancellationToken ct) =>
        {
            if (file.Length is 0 or > PackReader.MaxZipBytes) return TypedResults.BadRequest("Fajl je prazan ili veći od 20 MB.");
            if (!file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)) return TypedResults.BadRequest("Očekuje se .zip paket.");

            await using var stream = file.OpenReadStream();
            var result = PackReader.FromZip(stream);
            if (!result.Success)
                return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["pack"] = result.Errors.ToArray() });

            await importer.ImportAsync(result.Pack!, ct);
            var summary = (await s.ListPacksAsync(ct)).First(p => p.Id == result.Pack!.Pack.Id);
            return TypedResults.Ok(summary);
        })
        // Lokalna aplikacija bez prijave, pa nema kolačića sesije koje bi CSRF iskoristio (vodič, pogl. 15).
        // Kad aplikacija dobije naloge, ovo se uključuje.
        .DisableAntiforgery();

        api.MapPost("/packs/{id}/activate", async Task<Results<NoContent, NotFound>> (string id, HunterDb db, CancellationToken ct) =>
        {
            if (!await db.Packs.AnyAsync(p => p.Id == id, ct)) return TypedResults.NotFound();
            var settings = await db.Settings.SingleAsync(x => x.Id == 1, ct);
            settings.ActivePackId = id;
            await db.SaveChangesAsync(ct);
            return TypedResults.NoContent();
        });

        // ---------- status, mapa, poglavlja ----------
        api.MapGet("/status", async Task<Results<Ok<StatusView>, NotFound>> (ProgressService s, CancellationToken ct) =>
            await s.GetStatusAsync(ct) is { } v ? TypedResults.Ok(v) : TypedResults.NotFound());

        api.MapGet("/map", async Task<Results<Ok<MapView>, NotFound>> (ProgressService s, CancellationToken ct) =>
            await s.GetMapAsync(ct) is { } v ? TypedResults.Ok(v) : TypedResults.NotFound());

        api.MapGet("/chapters/{id}", async Task<Results<Ok<ChapterView>, NotFound>> (string id, ProgressService s, CancellationToken ct) =>
            await s.GetChapterAsync(id, ct) is { } v ? TypedResults.Ok(v) : TypedResults.NotFound());

        api.MapPost("/chapters/{id}/steps/{step}", async Task<Results<Ok<XpResult>, BadRequest<string>>> (
            string id, Step step, ProgressService s, CancellationToken ct) =>
        {
            var (result, error) = await s.CompleteStepAsync(id, step, ct);
            return result is not null ? TypedResults.Ok(result) : TypedResults.BadRequest(error!);
        });

        api.MapPost("/chapters/{id}/test", async Task<Results<Ok<TestResultView>, BadRequest<string>>> (
            string id, SubmitTestRequest body, ProgressService s, CancellationToken ct) =>
        {
            var (result, error) = await s.SubmitTestAsync(id, body.Answers ?? [], ct);
            return result is not null ? TypedResults.Ok(result) : TypedResults.BadRequest(error!);
        });

        // ---------- boss test regiona ----------
        api.MapPost("/regions/{code}/boss", async Task<Results<Ok<BossView>, BadRequest<string>>> (
            string code, ProgressService s, CancellationToken ct) =>
        {
            var (result, error) = await s.StartBossAsync(code, ct);
            return result is not null ? TypedResults.Ok(result) : TypedResults.BadRequest(error!);
        });

        api.MapPost("/boss/{attemptId:long}", async Task<Results<Ok<BossResultView>, BadRequest<string>>> (
            long attemptId, SubmitTestRequest body, ProgressService s, CancellationToken ct) =>
        {
            var (result, error) = await s.SubmitBossAsync(attemptId, body.Answers ?? [], ct);
            return result is not null ? TypedResults.Ok(result) : TypedResults.BadRequest(error!);
        });

        // ---------- slobodni poeni ----------
        api.MapPost("/stats/{key}/points", async Task<Results<Ok<AllocatePointResult>, BadRequest<string>>> (
            string key, ProgressService s, CancellationToken ct) =>
        {
            var (result, error) = await s.AllocatePointAsync(key, ct);
            return result is not null ? TypedResults.Ok(result) : TypedResults.BadRequest(error!);
        });

        // Preskakanje kaznenog zadatka: odmah prekida niz (StreakRules), druge kazne nema.
        api.MapPost("/penalty/skip", async Task<Results<Ok<PenaltySkipResult>, Conflict<string>>> (ProgressService s, CancellationToken ct) =>
        {
            var (result, error) = await s.SkipPenaltyAsync(ct);
            return result is not null ? TypedResults.Ok(result) : TypedResults.Conflict(error!);
        });

        // ---------- podešavanja ----------
        api.MapGet("/settings", async (HunterDb db, CancellationToken ct) =>
        {
            var s = await db.Settings.AsNoTracking().SingleAsync(x => x.Id == 1, ct);
            return new SettingsView(s.ActivePackId, s.Theme, s.Glow, s.ReduceMotion, s.DailyGoalMinutes, s.PenaltyEnabled, s.ScanLines);
        });

        api.MapPut("/settings", async Task<Results<Ok<SettingsView>, BadRequest<string>>> (SettingsView body, HunterDb db, CancellationToken ct) =>
        {
            if (!Themes.Contains(body.Theme)) return TypedResults.BadRequest($"Nepoznata tema '{body.Theme}'.");
            if (body.DailyGoalMinutes is < 10 or > 600) return TypedResults.BadRequest("Dnevni cilj mora biti 10–600 minuta.");
            var s = await db.Settings.SingleAsync(x => x.Id == 1, ct);
            s.Theme = body.Theme;
            s.Glow = body.Glow;
            s.ReduceMotion = body.ReduceMotion;
            s.DailyGoalMinutes = body.DailyGoalMinutes;
            s.PenaltyEnabled = body.PenaltyEnabled;
            s.ScanLines = body.ScanLines;
            await db.SaveChangesAsync(ct);
            return TypedResults.Ok(new SettingsView(s.ActivePackId, s.Theme, s.Glow, s.ReduceMotion, s.DailyGoalMinutes, s.PenaltyEnabled, s.ScanLines));
        });
    }
}
