const fs = require('fs');
let code = fs.readFileSync('components/DataCard.tsx', 'utf8');

code = code.replace(
  `<span className="text-slate-500 ml-0.5">{isMaxMode ? "≤" : "±"}{isMaxMode ? "" : activeTolerance}</span>`,
  `{isMaxMode ? <span className="text-slate-500 ml-0.5">≤</span> : <span className="text-slate-500 ml-0.5">±{activeTolerance}</span>}`
);

fs.writeFileSync('components/DataCard.tsx', code);
