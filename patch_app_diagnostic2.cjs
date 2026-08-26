const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /      \/>\s*<\/div>\s*\);\s*\};\s*export default App;/g,
  `      />
      {currentUser?.role === 'admin' && (
        <NetworkDiagnostic googleSheetUrl={googleSheetUrl} />
      )}
    </div>
  );
};

export default App;`
);

fs.writeFileSync('App.tsx', code);
