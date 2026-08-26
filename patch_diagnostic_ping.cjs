const fs = require('fs');
let code = fs.readFileSync('components/NetworkDiagnostic.tsx', 'utf8');

code = code.replace(
  /const res = await fetch\(`\$\{googleSheetUrl\}\$\{googleSheetUrl\.includes\('\?'\) \? '&' : '\?'\}ping=1`, \{ method: 'GET', mode: 'no-cors' \}\);/g,
  `// Ping Google's Generate 204 endpoint for generic network latency (Does NOT consume GAS quota)
        const res = await fetch('https://clients3.google.com/generate_204', { method: 'GET', mode: 'no-cors' });`
);

code = code.replace(
  /if \(isMounted\) \{\s*setLatency\(Math\.round\(end - start\)\);\s*setGasStatus\('success'\);\s*\}/g,
  `if (isMounted) {
          setLatency(Math.round(end - start));
        }`
);

code = code.replace(
  /if \(isMounted\) \{\s*setFailCount\(prev => prev \+ 1\);\s*setGasStatus\('error'\);\s*setLastErrorMessage\(e\.message \|\| 'Ping Failed'\);\s*\}/g,
  `if (isMounted) {
          setFailCount(prev => prev + 1);
          // Only track network error, don't set GAS error just because internet is bad
          if (isOnline) setLastErrorMessage('Network Ping Failed');
        }`
);

code = code.replace(
  /if \(!googleSheetUrl\) return;/g,
  `// No need to check googleSheetUrl anymore as we don't ping it`
);

fs.writeFileSync('components/NetworkDiagnostic.tsx', code);
