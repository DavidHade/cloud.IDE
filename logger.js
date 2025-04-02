(function () {
    var old = console.log;
    var output = document.getElementById('log-output');
    var system = document.getElementById('log-system');
    //const timestamp = `[${new Date().toLocaleTimeString()}] `;
    const timestamp = "> ";
    console.log = function (message) {
        if (typeof message == 'object') {
            const text = (JSON && JSON.stringify ? JSON.stringify(message) : message) + '<br />'
            
            if(text.startsWith('dbg:')){
                system.innerHTML += timestamp + text.substring(5, text.length);
            }else{
                output.innerHTML += timestamp + text;
            }
        } else {
            if (message.toString().startsWith('dbg:')){
                system.innerHTML += timestamp + message.substring(5, message.length) + '<br />';
            }else{
                if (message.startsWith('err: ')){
                    const inner = timestamp + message.substring(5, message.length) + '<br />';
                    output.innerHTML += `<span style="color: red">${inner}</span>`;
                }else{
                    const inner = timestamp + message + '<br />';
                    output.innerHTML += inner;
                }  
            }
        }
        old.apply(console, arguments);
    }
})();