import { execSync } from 'child_process';
import fs from 'fs';

const channels = [
  {
    id: "aspire-study",
    playlistsData: [
      { search: "ytsearch20:nimcet mathematics aspire study", title: "Aspire Master Mathematics Series" },
      { search: "ytsearch20:nimcet computer basics aspire study", title: "Aspire Computer Course" }
    ]
  },
  {
    id: "acme-academy",
    playlistsData: [
      { search: "ytsearch20:nimcet reasoning acme academy", title: "ACME 30 Days Special Challenge" },
      { search: "ytsearch20:nimcet pyq acme academy", title: "ACME PYQ Series" }
    ]
  }
];

function formatTime(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

for (const channel of channels) {
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
            for (const entry of data.entries) {
                if (!entry || !entry.title) continue;
                videos.push({
                    id: entry.id,
                    title: entry.title.replace(/"/g, '\\"').replace(/\n/g, ' '),
                    thumbnail: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
                    duration: formatTime(entry.duration)
                });
            }
            if (videos.length > 0) {
                playlistsCode += `      {
        id: "PL_${Math.random().toString(36).substring(2, 9)}",
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
    
    // We will find the specific channel object and replace ONLY its playlists content
    const regex = new RegExp(`(id:\\s*"${channel.id}",[\\s\\S]*?playlists:\\s*\\[)([\\s\\S]*?)(\\]\\s*\\n\\s*\\})`, "m");
    if (regex.test(dataTs)) {
        dataTs = dataTs.replace(regex, `$1\n${playlistsCode}$3`);
        console.log(`Updated playlists for ${channel.id}`);
    } else {
        console.log(`Could not find ${channel.id} playlists section`);
    }
}

fs.writeFileSync('src/data.ts', dataTs);
console.log('Done others!');
