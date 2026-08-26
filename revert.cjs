const fs = require('fs');
let code = fs.readFileSync('components/NetworkDiagnostic.tsx', 'utf8');

// Revert gray to slate
code = code.replace(/gray/g, 'slate');
// Keep text-teal-500 for now. We will map it in sharedLightCSS.

// Make background adapt to light mode by removing /95 opacity
code = code.replace(/bg-slate-950\/95/g, 'bg-slate-950');

fs.writeFileSync('components/NetworkDiagnostic.tsx', code);
