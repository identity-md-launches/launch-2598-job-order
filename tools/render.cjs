#!/usr/bin/env node
/* Offline export using the exact shipped lottie-web renderer, then resvg and a bundled H.264 WASM encoder. */
const fs=require('fs');
const path=require('path');
const HME=require('../vendor/h264/encoder.cjs');
const {faststart}=require('./mp4.cjs');
const {Resvg}=require('../vendor/resvg/index.cjs');
const {createRenderer}=require('./lottie-render.cjs');
const raster=require('./rasterize.cjs');
const ROOT=path.resolve(__dirname,'..');
process.chdir(ROOT);
async function main(){
 await raster.init();
 const full=createRenderer('deliverables/siphon-wheel.json');
 const loop=createRenderer('deliverables/siphon-wheel-loop.json');
 fs.mkdirSync('artifacts',{recursive:true});
 const poster=raster.png(full.frame(180));
 fs.writeFileSync('artifacts/image.png',poster);
 fs.writeFileSync('deliverables/siphon-wheel-poster.png',poster);
 fs.writeFileSync('deliverables/siphon-wheel-32.png',raster.png(full.frame(180),32));
 async function encode(renderer,count,name){
  const encoder=await HME.createH264MP4Encoder();
  encoder.width=512;encoder.height=512;encoder.frameRate=60;
  encoder.quantizationParameter=16;encoder.speed=0;encoder.groupOfPictures=60;
  encoder.initialize();
  for(let frame=0;frame<count;frame++){
   const pixels=new Resvg(renderer.frame(frame),{font:{loadSystemFonts:false}}).render().pixels;
   encoder.addFrameRgba(pixels);
  }
  encoder.finalize();
  fs.writeFileSync(name,faststart(Buffer.from(encoder.FS.readFile(encoder.outputFilename))));
  encoder.delete();
  console.log(`${name}: ${count} frames, 512 × 512, H.264, 60 fps`);
 }
 await encode(full,360,'deliverables/siphon-wheel.mp4');
 await encode(loop,240,'deliverables/siphon-wheel-loop.mp4');
 fs.mkdirSync('review',{recursive:true});
 for(const frame of [0,30,60,90,119,120,180,240,300,359])fs.writeFileSync(`review/frame-${String(frame).padStart(3,'0')}.png`,raster.png(full.frame(frame),256));
 full.destroy();loop.destroy();
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
