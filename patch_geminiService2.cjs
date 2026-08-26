const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

code = code.replace(
  /return JSON\.parse\(text\);\s*\} catch \(error: any\) \{/g,
  `const parsed = JSON.parse(text);
    window.dispatchEvent(new CustomEvent('gemini-api-success'));
    return parsed;
  } catch (error: any) {`
);

code = code.replace(
  /throw new Error\(errorMessage\);\s*\}/g,
  `window.dispatchEvent(new CustomEvent('gemini-api-error', { detail: errorMessage }));
    throw new Error(errorMessage);
  }`
);

fs.writeFileSync('services/geminiService.ts', code);
