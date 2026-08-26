const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

if (!code.includes('NetworkDiagnostic')) {
  code = code.replace(
    /import \{ Dashboard \} from '\.\/components\/Dashboard';/,
    `import { Dashboard } from './components/Dashboard';\nimport { NetworkDiagnostic } from './components/NetworkDiagnostic';`
  );
  
  code = code.replace(
    /<\/div>\s*<\/div>\s*\)\s*;\s*\}\s*export default App;/g,
    `      {currentUser?.role === 'admin' && (
        <NetworkDiagnostic googleSheetUrl={googleSheetUrl} />
      )}
    </div>
  );
}

export default App;`
  );
  fs.writeFileSync('App.tsx', code);
}
