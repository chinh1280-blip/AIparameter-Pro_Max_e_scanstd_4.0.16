const fs = require('fs');
let code = fs.readFileSync('backend.gs', 'utf-8');

code = code.replace(
  /function doGet\(e\) \{[\s\S]*?if \(action === "sync"\) \{/,
  `function doGet(e) {
  if (!e || !e.parameter) return ContentService.createTextOutput("Service Active").setMimeType(ContentService.MimeType.TEXT);
  const action = e.parameter.action;
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "LỖI: Script chưa được liên kết với Google Sheet. Vui lòng mở Google Sheet > Tiện ích mở rộng > Apps Script và dán code vào đó." })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "sync") {`
);

code = code.replace(
  /\} else if \(action === "verify_user"\) \{[\s\S]*?\}\n\}/,
  `} else if (action === "verify_user") {
      const u = e.parameter.u;
      const p = e.parameter.p;
      const result = verifyUser(ss, u, p);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Action not found" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`
);

fs.writeFileSync('backend.gs', code);
