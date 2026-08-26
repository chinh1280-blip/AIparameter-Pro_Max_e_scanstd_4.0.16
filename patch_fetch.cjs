const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// For handleUploadToSheet
code = code.replace(
  /const response = await fetch\(googleSheetUrl, \{\s*method: "POST",\s*mode: "no-cors",\s*headers: \{\s*"Content-Type": "text\/plain",\s*\},\s*body: JSON\.stringify\(payload\),\s*\}\);/g,
  `const response = await fetch(googleSheetUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload),
          });
          window.dispatchEvent(new CustomEvent('gas-api-success'));`
);

// For fetchAllData (inside try block before the first line)
// It's a recursive/retry function, we just dispatch on success/error inside the fetch call.
// Let's find how fetchAllData is calling fetch.
