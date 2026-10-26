#!/usr/bin/env python3
"""Generate editable SVG+CSS and standalone Lottie assets. Standard library only."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'deliverables'
OUT.mkdir(exist_ok=True)
FPS = 60
INTRO = 120
LOOP = 240
END = INTRO + LOOP
PALETTE = {
    'background': '#090F18', 'tubeEdge': '#263343', 'tube': '#121E2D',
    'rim': '#7D8999', 'rimDark': '#344152', 'metalLight': '#AFB9C6',
    'metalDark': '#596778', 'waterBlue': '#627DFA', 'waterCyan': '#36C9EF',
    'waterIce': '#94EDFF', 'highlight': '#D2F8FF',
}
palette_path = ROOT / 'source' / 'palette.json'
if palette_path.exists():
    overrides = json.loads(palette_path.read_text())
    for key, value in overrides.items():
        if key not in PALETTE or not isinstance(value,str) or not re.fullmatch(r'#[0-9a-fA-F]{6}',value):
            raise ValueError(f'Invalid palette entry: {key}')
    PALETTE.update(overrides)

V = [[174,422],[96,344],[96,214],[256,70],[416,214],[416,344],[338,422]]
I = [[55,0],[0,43],[0,0],[-88,0],[0,-79.5],[0,0],[43,0]]
O = [[-43,0],[0,-45],[0,-79.5],[88,0],[0,45],[0,43],[-55,0]]
PATH = {'c': True, 'v': V, 'i': I, 'o': O}

def color(s):
    return [int(s[n:n+2],16)/255 for n in (1,3,5)]
def prop(v): return {'a':0,'k':v}
def anim(keys):
    return {'a':1,'k':[dict(t=t,s=[v],i={'x':[1],'y':[1]},o={'x':[0],'y':[0]}) for t,v in keys]}
def ks(**kw):
    d = dict(o=prop(100),r=prop(0),p=prop([0,0,0]),a=prop([0,0,0]),s=prop([100,100,100]))
    d.update(kw)
    return d

def shape_path(path=PATH): return dict(ty='sh',ks=prop(path),nm='Closed siphon circuit')
def stroke(hex,width,opacity=100):
    return dict(ty='st',c=prop(color(hex)),o=prop(opacity),w=prop(width),lc=2,lj=2,ml=4,nm='Stroke')
def fill(hex,opacity=100): return dict(ty='fl',c=prop(color(hex)),o=prop(opacity),r=1,nm='Fill')
def ellipse(radius,pos=[256,266]): return dict(ty='el',p=prop(pos),s=prop([radius*2,radius*2]),nm='Circle')
def gradient(ty='gs',width=16):
    stops = [(0,PALETTE['waterBlue']),(.42,PALETTE['waterCyan']),(.72,PALETTE['waterIce']),(1,PALETTE['waterCyan'])]
    data = [x for at,c in stops for x in [at,*color(c)]]
    d = dict(ty=ty,o=prop(100),g={'p':len(stops),'k':prop(data)},s=prop([416,422]),e=prop([96,70]),t=1,h=prop(0),a=prop(0),nm='Cool water gradient')
    if ty=='gs': d.update(w=prop(width),lc=2,lj=2,ml=4)
    else: d['r']=1
    return d

def trim(s=0,e=100,offset=None):
    return dict(ty='tm',s=prop(s),e=prop(e),o=offset or prop(0),m=1,nm='Flow along circuit')
def group(name,items,transform=None):
    tr = dict(ty='tr',p=prop([0,0]),a=prop([0,0]),s=prop([100,100]),r=prop(0),o=prop(100),sk=prop(0),sa=prop(0))
    if transform: tr.update(transform)
    return dict(ty='gr',it=items+[tr],nm=name)
def layer(name,shapes,transform=None):
    return dict(ddd=0,ind=0,ty=4,nm=name,sr=1,ks=transform or ks(),ao=0,shapes=shapes,ip=0,op=END,st=0,bm=0)

def make_lottie(loop_only=False):
    start=0 if loop_only else INTRO
    end=LOOP if loop_only else END
    layers=[]
    # The layer stack is front-to-back.
    layers.append(layer('Hub • silver bevel',[
        group('Hub center', [ellipse(6),fill(PALETTE['waterCyan'])]),
        group('Hub inset', [ellipse(17),fill(PALETTE['tube'])]),
        group('Hub silver', [ellipse(23),fill(PALETTE['metalLight'])]),
        group('Hub bevel', [ellipse(29),fill(PALETTE['rimDark'])])
    ]))
    for j in range(4):
        offset = anim([(start,0),(end,360)])
        flow_opacity = prop(42) if loop_only else anim([(0,0),(108,0),(120,42),(END,42)])
        layers.append(layer(f'Flow glint {j+1} • clockwise',[
            group('Single ribbon highlight',[shape_path(),stroke(PALETTE['highlight'],5),trim(j*25,j*25+6,offset)])
        ],ks(o=flow_opacity)))
    prime = trim()
    if not loop_only: prime['e'] = anim([(0,0),(8,0),(114,100),(END,100)])
    layers.append(layer('Water • one continuous ribbon',[group('Water',[shape_path(),gradient(),prime])]))
    layers.append(layer('Tube • machined edge',[group('Inner channel',[shape_path(),stroke(PALETTE['tube'],23)]),group('Outer edge',[shape_path(),stroke(PALETTE['tubeEdge'],28)])]))
    # Eight identical vanes allow exactly 45 degrees per seamless cycle.
    vanes=[]
    blade={'c':True,'v':[[-7,-36],[7,-36],[18,-112],[4,-120]],'i':[[0,0]]*4,'o':[[0,0]]*4}
    for j in range(8):
        blade_fill=dict(ty='gf',o=prop(100),g={'p':2,'k':prop([0,*color(PALETTE['metalDark']),1,*color(PALETTE['metalLight'])])},s=prop([-8,0]),e=prop([18,-120]),t=1,r=1,h=prop(0),a=prop(0))
        vanes.append(group(f'Vane {j+1}',[shape_path(blade),blade_fill],{'r':prop(j*45)}))
    layers.append(layer('Wheel • eightfold rotor',vanes,ks(p=prop([256,266,0]),r=anim([(start,0),(end,45)]))))
    layers.append(layer('Wheel • fixed rim',[
        group('Rim inner edge',[ellipse(119),stroke(PALETTE['rimDark'],2)]),
        group('Outer rim',[ellipse(126),stroke(PALETTE['rim'],12)]),
        group('Rear bevel',[ellipse(126,[256,269]),stroke('#182332',15)]),
    ]))
    layers.append(dict(ddd=0,ind=0,ty=1,nm='Background • charcoal navy',sw=512,sh=512,sc=PALETTE['background'],sr=1,ks=ks(),ip=0,op=end,st=0,bm=0))
    for j,l in enumerate(layers,1): l['ind']=j; l['op']=end
    return dict(v='5.13.0',fr=FPS,ip=0,op=end,w=512,h=512,nm='Siphon Wheel — steady loop' if loop_only else 'Siphon Wheel — prime then flow',ddd=0,assets=[],layers=layers,
        markers=[dict(tm=0,cm='loop',dr=LOOP)] if loop_only else [dict(tm=0,cm='intro',dr=INTRO),dict(tm=INTRO,cm='loop',dr=LOOP)])


def svg_path():
    s=f'M {V[0][0]} {V[0][1]}'
    for j in range(len(V)):
        k=(j+1)%len(V)
        c1=[V[j][a]+O[j][a] for a in range(2)]
        c2=[V[k][a]+I[k][a] for a in range(2)]
        s+=f' C {c1[0]} {c1[1]} {c2[0]} {c2[1]} {V[k][0]} {V[k][1]}'
    return s+' Z'

def make_svg():
    p=svg_path()
    vanes=''.join(f'<g transform="rotate({j*45})"><path d="M-7-36H7L18-112L4-120Z" fill="url(#metal)"/></g>' for j in range(8))
    glints=''.join(f'<use href="#circuit" class="glint" pathLength="100" stroke-dasharray="6 94" style="--phase:{-j*25}"/>' for j in range(4))
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-labelledby="title desc">
  <title id="title">Siphon wheel</title>
  <desc id="desc">A silver mechanical wheel inside a continuous cyan siphon. Water rises on the left, crests above the wheel, and falls on the right.</desc>
  <defs>
    <path id="circuit" d="{p}" pathLength="100"/>
    <linearGradient id="water" gradientUnits="userSpaceOnUse" x1="416" y1="422" x2="96" y2="70">
      <stop stop-color="{PALETTE['waterBlue']}"/><stop offset=".42" stop-color="{PALETTE['waterCyan']}"/><stop offset=".72" stop-color="{PALETTE['waterIce']}"/><stop offset="1" stop-color="{PALETTE['waterCyan']}"/>
    </linearGradient>
    <linearGradient id="metal" gradientUnits="userSpaceOnUse" x1="-8" y1="0" x2="18" y2="-120"><stop stop-color="{PALETTE['metalDark']}"/><stop offset="1" stop-color="{PALETTE['metalLight']}"/></linearGradient>
  </defs>
  <style>
    /* Edit the gradient stops above to match the site's accent. */
    .rotor {{ transform-origin:256px 266px; animation:turn 4s 2s linear infinite; }}
    .water {{ stroke-dasharray:100 100; animation:prime 2s linear both; }}
    .glints {{ opacity:0; animation:reveal 2s linear forwards; }}
    .glint {{ stroke-dashoffset:var(--phase); animation:flow 4s 2s linear infinite; }}
    @keyframes turn {{ from {{transform:rotate(0deg)}} to {{transform:rotate(45deg)}} }}
    @keyframes flow {{ from {{stroke-dashoffset:var(--phase)}} to {{stroke-dashoffset:calc(var(--phase) - 100)}} }}
    @keyframes prime {{ 0%,6.6667% {{stroke-dashoffset:100}} 95%,100% {{stroke-dashoffset:0}} }}
    @keyframes reveal {{ 0%,90% {{opacity:0}} 100% {{opacity:.42}} }}
    @media (prefers-reduced-motion:reduce) {{ .rotor,.water,.glints,.glint {{animation:none}} .water {{stroke-dashoffset:0}} .glints {{opacity:.42}} }}
  </style>
  <rect width="512" height="512" fill="{PALETTE['background']}"/>
  <circle cx="256" cy="269" r="126" fill="none" stroke="#182332" stroke-width="15"/>
  <circle cx="256" cy="266" r="126" fill="none" stroke="{PALETTE['rim']}" stroke-width="12"/>
  <circle cx="256" cy="266" r="119" fill="none" stroke="{PALETTE['rimDark']}" stroke-width="2"/>
  <g class="rotor"><g transform="translate(256 266)">{vanes}</g></g>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <use href="#circuit" stroke="{PALETTE['tubeEdge']}" stroke-width="28"/>
    <use href="#circuit" stroke="{PALETTE['tube']}" stroke-width="23"/>
    <use href="#circuit" class="water" stroke="url(#water)" stroke-width="16" pathLength="100"/>
    <g class="glints" stroke="{PALETTE['highlight']}" stroke-width="5">{glints}</g>
  </g>
  <circle cx="256" cy="266" r="29" fill="{PALETTE['rimDark']}"/>
  <circle cx="256" cy="266" r="23" fill="{PALETTE['metalLight']}"/>
  <circle cx="256" cy="266" r="17" fill="{PALETTE['tube']}"/>
  <circle cx="256" cy="266" r="6" fill="{PALETTE['waterCyan']}"/>
</svg>
'''

if __name__ == '__main__':
    for name,loop in [('siphon-wheel.json',False),('siphon-wheel-loop.json',True)]:
        (OUT/name).write_text(json.dumps(make_lottie(loop),separators=(',',':'))+'\n')
    (ROOT/'source'/'siphon-wheel.svg').write_text(make_svg())
    (ROOT/'source'/'palette.json').write_text(json.dumps(PALETTE,indent=2)+'\n')
    print('Generated Lottie assets and editable SVG+CSS (512 × 512).')
