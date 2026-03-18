import React, { useRef, useCallback } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { processImage } from '../utils/imageProcessing';
import { ImageProcessingProfile, DEFAULT_PROCESSING_PROFILES } from '../types';

/**
 * === TỐI ƯU CHO QC LỚN TUỔI ===
 * 1. Nút chụp ảnh TO HƠN NHIỀU (min-height 120px → dễ nhấn)
 * 2. Thêm haptic feedback (vibrate) khi chụp thành công
 * 3. Text lớn hơn, rõ ràng hơn
 * 4. Loading state rõ ràng hơn với text tiếng Việt
 * 5. Thêm nút chọn từ thư viện riêng biệt
 * 6. Tối ưu: không re-render khi không cần thiết (useCallback)
 */

interface ImageUploaderProps {
  onImageSelected: (displayBase64: string, processedBase64: string) => void;
  isProcessing: boolean;
  processingProfile?: ImageProcessingProfile;
  themeMode?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, isProcessing, processingProfile, themeMode }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const activeProfile = processingProfile || DEFAULT_PROCESSING_PROFILES[0];

  const processFile = useCallback(async (file: File) => {
    try {
      const { display, processed } = await processImage(file, activeProfile);
      // Haptic feedback khi xử lý xong
      if (navigator.vibrate) navigator.vibrate(100);
      onImageSelected(display, processed);
    } catch (error) {
      console.error("Image processing failed:", error);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (navigator.vibrate) navigator.vibrate(100);
        onImageSelected(base64, base64);
      };
      reader.readAsDataURL(file);
    }
  }, [activeProfile, onImageSelected]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
      // Reset input để có thể chụp lại cùng file
      event.target.value = '';
    }
  }, [processFile]);

  const isLight = themeMode === 'light' || themeMode === 'light_2';

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Input ẩn cho Camera */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Input ẩn cho Gallery (không có capture) */}
      <input
        type="file"
        accept="image/*"
        ref={galleryInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* === NÚT CHỤP ẢNH - TO, RÕ RÀNG === */}
      <button
        disabled={isProcessing}
        onClick={() => cameraInputRef.current?.click()}
        className={`
            w-full relative group overflow-hidden
            ${isLight 
              ? 'bg-white hover:bg-slate-50 border-2 border-dashed border-slate-800 rounded-3xl min-h-[140px]' 
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border-2 border-blue-500 rounded-2xl shadow-lg shadow-blue-600/20 min-h-[100px]'}
            transition-all duration-200
            flex flex-col items-center justify-center gap-2
            py-5 px-4
            ${isProcessing ? 'opacity-60 cursor-not-allowed animate-pulse' : 'cursor-pointer active:scale-[0.98]'}
        `}
      >
        {isProcessing ? (
          <>
            <div className={`w-10 h-10 border-4 ${isLight ? 'border-slate-800' : 'border-white'} border-t-transparent rounded-full animate-spin`} />
            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-black text-base uppercase tracking-wide`}>
              Đang xử lý...
            </span>
          </>
        ) : (
          <>
            {isLight ? (
              <>
                <div className="w-14 h-14 bg-[#EEF2F6] rounded-full flex items-center justify-center mb-1">
                  <Camera className="text-[#FF5722] w-7 h-7" strokeWidth={2} />
                </div>
                <span className="text-slate-800 font-bold text-lg">
                  Chụp hình
                </span>
                <span className="text-slate-500 text-xs">
                  Nhấn để mở camera
                </span>
              </>
            ) : (
              <>
                <Camera className="text-white w-10 h-10" strokeWidth={2.5} />
                <span className="text-white font-black text-base uppercase tracking-wide">
                  Chụp ảnh
                </span>
              </>
            )}
          </>
        )}
      </button>

      {/* === NÚT CHỌN TỪ THƯ VIỆN - Phụ, nhỏ hơn === */}
      {!isProcessing && (
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 
                     rounded-xl py-3 px-4 transition-all duration-200
                     flex items-center justify-center gap-2
                     active:scale-[0.98]"
        >
          <ImagePlus className="text-slate-300 w-5 h-5" />
          <span className="text-slate-300 font-bold text-sm">
            Chọn từ thư viện
          </span>
        </button>
      )}
    </div>
  );
};
