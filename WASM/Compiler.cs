using System.Diagnostics;
using System.Runtime.InteropServices.JavaScript;
using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace WASM;

public static partial class Compiler
{
    static CSharpCompilationOptions CompilationOptions(IEnumerable<string> additionalUsings)
        => new(
            OutputKind.DynamicallyLinkedLibrary,
            concurrentBuild: false,
            checkOverflow: true,
            optimizationLevel: OptimizationLevel.Release,
            usings: Constants.DefaultUsings.Combine(additionalUsings));
    
    [JSExport]
    public static async Task Compile(string src)
    {
        try
        {
            var sw = Stopwatch.StartNew();
            await CompileInternal(src);
            Console.WriteLine("dbg: Finished in {0} ms", sw.ElapsedMilliseconds);
        }
        catch (Exception e)
        {
            Console.WriteLine($"dbg: ERROR: {e.Message}");
        }
    }

    [JSExport]
    public static async Task PreloadReferences()
    {
        try
        {
            _ = await AssemblyLoader.PreloadReferenceAssemblies();
        }
        catch (Exception e)
        {
            Console.WriteLine($"dbg: ERROR: {e.Message}");
        }
    }
    
    static async Task CompileInternal(string src)
    {
        var sw = Stopwatch.StartNew();
        var substitutedSrc = Regex.Replace(src, @"namespace\s+\w+", AssemblyLoader.NameSpace);
        var syntaxTree = CSharpSyntaxTree.ParseText(substitutedSrc);
        var assemblyName = Path.GetRandomFileName();
        var usings = Utils.ExtractUsings(substitutedSrc);
        var additionalRefs = Constants.DefaultReferences.Where(x => usings.Any(x.Equals));
        var references = await AssemblyLoader.GetReferenceAssemblies(additionalRefs);
        
        // analyse and generate IL code from syntax tree
        var compilation = CSharpCompilation.Create(
            assemblyName,
            syntaxTrees: [syntaxTree],
            references: references,
            options: CompilationOptions(usings));

        Console.WriteLine($"dbg: Created compilation: {compilation.AssemblyName} in {sw.ElapsedMilliseconds} ms");

        AssemblyLoader.EmitAndRun(compilation);
    }
}