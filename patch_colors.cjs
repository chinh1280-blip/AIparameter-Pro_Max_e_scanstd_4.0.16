const fs = require('fs');
let code = fs.readFileSync('components/NetworkDiagnostic.tsx', 'utf8');

code = code.replace(/text-slate-500/g, 'text-slate-300');
code = code.replace(/text-slate-400/g, 'text-slate-100');

fs.writeFileSync('components/NetworkDiagnostic.tsx', code);
