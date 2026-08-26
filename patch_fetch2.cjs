const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /resData = JSON\.parse\(responseText\);\s*success = true;/g,
  `resData = JSON.parse(responseText);
            success = true;
            window.dispatchEvent(new CustomEvent('gas-api-success'));`
);

code = code.replace(
  /if \(attempt === maxRetries\) \{\s*console\.error/g,
  `if (attempt === maxRetries) {
              window.dispatchEvent(new CustomEvent('gas-api-error', { detail: "Failed to parse JSON" }));
              console.error`
);

code = code.replace(
  /throw error;\s*\}\s*catch \(err\) \{\s*console\.error\("Sync error:", err\);/g,
  `throw error;
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('gas-api-error', { detail: err.message || "Network Error" }));
      console.error("Sync error:", err);`
);

fs.writeFileSync('App.tsx', code);
