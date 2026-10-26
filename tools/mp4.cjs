/* Move the MP4 index before the media, so Cloudflare can begin playback immediately. */
function atoms(buffer, start = 0, end = buffer.length) {
  const result = [];
  for (let p = start; p < end;) {
    const size = buffer.readUInt32BE(p);
    if (size < 8 || p + size > end) throw new Error('Invalid or unsupported MP4 atom');
    result.push({type:buffer.toString('ascii',p+4,p+8),start:p,size,end:p+size});
    p += size;
  }
  return result;
}
function faststart(input) {
  const top = atoms(input);
  const movie = top.find(a => a.type === 'moov');
  const media = top.find(a => a.type === 'mdat');
  if (!movie || !media) throw new Error('Missing MP4 movie or media atom');
  if (movie.start < media.start) return input;
  const moov = Buffer.from(input.subarray(movie.start,movie.end));
  const containers = new Set(['moov','trak','mdia','minf','stbl','edts','dinf']);
  function patch(start,end) {
    for (const a of atoms(moov,start,end)) {
      if (containers.has(a.type)) patch(a.start+8,a.end);
      if (a.type === 'stco') {
        const count = moov.readUInt32BE(a.start+12);
        for(let i=0;i<count;i++) {
          const p=a.start+16+i*4;
          moov.writeUInt32BE(moov.readUInt32BE(p)+movie.size,p);
        }
      }
      if (a.type === 'co64') throw new Error('64-bit offsets not expected for these small assets');
      // Omit encoder wall-clock timestamps for reproducible exports.
      if (['mvhd','tkhd','mdhd'].includes(a.type)) {
        const version=moov[a.start+8];
        moov.fill(0,a.start+12,a.start+12+(version===1?16:8));
      }
    }
  }
  patch(0,moov.length);
  const first=top[0];
  if(first.type!=='ftyp') throw new Error('Expected ftyp first');
  return Buffer.concat([input.subarray(0,first.end),moov,
    ...top.slice(1).filter(a=>a!==movie).map(a=>input.subarray(a.start,a.end))]);
}
module.exports={atoms,faststart};
