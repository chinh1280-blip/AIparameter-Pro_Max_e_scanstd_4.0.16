const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /await fetch\(googleSheetUrl, \{ method: 'POST', mode: 'no-cors', body: JSON\.stringify\(payload\) \}\);/g,
  `await fetch(googleSheetUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      window.dispatchEvent(new CustomEvent('gas-api-success'));`
);

code = code.replace(
  /\} catch \(err\) \{\s*showToast\("Lỗi khi gửi báo cáo", "error"\);\s*\}/g,
  `} catch (err: any) {
          window.dispatchEvent(new CustomEvent('gas-api-error', { detail: err.message || "Lỗi gửi báo cáo" }));
          showToast("Lỗi khi gửi báo cáo", "error");
        }`
);

code = code.replace(
  /showToast\("Đã đồng bộ Cấu hình lên Cloud!", "success"\);\s*\}/g,
  `showToast("Đã đồng bộ Cấu hình lên Cloud!", "success");
      window.dispatchEvent(new CustomEvent('gas-api-success'));
    }`
);

code = code.replace(
  /\} catch \(e\) \{\s*showToast\("Lỗi đồng bộ cấu hình", "error"\);\s*\}/g,
  `} catch (e: any) {
      window.dispatchEvent(new CustomEvent('gas-api-error', { detail: e.message || "Lỗi đồng bộ" }));
      showToast("Lỗi đồng bộ cấu hình", "error");
    }`
);

fs.writeFileSync('App.tsx', code);
