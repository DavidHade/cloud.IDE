using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices.JavaScript;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace WASM;

public static partial class AssemblyLoader
{
    private const string Namespace = "CSharpPlayground";
    public const string NameSpace = $"namespace {Namespace}";
    private static readonly HttpClient Client = new()
    {
        BaseAddress = new Uri(GetBaseUrl())
    };

    private static List<MetadataReference> _cachedReferences = [];
    
    [JSImport("getBaseUrl", "CSharpMethodsJSImplementationsModule")]
    private static partial string GetBaseUrl();

    public static async Task<List<MetadataReference>> GetReferenceAssemblies()
    {
        if (_cachedReferences.Any()) return _cachedReferences;
        
        var appAssemblies = Assembly.GetExecutingAssembly()
            .GetReferencedAssemblies()
            .Select(Assembly.Load)
            .ToList();
        
        appAssemblies.Add(typeof(object).Assembly);
        var references = new List<MetadataReference>();
        
        foreach (var assembly in appAssemblies)
        {
            var metadataReference = await GetAssemblyMetadataReference(assembly);
            if (metadataReference == null)
            {
                Console.WriteLine($"dbg: {assembly.GetName().Name} was null");
                continue;
            }

            references.Add(metadataReference);
        }

        _cachedReferences = references;
        
        return references;
    }
    
    public static void EmitAndRun(CSharpCompilation compilation)
    {
        var sw = Stopwatch.StartNew();
        using var ms = new MemoryStream();
        var result = compilation.Emit(ms);
        var outcome = result.Success ? "Success" : "Error";
        
        Console.WriteLine($"dbg: Emitted IL: {outcome} in {sw.ElapsedMilliseconds} ms");

        if (!result.Success)
        {
            var failures = result.Diagnostics.Where(diagnostic => 
                diagnostic.IsWarningAsError || 
                diagnostic.Severity == DiagnosticSeverity.Error);

            foreach (var diagnostic in failures)
            {
                Console.WriteLine("err: ({0}): {1}", diagnostic.Id, diagnostic.GetMessage());
            }
        }
        else
        {
            ms.Seek(0, SeekOrigin.Begin);
            var assembly = Assembly.Load(ms.ToArray());
                
            const string typeName = $"{Namespace}.Program";
            var type = assembly.GetType(typeName);

            if (type is null)
                throw new Exception($"Unable to get type {typeName}");
                
            var obj = Activator.CreateInstance(type);

            if (obj is null)
                throw new Exception($"Unable to instantiate type {typeName}");
                    
            Console.WriteLine($"dbg: Instantiated: {obj.GetType()}");

            const BindingFlags flags = BindingFlags.Default | BindingFlags.InvokeMethod; 
                    
            type.InvokeMember("Main", flags, null, obj, [new[] {""}]);
        }
    }
    
    private static async Task<MetadataReference?> GetAssemblyMetadataReference(Assembly assembly)
    {
        var sw = Stopwatch.StartNew();
        var assemblyName = assembly.GetName().Name;
        var assemblyUrl = $"./wwwroot/_framework/{assemblyName}.dll";
        
        try
        {
            var response = await Client.GetAsync(assemblyUrl);
            if (response.IsSuccessStatusCode)
            {
                var bytes = await response.Content.ReadAsByteArrayAsync();
                Console.WriteLine("dbg: Downloaded {0} in {1} ms", assemblyName, sw.ElapsedMilliseconds);
                
                return MetadataReference.CreateFromImage(bytes);
            }
        }
        catch (Exception e)
        {
            Console.WriteLine("dbg: Failed downloading {0} - {1}", assemblyName, e.Message);
        }
        
        return null;
    }
}

