// note that it expects to load dotnet.js 
// (and wasm files) from _framework folder
import { dotnet } from "/cloud.IDE/wwwroot/_framework/dotnet.js"

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

export async function compileAndRun(src) {
    await exports.WASM.Compiler.CompileAndRun(src);
}

export async function precompile(src) {
    await exports.WASM.Compiler.PreCompile(src);
}

export async function preload(){
    await exports.WASM.Compiler.PreloadReferences();
}