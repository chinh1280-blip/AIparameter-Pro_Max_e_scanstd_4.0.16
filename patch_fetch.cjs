const fs = require('fs');

// Patch App.tsx
let app = fs.readFileSync('App.tsx', 'utf-8');
app = app.replace(
  /const response = await fetch\(`\$\{googleSheetUrl\}\$\{googleSheetUrl\.includes\('\?'\) \? '&' : '\?'\}action=sync&t=\$\{Date\.now\(\)\}`\);\s*if \(response\.ok\) \{\s*const resData = await response\.json\(\);/,
  `const response = await fetch(\`\$\{googleSheetUrl\}\$\{googleSheetUrl.includes('?') ? '&' : '?'\}action=sync&t=\$\{Date.now()\}\`);
      if (response.ok) {
        const responseText = await response.text();
        let resData;
        try {
          resData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse JSON. Raw response:", responseText);
          showToast("Lỗi dữ liệu từ Google Sheet (Có thể bị quá tải). Vui lòng thử lại sau.", "error");
          setIsRefreshing(false);
          return;
        }`
);
fs.writeFileSync('App.tsx', app);

// Patch LoginScreen.tsx
let login = fs.readFileSync('components/LoginScreen.tsx', 'utf-8');
login = login.replace(
  /const verifyRes = await fetch\(verifyUrl\);\s*const verifyData = await verifyRes\.json\(\);/,
  `const verifyRes = await fetch(verifyUrl);
          const responseText = await verifyRes.text();
          let verifyData;
          try {
            verifyData = JSON.parse(responseText);
          } catch (parseError) {
            console.error("Failed to parse JSON on login. Raw response:", responseText);
            setError("Google Sheet phản hồi lỗi (Quá tải hoặc sai URL). Vui lòng thử lại.");
            setIsLoading(false);
            return;
          }`
);
fs.writeFileSync('components/LoginScreen.tsx', login);

