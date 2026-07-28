const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const search = `             const tolerance = currentPreset?.tolerances?.[key] ?? getDefaultTolerance(key);
             const diffAbs = Math.abs((val as number) - std);
             const isCorrect = diffAbs <= tolerance;
             
             if (!isCorrect) {
                hasError = true;
                outOfStandardCount++;
             }
             
             errorDetails.push({
                name: fieldLabels[key] || key,
                value: val,
                std: \`\${std} ±\${tolerance}\`,
                diff: diff > 0 ? \`+\${diff}\` : diff,
                isCorrect: isCorrect
             });`;

const replace = `             const rawTol = currentPreset?.tolerances?.[key];
             const isMaxMode = rawTol === '<';
             const tolerance = isMaxMode ? getDefaultTolerance(key) : (rawTol ?? getDefaultTolerance(key));
             const diffAbs = Math.abs((val as number) - std);
             
             let isCorrect = true;
             if (isMaxMode) {
                 isCorrect = (val as number) <= std;
             } else {
                 isCorrect = diffAbs <= (tolerance as number);
             }
             
             if (!isCorrect) {
                hasError = true;
                outOfStandardCount++;
             }
             
             errorDetails.push({
                name: fieldLabels[key] || key,
                value: val,
                std: isMaxMode ? \`≤ \${std}\` : \`\${std} ±\${tolerance}\`,
                diff: diff > 0 ? \`+\${diff}\` : diff,
                isCorrect: isCorrect
             });`;

code = code.replace(search, replace);
fs.writeFileSync('App.tsx', code);
