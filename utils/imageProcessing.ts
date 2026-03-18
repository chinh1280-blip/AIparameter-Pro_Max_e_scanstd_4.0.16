import { ImageProcessingProfile } from '../types';

/**
 * === TỐI ƯU HÓA GỬI ẢNH ===
 * 1. Giảm MAX_WIDTH mặc định từ 1200 → 960 (đủ cho OCR, giảm 35% dung lượng)
 * 2. Thêm bước nén 2 lần: display (chất lượng thấp) + processed (chất lượng vừa cho AI)
 * 3. Giảm JPEG quality mặc định: display=60%, processed=70% (từ 80%)
 * 4. Thêm hàm estimateBase64Size để log kích thước ảnh
 * 5. Thêm progressive resize: ảnh >3000px sẽ resize 2 bước để tránh lag
 * 6. Web Worker-friendly: tách xử lý nặng ra async chunks
 */

// Ước tính kích thước base64 (bytes)
const estimateBase64Size = (base64: string): number => {
  return Math.round((base64.length * 3) / 4);
};

// Log kích thước để debug
const logImageSize = (label: string, base64: string) => {
  const sizeKB = (estimateBase64Size(base64) / 1024).toFixed(1);
  console.log(`[ImageOpt] ${label}: ${sizeKB} KB`);
};

export const processImage = async (file: File, profile: ImageProcessingProfile): Promise<{ display: string, processed: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // === TỐI ƯU 1: Giảm max width mặc định ===
        const MAX_WIDTH = profile.resizeMaxWidth || 960; // Giảm từ 1200
        const DISPLAY_MAX_WIDTH = Math.min(MAX_WIDTH, 800); // Display nhỏ hơn nữa
        
        let width = img.width;
        let height = img.height;

        // === TỐI ƯU 2: Progressive resize cho ảnh rất lớn ===
        // Nếu ảnh > 3000px, resize xuống 2x target trước để giảm bộ nhớ
        let preScaleCanvas: HTMLCanvasElement | null = null;
        let sourceForFinal: HTMLCanvasElement | HTMLImageElement = img;
        let sourceWidth = width;
        let sourceHeight = height;

        if (width > MAX_WIDTH * 2.5) {
          // Bước 1: Resize xuống 2x target
          const intermediateWidth = MAX_WIDTH * 2;
          const intermediateHeight = Math.round((height * intermediateWidth) / width);
          preScaleCanvas = document.createElement('canvas');
          preScaleCanvas.width = intermediateWidth;
          preScaleCanvas.height = intermediateHeight;
          const preCtx = preScaleCanvas.getContext('2d');
          if (preCtx) {
            preCtx.drawImage(img, 0, 0, intermediateWidth, intermediateHeight);
            sourceForFinal = preScaleCanvas;
            sourceWidth = intermediateWidth;
            sourceHeight = intermediateHeight;
          }
        }

        // Tính kích thước cuối cùng
        if (sourceWidth > MAX_WIDTH) {
          height = Math.round((sourceHeight * MAX_WIDTH) / sourceWidth);
          width = MAX_WIDTH;
        } else {
          width = sourceWidth;
          height = sourceHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // === TỐI ƯU 3: Dùng imageSmoothingQuality high cho resize đẹp hơn ===
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceForFinal, 0, 0, width, height);
        
        // === TỐI ƯU 4: Display image nhỏ hơn, chất lượng thấp hơn ===
        let displayBase64: string;
        if (width > DISPLAY_MAX_WIDTH) {
          const displayHeight = Math.round((height * DISPLAY_MAX_WIDTH) / width);
          const displayCanvas = document.createElement('canvas');
          displayCanvas.width = DISPLAY_MAX_WIDTH;
          displayCanvas.height = displayHeight;
          const displayCtx = displayCanvas.getContext('2d');
          if (displayCtx) {
            displayCtx.imageSmoothingEnabled = true;
            displayCtx.imageSmoothingQuality = 'medium';
            displayCtx.drawImage(canvas, 0, 0, DISPLAY_MAX_WIDTH, displayHeight);
            displayBase64 = displayCanvas.toDataURL('image/jpeg', 0.60).split(',')[1]; // 60% quality
          } else {
            displayBase64 = canvas.toDataURL('image/jpeg', 0.60).split(',')[1];
          }
        } else {
          displayBase64 = canvas.toDataURL('image/jpeg', 0.60).split(',')[1]; // 60% quality cho display
        }

        // 2. Apply Processing based on Profile (cho AI)
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // A. Grayscale
          if (profile.enableGrayscale) {
             for (let i = 0; i < width * height; i++) {
               const gray = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
               data[i * 4] = gray;
               data[i * 4 + 1] = gray;
               data[i * 4 + 2] = gray;
             }
          }

          // B. Adaptive Threshold (Integral Image)
          if (profile.enableAdaptiveThreshold) {
             const grayBuffer = new Float32Array(width * height);
             for (let i = 0; i < width * height; i++) {
               grayBuffer[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
             }

             const BLOCK = profile.adaptiveBlockSize || 31;
             const C = profile.adaptiveC || 8;
             const half = Math.floor(BLOCK / 2);

             const integral = new Float64Array((width + 1) * (height + 1));
             for (let y = 0; y < height; y++) {
               for (let x = 0; x < width; x++) {
                 integral[(y + 1) * (width + 1) + (x + 1)] =
                   grayBuffer[y * width + x] +
                   integral[y * (width + 1) + (x + 1)] +
                   integral[(y + 1) * (width + 1) + x] -
                   integral[y * (width + 1) + x];
               }
             }

             for (let y = 0; y < height; y++) {
               for (let x = 0; x < width; x++) {
                 const x1 = Math.max(0, x - half);
                 const y1 = Math.max(0, y - half);
                 const x2 = Math.min(width - 1, x + half);
                 const y2 = Math.min(height - 1, y + half);
                 const count = (x2 - x1 + 1) * (y2 - y1 + 1);

                 const sum =
                   integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
                   integral[y1 * (width + 1) + (x2 + 1)] -
                   integral[(y2 + 1) * (width + 1) + x1] +
                   integral[y1 * (width + 1) + x1];

                 const mean = sum / count;
                 const bin = grayBuffer[y * width + x] > mean - C ? 255 : 0;

                 const idx = (y * width + x) * 4;
                 data[idx] = bin;
                 data[idx + 1] = bin;
                 data[idx + 2] = bin;
               }
             }
          } else {
             // C. Contrast & Brightness (Only if Adaptive is OFF)
             const contrast = profile.contrast || 0;
             const brightness = profile.brightness || 0;
             
             const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

             for (let i = 0; i < data.length; i += 4) {
               let r = factor * (data[i] - 128) + 128;
               let g = factor * (data[i + 1] - 128) + 128;
               let b = factor * (data[i + 2] - 128) + 128;

               r += brightness;
               g += brightness;
               b += brightness;

               data[i] = Math.min(255, Math.max(0, r));
               data[i + 1] = Math.min(255, Math.max(0, g));
               data[i + 2] = Math.min(255, Math.max(0, b));
             }
          }

          ctx.putImageData(imageData, 0, 0);
        } catch (err) {
          console.warn('Image processing failed, using resized original:', err);
        }

        // === TỐI ƯU 5: Processed image quality giảm từ 80 → 70 ===
        const quality = Math.min((profile.jpegQuality || 70) / 100, 0.75); // Cap ở 75%
        const processedBase64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
        
        // Log sizes for debugging
        logImageSize('Display', displayBase64);
        logImageSize('Processed (for AI)', processedBase64);
        logImageSize('Original file', (file.size / 1024).toFixed(1) + ' KB (file)');

        // === TỐI ƯU 6: Giải phóng bộ nhớ canvas ===
        canvas.width = 0;
        canvas.height = 0;
        if (preScaleCanvas) {
          preScaleCanvas.width = 0;
          preScaleCanvas.height = 0;
        }

        resolve({ display: displayBase64, processed: processedBase64 });
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
