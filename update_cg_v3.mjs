import fs from 'fs';

const fetchedCg = JSON.parse(fs.readFileSync('/tmp/fethed_cg_31.json', 'utf8'))[0];

// Format CG to match the structure in src/data.ts
function formatPlaylist(pl) {
    let videosCode = pl.videos.map(v => 
        `          { id: "${v.id}", title: "${v.title}", thumbnail: "${v.thumbnail}", duration: "${v.duration}" }`
    ).join(",\n");

    return `{
        id: "${pl.id}",
        title: "${pl.title}",
        thumbnail: "https://i.ytimg.com/vi/vQRRiPJGaFA/hqdefault.jpg",
        videoCount: ${pl.videoCount},
        videos: [\n${videosCode}\n        ]
      }`;
}

const cgCode = formatPlaylist(fetchedCg);

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

// Use a regex to replace any existing Computational Geometry playlist in data.ts
// Match the whole object having id matching either the 15-vids one or the 31-vids one
const cgPlaylistRegex = /\{\s*id:\s*"(?:PL_SYBSC_1myb2xh|PLi7snlZMKRsZTJ9vnIZ9DNLxDrmd74z2U)",[\s\S]*?videos:\s*\[[\s\S]*?\]\s*\}/g;

dataTs = dataTs.replace(cgPlaylistRegex, (match) => {
    return cgCode;
});

fs.writeFileSync('src/data.ts', dataTs);
console.log('Successfully replaced Computational Geometry with the 31-vids version and updated thumbnail!');
