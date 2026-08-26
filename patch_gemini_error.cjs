const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

// Replace the catch block to dispatch the raw error message before we map it to friendly strings.
code = code.replace(
  /console\.error\(`Gemini API Error:`, error\);\s*const msg = error\.message\?\.toLowerCase\(\) \|\| '';/g,
  `console.error(\`Gemini API Error:\`, error);
    const msg = error.message?.toLowerCase() || '';
    window.dispatchEvent(new CustomEvent('gemini-api-error', { detail: error.message || "Unknown Gemini API Error" }));`
);

fs.writeFileSync('services/geminiService.ts', code);
