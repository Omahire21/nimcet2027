import fs from 'fs';

const dsaData = JSON.parse(fs.readFileSync('/tmp/fethed_dsa_v2.json', 'utf8'))[0];
const cgData = JSON.parse(fs.readFileSync('/tmp/fethed_cg_31.json', 'utf8'))[0];

let dataTs = fs.readFileSync('src/data.ts', 'utf8');

// We will use a script to reconstruct the data structure to be safe
// But first let's see how its exported
const startMarker = 'export const channelsData: Channel[] = [';
const endMarker = '];';

const startIndex = dataTs.indexOf(startMarker);
const endIndex = dataTs.lastIndexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find channelsData markers");
    process.exit(1);
}

// Instead of parsing TS with JS (dangerous), I will use regex to find and replace blocks.

// 1. Remove Computational Geometry from all channels except sybsc-cs
// A playlist block usually looks like: { id: "...", title: "...", ... videos: [...] }
// Note: This is fragile with regex, so I'll be very specific.

// First, let's find the sybsc-cs channel block
const channelsParts = dataTs.split('  {'); 
// This is also risky if there are sub-objects.

// Let's try a different approach: Replace the entire array content with a clean version.
// I'll extract all channels, clean them, and put them back.

// Actually, I'll just use a targeted approach of removing the PW/ACME/ASPIRE CG playlists.
// Computational Geometry usually has the id 'PL_SYBSC_1myb2xh' or similar in earlier versions.
// In the current data.ts, it might have one of these:
// - PLi7snlZMKRsZTJ9vnIZ9DNLxDrmd74z2U (31 vids)
// - PL_SYBSC_1myb2xh (15 vids)

// Let's remove the "Computational Geometry" playlists from the first 3 channels.
// I'll look for the playlist object by title since ids might vary.

const cgPlaylistObjectRegex = /\{\s*id:\s*"[^"]*",\s*title:\s*"Computational Geometry",[\s\S]*?videos:\s*\[[\s\S]*?\]\s*\}/g;

// This will find all CG playlists. 
// I want to remove them if they are NOT inside the sybsc-cs channel.
// sybsc-cs is at the end.

const parts = dataTs.split('id: "sybsc-cs"');
if (parts.length === 2) {
    let beforeSybsc = parts[0];
    let sybscPart = parts[1];

    // Remove CG from before sybsc
    beforeSybsc = beforeSybsc.replace(cgPlaylistObjectRegex, '');
    // Clean up commas
    beforeSybsc = beforeSybsc.replace(/,\s*,/g, ',');

    // Cleanup sybscPart: remove ANY existing CG or DSA
    const dsaTitleRegex = /\{\s*id:\s*"[^"]*",\s*title:\s*"Data Structures & Algorithms",[\s\S]*?videos:\s*\[[\s\S]*?\]\s*\}/g;
    sybscPart = sybscPart.replace(cgPlaylistObjectRegex, '');
    sybscPart = sybscPart.replace(dsaTitleRegex, '');
    sybscPart = sybscPart.replace(/,\s*,/g, ',');

    // Now insert the correct ones at the start of playlists: [
    const playlistStart = 'playlists: [';
    const insIndex = sybscPart.indexOf(playlistStart) + playlistStart.length;
    
    function formatPlaylist(pl) {
        let videosCode = pl.videos.map(v => 
            `          { id: "${v.id}", title: "${v.title}", thumbnail: "${v.thumbnail}", duration: "${v.duration}" }`
        ).join(",\n");

        return `\n      {
        id: "${pl.id}",
        title: "${pl.title}",
        thumbnail: "${pl.thumbnail}",
        videoCount: ${pl.videoCount},
        videos: [\n${videosCode}\n        ]
      }`;
    }

    const correctPlaylists = formatPlaylist(dsaData) + ',' + formatPlaylist(cgData);
    sybscPart = sybscPart.slice(0, insIndex) + correctPlaylists + ',' + sybscPart.slice(insIndex);

    dataTs = beforeSybsc + 'id: "sybsc-cs"' + sybscPart;
    
    // Final cleanup of triple/double commas
    dataTs = dataTs.replace(/,\s*,\s*,/g, ',');
    dataTs = dataTs.replace(/,\s*,/g, ',');
    
    fs.writeFileSync('src/data.ts', dataTs);
    console.log('Data cleanup completed successfully!');
} else {
    console.error("sybsc-cs not found uniquely");
}
