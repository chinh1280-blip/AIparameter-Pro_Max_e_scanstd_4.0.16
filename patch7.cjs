const fs = require('fs');
let code = fs.readFileSync('components/Dashboard.tsx', 'utf8');

const search = `<span className="text-slate-600 ml-0.5 text-[8px] font-bold tracking-tighter">±{tol}</span>`;
const replace = `<span className="text-slate-600 ml-0.5 text-[8px] font-bold tracking-tighter">{isMaxMode ? '≤' : \`±\${tol}\`}</span>`;

code = code.replace(new RegExp(search.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), replace);

// Also for chart presets top bar
const search2 = `<span className="text-[8px] font-bold text-slate-600">±{tol}</span>`;
const replace2 = `<span className="text-[8px] font-bold text-slate-600">{rawTol === '<' ? '≤' : \`±\${tol}\`}</span>`;
code = code.replace(new RegExp(search2.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), replace2);

fs.writeFileSync('components/Dashboard.tsx', code);
