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

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder().WithImage("postgres:17").Build();

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
        await db.StepCompletions.ExecuteDeleteAsync();
        await db.TestAttempts.ExecuteDeleteAsync();
        await db.Packs.Where(p => p.Id != SeedPackId).ExecuteDeleteAsync();
        await db.Settings.ExecuteUpdateAsync(s => s.SetProperty(x => x.ActivePackId, SeedPackId));
    }
}

/// <summary>Svi API testovi dele jednu bazu, pa se izvršavaju redom (xUnit ne paralelizuje unutar kolekcije).</summary>
[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<HunterApiFactory>
{
    public const string Name = "api";
}
