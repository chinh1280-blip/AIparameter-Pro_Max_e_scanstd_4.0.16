const fs = require('fs');
let code = fs.readFileSync('components/Dashboard.tsx', 'utf-8');

code = code.replace(
  "{machines.map(m => (",
  "{machines.filter(m => m.isVisible !== false).map(m => ("
);

code = code.replace(
  "{machines.map(machine => {",
  "{machines.filter(m => m.isVisible !== false).map(machine => {"
);

fs.writeFileSync('components/Dashboard.tsx', code);
