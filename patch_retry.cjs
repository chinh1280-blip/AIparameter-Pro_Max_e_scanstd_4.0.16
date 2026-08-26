const fs = require('fs');

let app = fs.readFileSync('App.tsx', 'utf-8');
app = app.replace(
  /const fetchAllData = useCallback\(async \(\) => \{[\s\S]*?if \(!googleSheetUrl\) return;\s*setIsRefreshing\(true\);\s*try \{[\s\S]*?const response = await fetch\(`\$\{googleSheetUrl\}\$\{googleSheetUrl\.includes\('\?'\) \? '&' : '\?'\}action=sync&t=\$\{Date\.now\(\)\}`\);[\s\S]*?if \(response\.ok\) \{[\s\S]*?const responseText = await response\.text\(\);[\s\S]*?let resData;[\s\S]*?try \{[\s\S]*?resData = JSON\.parse\(responseText\);[\s\S]*?\} catch \(parseError\) \{[\s\S]*?console\.error\("Failed to parse JSON\. Raw response:", responseText\);[\s\S]*?showToast\("Lỗi dữ liệu từ Google Sheet \(Có thể bị quá tải\)\. Vui lòng thử lại sau\.", "error"\);[\s\S]*?setIsRefreshing\(false\);[\s\S]*?return;[\s\S]*?\}/,
  `const fetchAllData = useCallback(async () => {
    if (!googleSheetUrl) return;
    setIsRefreshing(true);
    
    const maxRetries = 3;
    let resData = null;
    let success = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(\`\$\{googleSheetUrl\}\$\{googleSheetUrl.includes('?') ? '&' : '?'\}action=sync&t=\$\{Date.now()\}\`);
        if (response.ok) {
          const responseText = await response.text();
          try {
            resData = JSON.parse(responseText);
            success = true;
            break; // Success, exit retry loop
          } catch (parseError) {
            console.warn(\`Attempt \$\{attempt\}: Failed to parse JSON. Raw HTML returned.\`);
            if (attempt === maxRetries) {
              console.error("Failed to parse JSON on final attempt. Raw response:", responseText);
              showToast("Quá tải Google Sheet (Hoặc lỗi nhiều tài khoản). Vui lòng dùng 1 trình duyệt ẩn danh hoặc 1 tài khoản Google.", "error");
              setIsRefreshing(false);
              return;
            }
          }
        } else {
            console.warn(\`Attempt \$\{attempt\}: HTTP Error \$\{response.status\}\`);
        }
      } catch (err) {
         console.warn(\`Attempt \$\{attempt\} failed with error:\`, err);
      }
      
      // Wait before retry (exponential backoff: 1.5s, 3s)
      if (!success && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
    
    if (!success || !resData) {
       setIsRefreshing(false);
       showToast("Không thể kết nối đến Google Sheet sau nhiều lần thử.", "error");
       return;
    }
    
    try {`
);
app = app.replace(
  /if \(resData\.error\) \{[\s\S]*?console\.error\("Backend Error:", resData\.error\);[\s\S]*?showToast\(resData\.error, "error"\);[\s\S]*?return;[\s\S]*?\}/,
  `if (resData.error) {
          console.error("Backend Error:", resData.error);
          showToast(resData.error, "error");
          setIsRefreshing(false);
          return;
        }`
);

fs.writeFileSync('App.tsx', app);

let login = fs.readFileSync('components/LoginScreen.tsx', 'utf-8');
login = login.replace(
  /const verifyRes = await fetch\(verifyUrl\);\s*const responseText = await verifyRes\.text\(\);\s*let verifyData;\s*try \{\s*verifyData = JSON\.parse\(responseText\);\s*\} catch \(parseError\) \{\s*console\.error\("Failed to parse JSON on login\. Raw response:", responseText\);\s*setError\("Google Sheet phản hồi lỗi \(Quá tải hoặc sai URL\)\. Vui lòng thử lại\."\);\s*setIsLoading\(false\);\s*return;\s*\}/,
  `let verifyData = null;
        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const verifyRes = await fetch(verifyUrl);
                const responseText = await verifyRes.text();
                try {
                    verifyData = JSON.parse(responseText);
                    success = true;
                    break;
                } catch (parseError) {
                    console.warn(\`Login attempt \$\{attempt\} received HTML instead of JSON.\`);
                    if (attempt === 3) {
                        console.error("Final attempt raw response:", responseText);
                        setError("Google chặn phản hồi (Do quá tải hoặc trình duyệt đang đăng nhập nhiều tài khoản Google). Vui lòng thử trên tab Ẩn danh.");
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.warn(\`Login attempt \$\{attempt\} error:\`, err);
            }
            if (!success && attempt < 3) {
                await new Promise(r => setTimeout(r, 1500 * attempt));
            }
        }
        
        if (!success || !verifyData) {
            setError("Không thể kết nối đến Google Sheet. Vui lòng thử lại.");
            setIsLoading(false);
            return;
        }`
);
fs.writeFileSync('components/LoginScreen.tsx', login);
