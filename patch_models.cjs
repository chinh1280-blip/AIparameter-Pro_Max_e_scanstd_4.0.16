const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('App.tsx', 'utf8');
appCode = appCode.replace(
  /\{ id: 'gemini-flash-latest', name: 'Flash' \}/g,
  `{ id: 'gemini-2.5-flash', name: 'Flash' }`
);
fs.writeFileSync('App.tsx', appCode);

// Patch components/SettingsModal.tsx
let settingsCode = fs.readFileSync('components/SettingsModal.tsx', 'utf8');
settingsCode = settingsCode.replace(
  /<option value="gemini-flash-latest">Flash<\/option>/g,
  `<option value="gemini-2.5-flash">Flash</option>`
);
fs.writeFileSync('components/SettingsModal.tsx', settingsCode);
