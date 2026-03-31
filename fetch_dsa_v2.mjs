import { execSync } from 'child_process';
import fs from 'fs';

const playlistsData = [
    { id: "PLdo5W4Nhv31bbKJzrsKfMpo_grxuLl8LU", title: "Data Structures & Algorithms" }
];

function formatTime(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let result = [];

for (const pl of playlistsData) {
    console.log('Fetching', pl.title, '...');
    try {
        const raw = execSync(`yt-dlp -J --flat-playlist "https://www.youtube.com/playlist?list=${pl.id}"`, { maxBuffer: 100 * 1024 * 1024 }).toString();
        const data = JSON.parse(raw);

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
        
        result.push({
            id: pl.id,
            title: pl.title,
            thumbnail: videos[0]?.thumbnail || '',
            videoCount: videos.length,
            videos: videos
        });
        console.log('Success:', pl.title, 'Videos:', videos.length);
    } catch (e) { 
        console.error("Failed", pl.title, e.message); 
    }
}

fs.writeFileSync('/tmp/fethed_dsa_v2.json', JSON.stringify(result, null, 2));
