# يبني شعار Gold Land كـ SVG خفيف من إحداثيات ملف CorelDRAW الأصلي
CX, CY = 618937.4, 398540.8
VB = "238000 18000 762000 762000"

BODY = ("M623851 32443.3c126541.3,1665.9 237578.4,67525.6 302065.2,166497.4l-116516.8 0c-48483.8,-46274.9 -113802.1,-75062.9 -185835.1,-76248 "
 "-2229.8,-178.2 -3999.3,-2058.3 -3999.3,-4331.9l0 -82286c344.6,-2052.2 2140.1,-3628.7 4286,-3628.7l0 -2.8z"
 "m3200.7 274081.3l252042.5 0 83441.6 0 10881.7 0c7615,29399.2 11666.7,60234.6 11666.7,92016.2 0,202217 -163929.8,366146.8 -366146.8,366146.8 "
 "-202217,0 -366146.8,-163929.8 -366146.8,-366146.8 0,-92205.4 34094.2,-176439.6 90348.7,-240813.5l0 233485.6c-63.7,2435.1 -97.9,4877.4 -97.9,7327.9 "
 "0,2450.5 34.2,4893.2 97.9,7327.9l0 93.1 3.4 0c3933.6,148942.1 125903.3,268475 275794.7,268475 152373,0 275896,-123523 275896,-275896l-2.4 -868.5 "
 "-267779.3 0c-4050,0 -7363.5,-3313.5 -7363.5,-7363.8l0 -76420.1c0,-4050.2 3313.5,-7363.8 7363.5,-7363.8z")
L_DARK = ("M778062.7 490742.5c-28607.7,53778.6 -89536.6,90911.9 -160082.5,90911.9 -90738,0 -169087.1,-66151.6 -177444,-161850.9 "
 "-6437.1,-113569.8 -5780.4,-227723.6 -2556.2,-341557.6 29456,-15814.1 57100.7,-27101.6 88367.6,-35491.7 -1582.6,119334.1 -2167.5,237810.7 -2167.5,357094.2 "
 "0,39897.6 26770.1,73541.8 63327.8,83952.5l0 .7c21888.9,6917.3 44637.1,9532.7 80086.7,9934.5 36759.3,-830.9 74255.3,-1694.3 110468.1,-2993.6z")
LEFT_BAND = "M343139.3 157727.3L364119.3 180973.3 364119.3 406866.7 343139.3 405961.8z"
BOTTOM_BAND = "M343142.7 405961.8A275896 275896 0 0 0 894833.4 398540.8L866161 400113.5A251100 251100 0 0 1 364119.3 406866.7z"
TOP_BAND = "M623564.3 122692.7A275896 275896 0 0 1 809399.4 198940.7L788416 218477.5A251030 251030 0 0 0 619306.1 149091.8z"
TOP_END = "M925916.2 198940.7L894446.3 218477.5 788416 218477.5 809399.4 198940.7z"
TOP_CAP = "M623564.3 122692.7L619306.1 149091.8 617263 148319 615950 146616 615667 145150 619565 118361 619805 119783 620471 121009 621319 121843 622367 122422z"
SLIVER1 = "M619565 118360.8L615666.7 145149.8 615666.7 70269.5 619565 36074.8z"
SLIVER2 = "M619688.2 390308.5L615778.8 392622.1 615778.8 323080 619688.2 313888.4z"

# --- تدرج الذهب (مأخوذ من لوحة ألوان الشرائط الأصلية) ---
IDS=[0,29.5,60,100,143,200,240,284.5,329,369,426,469,509,539.5,570,610,653,710,750,794.5,839,865]
COLS=['#C39238','#B8862B','#C39239','#D2A24B','#E2B45F','#EAC47A','#F0D08D','#F6DDA2','#F0D08D','#EAC47A','#E2B45F','#D2A24B','#C39239','#B8862B','#C39239','#D2A24B','#E2B45F','#EAC47A','#F0D08D','#F6DDA2','#F0D08D','#ECC880']
BODY_STOPS=''.join(f'<stop offset="{i/865:.4f}" stop-color="{c}"/>' for i,c in zip(IDS,COLS))

# --- حافة الـ L المائلة: شرائح، كل شريحة بتدرجها (مثل الملف الأصلي) ---
def bez(p0,p1,p2,p3,t):
    u=1-t
    return (u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0], u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1])
def slices(O,I,n,pref):
    gd=[];ps=[]
    for k in range(n):
        t0=k/n; t1=min(1,(k+1)/n+0.004)
        o0,o1=bez(*O,t0),bez(*O,t1); i0,i1=bez(*I,t0),bez(*I,t1)
        om=bez(*O,(t0+t1)/2); im=bez(*I,(t0+t1)/2); gid=f'{pref}{k}'
        gd.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{om[0]:.0f}" y1="{om[1]:.0f}" x2="{im[0]:.0f}" y2="{im[1]:.0f}"><stop offset="0" stop-color="#F6DDA2"/><stop offset="1" stop-color="#B8862B"/></linearGradient>')
        ps.append(f'<path d="M{o0[0]:.0f} {o0[1]:.0f}L{o1[0]:.0f} {o1[1]:.0f} {i1[0]:.0f} {i1[1]:.0f} {i0[0]:.0f} {i0[1]:.0f}z" fill="url(#{gid})"/>')
    return ''.join(gd),''.join(ps)

CORNER_O=((524180.1,399848.4),(524180.1,439746.0),(550950.2,473390.2),(587507.9,483801.6))
CORNER_I=((542778.7,379798.7),(542778.7,411716.3),(564194.1,438631.9),(593440.9,446960.6))
FOOT1_O=((587507.9,483801.6),(609396.8,490718.9),(632144.7,493334.3),(667594.6,493736.1))
FOOT1_I=((593440.9,446960.6),(610000,452100),(635000,454600),(657510,454909))
FOOT2_O=((667594.6,493736.1),(704353.9,492905.2),(741849.9,492041.8),(778062.7,490742.5))
FOOT2_I=((657510,454909),(683000,455100),(715000,453700),(745885,452514))
STEM='M526347.6 42754.2L544512.7 94123.3 542778.7 379798.7 524180.1 399848.4C524180.1 280564.9 524765 162088.3 526347.6 42754.2z'
_g=[];_p=[]
for O,I,n,pref in ((CORNER_O,CORNER_I,36,'gl-c'),(FOOT1_O,FOOT1_I,14,'gl-f'),(FOOT2_O,FOOT2_I,14,'gl-g')):
    a,b=slices(O,I,n,pref);_g.append(a);_p.append(b)
BEVEL_DEFS=''.join(_g)
BEVEL_PATHS=f'<path d="{STEM}" fill="url(#gl-stem)"/>'+''.join(_p)
L_BEVEL_CLIP = STEM  # الـ clip الذهبي يستخدم الشكل الخارجي التقريبي

def defs():
    return (f'<defs>'
      f'<linearGradient id="gl-body" gradientUnits="userSpaceOnUse" x1="125309" y1="184453" x2="347591" y2="910340">{BODY_STOPS}</linearGradient>'
      f'<radialGradient id="gl-ring" gradientUnits="userSpaceOnUse" cx="{CX}" cy="{CY}" r="275896"><stop offset="0" stop-color="#B8862B"/><stop offset=".9" stop-color="#B8862B"/><stop offset="1" stop-color="#F6DDA2"/></radialGradient>'
      '<linearGradient id="gl-left" gradientUnits="userSpaceOnUse" x1="343139" y1="0" x2="364119" y2="0"><stop offset="0" stop-color="#F6DDA2"/><stop offset="1" stop-color="#B8862B"/></linearGradient>'
      '<linearGradient id="gl-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DDA2"/><stop offset="1" stop-color="#B8862B"/></linearGradient>'
      '<linearGradient id="gl-sliver" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#F6DDA2"/><stop offset="1" stop-color="#B8862B"/></linearGradient>'
      '<linearGradient id="gl-stem" gradientUnits="userSpaceOnUse" x1="525000" y1="0" x2="543600" y2="0"><stop offset="0" stop-color="#F6DDA2"/><stop offset="1" stop-color="#B8862B"/></linearGradient>'
      '<linearGradient id="gl-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
      f'<clipPath id="gl-clip-gold"><path d="{BODY}"/><path d="{LEFT_BAND}"/><path d="{BOTTOM_BAND}"/><path d="{TOP_BAND}"/><path d="{STEM}"/></clipPath>'
      f'<clipPath id="gl-clip-l"><path d="{L_DARK}"/></clipPath>'
      f'{BEVEL_DEFS}</defs>')

def shapes(animated=True):
    sheen = f'<g transform="rotate(20 {CX} {CY})"><rect class="gl-sheen" x="{CX-47500-520000}" y="-200000" width="95000" height="1200000" fill="url(#gl-sheen)"/></g>'
    sheen_l = sheen.replace('class="gl-sheen"', 'class="gl-sheen gl-sheen-l"')
    comet = ''.join(f'<circle cx="{CX}" cy="{CY}" r="357000" pathLength="1" fill="none" stroke="#FFF6D8" stroke-width="9000" stroke-linecap="round" opacity="{o}" stroke-dasharray="{l} {round(1-l,3)}" stroke-dashoffset="{l}"/>' for l,o in ((0.22,.16),(0.14,.32),(0.07,.6),(0.025,.95)))
    fx_gold = f'<g clip-path="url(#gl-clip-gold)" class="gl-fx"><g class="gl-spin">{comet}</g>{sheen}</g>' if animated else ''
    fx_l = f'<g clip-path="url(#gl-clip-l)" class="gl-fx">{sheen_l}</g>' if animated else ''
    return (f'<g class="gl-float">'
      f'<path d="{TOP_END}" fill="url(#gl-cap)"/><path d="{TOP_BAND}" fill="url(#gl-ring)"/><path d="{TOP_CAP}" fill="url(#gl-cap)"/>'
      f'<path d="{SLIVER1}" fill="url(#gl-sliver)"/><path d="{SLIVER2}" fill="url(#gl-sliver)"/>'
      f'<path d="{LEFT_BAND}" fill="url(#gl-left)"/><path d="{BOTTOM_BAND}" fill="url(#gl-ring)"/>'
      f'<path d="{BODY}" fill="url(#gl-body)"/>'
      f'<g class="gl-l">{BEVEL_PATHS}<path d="{L_DARK}" fill="#353334"/>{fx_l}</g>'
      f'{fx_gold}</g>')

CSS = '''.gl-float{animation:gl-float 5.2s ease-in-out infinite alternate}
.gl-l{animation:gl-par 5.2s ease-in-out infinite alternate}
.gl-spin{transform-origin:618937.4px 398540.8px;animation:gl-spin 3.6s linear infinite}
.gl-sheen{animation:gl-sheen 4.8s cubic-bezier(.45,.05,.3,1) infinite}
.gl-sheen-l{opacity:.35}
@keyframes gl-float{from{transform:translateY(-7000px)}to{transform:translateY(7000px)}}
@keyframes gl-par{from{transform:translate(3500px,4500px)}to{transform:translate(-3500px,-4500px)}}
@keyframes gl-spin{to{transform:rotate(360deg)}}
@keyframes gl-sheen{0%,12%{transform:translateX(0)}52%,100%{transform:translateX(1040000px)}}
@media (prefers-reduced-motion:reduce){.gl-float,.gl-l,.gl-spin,.gl-sheen{animation:none}}'''

def standalone():
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB}" role="img" aria-label="Gold Land"><style>{CSS}</style>' + defs() + shapes() + '</svg>')
def sprite():
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">'
            + defs() + f'<symbol id="gl-logo" viewBox="{VB}">' + shapes() + '</symbol></svg>')

if __name__ == '__main__':
    import os
    open('logo.svg','w',encoding='utf-8').write(standalone())
    open('sprite.html','w',encoding='utf-8').write(sprite())
    open('anim.css','w',encoding='utf-8').write(CSS)
    print('logo.svg', os.path.getsize('logo.svg'), 'sprite', os.path.getsize('sprite.html'))
