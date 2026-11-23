using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Hunter.Core.Progress;
using Xunit;

namespace Hunter.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class ApiTests(HunterApiFactory factory) : IAsyncLifetime
{
    // Isti JSON kao API: camelCase i enumi kao tekst (Program.cs).
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private readonly HttpClient _client = factory.CreateClient();

    // Primer paket: poglavlje 1 ima korake lekcija, vežba i test (2 pitanja, tačno je opcija 1 u oba).
    private const string Chapter = "1";

    public Task InitializeAsync() => factory.ResetProgressAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // ---------- uvoz paketa ----------

    [Fact]
    public async Task Startup_imports_seed_pack_and_makes_it_active()
    {
        var packs = await _client.GetFromJsonAsync<List<PackSummary>>("/api/packs", Json);

        var seed = Assert.Single(packs!);
        Assert.Equal(HunterApiFactory.SeedPackId, seed.Id);
        Assert.True(seed.IsActive);
        Assert.Equal(2, seed.ChapterCount);
    }

    [Fact]
    public async Task Upload_valid_zip_imports_pack_without_changing_active_pack()
    {
        var response = await UploadAsync(PackZip("upload-test"), "paket.zip");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<PackSummary>(Json);
        Assert.Equal("upload-test", summary!.Id);
        Assert.False(summary.IsActive);   // aktivan postaje samo prvi uvezen paket
    }

    [Fact]
    public async Task Upload_rejects_file_that_is_not_a_zip()
    {
        var response = await UploadAsync("ovo nije zip"u8.ToArray(), "paket.zip");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("nije ispravan zip", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Upload_rejects_zip_that_fails_validation()
    {
        // Paket pokazuje na poglavlje koje ne postoji u chapters.json.
        var response = await UploadAsync(PackZip("los-paket", pack => pack["regions"]![0]!["levels"]![0]!["chapters"] = new JsonArray("nema")), "paket.zip");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonObject>(Json);
        Assert.NotNull(problem!["errors"]!["pack"]);
        var packs = await _client.GetFromJsonAsync<List<PackSummary>>("/api/packs", Json);
        Assert.DoesNotContain(packs!, p => p.Id == "los-paket");
    }

    // ---------- aktivacija ----------

    [Fact]
    public async Task Activate_switches_active_pack()
    {
        await UploadAsync(PackZip("drugi-paket"), "paket.zip");

        var response = await _client.PostAsync("/api/packs/drugi-paket/activate", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var settings = await _client.GetFromJsonAsync<SettingsView>("/api/settings", Json);
        Assert.Equal("drugi-paket", settings!.ActivePackId);
    }

    [Fact]
    public async Task Scan_lines_are_on_by_default_and_can_be_turned_off()
    {
        var before = await _client.GetFromJsonAsync<SettingsView>("/api/settings", Json);
        Assert.True(before!.ScanLines);

        await _client.PutAsJsonAsync("/api/settings", before with { ScanLines = false }, Json);
        var after = await _client.GetFromJsonAsync<SettingsView>("/api/settings", Json);
        await _client.PutAsJsonAsync("/api/settings", before, Json);  // podešavanja deli cela klasa testova

        Assert.False(after!.ScanLines);
    }

    [Fact]
    public async Task Activate_unknown_pack_returns_404()
    {
        var response = await _client.PostAsync("/api/packs/ne-postoji/activate", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ---------- koraci i XP ----------

    [Fact]
    public async Task Completing_step_awards_xp_only_once()
    {
        var first = await CompleteAsync(Chapter, Step.Lesson);
        var second = await CompleteAsync(Chapter, Step.Lesson);

        Assert.Equal(50, first.XpAwarded);
        Assert.Equal(0, second.XpAwarded);
        Assert.Equal(50, (await StatusAsync()).Level.TotalXp);
    }

    [Fact]
    public async Task Test_step_cannot_be_completed_manually()
    {
        var response = await _client.PostAsync($"/api/chapters/{Chapter}/steps/Test", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------- test poglavlja ----------

    [Fact]
    public async Task Chapter_does_not_reveal_correct_answers_before_submit()
    {
        var body = await _client.GetStringAsync($"/api/chapters/{Chapter}");
        var test = JsonNode.Parse(body)!["test"]!.AsArray();

        Assert.NotEmpty(test);
        Assert.All(test, q =>
        {
            Assert.Null(q!["correct"]);
            Assert.Null(q["why"]);
        });
    }

    [Fact]
    public async Task Failed_test_gives_no_xp_and_is_saved_as_weak_point()
    {
        var result = await SubmitTestAsync(Chapter, [0, 0]);

        Assert.False(result.Grade.Passed);
        Assert.Equal(0, result.Xp.XpAwarded);
        Assert.Equal(2, (await StatusAsync()).WeakPoints.Count);
    }

    [Fact]
    public async Task Only_first_passed_test_gives_xp()
    {
        var first = await SubmitTestAsync(Chapter, [1, 1]);
        var second = await SubmitTestAsync(Chapter, [1, 1]);

        Assert.True(first.Grade.Passed);
        Assert.True(first.FirstPass);
        Assert.Equal(80, first.Xp.XpAwarded);
        Assert.False(second.FirstPass);
        Assert.Equal(0, second.Xp.XpAwarded);
        Assert.Equal(80, (await StatusAsync()).Level.TotalXp);
    }

    [Fact]
    public async Task Test_with_wrong_number_of_answers_is_rejected()
    {
        var response = await _client.PostAsJsonAsync($"/api/chapters/{Chapter}/test", new SubmitTestRequest([1]), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------- dnevni zadatak ----------
    // Primer paket: pogl. 1 (20 min: lekcija, vežba, test), pogl. 2 (25 min: lekcija, test).
    // Procena po težini: 1/Lesson 9, 1/Exercise 9, 1/Test 5, 2/Lesson 20, 2/Test 5 minuta.

    [Fact]
    public async Task Status_shows_daily_quest_tailored_to_goal()
    {
        var quest = (await StatusAsync()).DailyQuest!;

        // Cilj 60 min: prva tri (23 min) uvek, 2/Lesson (+20 = 43) staje, pa su 4 zadatka.
        Assert.Equal(["1:Lesson", "1:Exercise", "1:Test", "2:Lesson"], quest.Tasks.Select(t => $"{t.ChapterId}:{t.Step}"));
        Assert.Equal(43, quest.Minutes);
        Assert.Equal(0, quest.DoneCount);
        Assert.False(quest.Completed);
    }

    [Fact]
    public async Task Daily_quest_is_locked_for_the_day()
    {
        await StatusAsync();   // zadatak se pravi pri prvom statusu u danu
        await _client.PutAsJsonAsync("/api/settings", new SettingsView(HunterApiFactory.SeedPackId, "sistem", true, false, 10, true, true), Json);

        var quest = (await StatusAsync()).DailyQuest!;

        Assert.Equal(4, quest.Tasks.Count);   // sa ciljem 10 min bila bi 3, ali današnji je već zaključan
    }

    [Fact]
    public async Task Step_done_before_opening_status_counts_for_daily_quest()
    {
        await CompleteAsync(Chapter, Step.Lesson);

        var quest = (await StatusAsync()).DailyQuest!;

        Assert.True(quest.Tasks[0].Done);
        Assert.Equal(1, quest.DoneCount);
    }

    [Fact]
    public async Task Finishing_last_task_completes_daily_quest_once()
    {
        await StatusAsync();
        Assert.False((await CompleteAsync(Chapter, Step.Lesson)).QuestCompleted);
        Assert.False((await CompleteAsync(Chapter, Step.Exercise)).QuestCompleted);
        Assert.False((await SubmitTestAsync(Chapter, [1, 1])).Xp.QuestCompleted);

        var last = await CompleteAsync("2", Step.Lesson);
        var afterQuest = await SubmitTestAsync("2", [1]);   // korak van zadatka

        Assert.True(last.QuestCompleted);
        Assert.False(afterQuest.Xp.QuestCompleted);
        var quest = (await StatusAsync()).DailyQuest!;
        Assert.True(quest.Completed);
        Assert.Equal(4, quest.DoneCount);
    }

    // ---------- kazneni zadatak ----------

    [Fact]
    public async Task Unfinished_yesterday_puts_review_first_in_todays_quest()
    {
        await factory.SeedPenaltyAsync(yesterdayCompleted: false);

        var quest = (await StatusAsync()).DailyQuest!;

        Assert.True(quest.Penalty);
        var review = quest.Tasks[0];
        Assert.True(review.Review);
        Assert.Equal((Chapter, Step.Test), (review.ChapterId, review.Step));
        Assert.Equal(0, review.Xp);           // ponovljen test ne daje XP
        Assert.False(review.Done);            // jučerašnji prolaz se ne računa, mora ponovo danas
        Assert.All(quest.Tasks.Skip(1), t => Assert.False(t.Review));
    }

    [Fact]
    public async Task Passing_review_test_today_completes_review_task()
    {
        await factory.SeedPenaltyAsync(yesterdayCompleted: false);
        await StatusAsync();

        var result = await SubmitTestAsync(Chapter, [1, 1]);

        Assert.False(result.FirstPass);
        Assert.True((await StatusAsync()).DailyQuest!.Tasks[0].Done);
    }

    [Fact]
    public async Task Completed_yesterday_means_no_penalty()
    {
        await factory.SeedPenaltyAsync(yesterdayCompleted: true);

        Assert.False((await StatusAsync()).DailyQuest!.Penalty);
    }

    [Fact]
    public async Task Penalty_can_be_turned_off_in_settings()
    {
        await factory.SeedPenaltyAsync(yesterdayCompleted: false);
        await _client.PutAsJsonAsync("/api/settings", new SettingsView(HunterApiFactory.SeedPackId, "sistem", true, false, 60, false, true), Json);

        Assert.False((await StatusAsync()).DailyQuest!.Penalty);
    }

    // ---------- slobodni poeni ----------

    [Fact]
    public async Task No_free_points_at_start_so_allocation_is_rejected()
    {
        Assert.Equal(0, (await StatusAsync()).FreePoints);

        var response = await _client.PostAsync("/api/stats/LOG/points", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Level_ups_and_completed_quest_give_points_that_raise_a_stat()
    {
        await StatusAsync();
        await CompleteAsync(Chapter, Step.Lesson);
        await CompleteAsync(Chapter, Step.Exercise);
        await SubmitTestAsync(Chapter, [1, 1]);
        await CompleteAsync("2", Step.Lesson);   // 280 XP = nivo 3 (2 level-up-a) + završen dnevni zadatak

        Assert.Equal(3, (await StatusAsync()).FreePoints);

        // ETI (pogl. 2) je na 0%; LOG je već 100% jer je pogl. 1 očišćeno, pa se tamo bonus ne bi video.
        var response = await _client.PostAsync("/api/stats/ETI/points", null);
        var result = (await response.Content.ReadFromJsonAsync<AllocatePointResult>(Json))!;

        Assert.Equal(2, result.FreePoints);
        Assert.Equal(1, result.Stat.Points);
        Assert.Equal((0, 2), (result.Stat.Percent, result.Stat.Value));
        Assert.Equal(2, (await StatusAsync()).FreePoints);
    }

    [Fact]
    public async Task Allocating_to_unknown_stat_is_rejected()
    {
        var response = await _client.PostAsync("/api/stats/NEMA/points", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("nema statistiku", await response.Content.ReadAsStringAsync());
    }

    // ---------- boss test regiona ----------
    // Region I primer paketa = samo pogl. 1 (2 pitanja, tačna je opcija 1 u oba), pa je odgovor „sve 1” tačan
    // bez obzira na to kojim redom server izmeša pitanja.

    [Fact]
    public async Task Boss_is_locked_until_region_is_cleared()
    {
        Assert.Equal(BossState.Locked, (await RegionAsync("I")).Boss);

        var response = await _client.PostAsync("/api/regions/I/boss", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Boss_questions_come_without_correct_answers()
    {
        await ClearChapterOneAsync();

        var body = await (await _client.PostAsync("/api/regions/I/boss", null)).Content.ReadAsStringAsync();
        var questions = JsonNode.Parse(body)!["questions"]!.AsArray();

        Assert.Equal(2, questions.Count);   // region ima samo 2 pitanja, pa ih boss uzima sva
        Assert.All(questions, q => { Assert.Null(q!["correct"]); Assert.Null(q["why"]); });
    }

    [Fact]
    public async Task First_boss_win_gives_xp_and_marks_region_once()
    {
        await ClearChapterOneAsync();

        var first = await FightBossAsync("I", answer: 1);
        var second = await FightBossAsync("I", answer: 1);

        Assert.True(first.Grade.Passed);
        Assert.True(first.FirstClear);
        Assert.Equal(500, first.Xp.XpAwarded);
        Assert.False(second.FirstClear);
        Assert.Equal(0, second.Xp.XpAwarded);
        Assert.Equal(BossState.Cleared, (await RegionAsync("I")).Boss);
    }

    [Fact]
    public async Task Lost_boss_gives_nothing_and_stays_ready()
    {
        await ClearChapterOneAsync();

        var result = await FightBossAsync("I", answer: 0);

        Assert.False(result.Grade.Passed);
        Assert.Equal(0, result.Xp.XpAwarded);
        Assert.Equal(BossState.Ready, (await RegionAsync("I")).Boss);
    }

    [Fact]
    public async Task Boss_attempt_can_be_submitted_only_once()
    {
        await ClearChapterOneAsync();
        var boss = (await (await _client.PostAsync("/api/regions/I/boss", null)).Content.ReadFromJsonAsync<BossView>(Json))!;
        var answers = new SubmitTestRequest([1, 1]);

        var first = await _client.PostAsJsonAsync($"/api/boss/{boss.AttemptId}", answers, Json);
        var again = await _client.PostAsJsonAsync($"/api/boss/{boss.AttemptId}", answers, Json);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
    }

    private async Task ClearChapterOneAsync()
    {
        await CompleteAsync(Chapter, Step.Lesson);
        await CompleteAsync(Chapter, Step.Exercise);
        await SubmitTestAsync(Chapter, [1, 1]);
    }

    private async Task<BossResultView> FightBossAsync(string region, int answer)
    {
        var boss = (await (await _client.PostAsync($"/api/regions/{region}/boss", null)).Content.ReadFromJsonAsync<BossView>(Json))!;
        var response = await _client.PostAsJsonAsync($"/api/boss/{boss.AttemptId}",
            new SubmitTestRequest(boss.Questions.Select(_ => answer).ToList()), Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BossResultView>(Json))!;
    }

    private async Task<RegionView> RegionAsync(string code) =>
        (await _client.GetFromJsonAsync<MapView>("/api/map", Json))!.Regions.Single(r => r.Code == code);

    // ---------- pomoćno ----------

    private async Task<XpResult> CompleteAsync(string chapter, Step step)
    {
        var response = await _client.PostAsync($"/api/chapters/{chapter}/steps/{step}", null);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<XpResult>(Json))!;
    }

    private async Task<TestResultView> SubmitTestAsync(string chapter, int[] answers)
    {
        var response = await _client.PostAsJsonAsync($"/api/chapters/{chapter}/test", new SubmitTestRequest(answers), Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TestResultView>(Json))!;
    }

    private async Task<StatusView> StatusAsync() => (await _client.GetFromJsonAsync<StatusView>("/api/status", Json))!;

    private async Task<HttpResponseMessage> UploadAsync(byte[] bytes, string fileName)
    {
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        form.Add(file, "file", fileName);
        return await _client.PostAsync("/api/packs", form);
    }

    /// <summary>Zip od primer paketa sa drugim id-jem (i opcionom izmenom pack.json-a).</summary>
    private static byte[] PackZip(string id, Action<JsonObject>? change = null)
    {
        var dir = Path.Combine(AppContext.BaseDirectory, "packs", HunterApiFactory.SeedPackId);
        var pack = JsonNode.Parse(File.ReadAllText(Path.Combine(dir, "pack.json")))!.AsObject();
        pack["id"] = id;
        change?.Invoke(pack);

        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            Write(zip, "pack.json", pack.ToJsonString());
            Write(zip, "chapters.json", File.ReadAllText(Path.Combine(dir, "chapters.json")));
        }
        return ms.ToArray();

        static void Write(ZipArchive zip, string name, string content)
        {
            using var w = new StreamWriter(zip.CreateEntry(name).Open());
            w.Write(content);
        }
    }
}
