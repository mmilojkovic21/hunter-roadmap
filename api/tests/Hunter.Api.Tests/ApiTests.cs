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
