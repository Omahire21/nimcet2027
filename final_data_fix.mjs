import fs from 'fs';

const fetchedDsa = JSON.parse(fs.readFileSync('/tmp/fethed_dsa_v2.json', 'utf8'))[0];

function formatPlaylist(pl) {
    let videosCode = pl.videos.map(v => 
        `          { id: "${v.id}", title: "${v.title}", thumbnail: "${v.thumbnail}", duration: "${v.duration}" }`
    ).join(",\n");

    return `{
        id: "${pl.id}",
        title: "${pl.title}",
        thumbnail: "${pl.thumbnail}",
        videoCount: ${pl.videoCount},
        videos: [\n${videosCode}\n        ]
      }`;
}

const dsaCode = formatPlaylist(fetchedDsa);

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

// 1. Remove the 15-video CG. (The 15-vids version has videoCount: 15)
// Check both title and videoCount to avoid mistakes
const cg15Regex = /\{\s*id:\s*"[^"]*"\s*,\s*title:\s*"Computational Geometry",[\s\S]*?videoCount:\s*15,[\s\S]*?videos:\s*\[[\s\S]*?\]\s*\}/g;
dataTs = dataTs.replace(cg15Regex, '');

// Clean up commas left by the empty string replacement if any
dataTs = dataTs.replace(/,\s*,/g, ',');

// 2. Insert DSA at the START of the sybsc-cs playlists array.
const playlistsStartRegex = /(id:\s*"sybsc-cs"[\s\S]*?playlists:\s*\[\s*)/;
dataTs = dataTs.replace(playlistsStartRegex, `$1${dsaCode},\n`);

fs.writeFileSync('src/data.ts', dataTs);
console.log('Successfully added DSA and removed the 15-vids CG!');
