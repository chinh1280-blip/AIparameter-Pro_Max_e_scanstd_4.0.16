const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

if (!html.includes('manifest.json')) {
    html = html.replace('</head>', '  <link rel="manifest" href="/manifest.json">\n  <meta name="theme-color" content="#0b1120">\n</head>');
    fs.writeFileSync('index.html', html);
}
