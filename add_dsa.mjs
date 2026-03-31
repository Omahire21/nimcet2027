import { execSync } from 'child_process';
import fs from 'fs';

function formatTime(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Jenny's Lectures DSA playlist
const dsaUrl = "https://www.youtube.com/playlist?list=PLdo5W4Nhv31bbKJzrsPnFSZIGFSMdth_4";
console.log("Fetching DSA from Jenny's Lectures...");

let code = '';
try {
  const raw = execSync(`yt-dlp -J --flat-playlist "${dsaUrl}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
  const data = JSON.parse(raw);
  const videos = [];
  for (const entry of data.entries || []) {
    if (!entry || !entry.title) continue;
    videos.push({
      id: entry.id,
      title: entry.title.replace(/"/g, '\\"').replace(/\n/g, ' '),
      thumbnail: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
      duration: formatTime(entry.duration)
    });
    if (videos.length >= 80) break;
  }
  console.log("Got", videos.length, "DSA videos");

  code = `      {
        id: "PL_DSA_jenny_lecturing",
        title: "DSA Complete Course (Jenny's Lectures)",
        thumbnail: "${videos[0].thumbnail}",
        videoCount: ${videos.length},
        videos: [\n`;
  for (const v of videos) {
    code += `          { id: "${v.id}", title: "${v.title}", thumbnail: "${v.thumbnail}", duration: "${v.duration}" },\n`;
  }
  code += `        ]\n      }`;
} catch (e) {
  console.error("Failed:", e.message);
}

if (!code) { console.log("Nothing to add"); process.exit(1); }

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

// Insert DSA playlist before the closing ]\n  } of sybsc-cs
dataTs = dataTs.replace(
  /(\s*\]\s*\n\s*\}\s*\n\];?\s*)$/,
  `,\n${code}\n    ]\n  }\n];\n`
);

fs.writeFileSync('src/data.ts', dataTs);
console.log('DSA added!');
