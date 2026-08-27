const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Insert isIOS detection near the top of the component
code = code.replace(
  /const \[isFullscreen, setIsFullscreen\] = useState\(false\);/g,
  `const [isFullscreen, setIsFullscreen] = useState(false);
  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));`
);

// Conditionally render the Fullscreen button
code = code.replace(
  /<button onClick=\{toggleFullscreen\}.*?>[\s\S]*?<\/button>/g,
  (match) => {
    if (match.includes('toggleFullscreen')) {
        return `{!isIOS && (
               ${match}
               )}`;
    }
    return match;
  }
);

fs.writeFileSync('App.tsx', code);
