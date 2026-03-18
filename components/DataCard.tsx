import React from 'react';
import { getDefaultTolerance } from '../types';
import { Check, X, AlertTriangle } from 'lucide-react';

/**
 * === FIX v2 - Sửa lỗi hiển thị ===
 * - Giảm padding p-4 → p-3 (compact, không tràn khung)
 * - Border 2px → 1px (bớt chiếm diện tích)  
 * - Rounded 2xl → xl (gọn hơn)
 * - Nền: bg-xxx-500/8 thay vì bg-xxx-950/40 (sáng nhẹ, không tối đen)
 * - Font giá trị: text-2xl vừa phải (không tràn ô)
 * - Nút +/- nhỏ hơn: w-9 h-10
 * - Header 1 dòng gọn: Chuẩn + tol cùng hàng
 * - Dòng chênh lệch compact hơn
 */

interface DataCardProps {
  dataKey: string;
  value: number | null;
  standardValue?: number;
  tolerance?: number;
  onChange: (key: string, value: number | null) => void;
  fieldLabels: Record<string, string>;
  themeMode?: string;
}

export const DataCard: React.FC<DataCardProps> = React.memo(({ dataKey, value, standardValue, tolerance, onChange, fieldLabels, themeMode }) => {
  const activeTolerance = tolerance ?? getDefaultTolerance(dataKey);

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
    diffDisplay = diff === 0 ? "OK" : `${sign}${diff.toFixed(1)}`;
    
    if (diffAbs <= activeTolerance / 2) {
      statusColor = isLight ? "text-green-700" : "text-green-500";
      bgColor = "bg-green-500/8";
      borderColor = isLight ? "border-green-600 border-2" : "border-green-500/30";
      statusIcon = <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center"><Check size={14} className="text-white" strokeWidth={3} /></div>;
    } else if (diffAbs <= activeTolerance) {
      statusColor = isLight ? "text-yellow-700" : "text-yellow-500";
      bgColor = "bg-yellow-500/8";
      borderColor = isLight ? "border-yellow-500 border-2" : "border-yellow-500/30";
      statusIcon = <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center"><AlertTriangle size={13} className="text-white" strokeWidth={3} /></div>;
    } else {
      statusColor = isLight ? "text-red-700" : "text-red-500";
      bgColor = "bg-red-500/8";
      borderColor = isLight ? "border-red-600 border-2" : "border-red-500/30";
      statusIcon = <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center animate-pulse"><X size={14} className="text-white" strokeWidth={3} /></div>;
    }
  }

  return (
    <div className={`${bgColor} p-2.5 rounded-xl border ${borderColor} flex flex-col transition-all`}>
      {/* Header 1 dòng: Label + Chuẩn±tol + Icon */}
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider leading-tight flex-1 min-w-0 truncate">
          {fieldLabels[dataKey] || dataKey}
        </label>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {standardValue !== undefined && (
            <span className="text-[10px] font-black uppercase leading-none whitespace-nowrap">
              <span className="text-green-500">{standardValue}</span>
              <span className="text-slate-500 ml-0.5">±{activeTolerance}</span>
            </span>
          )}
          {statusIcon}
        </div>
      </div>
      
      {/* Input */}
      <div className="flex items-center">
        <input
          type="number"
          step="0.1"
          className={`flex-1 min-w-0 bg-slate-900/40 text-white text-xl font-mono font-black py-1.5 px-2 rounded-lg text-center 
            focus:outline-none focus:ring-1 focus:ring-blue-500/40 border border-slate-700/30 transition-all 
            ${value === null ? 'border-red-500/40 text-red-300' : ''} 
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          value={value ?? ''}
          onChange={(e) => onChange(dataKey, e.target.value === '' ? null : parseFloat(e.target.value))}
          placeholder="--"
          inputMode="decimal"
        />
      </div>

      {/* Chênh lệch compact */}
      {value !== null && standardValue !== undefined && (
        <div className={`mt-1.5 text-center font-mono font-black text-xs ${statusColor}`}>
          Chênh lệch: {diffDisplay}
        </div>
      )}

      {value === null && (
        <div className="mt-1.5 text-center">
          <span className="text-[10px] font-black bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 uppercase">
            Chưa có dữ liệu
          </span>
        </div>
      )}
    </div>
  );
});
