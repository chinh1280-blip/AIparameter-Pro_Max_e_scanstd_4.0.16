const fs = require('fs');
let code = fs.readFileSync('components/Dashboard.tsx', 'utf8');

const target1 = `                const rawTol = currentPreset?.tolerances?.[f];
                const tol = (rawTol !== undefined && rawTol !== null && rawTol !== "") ? parseFloat(String(rawTol)) : getDefaultTolerance(f);
                const diffAbs = Math.abs(diff);

                let borderColor = 'border-slate-800';
                if (diffAbs <= tol / 2) {
                    borderColor = 'border-green-500 shadow-[0_0_10px_-2px_rgba(34,197,94,0.3)]';
                } else if (diffAbs <= tol) {
                    borderColor = 'border-yellow-500 shadow-[0_0_10px_-2px_rgba(234,179,8,0.3)]';
                } else {
                    borderColor = 'border-red-500 shadow-[0_0_10px_-2px_rgba(239,68,68,0.3)]';
                }

                const color = diffAbs <= tol / 2 ? 'text-green-400' : (diffAbs <= tol ? 'text-yellow-400' : 'text-red-400');`;

const repl1 = `                const rawTol = currentPreset?.tolerances?.[f];
                const isMaxMode = rawTol === '<';
                const tol = isMaxMode ? getDefaultTolerance(f) : (rawTol !== undefined && rawTol !== null && rawTol !== "") ? parseFloat(String(rawTol)) : getDefaultTolerance(f);
                const diffAbs = Math.abs(diff);

                let borderColor = 'border-slate-800';
                let color = 'text-green-400';
                let isAlert = false;
                
                if (isMaxMode) {
                    if (val <= std) {
                        borderColor = 'border-green-500 shadow-[0_0_10px_-2px_rgba(34,197,94,0.3)]';
                        color = 'text-green-400';
                    } else {
                        borderColor = 'border-red-500 shadow-[0_0_10px_-2px_rgba(239,68,68,0.3)]';
                        color = 'text-red-400';
                        isAlert = true;
                    }
                } else {
                    if (diffAbs <= tol / 2) {
                        borderColor = 'border-green-500 shadow-[0_0_10px_-2px_rgba(34,197,94,0.3)]';
                        color = 'text-green-400';
                    } else if (diffAbs <= tol) {
                        borderColor = 'border-yellow-500 shadow-[0_0_10px_-2px_rgba(234,179,8,0.3)]';
                        color = 'text-yellow-400';
                    } else {
                        borderColor = 'border-red-500 shadow-[0_0_10px_-2px_rgba(239,68,68,0.3)]';
                        color = 'text-red-400';
                        isAlert = true;
                    }
                }`;

code = code.split(target1).join(repl1);
code = code.replace(/<span>±\{tol\}<\/span>/g, '<span>{isMaxMode ? "≤" : "±"}{isMaxMode ? std : tol}</span>');
code = code.replace(/<span className="text-\[9px\] text-slate-600 font-bold">±\{tol\}<\/span>/g, '<span className="text-[9px] text-slate-600 font-bold">{isMaxMode ? "≤" : "±"}{isMaxMode ? std : tol}</span>');
code = code.replace(/\{diffAbs <= tol \?/g, '{!isAlert ?');

fs.writeFileSync('components/Dashboard.tsx', code);
