import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { DataCard } from './DataCard';
import { ProcessingState, StandardDataMap, ProductPreset, ZoneDefinition, ImageProcessingProfile, DEFAULT_PROCESSING_PROFILES, getDefaultTolerance } from '../types';
import { analyzeImage } from '../services/geminiService';
import { Trash2, Info, CheckCircle2, Eye, EyeOff, Scan, X, LayoutGrid, List, Check, RotateCcw, Filter } from 'lucide-react';

/**
 * === FIX v2 - Sửa lỗi hiển thị ===
 * - List view: py-2.5 thay vì py-3 (compact hơn)
 * - List view: border 1px thay vì 2px
 * - Nền: bg-xxx-500/8 thay vì bg-xxx-950/30 (sáng nhẹ, ko tối đen)
 * - Gap giữa list items: gap-1.5 thay vì gap-2
 * - Summary banner: compact hơn, nền nhẹ hơn
 * - Grid gap: gap-2.5 thay vì gap-3
 */

const getDirectImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    if (url.includes('drive.google.com')) {
      let fileId = '';
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        fileId = fileIdMatch[1];
      } else {
        const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idParamMatch && idParamMatch[1]) {
          fileId = idParamMatch[1];
        }
      }
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
      }
    }
    return url;
  } catch (e) {
    return url;
  }
};

interface ZoneViewProps {
  zone: ZoneDefinition;
  data: any | null;
  standardData: StandardDataMap;
  currentPreset?: ProductPreset | null;
  setData: (data: any | null) => void;
  state: ProcessingState;
  setState: (state: ProcessingState) => void;
  modelName: string;
  fieldLabels: Record<string, string>;
  apiKey?: string;
  showProcessedImage?: boolean;
  processingProfiles?: ImageProcessingProfile[];
  themeMode?: string;
}

export const ZoneView: React.FC<ZoneViewProps> = React.memo(({
  zone,
  data,
  standardData,
  currentPreset,
  setData,
  state,
  setState,
  modelName,
  fieldLabels,
  apiKey,
  showProcessedImage = false,
  processingProfiles = DEFAULT_PROCESSING_PROFILES,
  themeMode,
}) => {
  const imagesConfig = zone.images && zone.images.length > 0 ? zone.images : [{ id: 'default', label: 'Ảnh 1' }];
  const imageUrls = state.imageUrls || {};
  const processedImageUrls = state.processedImageUrls || {};
  
  const [visibleGuides, setVisibleGuides] = useState<Record<string, boolean>>({});
  const [viewModes, setViewModes] = useState<Record<string, 'display' | 'processed'>>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showOnlyFails, setShowOnlyFails] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleGuide = (id: string) => {
    setVisibleGuides(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleViewMode = (id: string) => {
    setViewModes(prev => ({ ...prev, [id]: prev[id] === 'processed' ? 'display' : 'processed' }));
  };

  const handleImageSelected = async (imageId: string, displayBase64: string, processedBase64: string) => {
    const newImageUrls = { ...imageUrls, [imageId]: `data:image/jpeg;base64,${displayBase64}` };
    const newProcessedImageUrls = { ...processedImageUrls, [imageId]: processedBase64 };
    
    const allUploaded = imagesConfig.every(img => newImageUrls[img.id]);

    setState({
      ...state,
      isAnalyzing: allUploaded,
      error: null,
      imageUrls: newImageUrls,
      processedImageUrls: newProcessedImageUrls,
    });
    
    if (allUploaded) {
      setData(null);
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      
      try {
        const base64List = imagesConfig.map(img => newProcessedImageUrls[img.id]);
        const activeModel = zone.modelId || modelName;

        let processingProfileId: string | undefined;
        for (const img of imagesConfig) {
            if (img.processingProfileId) {
                processingProfileId = img.processingProfileId;
                break;
            }
        }

        const result = await analyzeImage(base64List, zone.prompt, zone.schema, activeModel, apiKey, processingProfileId, processingProfiles);
        setData(result);
        if (navigator.vibrate) navigator.vibrate(200);
        setState({ ...state, isAnalyzing: false, imageUrls: newImageUrls, processedImageUrls: newProcessedImageUrls });
      } catch (err: any) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
        setState({ 
          ...state, 
          isAnalyzing: false, 
          error: err.message || "Không thể đọc dữ liệu. Vui lòng chụp lại ảnh rõ nét hơn.",
          imageUrls: newImageUrls,
          processedImageUrls: newProcessedImageUrls
        });
      }
    }
  };

  const handleClearImage = (imageId: string) => {
    const newImageUrls = { ...imageUrls };
    const newProcessedImageUrls = { ...processedImageUrls };
    delete newImageUrls[imageId];
    delete newProcessedImageUrls[imageId];
    setState({ ...state, isAnalyzing: false, error: null, imageUrls: newImageUrls, processedImageUrls: newProcessedImageUrls });
    setData(null);
  };

  const handleClearAll = () => {
    setShowConfirm(true);
  };

  const confirmClearAll = () => {
    setData(null);
    setState({ isAnalyzing: false, error: null, imageUrl: null, imageUrls: {}, processedImageUrls: {} });
    setShowConfirm(false);
  };

  const handleRetakeImage = (imageId: string) => {
    handleClearImage(imageId);
  };

  const handleDataChange = (key: string, value: number | null) => {
    if (data) {
      setData({ ...data, [key]: value });
    }
  };

  const getSummary = () => {
    if (!data || !currentPreset) return null;
    let passCount = 0;
    let failCount = 0;
    let totalChecked = 0;

    Object.entries(data).forEach(([key, val]) => {
      const std = standardData[key];
      if (val !== null && std !== undefined) {
        totalChecked++;
        const tol = currentPreset?.tolerances?.[key] ?? getDefaultTolerance(key);
        if (Math.abs((val as number) - std) <= tol) {
          passCount++;
        } else {
          failCount++;
        }
      }
    });

    return { passCount, failCount, totalChecked };
  };

  const summary = data ? getSummary() : null;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
        <div className="mb-4 flex items-center justify-between">
           <div className="flex items-center gap-2 text-blue-400">
             <Info size={18}/>
             <span className="text-sm font-black uppercase tracking-wider">{zone.name}</span>
           </div>
           {Object.keys(imageUrls).length > 0 && !state.isAnalyzing && (
             <button onClick={handleClearAll} className="text-sm text-red-400 hover:text-red-300 active:text-red-200 flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all active:scale-95">
               <Trash2 size={16} /> Xóa tất cả
             </button>
           )}
        </div>

        {state.error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-xl text-sm font-bold flex items-start gap-3">
            <span className="text-xl">⚠️</span> 
            <div>
              <p className="mb-0.5">{state.error}</p>
              <p className="text-red-400 text-xs">Hãy chụp lại ảnh rõ nét hơn, đủ sáng.</p>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 ${imagesConfig.length > 1 ? 'sm:grid-cols-2' : ''} gap-4`}>
          {imagesConfig.map((img) => {
            const currentImageUrl = imageUrls[img.id];
            const processedImageUrl = processedImageUrls[img.id];
            const vMode = viewModes[img.id] || 'display';
            const displayUrl = (vMode === 'processed' && processedImageUrl) 
                ? `data:image/jpeg;base64,${processedImageUrl}` 
                : currentImageUrl;
            
            const showGuide = visibleGuides[img.id];

            const profile = processingProfiles.find(p => p.id === img.processingProfileId) 
                         || DEFAULT_PROCESSING_PROFILES.find(p => p.id === img.captureMode)
                         || DEFAULT_PROCESSING_PROFILES[0];

            return (
              <div key={img.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">{img.label}</span>
                  <div className="flex items-center gap-2">
                      {img.guideImage && (
                          <button 
                            onClick={() => toggleGuide(img.id)}
                            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${showGuide ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}
                          >
                             {showGuide ? <EyeOff size={12}/> : <Eye size={12}/>} {showGuide ? 'Ẩn Mẫu' : 'Xem Mẫu'}
                          </button>
                      )}
                      {currentImageUrl && <CheckCircle2 size={18} className="text-green-500" />}
                  </div>
                </div>

                {showGuide && img.guideImage && (
                    <div 
                        className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-blue-500/30 shadow-lg mb-1 group cursor-zoom-in"
                        onClick={() => setZoomedImage(getDirectImageUrl(img.guideImage) || null)}
                    >
                        <img 
                          src={getDirectImageUrl(img.guideImage)} 
                          alt="Guide" 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== img.guideImage) {
                                target.src = img.guideImage || '';
                            }
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-sm backdrop-blur-sm">Ảnh Mẫu</div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Scan className="text-white" size={32} />
                        </div>
                    </div>
                )}

                {currentImageUrl ? (
                  <div className="relative">
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-slate-700 shadow-inner">
                      <img 
                        src={displayUrl} 
                        alt={img.label} 
                        className={`w-full h-full object-contain ${state.isAnalyzing ? 'opacity-50 blur-sm' : ''}`}
                        loading="lazy"
                      />
                      {state.isAnalyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                          <span className="text-blue-300 font-bold text-sm">Đang đọc số liệu...</span>
                        </div>
                      )}
                      
                      {!state.isAnalyzing && showProcessedImage && processedImageUrl && (
                        <button 
                            onClick={() => toggleViewMode(img.id)}
                            className={`absolute bottom-2 right-2 px-2 py-1 rounded text-[9px] font-black uppercase backdrop-blur-md shadow-lg z-20 transition-all border ${vMode === 'processed' ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-900/80 text-slate-300 border-slate-700'}`}
                        >
                            {vMode === 'processed' ? 'Processed' : 'Original'}
                        </button>
                      )}
                    </div>
                    
                    {!state.isAnalyzing && (
                      <button 
                          onClick={() => handleRetakeImage(img.id)}
                          className="mt-2 w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 py-2.5 rounded-xl 
                                     flex items-center justify-center gap-2 text-sm font-bold border border-slate-700 
                                     transition-all active:scale-[0.98]"
                      >
                          <RotateCcw size={16} /> Chụp lại
                      </button>
                    )}
                  </div>
                ) : (
                   <ImageUploader 
                     onImageSelected={(display, processed) => handleImageSelected(img.id, display, processed)} 
                     isProcessing={state.isAnalyzing}
                     processingProfile={profile}
                     themeMode={themeMode}
                   />
                )}
              </div>
            );
          })}
        </div>
        
        {state.isAnalyzing && (
          <div className="mt-4 flex flex-col items-center justify-center py-6">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <span className="text-blue-400 font-black text-base">Đang phân tích ảnh...</span>
            <span className="text-slate-500 text-xs mt-1">Vui lòng chờ trong giây lát</span>
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-3">
          {/* Tổng kết - compact, nền nhẹ */}
          {summary && (
            <div className={`px-3 py-2.5 rounded-xl border flex items-center gap-3 ${
              summary.failCount === 0 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              {summary.failCount === 0 ? (
                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <Check size={20} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shrink-0 animate-pulse">
                  <X size={20} className="text-white" strokeWidth={3} />
                </div>
              )}
              <div className="min-w-0">
                <p className={`font-black text-base uppercase ${summary.failCount === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {summary.failCount === 0 ? 'TẤT CẢ ĐẠT' : `${summary.failCount} KHÔNG ĐẠT`}
                </p>
                <p className="text-slate-400 text-[11px] font-bold">
                  {summary.passCount}/{summary.totalChecked} thông số trong tiêu chuẩn
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
             <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
                Kết quả đọc
             </h3>
             <div className="flex items-center gap-0.5 bg-slate-900/50 border border-slate-800 p-0.5 rounded-lg">
               <button
                 onClick={() => setShowOnlyFails(!showOnlyFails)}
                 className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${showOnlyFails ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                 title="Chỉ hiện thông số lỗi"
               >
                 <Filter size={16} />
               </button>
               <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
               <button
                 onClick={() => setViewMode('grid')}
                 className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                 title="Dạng thẻ"
               >
                 <LayoutGrid size={16} />
               </button>
               <button
                 onClick={() => setViewMode('list')}
                 className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                 title="Dạng danh sách"
               >
                 <List size={16} />
               </button>
             </div>
          </div>
          
          {(() => {
            const filteredDataEntries = Object.entries(data).filter(([key, value]) => {
              if (!showOnlyFails) return true;
              const val = value as number;
              const std = standardData[key];
              if (val === null) return true; // Missing is fail
              if (std === undefined) return false; // No standard -> can't fail
              const tol = currentPreset?.tolerances?.[key] ?? getDefaultTolerance(key);
              return Math.abs(val - std) > tol;
            });

            if (filteredDataEntries.length === 0) {
              return (
                <div className="text-center py-8 text-slate-500 font-bold text-sm bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
                  Tất cả thông số đều đạt chuẩn! 🎉
                </div>
              );
            }

            return viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredDataEntries.map(([key, value]) => (
                  <DataCard 
                    key={key} 
                    dataKey={key} 
                    value={value as number} 
                    standardValue={standardData[key]}
                    tolerance={currentPreset?.tolerances?.[key]}
                    onChange={handleDataChange} 
                    fieldLabels={fieldLabels}
                    themeMode={themeMode}
                  />
                ))}
              </div>
            ) : (
              /* === LIST VIEW - FIX: compact, nền sáng nhẹ, border mỏng === */
              <div className="flex flex-col gap-1.5">
                {filteredDataEntries.map(([key, value]) => {
                  const val = value as number;
                let std = standardData[key];
                let diff = val !== null && std !== undefined ? parseFloat((val - std).toFixed(2)) : 0;
                
                const tol = currentPreset?.tolerances?.[key] ?? getDefaultTolerance(key);
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
                }

                return (
                  // === FIX: px-3 py-2 (compact), border 1px, rounded-lg ===
                  <div key={key} className={`${bgColor} px-3 py-2 rounded-lg border ${borderColor} flex items-center justify-between gap-2`}>
                    <p className="text-[11px] text-slate-300 font-black uppercase leading-tight flex-1 min-w-0 truncate">{fieldLabels[key] || key}</p>
                    <div className="flex items-center font-mono whitespace-nowrap gap-1 shrink-0">
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          className={`w-14 !bg-transparent text-right text-sm font-black p-0 focus:outline-none focus:ring-0 border-none ${color} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                          value={val ?? ''}
                          onChange={(e) => handleDataChange(key, e.target.value === '' ? null : parseFloat(e.target.value))}
                          placeholder="--"
                        />
                        {std !== undefined && (
                            <div className="flex items-center border-l border-slate-700/40 pl-1.5 ml-1 gap-1.5">
                              <span className="text-[11px] text-slate-500 font-bold">{std}</span>
                              <span className="text-[9px] text-slate-600 font-bold">±{tol}</span>
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
                              )}
                            </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      )}
      {zoomedImage && (
        <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
            <button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 text-white/50 hover:text-white p-3 transition-colors"><X size={36}/></button>
            <img src={zoomedImage} alt="Zoomed Guide" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* === CONFIRM DIALOG === */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700 animate-scale-up">
            <h3 className="text-xl font-black text-white mb-3">Xác nhận</h3>
            <p className="text-slate-300 mb-6 text-sm leading-relaxed">Xóa tất cả ảnh và dữ liệu đã đọc?</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={confirmClearAll}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 active:scale-95 transition-all shadow-lg shadow-red-600/30"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
