var shell = require('electron').shell;
//open links externally by default
document.querySelectorAll('a[href^="http"]').forEach(function(el) {
    el.addEventListener('click', function(event) {
        event.preventDefault();
        shell.openExternal(this.href);
    });
});