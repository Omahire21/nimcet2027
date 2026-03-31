import { execSync } from 'child_process';
import fs from 'fs';

const channel = {
  id: "sybsc-cs",
  name: "SYBSC CS (Computer Science)",
  icon: "https://ui-avatars.com/api/?name=CS&background=4f46e5&color=fff&rounded=true&bold=true",
  subscribers: "Curated Playlists",
  playlistsData: [
    { search: "https://www.youtube.com/playlist?list=PLT3bOBUU3L9iEPG5c4X5GPEHG1snemTEp", title: "Numerical Techniques (Pradeep Giri)" },
    { search: "ytsearch15:Computational Geometry full course computer graphics", title: "Computational Geometry" },
    { search: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p", title: "DBMS Complete Course (Gate Smashers)" },
    { search: "https://www.youtube.com/playlist?list=PLdo5W4Nhv31bbKJzrsPnFSZIGFSMdth_4", title: "DSA Complete Course (Jenny's Lectures)" }
  ]
};

function formatTime(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let playlistsCode = '';

for (const pl of channel.playlistsData) {
    console.log('Fetching', pl.title);
    try {
        const raw = execSync(`yt-dlp -J --flat-playlist "${pl.search}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
        
        const parser = raw.trim().split('\n').map(line => {
            try { return JSON.parse(line); } catch(e){return null;}
        }).filter(Boolean);
        
        let data = parser.length === 1 && parser[0].entries ? parser[0] : { entries: parser };

        const videos = [];
        for (const entry of data.entries || []) {
            if (!entry || !entry.title) continue;
            if (videos.some(v => v.id === entry.id)) continue;
            
            videos.push({
                id: entry.id,
                title: entry.title.replace(/"/g, '\\"').replace(/\n/g, ' '),
                thumbnail: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
                duration: formatTime(entry.duration)
            });
            if (videos.length >= 25 && pl.search.startsWith('ytsearch')) break; // limit ytsearch
            if (videos.length >= 60) break; // Limit playlist to 60 to prevent enormous data
        }
        
        if (videos.length > 0) {
            playlistsCode += `      {
        id: "PL_SYBSC_${Math.random().toString(36).substring(2, 9)}",
        title: "${pl.title}",
        thumbnail: "${videos[0].thumbnail}",
        videoCount: ${videos.length},
        videos: [\n`;
            for(const v of videos) {
                playlistsCode += `          { id: "${v.id}", title: "${v.title}", thumbnail: "${v.thumbnail}", duration: "${v.duration}" },\n`;
            }
            playlistsCode += `        ]\n      },\n`;
            console.log('Success:', pl.title, 'Videos:', videos.length);
        }
    } catch (e) { console.error("Failed", pl.title, e.message); }
}

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

const regex = /\{\s*id:\s*"sybsc-cs",[\s\S]*?(?=\}\s*\]\s*;\s*$|\}\s*\]\s*$)/m;
if (regex.test(dataTs)) {
    const newChannelCode = `{
    id: "${channel.id}",
    name: "${channel.name}",
    icon: "${channel.icon}",
    subscribers: "${channel.subscribers}",
    playlists: [
${playlistsCode}
    ]
  }`;
    dataTs = dataTs.replace(regex, newChannelCode);
    fs.writeFileSync('src/data.ts', dataTs);
    console.log('Successfully updated SYBSC CS channel with correct playlists!');
} else {
    console.log('Failed to match sybsc-cs regex.');
}
