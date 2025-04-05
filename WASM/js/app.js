import { compileAndRun } from './wasmRunner.js';

const codeTextarea = document.getElementById('code');
const highlightedContent = document.getElementById('highlighted-content');
const lineNumbers = document.getElementById('line-numbers');
const highlightedCode = document.getElementById('highlighted-code');
const runButton = document.getElementById('run');
const statusItem = document.querySelector('.status-item span');
const statusBar = document.querySelector('.status-bar');
const storedValue = localStorage.getItem("cloudIDE");
const urlParams = new URLSearchParams(window.location.search);
const state = urlParams.get('state');
const copyToast = document.getElementById("toast-save");
const output = document.getElementById('output-text');
const system = document.getElementById("log-system");
const spinner = document.getElementById('spinner');

// Initial code
const initialCode = `using System;

namespace cloudIDE;

public class Program
{
	public void Main(string[] args)
	{
		Console.WriteLine("Hello, WebAssembly!");

		for (int i = 5; i < 10; i++)
			Console.WriteLine(Fibonacci(i));
	}

	public static int Fibonacci(int n)
	{
		if (n == 0) return 0;
		if (n == 1) return 1;
		return Fibonacci(n - 1) + Fibonacci(n - 2);
	}
}`;

// Initial code
const minimalCode = `using System;

namespace cloudIDE;

public class Program
{
	public void Main(string[] args)
	{
		Console.WriteLine("Hello, WebAssembly!");
	}
}`;

export function handleSavedState(){
    // Set initial code
    codeTextarea.value =
        state != null ? fromBinary(state)
            : storedValue != null ? storedValue
                : initialCode;

    updateHighlightedCode();

    if (state != null){ clearQueryParams() }
}

function clearQueryParams(){
    window.history.pushState("", 
        window.location.title, 
        window.location.href.split("?")[0] );
}

// Update the highlighted code when typing
codeTextarea.addEventListener('input', () => {
    updateHighlightedCode();
    localStorage.setItem("cloudIDE", codeTextarea.value);
});
codeTextarea.addEventListener('scroll', syncScroll);

// Clear console buttons
document.getElementById('clear-output-console').onclick = () => {
    output.innerHTML = '';
};
document.getElementById('clear-system-console').onclick = () => {
    system.innerHTML = '';
};
document.getElementById('clear-code-editor').onclick = (e) => {
    e.preventDefault();
    codeTextarea.value = minimalCode;
    localStorage.setItem("cloudIDE", codeTextarea.value);
    updateHighlightedCode();
};

// Keyboard shortcut for running code
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        runButton.click();
    }
    else if(e.ctrlKey && e.key === 's'){
        e.preventDefault();
        copyToast.classList.add('show');
        setTimeout(() => {
            copyToast.classList.remove('show');
        }, 2000);
    }
    else if(e.key === 'Escape'){
        closeModal();
    }
});

// Prevent tab from jumping focus out of editor
codeTextarea.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        let start = this.selectionStart;
        let end = this.selectionEnd;

        // set textarea value to: text before caret + tab + text after caret
        this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);

        // put caret at right position again
        this.selectionStart = this.selectionEnd = start + 1;
    }
    else if(e.key === 'Enter'){
        let cursorPos = this.selectionStart;
        let currentLine = this.value.substring(0, this.selectionStart).split("\n").pop();
        let indent = currentLine.match(/^\s*/)[0];
        let value = this.value;
        let textBefore = value.substring(0,  cursorPos );
        let textAfter  = value.substring( cursorPos, value.length );

        e.preventDefault();
        this.value = textBefore + "\n" + indent + textAfter;
        setCaretPosition(this, cursorPos + indent.length + 1); // +1 is for the \n
        updateHighlightedCode();
    }
});

function setCaretPosition(ctrl, pos)
{
    if(ctrl.setSelectionRange)
    {
        ctrl.focus();
        ctrl.setSelectionRange(pos,pos);
    }
    else if (ctrl.createTextRange) {
        let range = ctrl.createTextRange();
        range.collapse(true);
        range.moveEnd('character', pos);
        range.moveStart('character', pos);
        range.select();
    }
}

// Update line numbers
function updateLineNumbers() {
    const lines = codeTextarea.value.split('\n');
    lineNumbers.innerHTML = '';
    for (let i = 0; i < lines.length; i++) {
        lineNumbers.innerHTML += `<div>${i + 1}</div>`;
    }
}

// Update syntax highlighting using Prism
function updateHighlightedCode() {
    highlightedContent.textContent = codeTextarea.value;
    Prism.highlightElement(highlightedContent);
    updateLineNumbers();
}

// Sync scrolling between textarea and highlighted overlay
function syncScroll() {
    highlightedCode.scrollTop = codeTextarea.scrollTop;
    highlightedCode.scrollLeft = codeTextarea.scrollLeft;
    lineNumbers.scrollTop = codeTextarea.scrollTop;
}

function handleError(error){
    statusItem.textContent = 'Error';
    statusBar.style.color = 'var(--error)';

    console.logConsole(error);
    const text = (JSON && JSON.stringify
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : error) + '<br />'
    output.innerHTML += "> " + text;
}

async function run (){
    statusItem.textContent = 'Running...';
    statusBar.style.color = 'var(--accent-hover)';
    spinner.style.display = 'inline-block';
    await compileAndRun(codeTextarea.value);
    statusItem.textContent = 'Execution completed';
    statusBar.style.color = 'var(--success)';
    spinner.style.display = 'none';
}

document.getElementById("run").onclick = async () => {
    output.textContent = '';
    system.textContent = '';

    try {
        await run();
    } catch (error) {
        handleError(error);
    } finally {
        setTimeout(() => {
            statusItem.textContent = 'Ready';
            statusBar.style.color = 'var(--text-secondary)';
        }, 2000);
    }
};