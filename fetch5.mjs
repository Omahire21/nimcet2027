import { execSync } from 'child_process';
import fs from 'fs';

const playlistsToFetch = [
  { url: "https://youtube.com/playlist?list=PLw6nNovS7OMmHNpgEaYEQXiS59aU3MFKL", customTitle: "NIMCET Full Course (PW)" },
  { url: "https://youtube.com/playlist?list=PLw6nNovS7OMmR6bRxWuTMHuQTGLXf8_Z6", customTitle: "Mathematics" },
  { url: "https://youtube.com/playlist?list=PLw6nNovS7OMmI7NibU6rKcDBNTnI6oS_2", customTitle: "Quantitative Aptitude" },
  { url: "https://youtube.com/playlist?list=PLw6nNovS7OMlaCoNuaDmHrAIYc0V3l_4-", customTitle: "Logical Reasoning" },
  { url: "https://youtube.com/playlist?list=PLw6nNovS7OMkNMzRS6Q0ZLdyDg55I8PKy", customTitle: "Mathematics by Keshav Sir" }
];

function formatTime(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const fetchedPlaylists = [];

for (const pl of playlistsToFetch) {
  console.log('Fetching', pl.customTitle);
  try {
    const raw = execSync(`yt-dlp -J --flat-playlist "${pl.url}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
    const data = JSON.parse(raw);
    
    const videos = [];
    for (const entry of data.entries || []) {
      if (!entry.title || entry.title.includes('[Private video]') || entry.title.includes('[Deleted video]')) continue;
      videos.push({
        id: entry.id,
        title: entry.title.replace(/"/g, '\\"').replace(/\n/g, ' '),
        thumbnail: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
        duration: formatTime(entry.duration)
      });
    }

    if (videos.length > 0) {
      let urlObj;
      try { urlObj = new URL(pl.url); } catch (e) {}
      fetchedPlaylists.push({
        id: data.id || (urlObj ? urlObj.searchParams.get('list') : Math.random().toString()),
        title: pl.customTitle,
        thumbnail: videos[0].thumbnail,
        videoCount: videos.length,
        videos: videos
      });
      console.log('Success:', pl.customTitle, 'Videos:', videos.length);
    }
  } catch (e) {
    console.error("Failed", pl.customTitle);
  }
}

let code = ``;
for (const p of fetchedPlaylists) {
    code += `      {
        id: "${p.id}",
        title: "${p.title}",
        thumbnail: "${p.thumbnail}",
        videoCount: ${p.videoCount},
        videos: [\n`;
    for (const v of p.videos) {
        let dur = v.duration === "0:00" ? "NA" : v.duration;
        code += `          { id: "${v.id}", title: "${v.title}", thumbnail: "${v.thumbnail}", duration: "${dur}" },\n`;
    }
    code += `        ]\n      },\n`;
}

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

const pwRegex = /(id:\s*"pw-nimcet",[\s\S]*?playlists:\s*\[)([\s\S]*?)(\]\s*\n\s*\},\s*\{\s*id:\s*"aspire-study")/m;
const match = pwRegex.test(dataTs);

if (match) {
    dataTs = dataTs.replace(pwRegex, `$1\n${code}$3`);
    fs.writeFileSync('src/data.ts', dataTs);
    console.log('Successfully updated src/data.ts');
} else {
    console.log('Regex did not match! pw-nimcet section not found or format changed.');
}
