const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf-8');
app = app.replace(
  /if \(resData\.appConfig\.userGuideImages\) setUserGuideImages\(resData\.appConfig\.userGuideImages\);\s*\}\s*\}\s*\} catch \(error\) \{/g,
  `if (resData.appConfig.userGuideImages) setUserGuideImages(resData.appConfig.userGuideImages);
        }
    } catch (error) {`
);
fs.writeFileSync('App.tsx', app);
