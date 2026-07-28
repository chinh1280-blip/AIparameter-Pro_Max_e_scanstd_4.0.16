const fs = require('fs');
let code = fs.readFileSync('components/Dashboard.tsx', 'utf8');

const search = `    const timePart = (match[4] || "").trim();
    let h = 0, m = 0, s = 0;
    if (timePart) {
      const t = timePart.split(':');
      h = parseInt(t[0]) || 0; m = parseInt(t[1]) || 0; s = parseInt(t[2]) || 0;
    }`;

const replace = `    const timePart = (match[4] || "").replace(/[^0-9:]/g, '').trim();
    let h = 0, m = 0, s = 0;
    if (timePart) {
      const t = timePart.split(':');
      h = parseInt(t[0]) || 0; m = parseInt(t[1]) || 0; s = parseInt(t[2]) || 0;
    }`;

code = code.replace(search, replace);
fs.writeFileSync('components/Dashboard.tsx', code);
