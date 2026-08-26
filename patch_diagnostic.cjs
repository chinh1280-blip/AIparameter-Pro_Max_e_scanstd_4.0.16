const fs = require('fs');
let code = fs.readFileSync('components/NetworkDiagnostic.tsx', 'utf8');

// Sandbox colors by changing slate to gray (gray is not overridden in sharedLightCSS)
code = code.replace(/slate/g, 'gray');

// Change title color from text-amber-400 to text-teal-500
code = code.replace(/text-amber-400/g, 'text-teal-500'); // Note: latency is also amber-400, so it will become teal-500. This is fine.

fs.writeFileSync('components/NetworkDiagnostic.tsx', code);
