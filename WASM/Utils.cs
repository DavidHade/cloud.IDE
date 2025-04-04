using System.Text.RegularExpressions;

namespace WASM;

public static partial class Utils
{
    [GeneratedRegex(@"using\s([\w\.]+)\;", RegexOptions.IgnoreCase, "en-US")]
    private static partial Regex UsingStatementRegex();
    
    public static IEnumerable<string> ExtractUsings(string text)
    {
        var matches = UsingStatementRegex().Matches(text);

        return matches.Select(x => x.Groups[1].Value);
    }

    public static HashSet<string> Combine(this HashSet<string> xs, IEnumerable<string> ys)
    {
        foreach (var s in ys) xs.Add(s);

        return xs;
    }
}