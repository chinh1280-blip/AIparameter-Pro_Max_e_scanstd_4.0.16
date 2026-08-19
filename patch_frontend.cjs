const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf-8');

app = app.replace(
  /const resData = await response\.json\(\);/,
  `const resData = await response.json();
        if (resData.error) {
          console.error("Backend Error:", resData.error);
          showToast(resData.error, "error");
          return;
        }`
);
fs.writeFileSync('App.tsx', app);

let login = fs.readFileSync('components/LoginScreen.tsx', 'utf-8');
login = login.replace(
  /const verifyData = await verifyRes\.json\(\);/,
  `const verifyData = await verifyRes.json();
          if (verifyData.error) {
             setError(verifyData.error);
             return;
          }`
);
fs.writeFileSync('components/LoginScreen.tsx', login);
