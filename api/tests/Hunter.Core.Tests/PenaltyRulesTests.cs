using Hunter.Core.Progress;
using Xunit;

namespace Hunter.Core.Tests;

public class PenaltyRulesTests
{
    private static readonly DateOnly Today = new(2026, 11, 22);
    private static PastQuest Q(int daysAgo, bool completed) => new(Today.AddDays(-daysAgo), completed);

    [Fact]
    public void IsDue_YesterdayNotCompleted() =>
        Assert.True(PenaltyRules.IsDue(Today, [Q(2, true), Q(1, false)]));

    [Fact]
    public void IsDue_YesterdayCompleted_NoPenalty() =>
        Assert.False(PenaltyRules.IsDue(Today, [Q(2, false), Q(1, true)]));

    [Fact]
    public void IsDue_SkippedYesterdayAfterEarlierUse() =>
        Assert.True(PenaltyRules.IsDue(Today, [Q(3, true)]));

    [Fact]
    public void IsDue_FirstDay_NoPenalty() =>
        Assert.False(PenaltyRules.IsDue(Today, []));

    [Fact]
    public void IsDue_IgnoresTodaysQuest() =>
        Assert.False(PenaltyRules.IsDue(Today, [Q(0, false)]));

    [Fact]
    public void PickReview_TakesUntilTwentyMinutes()
    {
        var picked = PenaltyRules.PickReview([new("1", Step.Test, 8), new("2", Step.Test, 8), new("3", Step.Test, 8), new("4", Step.Test, 8)]);

        Assert.Equal(["1", "2", "3"], picked.Select(p => p.ChapterId));   // 8 + 8 = 16 < 20, treći dostiže 24
    }

    [Fact]
    public void PickReview_OneLongTestIsEnough() =>
        Assert.Single(PenaltyRules.PickReview([new("1", Step.Test, 25), new("2", Step.Test, 5)]));

    [Fact]
    public void PickReview_NoCandidates_Empty() =>
        Assert.Empty(PenaltyRules.PickReview([]));
}
