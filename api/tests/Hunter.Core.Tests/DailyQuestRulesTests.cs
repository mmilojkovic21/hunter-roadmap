using Hunter.Core.Progress;
using Xunit;

namespace Hunter.Core.Tests;

public class DailyQuestRulesTests
{
    private static QuestCandidate C(string id, int minutes) => new(id, Step.Lesson, minutes);

    [Fact]
    public void Pick_TakesFourWhenTheyFitTheGoal()
    {
        var picked = DailyQuestRules.Pick([C("1", 15), C("2", 15), C("3", 15), C("4", 15), C("5", 15)], goalMinutes: 60);

        Assert.Equal(["1", "2", "3", "4"], picked.Select(p => p.ChapterId));
    }

    [Fact]
    public void Pick_StopsAtThreeWhenFourthDoesNotFit()
    {
        var picked = DailyQuestRules.Pick([C("1", 20), C("2", 20), C("3", 20), C("4", 20)], goalMinutes: 60);

        Assert.Equal(3, picked.Count);
    }

    [Fact]
    public void Pick_AlwaysTakesThreeEvenWhenGoalIsShort()
    {
        var picked = DailyQuestRules.Pick([C("1", 30), C("2", 30), C("3", 30), C("4", 5)], goalMinutes: 20);

        Assert.Equal(["1", "2", "3"], picked.Select(p => p.ChapterId));
    }

    [Fact]
    public void Pick_KeepsMapOrder()
    {
        // 4. korak (90 min) ne staje; ne preskače se da bi ušao kraći 5. korak.
        var picked = DailyQuestRules.Pick([C("1", 10), C("2", 10), C("3", 10), C("4", 90), C("5", 5)], goalMinutes: 60);

        Assert.Equal(["1", "2", "3"], picked.Select(p => p.ChapterId));
    }

    [Fact]
    public void Pick_TakesWhatIsLeftNearEndOfPack()
    {
        Assert.Equal(2, DailyQuestRules.Pick([C("1", 10), C("2", 10)], 60).Count);
        Assert.Empty(DailyQuestRules.Pick([], 60));
    }

    [Fact]
    public void StepMinutes_SplitsChapterByWeight()
    {
        Step[] all = [Step.Lesson, Step.Deeper, Step.Exercise, Step.Test];   // težine 4 + 2 + 4 + 1 = 11

        Assert.Equal(40, DailyQuestRules.StepMinutes(Step.Lesson, all, 110));
        Assert.Equal(20, DailyQuestRules.StepMinutes(Step.Deeper, all, 110));
        Assert.Equal(10, DailyQuestRules.StepMinutes(Step.Test, all, 110));
    }

    [Fact]
    public void StepMinutes_HasFiveMinuteFloor() =>
        Assert.Equal(5, DailyQuestRules.StepMinutes(Step.Test, [Step.Lesson, Step.Test], 10));

    [Fact]
    public void StepMinutes_UnknownStep_Throws() =>
        Assert.Throws<ArgumentException>(() => DailyQuestRules.StepMinutes(Step.Deeper, [Step.Lesson], 30));
}
