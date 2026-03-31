import fs from 'fs';

let config = fs.readFileSync('tailwind.config.js', 'utf8');
if (!config.includes('darkMode')) {
  config = config.replace('theme: {', "darkMode: 'class',\n  theme: {");
  fs.writeFileSync('tailwind.config.js', config);
}

let code = fs.readFileSync('src/App.tsx', 'utf8');

// App icon replacement
code = code.replace(
  /<div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600\/20">[\s\S]*?<MonitorPlay size={20} className="text-white" \/>[\s\S]*?<\/div>/,
  `<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 relative overflow-hidden">
            <div className="absolute inset-x-0 -top-2 h-4 bg-white/30 blur-md rounded-full"></div>
            <span className="text-white font-black text-xl tracking-tighter italic relative z-10 drop-shadow-md">N</span>
          </div>`
);

// Toggle state
if (!code.includes('isDark')) {
  code = code.replace(
    'const [activeVideo, setActiveVideo] = useState<Video | null>(null);',
    `const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') !== 'light';
    }
    return true;
  });

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);`
  );
}

// Subscribe button removal:
code = code.replace(
  /<button className="bg-white\/10 hover:bg-white\/20 px-6 py-2 rounded-full font-medium transition-colors">[\s\S]*?Subscribe[\s\S]*?<\/button>/m,
  ""
);

// Theme Toggle Button
if (!code.includes('setIsDark(')) {
  code = code.replace(
    /<button className="p-2 hover:bg-white\/5 rounded-full transition-colors relative">/g,
    `<button onClick={() => setIsDark(!isDark)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-full transition-colors relative mr-2 text-slate-500 dark:text-slate-400">
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
          <button className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-full transition-colors relative">`
  );
}

// Bulk color classes replacement
code = code.replace(/bg-\[\#0f111a\]/g, "bg-slate-50 dark:bg-[#0f111a]");
code = code.replace(/bg-\[\#141621\](\/30|\/50)?/g, (match, op) => op ? `bg-white${op} dark:bg-[#141621]${op}` : "bg-white dark:bg-[#141621]");
code = code.replace(/text-slate-200/g, "text-slate-900 dark:text-slate-200");
code = code.replace(/text-slate-300/g, "text-slate-700 dark:text-slate-300");
code = code.replace(/text-slate-400/g, "text-slate-500 dark:text-slate-400");
code = code.replace(/border-white\/5/g, "border-slate-200 dark:border-white/5");
code = code.replace(/border-white\/10/g, "border-slate-200 dark:border-white/10");
code = code.replace(/bg-white\/5/g, "bg-slate-100 dark:bg-white/5");
code = code.replace(/hover:bg-white\/5/g, "hover:bg-slate-200 dark:hover:bg-white/5");
code = code.replace(/bg-white\/10([^\/])/g, "bg-slate-200 dark:bg-white/10$1");
code = code.replace(/bg-white\/20/g, "bg-slate-300 dark:bg-white/20");
code = code.replace(/bg-slate-800/g, "bg-slate-200 dark:bg-slate-800");
code = code.replace(/ring-white\/10/g, "ring-slate-300 dark:ring-white/10");
code = code.replace(/text-white\/90/g, "text-slate-800 dark:text-white/90");
code = code.replace(/text-white\/80/g, "text-slate-700 dark:text-white/80");

// Fix the gradient text
code = code.replace(/from-white to-slate-400/g, "from-slate-900 to-slate-600 dark:from-white dark:to-slate-400");
code = code.replace(/from-white to-slate-300/g, "from-slate-900 to-slate-600 dark:from-white dark:to-slate-300");

// Translucent dark layers
code = code.replace(/bg-black\/40/g, "bg-white/80 dark:bg-black/40");
code = code.replace(/bg-black\/80/g, "bg-white/95 dark:bg-black/80");

// Ensure the play overlay gets a nice tint in light mode
code = code.replace(/bg-indigo-900\/40/g, "bg-indigo-300/40 dark:bg-indigo-900/40");

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx theme updated!');
