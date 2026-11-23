using Hunter.Core.Packs;
using Hunter.Core.Progress;
using Xunit;

namespace Hunter.Core.Tests;

public class LevelRulesTests
{
    [Fact]
    public void FromTotalXp_Zero_IsLevelOne()
    {
        var l = LevelRules.FromTotalXp(0);
        Assert.Equal(1, l.Level);
        Assert.Equal(0, l.XpIntoLevel);
        Assert.Equal(100, l.XpForNextLevel);
    }

    [Fact]
    public void FromTotalXp_ExactlyEnough_GoesToNextLevel()
    {
        Assert.Equal(2, LevelRules.FromTotalXp(100).Level);
        Assert.Equal(3, LevelRules.FromTotalXp(250).Level);   // 100 + 150
    }

    [Fact]
    public void FromTotalXp_OneShort_StaysOnLevel()
    {
        var l = LevelRules.FromTotalXp(249);
        Assert.Equal(2, l.Level);
        Assert.Equal(149, l.XpIntoLevel);
        Assert.Equal(150, l.XpForNextLevel);
    }

    [Fact]
    public void FromTotalXp_Negative_Throws() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => LevelRules.FromTotalXp(-1));
}

public class RankRulesTests
{
    [Fact]
    public void FromCompletion_Boundaries()
    {
        Assert.Equal("E", RankRules.FromCompletion(0));
        Assert.Equal("E", RankRules.FromCompletion(9));
        Assert.Equal("D", RankRules.FromCompletion(10));
        Assert.Equal("C", RankRules.FromCompletion(25));
        Assert.Equal("B", RankRules.FromCompletion(45));
        Assert.Equal("A", RankRules.FromCompletion(65));
        Assert.Equal("S", RankRules.FromCompletion(85));
        Assert.Equal("S", RankRules.FromCompletion(100));
    }

    [Fact]
    public void NextRank_FromC_IsBAt45()
    {
        var next = RankRules.NextRank(30);
        Assert.NotNull(next);
        Assert.Equal("B", next!.Value.Next);
        Assert.Equal(45, next.Value.AtPct);
    }

    [Fact]
    public void NextRank_AtS_IsNull() => Assert.Null(RankRules.NextRank(90));
}

public class QuizGraderTests
{
    private static readonly QuestionDef[] Test =
    [
        new("a", null, ["x", "y"], 0, "w"),
        new("b", null, ["x", "y"], 1, "w"),
        new("c", null, ["x", "y"], 1, "w"),
        new("d", null, ["x", "y"], 0, "w"),
    ];

    [Fact]
    public void Grade_ThreeOfFour_Is75AndPassesAt70()
    {
        var r = QuizGrader.Grade(Test, [0, 1, 1, 1], passPct: 70);
        Assert.Equal(3, r.CorrectCount);
        Assert.Equal(75, r.Percent);
        Assert.True(r.Passed);
        Assert.False(r.Questions[3].IsCorrect);
    }

    [Fact]
    public void Grade_UnansweredCountsAsWrong()
    {
        var r = QuizGrader.Grade(Test, [-1, -1, -1, 0], passPct: 70);
        Assert.Equal(1, r.CorrectCount);
        Assert.False(r.Passed);
    }

    [Fact]
    public void Grade_WrongAnswerCount_Throws() =>
        Assert.Throws<ArgumentException>(() => QuizGrader.Grade(Test, [0, 1], passPct: 70));
}

public class StreakRulesTests
{
    private static readonly DateOnly Today = new(2026, 11, 22);

    [Fact]
    public void Current_ThreeDaysEndingToday_Is3() =>
        Assert.Equal(3, StreakRules.Current([Today, Today.AddDays(-1), Today.AddDays(-2), Today.AddDays(-5)], Today));

    [Fact]
    public void Current_NothingToday_CountsFromYesterday() =>
        Assert.Equal(2, StreakRules.Current([Today.AddDays(-1), Today.AddDays(-2)], Today));

    [Fact]
    public void Current_GapBeforeYesterday_IsZero() =>
        Assert.Equal(0, StreakRules.Current([Today.AddDays(-2)], Today));

    [Fact]
    public void Current_PenaltySkippedToday_BreaksStreakImmediately() =>
        Assert.Equal(0, StreakRules.Current([Today.AddDays(-1), Today.AddDays(-2), Today.AddDays(-3)], Today, brokenOn: Today));

    [Fact]
    public void Current_LearningAfterSkip_StartsNewStreakFromSkipDay() =>
        Assert.Equal(2, StreakRules.Current([Today, Today.AddDays(-1), Today.AddDays(-2), Today.AddDays(-3)], Today, brokenOn: Today.AddDays(-1)));

    [Fact]
    public void Current_OldSkipBeforeStreak_ChangesNothing() =>
        Assert.Equal(2, StreakRules.Current([Today, Today.AddDays(-1)], Today, brokenOn: Today.AddDays(-10)));
}

public class ChapterRulesTests
{
    private static ChapterFile Chapter(string? deeper = null, bool exercise = false, bool test = false) =>
        new("1", "T", null, 30, null, null, "lekcija", deeper,
            exercise ? new ExerciseDef(["korak"], "gotovo") : null, null,
            test ? [new QuestionDef("q", null, ["a", "b"], 0, "w")] : null, null);

    [Fact]
    public void StepsOf_OnlyLesson() => Assert.Equal(new[] { Step.Lesson }, ChapterRules.StepsOf(Chapter()));

    [Fact]
    public void StepsOf_Full() =>
        Assert.Equal(new[] { Step.Lesson, Step.Deeper, Step.Exercise, Step.Test },
            ChapterRules.StepsOf(Chapter(deeper: "više", exercise: true, test: true)));

    [Fact]
    public void Status_PartialIsInProgress_AllIsDone()
    {
        var steps = ChapterRules.StepsOf(Chapter(exercise: true));
        Assert.Equal(ChapterStatus.New, ChapterRules.Status(steps, new HashSet<Step>()));
        Assert.Equal(ChapterStatus.InProgress, ChapterRules.Status(steps, new HashSet<Step> { Step.Lesson }));
        Assert.Equal(ChapterStatus.Done, ChapterRules.Status(steps, new HashSet<Step> { Step.Lesson, Step.Exercise }));
    }
}
