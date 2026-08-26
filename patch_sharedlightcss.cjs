const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /\.border-green-500 \{ border-color: #22c55e !important; \}/,
  `.border-green-500 { border-color: #22c55e !important; }
    .text-emerald-400, .text-green-400 { color: #059669 !important; }
    .text-red-400 { color: #dc2626 !important; }
    .text-teal-500 { color: #0f766e !important; }`
);

fs.writeFileSync('App.tsx', code);
