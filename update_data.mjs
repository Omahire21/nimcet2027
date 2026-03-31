import fs from 'fs';

const text = fs.readFileSync('playlist_data_utf8.txt', 'utf8');
const lines = text.trim().split('\n');

const videos = [];
for (const line of lines) {
  if (!line.trim() || line.includes('[Private video]') || line.includes('[Deleted video]')) continue;
  const parts = line.split('|');
  if (parts.length >= 3) {
    const id = parts[0].trim();
    // Safely escape double quotes
    const title = parts[1].trim().replace(/"/g, '\\"');
    const duration = parts[2].trim() === 'NA' ? '0:00' : parts[2].trim();
    
    // We can also escape line breaks in title if there are any
    videos.push(`{ id: "${id}", title: "${title}", thumbnail: "https://i.ytimg.com/vi/${id}/hqdefault.jpg", duration: "${duration}" }`);
  }
}

const newPlaylist = `      {
        id: "PLw6nNovS7OMmHNpgEaYEQXiS59aU3MFKL",
        title: "NIMCET Full Course 2026/27 (PW)",
        thumbnail: "https://i.ytimg.com/vi/${videos[0].match(/id: "(.*?)"/)[1]}/hqdefault.jpg",
        videoCount: ${videos.length},
        videos: [
          ${videos.join(',\n          ')}
        ]
      },`;

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

// Replace only the first occurrence of "playlists: [" which belongs to PW NIMCET
dataTs = dataTs.replace(
  'playlists: [',
  'playlists: [\n' + newPlaylist
);

fs.writeFileSync('src/data.ts', dataTs);
console.log('Successfully updated src/data.ts');
