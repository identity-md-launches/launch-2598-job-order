#!/usr/bin/env node
const fs=require('fs'),path=require('path'),assert=require('assert');
const {createRenderer}=require('./lottie-render.cjs');
const {Resvg}=require('../vendor/resvg/index.cjs');
const raster=require('./rasterize.cjs');
const {atoms}=require('./mp4.cjs');
const ROOT=path.resolve(__dirname,'..');process.chdir(ROOT);
async function main(){
 await raster.init();
 const full=JSON.parse(fs.readFileSync('deliverables/siphon-wheel.json'));
 const loop=JSON.parse(fs.readFileSync('deliverables/siphon-wheel-loop.json'));
 assert.equal(full.w,512);assert.equal(full.h,512);assert.equal(full.fr,60);assert.equal(full.op,360);
 assert.equal(loop.op,240);assert.equal(full.assets.length,0);assert.equal(loop.assets.length,0);
 assert.deepEqual(full.markers,[{tm:0,cm:'intro',dr:120},{tm:120,cm:'loop',dr:240}]);
 assert(!full.layers.some(l=>l.ty===5),'No text layers');
 // Extend the composition by one frame just for checking the mathematical endpoint.
 const scratch='test/scratch';fs.mkdirSync(scratch,{recursive:true});
 const extended=structuredClone(full);extended.op=361;extended.layers.forEach(l=>l.op=361);
 fs.writeFileSync(`${scratch}/endpoint.json`,JSON.stringify(extended));
 const a=createRenderer(`${scratch}/endpoint.json`),b=createRenderer('deliverables/siphon-wheel-loop.json');
 function pixels(r,f){return Buffer.from(new Resvg(r.frame(f),{font:{loadSystemFonts:false}}).render().pixels)}
 const first=pixels(a,120),end=pixels(a,360);
 let seamPixels=0,maxDelta=0;
 for(let i=0;i<first.length;i+=4){let changed=false;for(let c=0;c<3;c++){const d=Math.abs(first[i+c]-end[i+c]);maxDelta=Math.max(maxDelta,d);changed ||= d>0}if(changed)seamPixels++}
 assert.equal(seamPixels,0,`Loop endpoint differs at ${seamPixels} pixels; max channel delta ${maxDelta}`);
 for(const f of [0,1,60,119,180,239])assert(pixels(b,f).equals(pixels(a,f+120)),`Loop asset differs from full animation at ${f}`);
 const blueCounts=[];
 for(const f of [0,30,60,90,120]){
  const p=pixels(a,f);let count=0;
  for(let i=0;i<p.length;i+=4)if(p[i+2]>130 && p[i+1]>p[i]*1.25)count++;
  blueCounts.push(count);
 }
 for(let i=1;i<blueCounts.length;i++)assert(blueCounts[i]>blueCounts[i-1],'Water must fill progressively during intro');
 assert(blueCounts[0]<200,'Tube must start empty');
 function crop(p,x0,y0,x1,y1){const parts=[];for(let y=y0;y<y1;y++)parts.push(p.subarray((y*512+x0)*4,(y*512+x1)*4));return Buffer.concat(parts)}
 assert(!crop(first,140,150,372,380).equals(crop(pixels(a,240),140,150,372,380)),'Rotor must turn');
 // Independent flow-direction check: sample the highlight before and after 1/4 sec.
 const circuit=full.layers.find(l=>l.nm.startsWith('Water')).shapes[0].it[0].ks.k;
 const pts=[];let total=0;
 for(let j=0;j<circuit.v.length;j++){
  const k=(j+1)%circuit.v.length,p0=circuit.v[j],p3=circuit.v[k];
  const p1=p0.map((x,c)=>x+circuit.o[j][c]),p2=p3.map((x,c)=>x+circuit.i[k][c]);
  for(let n=0;n<400;n++){const t=n/400,u=1-t;const p=[0,1].map(c=>u*u*u*p0[c]+3*u*u*t*p1[c]+3*u*t*t*p2[c]+t*t*t*p3[c]);if(pts.length)total+=Math.hypot(p[0]-pts.at(-1).x,p[1]-pts.at(-1).y);pts.push({x:p[0],y:p[1],d:total})}
 }
 function sample(p,fraction){const q=pts.reduce((best,q)=>Math.abs(q.d-total*fraction)<Math.abs(best.d-total*fraction)?q:best,pts[0]);const i=(Math.round(q.y)*512+Math.round(q.x))*4;return p[i]+p[i+1]+p[i+2]}
 const moved=pixels(a,135);
 assert(sample(first,.03)>sample(moved,.03)+20,'Highlight must leave the original point');
 assert(sample(moved,.0925)>sample(first,.0925)+20,'Highlight must move forward along the left-rising path');
 // Exercise the real lottie-web segment controller, with a manual clock.
 const segment=createRenderer('deliverables/siphon-wheel.json');
 const p=segment.player;let introCompletes=0,loopCompletes=0;
 p.addEventListener('complete',()=>{introCompletes++;p.loop=true;p.playSegments([120,360],true)});
 p.addEventListener('loopComplete',()=>loopCompletes++);
 p.loop=false;p.playSegments([0,120],true);p.advanceTime(2001);
 for(let i=0;i<8;i++)p.advanceTime(1000);
 assert.equal(introCompletes,1);assert.equal(loopCompletes,2);
 assert.equal(p.firstFrame,120);assert.equal(p.totalFrames,240);segment.destroy();
 const videoChecks=[];
 for(const [name,count,seconds] of [['siphon-wheel.mp4',360,6],['siphon-wheel-loop.mp4',240,4]]){
  const bytes=fs.readFileSync(`deliverables/${name}`);const top=atoms(bytes);
  const moov=top.find(a=>a.type==='moov'),mdat=top.find(a=>a.type==='mdat');
  assert(moov.start<mdat.start,'MP4 must have a fast-start index');
  const all=[];
  function collect(start,end){for(const a of atoms(bytes,start,end)){all.push(a);if(['moov','trak','mdia','minf','stbl'].includes(a.type))collect(a.start+8,a.end)}}
  collect(0,bytes.length);
  const mvhd=all.find(a=>a.type==='mvhd'),stsz=all.find(a=>a.type==='stsz'),stsd=all.find(a=>a.type==='stsd');
  assert.equal(bytes.readUInt32BE(mvhd.start+24)/bytes.readUInt32BE(mvhd.start+20),seconds);
  assert.equal(bytes.readUInt32BE(stsz.start+16),count);
  const sample=stsd.start+16;
  assert.equal(bytes.toString('ascii',sample+4,sample+8),'avc1');
  assert.equal(bytes.readUInt16BE(sample+32),512);assert.equal(bytes.readUInt16BE(sample+34),512);
  const config=atoms(bytes,sample+86,sample+bytes.readUInt32BE(sample)).find(a=>a.type==='avcC');
  assert.equal(bytes[config.start+9],66,'H.264 Baseline expected');
  videoChecks.push({file:name,codec:'H.264 Baseline / avc1',dimensions:[512,512],frames:count,seconds,fps:count/seconds,fastStart:true});
 }
 const report={dimensions:[512,512],fps:60,introSeconds:2,loopSeconds:4,endpointDifferentPixels:seamPixels,endpointMaximumChannelDifference:maxDelta,loopAssetMatchesFullSegment:true,introBluePixelCounts:blueCounts,flowDirection:'left rises, top crests, right descends',rotorMotion:'45 degrees per 4 seconds; eightfold symmetry',externalAssets:0,playerCheck:{introCompletes,loopCompletes,segment:[120,360]},videoChecks,checksPassed:true};
 fs.writeFileSync('review/check-results.json',JSON.stringify(report,null,2)+'\n');
 a.destroy();b.destroy();console.log(JSON.stringify(report,null,2));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
