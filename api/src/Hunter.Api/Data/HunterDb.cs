using Microsoft.EntityFrameworkCore;

namespace Hunter.Api.Data;

// Sadržaj paketa (struktura i poglavlja) čuva se kao JSON (jsonb) jer se samo čita u celini.
// Napredak (koraci, testovi, XP) su prave tabele jer se po njima filtrira i sabira.

public class PackEntity
{
    public required string Id { get; set; }
    public required string Title { get; set; }
    public string Description { get; set; } = "";
    public string Language { get; set; } = "";
    public string Version { get; set; } = "";
    public string? Author { get; set; }
    public int ChapterCount { get; set; }
    public required string PackJson { get; set; }      // ceo pack.json (struktura, statistike, XP pravila)
    public DateTimeOffset ImportedAt { get; set; }
    public List<ChapterEntity> Chapters { get; set; } = [];
}

public class ChapterEntity
{
    public required string PackId { get; set; }
    public required string Id { get; set; }
    public int Order { get; set; }
    public required string Title { get; set; }
    public required string ContentJson { get; set; }   // jedno poglavlje iz chapters.json
}

public class StepCompletion
{
    public long Id { get; set; }
    public required string PackId { get; set; }
    public required string ChapterId { get; set; }
    public required string Step { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
}

public class TestAttempt
{
    public long Id { get; set; }
    public required string PackId { get; set; }
    public required string ChapterId { get; set; }
    public int CorrectCount { get; set; }
    public int Total { get; set; }
    public int Percent { get; set; }
    public bool Passed { get; set; }
    public int[] WrongQuestions { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>Svaki osvojeni XP je događaj. Ukupan XP, nivo i niz dana se računaju iz događaja.</summary>
public class XpEvent
{
    public long Id { get; set; }
    public required string PackId { get; set; }
    public string? ChapterId { get; set; }
    public required string Reason { get; set; }
    public int Amount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>
/// Dnevni zadatak paketa za jedan dan. Zadaci se biraju jednom i čuvaju (zaključani za taj dan);
/// da li je zadatak urađen ne čuva se ovde, nego se čita iz <see cref="StepCompletion"/>.
/// </summary>
public class DailyQuest
{
    public long Id { get; set; }
    public required string PackId { get; set; }
    public DateOnly Day { get; set; }                    // lokalni dan (Hunter:TimeZone), ne UTC
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }     // kad je završen poslednji zadatak; nagrada se računa iz ovoga
    public List<DailyQuestTask> Tasks { get; set; } = [];
}

public class DailyQuestTask
{
    public long Id { get; set; }
    public long DailyQuestId { get; set; }
    public int Order { get; set; }
    public required string ChapterId { get; set; }
    public required string Step { get; set; }
    public int Minutes { get; set; }
    /// <summary>Kazneni zadatak: ponovo položi test poglavlja (urađeno = prolaz posle nastanka zadatka).</summary>
    public bool IsReview { get; set; }
}

/// <summary>Jedan slobodan poen dodeljen statistici paketa. Potrošeni poeni = broj ovih redova.</summary>
public class StatPoint
{
    public long Id { get; set; }
    public required string PackId { get; set; }
    public required string StatKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class UserSettings
{
    public int Id { get; set; } = 1;  // aplikacija je lokalna, za jednog korisnika
    public string? ActivePackId { get; set; }
    public string Theme { get; set; } = "sistem";
    public bool Glow { get; set; } = true;
    public bool ReduceMotion { get; set; }
    public int DailyGoalMinutes { get; set; } = 60;
    public bool PenaltyEnabled { get; set; } = true;
}

public class HunterDb(DbContextOptions<HunterDb> options) : DbContext(options)
{
    public DbSet<PackEntity> Packs => Set<PackEntity>();
    public DbSet<ChapterEntity> Chapters => Set<ChapterEntity>();
    public DbSet<StepCompletion> StepCompletions => Set<StepCompletion>();
    public DbSet<TestAttempt> TestAttempts => Set<TestAttempt>();
    public DbSet<XpEvent> XpEvents => Set<XpEvent>();
    public DbSet<UserSettings> Settings => Set<UserSettings>();
    public DbSet<DailyQuest> DailyQuests => Set<DailyQuest>();
    public DbSet<StatPoint> StatPoints => Set<StatPoint>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<PackEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.PackJson).HasColumnType("jsonb");
            e.HasMany(x => x.Chapters).WithOne().HasForeignKey(c => c.PackId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<ChapterEntity>(e =>
        {
            e.HasKey(x => new { x.PackId, x.Id });
            e.Property(x => x.ContentJson).HasColumnType("jsonb");
        });
        b.Entity<StepCompletion>(e =>
        {
            // Jedinstven indeks: isti korak se ne može završiti (i naplatiti XP) dvaput.
            e.HasIndex(x => new { x.PackId, x.ChapterId, x.Step }).IsUnique();
        });
        b.Entity<TestAttempt>(e => e.HasIndex(x => new { x.PackId, x.ChapterId, x.CreatedAt }));
        b.Entity<XpEvent>(e => e.HasIndex(x => x.CreatedAt));
        b.Entity<DailyQuest>(e =>
        {
            // Jedan zadatak po paketu po danu; štiti i od dva istovremena prva učitavanja statusa.
            e.HasIndex(x => new { x.PackId, x.Day }).IsUnique();
            e.HasMany(x => x.Tasks).WithOne().HasForeignKey(t => t.DailyQuestId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<DailyQuestTask>().ToTable("DailyQuestTasks");
        b.Entity<StatPoint>(e => e.HasIndex(x => x.PackId));
        b.Entity<UserSettings>().HasData(new UserSettings { Id = 1 });
    }
}
