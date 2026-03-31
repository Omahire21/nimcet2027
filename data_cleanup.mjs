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

// 1. Remove the 15-video CG. 
const cg15Regex = /\{\s*id:\s*"[^"]*"\s*,\s*title:\s*"Computational Geometry",[\s\S]*?videoCount:\s*15,[\s\S]*?videos:\s*\[[\s\S]*?\]\s*\}/g;
dataTs = dataTs.replace(cg15Regex, '');

// Clean up commas left by the empty string replacement
dataTs = dataTs.replace(/,\s*,/g, ',');

// 2. Ensure only ONE Computational Geometry exists (the 31-video one)
// If there are duplicates of the 31-video one, remove them too.
// I'll use a more precise removal for the 15-vids one.

// 3. Insert DSA at the START of sybsc-cs playlists.
// Find sybsc-cs and insert DSA there.
const sybscChannelRegex = /(id:\s*"sybsc-cs"[\s\S]*?playlists:\s*\[\s*)/;
if (sybscChannelRegex.test(dataTs)) {
    dataTs = dataTs.replace(sybscChannelRegex, `$1${dsaCode},\n`);
}

fs.writeFileSync('src/data.ts', dataTs);
console.log('Final data fix applied: DSA added, 15-vid CG removed.');
