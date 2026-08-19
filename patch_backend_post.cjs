const fs = require('fs');
let code = fs.readFileSync('backend.gs', 'utf-8');

code = code.replace(
  /function doPost\(e\) \{[\s\S]*?const ss = SpreadsheetApp\.getActiveSpreadsheet\(\);/,
  `function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "LỖI: Script chưa được liên kết với Google Sheet." })).setMimeType(ContentService.MimeType.JSON);
    }`
);

code = code.replace(
  /return ContentService\.createTextOutput\(JSON\.stringify\(\{ success: true \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\n\}/,
  `return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`
);

fs.writeFileSync('backend.gs', code);
