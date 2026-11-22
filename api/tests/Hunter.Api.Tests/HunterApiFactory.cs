using Hunter.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Xunit;

namespace Hunter.Api.Tests;

/// <summary>
/// Pravi API (Program.cs) nad pravom PostgreSQL bazom u kontejneru.
/// Pri startu API primeni migracije i uveze primer paket iz packs/, kao u produkciji.
/// Jedna baza za sve testove (brže od kontejnera po testu); <see cref="ResetProgressAsync"/> briše napredak između testova.
/// </summary>
public sealed class HunterApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string SeedPackId = "primer-filozofija";

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder("postgres:17").Build();

    public async Task InitializeAsync() => await _db.StartAsync();

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Testing" umesto "Development": appsettings.Development.json bi ubacio localhost bazu.
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Db", _db.GetConnectionString());
        builder.UseSetting("Hunter:PacksPath", Path.Combine(AppContext.BaseDirectory, "packs"));
    }

    /// <summary>Briše napredak i ostale pakete, a seed paket vraća kao aktivan.</summary>
    public async Task ResetProgressAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HunterDb>();
        await db.XpEvents.ExecuteDeleteAsync();
        await db.DailyQuests.ExecuteDeleteAsync();
        await db.StatPoints.ExecuteDeleteAsync();
        await db.StepCompletions.ExecuteDeleteAsync();
        await db.TestAttempts.ExecuteDeleteAsync();
        await db.Packs.Where(p => p.Id != SeedPackId).ExecuteDeleteAsync();
        await db.Settings.ExecuteUpdateAsync(s => s
            .SetProperty(x => x.ActivePackId, SeedPackId)
            .SetProperty(x => x.DailyGoalMinutes, 60)
            .SetProperty(x => x.PenaltyEnabled, true));
    }

    /// <summary>
    /// Stanje za kazneni zadatak: test poglavlja 1 položen juče (sa jednom greškom, pa je slaba tačka)
    /// i jučerašnji dnevni zadatak, završen ili ne. Upisuje se direktno, jer API ne ume da „vrati sat”.
    /// </summary>
    public async Task SeedPenaltyAsync(bool yesterdayCompleted)
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HunterDb>();
        var zone = scope.ServiceProvider.GetRequiredService<TimeZoneInfo>();
        var yesterdayAt = DateTimeOffset.UtcNow.AddDays(-1);
        var yesterday = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(yesterdayAt, zone).DateTime);

        db.StepCompletions.Add(new StepCompletion { PackId = SeedPackId, ChapterId = "1", Step = "Test", CompletedAt = yesterdayAt });
        db.TestAttempts.Add(new TestAttempt
        {
            PackId = SeedPackId, ChapterId = "1", CorrectCount = 1, Total = 2, Percent = 50, Passed = true,
            WrongQuestions = [0], CreatedAt = yesterdayAt
        });
        db.DailyQuests.Add(new DailyQuest
        {
            PackId = SeedPackId, Day = yesterday, CreatedAt = yesterdayAt,
            CompletedAt = yesterdayCompleted ? yesterdayAt : null,
            Tasks = [new DailyQuestTask { Order = 0, ChapterId = "1", Step = "Lesson", Minutes = 9 }]
        });
        await db.SaveChangesAsync();
    }
}

/// <summary>Svi API testovi dele jednu bazu, pa se izvršavaju redom (xUnit ne paralelizuje unutar kolekcije).</summary>
[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<HunterApiFactory>
{
    public const string Name = "api";
}
