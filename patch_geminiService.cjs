const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

code = code.replace(
  /export const analyzeImage = async \([^)]*\): Promise<any> => \{/,
  `export const analyzeImage = async (
  base64Image: string | string[],
  prompt: string,
  schemaJson: string,
  modelName: string,
  apiKeyOverride?: string,
  processingProfileId?: string,
  processingProfiles?: any[]
): Promise<any> => {
  window.dispatchEvent(new CustomEvent('gemini-api-start'));`
);

code = code.replace(
  /return parsedData;\s*\} catch \(error: any\) \{/g,
  `window.dispatchEvent(new CustomEvent('gemini-api-success'));
      return parsedData;
    } catch (error: any) {`
);

code = code.replace(
  /console\.error\('Gemini API Error:', error\);\s*throw error;\s*\}/g,
  `console.error('Gemini API Error:', error);
    window.dispatchEvent(new CustomEvent('gemini-api-error', { detail: error.message }));
    throw error;
  }`
);

fs.writeFileSync('services/geminiService.ts', code);
