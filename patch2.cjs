const fs = require('fs');
let code = fs.readFileSync('components/DataCard.tsx', 'utf8');

const searchTarget = `interface DataCardProps {
  dataKey: string;
  value: number | null;
  standardValue?: number;
  tolerance?: number;
  onChange: (key: string, value: number | null) => void;
  fieldLabels: Record<string, string>;
  themeMode?: string;
}`;

const replaceTarget = `interface DataCardProps {
  dataKey: string;
  value: number | null;
  standardValue?: number;
  tolerance?: number | string;
  onChange: (key: string, value: number | null) => void;
  fieldLabels: Record<string, string>;
  themeMode?: string;
}`;
code = code.replace(searchTarget, replaceTarget);

const search2 = `  const activeTolerance = tolerance ?? getDefaultTolerance(dataKey);
  let statusColor = "text-slate-400";
  let bgColor = "bg-slate-800/50";
  let borderColor = "border-slate-700/40";
  let statusIcon: React.ReactNode = null;
  let diffDisplay = "";
  
  const isLight = themeMode === 'light' || themeMode === 'light_2';

  if (value !== null && standardValue !== undefined) {
    const diff = value - standardValue;
    const diffAbs = Math.abs(diff);
    const sign = diff > 0 ? "+" : "";
    diffDisplay = diff === 0 ? "OK" : \`\${sign}\${diff.toFixed(1)}\`;
    
    if (diffAbs <= activeTolerance / 2) {`;

const replace2 = `  const isMaxMode = tolerance === '<';
  const activeTolerance = isMaxMode ? getDefaultTolerance(dataKey) : (typeof tolerance === 'number' ? tolerance : parseFloat(String(tolerance ?? getDefaultTolerance(dataKey))));
  
  let statusColor = "text-slate-400";
  let bgColor = "bg-slate-800/50";
  let borderColor = "border-slate-700/40";
  let statusIcon: React.ReactNode = null;
  let diffDisplay = "";
  
  const isLight = themeMode === 'light' || themeMode === 'light_2';

  if (value !== null && standardValue !== undefined) {
    const diff = value - standardValue;
    const diffAbs = Math.abs(diff);
    const sign = diff > 0 ? "+" : "";
    diffDisplay = diff === 0 ? "OK" : \`\${sign}\${diff.toFixed(1)}\`;
    
    if (isMaxMode) {
      if (value <= standardValue) {
        statusColor = isLight ? "text-green-700" : "text-green-500";
        bgColor = "bg-green-500/8";
        borderColor = isLight ? "border-green-600 border-2" : "border-green-500/30";
        statusIcon = <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center"><Check size={14} className="text-white" strokeWidth={3} /></div>;
      } else {
        statusColor = isLight ? "text-red-700" : "text-red-500";
        bgColor = "bg-red-500/8";
        borderColor = isLight ? "border-red-600 border-2" : "border-red-500/30";
        statusIcon = <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center animate-pulse"><X size={14} className="text-white" strokeWidth={3} /></div>;
      }
    } else if (diffAbs <= activeTolerance / 2) {`;

code = code.replace(search2, replace2);

const search3 = `          {standardValue !== undefined && (
            <span className="text-[10px] font-black uppercase leading-none whitespace-nowrap">
              <span className="text-green-500">{standardValue}</span>
              <span className="text-slate-500 ml-0.5">±{activeTolerance}</span>
            </span>
          )}`;

const replace3 = `          {standardValue !== undefined && (
            <span className="text-[10px] font-black uppercase leading-none whitespace-nowrap">
              <span className="text-green-500">{standardValue}</span>
              <span className="text-slate-500 ml-0.5">{isMaxMode ? "≤" : "±"}{isMaxMode ? "" : activeTolerance}</span>
            </span>
          )}`;

code = code.replace(search3, replace3);
fs.writeFileSync('components/DataCard.tsx', code);
