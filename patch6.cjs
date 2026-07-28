const fs = require('fs');
let code = fs.readFileSync('components/ZoneView.tsx', 'utf8');

const search = `                const tol = currentPreset?.tolerances?.[key] ?? getDefaultTolerance(key);
                const diffAbs = Math.abs(diff);

                // === FIX: Nền sáng nhẹ thay vì tối đen ===
                let borderColor = 'border-slate-700/30';
                let bgColor = 'bg-slate-800/40';
                let color = 'text-slate-400';

                const isLight = themeMode === 'light' || themeMode === 'light_2';

                if (val !== null && std !== undefined) {
                    if (diffAbs <= tol / 2) {
                        borderColor = isLight ? 'border-green-600 border' : 'border-green-500/25';
                        bgColor = 'bg-green-500/8';
                        color = isLight ? 'text-green-700' : 'text-green-400';
                    } else if (diffAbs <= tol) {
                        borderColor = isLight ? 'border-yellow-500 border' : 'border-yellow-500/25';
                        bgColor = 'bg-yellow-500/8';
                        color = isLight ? 'text-yellow-700' : 'text-yellow-400';
                    } else {
                        borderColor = isLight ? 'border-red-600 border' : 'border-red-500/25';
                        bgColor = 'bg-red-500/8';
                        color = isLight ? 'text-red-700' : 'text-red-400';
                    }
                }`;

const replace = `                const rawTol = currentPreset?.tolerances?.[key];
                const isMaxMode = rawTol === '<';
                const tol = isMaxMode ? getDefaultTolerance(key) : (rawTol ?? getDefaultTolerance(key));
                const diffAbs = Math.abs(diff);

                // === FIX: Nền sáng nhẹ thay vì tối đen ===
                let borderColor = 'border-slate-700/30';
                let bgColor = 'bg-slate-800/40';
                let color = 'text-slate-400';
                let isAlert = false;

                const isLight = themeMode === 'light' || themeMode === 'light_2';

                if (val !== null && std !== undefined) {
                    if (isMaxMode) {
                        isAlert = val > std;
                        if (!isAlert) {
                            borderColor = isLight ? 'border-green-600 border' : 'border-green-500/25';
                            bgColor = 'bg-green-500/8';
                            color = isLight ? 'text-green-700' : 'text-green-400';
                        } else {
                            borderColor = isLight ? 'border-red-600 border' : 'border-red-500/25';
                            bgColor = 'bg-red-500/8';
                            color = isLight ? 'text-red-700' : 'text-red-400';
                        }
                    } else if (diffAbs <= (tol as number) / 2) {
                        borderColor = isLight ? 'border-green-600 border' : 'border-green-500/25';
                        bgColor = 'bg-green-500/8';
                        color = isLight ? 'text-green-700' : 'text-green-400';
                    } else if (diffAbs <= (tol as number)) {
                        borderColor = isLight ? 'border-yellow-500 border' : 'border-yellow-500/25';
                        bgColor = 'bg-yellow-500/8';
                        color = isLight ? 'text-yellow-700' : 'text-yellow-400';
                    } else {
                        isAlert = true;
                        borderColor = isLight ? 'border-red-600 border' : 'border-red-500/25';
                        bgColor = 'bg-red-500/8';
                        color = isLight ? 'text-red-700' : 'text-red-400';
                    }
                }`;

code = code.replace(search, replace);

const search2 = `                              <span className="text-[9px] text-slate-600 font-bold">±{tol}</span>
                              {val !== null && (
                                diffAbs <= tol ? (
                                  <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full bg-green-500 flex items-center justify-center">
                                    <Check size={11} className="text-white" strokeWidth={4} />
                                  </div>
                                ) : (
                                  <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center">
                                    <X size={11} className="text-white" strokeWidth={4} />
                                  </div>
                                )
                              )}`;

const replace2 = `                              <span className="text-[9px] text-slate-600 font-bold">{isMaxMode ? "≤" : \`±\${tol}\`}</span>
                              {val !== null && (
                                !isAlert ? (
                                  <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full bg-green-500 flex items-center justify-center">
                                    <Check size={11} className="text-white" strokeWidth={4} />
                                  </div>
                                ) : (
                                  <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center">
                                    <X size={11} className="text-white" strokeWidth={4} />
                                  </div>
                                )
                              )}`;

code = code.replace(search2, replace2);
fs.writeFileSync('components/ZoneView.tsx', code);
