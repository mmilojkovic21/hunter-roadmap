using Hunter.Core.Progress;
using Xunit;

namespace Hunter.Core.Tests;

public class BossRulesTests
{
    private static List<QuestionRef> Pool(int n) => Enumerable.Range(0, n).Select(i => new QuestionRef($"c{i / 5}", i % 5)).ToList();

    [Fact]
    public void State_LockedUntilAllChaptersDone()
    {
        Assert.Equal(BossState.Locked, BossRules.State([ChapterStatus.Done, ChapterStatus.InProgress], cleared: false));
        Assert.Equal(BossState.Locked, BossRules.State([], cleared: false));
        Assert.Equal(BossState.Ready, BossRules.State([ChapterStatus.Done, ChapterStatus.Done], cleared: false));
    }

    [Fact]
    public void State_ClearedWins() =>
        Assert.Equal(BossState.Cleared, BossRules.State([ChapterStatus.Done], cleared: true));

    [Fact]
    public void PickQuestions_BigPool_TwentyToTwentyFiveDistinct()
    {
        for (var seed = 0; seed < 50; seed++)
        {
            var picked = BossRules.PickQuestions(Pool(80), new Random(seed));

            Assert.InRange(picked.Count, BossRules.MinQuestions, BossRules.MaxQuestions);
            Assert.Equal(picked.Count, picked.Distinct().Count());
        }
    }

    [Fact]
    public void PickQuestions_SmallPool_TakesAll()
    {
        var picked = BossRules.PickQuestions(Pool(7), new Random(1));

        Assert.Equal(7, picked.Count);
        Assert.Equal(Pool(7).ToHashSet(), picked.ToHashSet());
    }

    [Fact]
    public void PickQuestions_SameSeed_SameQuestions() =>
        Assert.Equal(BossRules.PickQuestions(Pool(80), new Random(42)), BossRules.PickQuestions(Pool(80), new Random(42)));
}
