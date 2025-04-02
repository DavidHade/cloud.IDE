// note that it expects to load dotnet.js 
// (and wasm files) from _framework folder
import { dotnet } from '/cloud.IDE/wwwroot/_framework/dotnet.js'

const is_browser = typeof window != "undefined";
if (!is_browser) throw new Error(`Expected to be running in a browser`);

// get the dotnetRuntime containing all the methods
// and objects for invoking C# from JavaScript and
// vice versa.

const { getAssemblyExports, getConfig, setModuleImports } = await dotnet.create();
setModuleImports("CSharpMethodsJSImplementationsModule", {
    getBaseUrl: () => { return window.location.href; }
});

// config contains the web-site configurations
const config = getConfig();
const exports = await getAssemblyExports(config.mainAssemblyName);

// call Program.Main(string[] args) method from JavaScript
// passing to it an array of arguments "arg1", "arg2" and "arg3"

//await dotnetRuntime.runMain(config.mainAssemblyName, ["arg1", "arg2", "arg3"]);

export async function run(src) {
    await exports.WASM.Compiler.Compile(src);
}

export async function preload(){
    await exports.WASM.Compiler.PreloadReferences();
}