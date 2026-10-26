/* Minimal DOM for the vendored lottie-web SVG renderer. No browser or network needed. */
const fs = require('fs');
class Element {
  constructor(name) {
    this.tagName = name; this.nodeName=name; this.nodeType=1;
    this.attributes={}; this.childNodes=[]; this.parentNode=null;
    this.style={}; this._text=''; this.classList={add(){},remove(){}};
  }
  setAttribute(k,v){this.attributes[k]=String(v)}
  setAttributeNS(ns,k,v){this.setAttribute(k,v)}
  getAttribute(k){return this.attributes[k] ?? null}
  removeAttribute(k){delete this.attributes[k]}
  appendChild(e){ if(e.parentNode)e.parentNode.removeChild(e);this.childNodes.push(e);e.parentNode=this;return e; }
  prepend(e){return this.insertBefore(e,this.childNodes[0] || null)}
  insertBefore(e,b){ if(e.parentNode)e.parentNode.removeChild(e);const at=this.childNodes.indexOf(b);if(at<0)return this.appendChild(e);this.childNodes.splice(at,0,e);e.parentNode=this;return e; }
  removeChild(e){const at=this.childNodes.indexOf(e);if(at>=0)this.childNodes.splice(at,1);e.parentNode=null;return e;}
  get firstChild(){return this.childNodes[0]||null}
  get lastChild(){return this.childNodes.at(-1)||null}
  get children(){return this.childNodes}
  get innerHTML(){return this.childNodes.map(e=>serialize(e)).join('')}
  set innerHTML(s){this.childNodes=[];this._text=s}
  get textContent(){return this._text}
  set textContent(s){this._text=String(s)}
  addEventListener(){} removeEventListener(){}
  getContext(){return {fillRect(){},clearRect(){},drawImage(){},getImageData(){return {data:new Uint8Array(4)}}}}
}
function escape(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
function serialize(e){
  if(e.nodeType===3)return escape(e.textContent);
  const attrs={...e.attributes};
  const style=Object.entries(e.style).filter(([k,v])=>!/^\d+$/.test(k)&&typeof v!=='function'&&v!=='').map(([k,v])=>k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+v).join(';');
  if(style)attrs.style=style;
  return '<'+e.tagName+Object.entries(attrs).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('')+'>'+escape(e._text)+e.childNodes.map(serialize).join('')+'</'+e.tagName+'>';
}
const document={createElement:n=>new Element(n),createElementNS:(ns,n)=>new Element(n),createTextNode:s=>({nodeType:3,textContent:s}),getElementsByTagName:()=>[],querySelectorAll:()=>[],addEventListener(){},documentElement:new Element('html'),body:new Element('body')};
global.document=document;
global.window={document,navigator:{userAgent:'node'},devicePixelRatio:1,location:{href:''},requestAnimationFrame(){return 0},cancelAnimationFrame(){},addEventListener(){},setTimeout,clearTimeout,performance:{now:()=>0}};
global.navigator=window.navigator;
global.requestAnimationFrame=window.requestAnimationFrame;
global.cancelAnimationFrame=window.cancelAnimationFrame;
const lottie=require('../vendor/lottie/lottie.min.js');
lottie.setLocationHref('');
function createRenderer(animationPath){
  const container=new Element('div');container.offsetWidth=512;container.offsetHeight=512;
  const animationData=JSON.parse(fs.readFileSync(animationPath,'utf8'));
  const player=lottie.loadAnimation({container,renderer:'svg',loop:false,autoplay:false,animationData,rendererSettings:{progressiveLoad:false,hideOnTransparent:false}});
  return {player,frame(n){player.goToAndStop(n,true);return serialize(container.childNodes[0])},destroy(){player.destroy()}};
}
module.exports={createRenderer};
if(require.main===module){
 const r=createRenderer(process.argv[2]||'deliverables/siphon-wheel.json');
 fs.writeFileSync(process.argv[4]||'/tmp/siphon-frame.svg',r.frame(Number(process.argv[3]||180)));r.destroy();process.exit(0);
}
