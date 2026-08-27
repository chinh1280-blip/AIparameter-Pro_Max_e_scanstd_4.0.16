const fs = require('fs');
let code = fs.readFileSync('index.css', 'utf8');

code = code.replace(/padding: 0;/g, 'padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);');

fs.writeFileSync('index.css', code);
