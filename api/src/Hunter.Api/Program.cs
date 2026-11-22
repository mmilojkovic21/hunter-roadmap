using System.Text.Json.Serialization;
using Hunter.Api;
using Hunter.Api.Data;
using Hunter.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<HunterDb>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Db")
        ?? throw new InvalidOperationException("Nedostaje ConnectionStrings:Db")));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton(_ =>
{
    // Dan za niz učenja računa se po tvom vremenu, ne po UTC-u servera.
    var id = builder.Configuration["Hunter:TimeZone"] ?? "Europe/Belgrade";
    try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
    catch (TimeZoneNotFoundException) { return TimeZoneInfo.Utc; }
});
builder.Services.AddSingleton<PackCatalog>();   // singleton: keš paketa (vidi komentar u klasi)
builder.Services.AddScoped<PackImporter>();
builder.Services.AddScoped<ProgressService>();

builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();            // greške kao ProblemDetails, bez stack trace-a u produkciji
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

// Baza i seed pri pokretanju. Migracije (a ne EnsureCreated) jer EnsureCreated ne ume
// da izmeni postojeću šemu, a nove funkcije dodaju tabele i kolone (vodič, pogl. 12).
// Ponavljanje pokušaja: u docker compose-u API može da krene pre nego što baza primi veze.
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HunterDb>();
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            await db.Database.MigrateAsync();
            break;
        }
        catch (Exception ex) when (attempt < 10)
        {
            log.LogWarning("Baza još nije spremna ({Message}), pokušaj {Attempt}/10", ex.Message, attempt);
            await Task.Delay(TimeSpan.FromSeconds(2));
        }
    }
    var seedPath = app.Configuration["Hunter:PacksPath"] ?? Path.Combine(AppContext.BaseDirectory, "packs");
    await scope.ServiceProvider.GetRequiredService<PackImporter>().SeedFromFolderAsync(seedPath, CancellationToken.None);
}

app.MapHealthChecks("/api/health");
app.MapHunterApi();

app.Run();

public partial class Program;   // za integracione testove (WebApplicationFactory), faza 2
