using Hunter.Core.Progress;
using Xunit;

namespace Hunter.Core.Tests;

public class FreePointRulesTests
{
    [Fact]
    public void Earned_LevelOneNoQuests_IsZero() =>
        Assert.Equal(0, FreePointRules.Earned(level: 1, completedQuests: 0));

    [Fact]
    public void Earned_CountsLevelUpsAndQuests() =>
        Assert.Equal(5, FreePointRules.Earned(level: 3, completedQuests: 3));   // 2 level-up-a + 3 zadatka

    [Fact]
    public void Earned_InvalidInput_Throws()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => FreePointRules.Earned(0, 0));
        Assert.Throws<ArgumentOutOfRangeException>(() => FreePointRules.Earned(1, -1));
    }

    [Fact]
    public void Available_NeverNegative()
    {
        Assert.Equal(2, FreePointRules.Available(earned: 5, spent: 3));
        Assert.Equal(0, FreePointRules.Available(earned: 1, spent: 2));
    }

    [Fact]
    public void StatValue_AddsTwoPerPointCappedAt100()
    {
        Assert.Equal(16, FreePointRules.StatValue(completionPct: 10, points: 3));
        Assert.Equal(100, FreePointRules.StatValue(completionPct: 95, points: 5));
    }
}
