const fs=require('fs');
const path=require('path');
const {Resvg,initWasm}=require('../vendor/resvg/index.cjs');
async function init(){await initWasm(fs.readFileSync(path.join(__dirname,'../vendor/resvg/index_bg.wasm')))}
function png(svg,width=512){return Buffer.from(new Resvg(svg,{fitTo:{mode:'width',value:width},font:{loadSystemFonts:false}}).render().asPng())}
module.exports={init,png};
if(require.main===module)init().then(()=>{fs.writeFileSync(process.argv[3],png(fs.readFileSync(process.argv[2],'utf8'),Number(process.argv[4]||512)));process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});
