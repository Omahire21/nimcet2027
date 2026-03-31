import { execSync } from 'child_process';
import fs from 'fs';

const channel = {
  id: "sybsc-cs",
  name: "SYBSC CS (Computer Science)",
  icon: "https://ui-avatars.com/api/?name=CS&background=4f46e5&color=fff&rounded=true&bold=true",
  subscribers: "Curated Playlists",
  playlistsData: [
    { search: "ytsearch25:Numerical Methods and Techniques full course engineering mathematics", title: "Numerical Techniques" },
    { search: "ytsearch25:Computational Geometry full course playlist computer graphics", title: "Computational Geometry" },
    { search: "ytsearch25:DBMS Database Management System complete course gate smashers", title: "DBMS Complete Course" },
    { search: "ytsearch25:Data Structures and Algorithms complete course jenny", title: "DSA Complete Course" }
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
        
        // Find the first set of entries or merge them
        let data = parser.length === 1 && parser[0].entries ? parser[0] : { entries: parser };

        const videos = [];
        for (const entry of data.entries) {
            if (!entry || !entry.title) continue;
            // Filter out obvious shorts/irrelevant if needed, but ytsearch usually gets regular videos.
            // Also filter duplicates
            if (videos.some(v => v.id === entry.id)) continue;
            
            videos.push({
                id: entry.id,
                title: entry.title.replace(/"/g, '\\"').replace(/\n/g, ' '),
                thumbnail: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
                duration: formatTime(entry.duration)
            });
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

const newChannelCode = `
  {
    id: "${channel.id}",
    name: "${channel.name}",
    icon: "${channel.icon}",
    subscribers: "${channel.subscribers}",
    playlists: [
${playlistsCode}
    ]
  }
`;

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

// Append to the end of the array
if (dataTs.endsWith('];\n') || dataTs.endsWith('];')) {
    dataTs = dataTs.replace(/\];\s*$/, `  ,${newChannelCode}];\n`);
    fs.writeFileSync('src/data.ts', dataTs);
    console.log('Successfully appended SYBSC CS channel!');
} else {
    console.log('Error finding the end of the channelsData array.');
}
