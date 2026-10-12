"""Cold Storage pregen portraits and tokens (noir emblem style).
Usage: python3 portraits.py OUT_DIR  ->  <slug>-portrait.svg (square card) and <slug>-token.svg (round, transparent outside)
Each bust is drawn in a 200x200 box with 'B' bone, 'A' accent, 'K' ink placeholders (same convention as glyphs.py).
"""
import html, math, os, re, sys

INK, BONE_TOP, BONE_BOT = '#0a0d10', '#f1e9d6', '#b9ae95'
def P(d, c='B', extra=''): return f'<path d="{d}" fill="{c}" {extra}/>'
def R(x, y, w, h, c='B', rx=0, extra=''): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{c}" {extra}/>'
def C(x, y, r, c='B', extra=''): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" {extra}/>'
def S(d, c='B', w=4, extra=''): return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def T(x, y, s, size, c='A', extra=''): return f'<text x="{x}" y="{y}" font-family="\'Courier New\',monospace" font-size="{size}" font-weight="700" fill="{c}" {extra}>{html.escape(s)}</text>'

HEAD = 'M100 46 C124 46 136 64 136 88 C136 114 121 130 100 130 C79 130 64 114 64 88 C64 64 76 46 100 46 Z'
HALF = 'M100 46 C124 46 136 64 136 88 C136 114 121 130 100 130 Z'
def shoulders(w=74, top=140): return P(f'M{100-w} 200 C{100-w} {top+18} {100-w*.55} {top} 100 {top} C{100+w*.55} {top} {100+w} {top+18} {100+w} 200 Z')
def neck(): return R(88, 118, 24, 28)
def base(w=74, top=140, head=HEAD): return shoulders(w, top) + neck() + P(head)
def shade(head=HALF, o='.5'): return P(head, 'K', f'opacity="{o}"')
def eyes(y=88, c='K', w=12, gap=16): return R(100 - gap - w, y, w, 4, c, 2) + R(100 + gap, y, w, 4, c, 2)

def nia():  # disaster-response organic: cropped hair, hazard jacket, reflective stripes, rubber stamp
    g = base(78)
    g += P('M64 84 C62 56 78 42 100 42 C124 42 138 56 136 84 C130 70 120 62 100 62 C82 62 70 70 64 84 Z', 'H')  # cropped hair
    g += shade() + eyes(90)
    g += P('M62 148 L100 172 L138 148 L146 200 L54 200 Z', 'K', 'opacity=".45"')  # high collar opening
    g += R(30, 176, 140, 7, 'A') + R(30, 188, 140, 4, 'A', extra='opacity=".7"')  # reflective stripes
    g += R(150, 150, 22, 16, 'A', 3) + R(156, 140, 10, 12, 'A', 2)  # stamp
    return g
def latch():  # ageing industrial synthetic: plated scalp, seams, optic ring, coveralls
    head = 'M100 44 C126 44 138 62 138 88 C138 114 122 132 100 132 C78 132 62 114 62 88 C62 62 74 44 100 44 Z'
    g = base(80, head=head) + shade('M100 44 C126 44 138 62 138 88 C138 114 122 132 100 132 Z')
    g += S('M70 70 L130 70 M100 44 L100 70 M64 100 L80 100 M120 100 L136 100 M84 122 L116 122', 'K', 3, 'opacity=".6"')  # panel seams
    g += C(118, 90, 11, 'K') + C(118, 90, 7, 'A') + R(74, 88, 16, 4, 'K', 2)  # optic ring
    g += R(40, 158, 120, 10, 'K', 3, 'opacity=".4"') + C(70, 182, 5, 'K') + C(130, 182, 5, 'K')  # coverall straps
    g += S('M150 150 L172 128 M164 150 L180 140', 'A', 4)  # spark from precise hands
    return g
def sabine():  # Meth in a municipal labour body: practical hair, coveralls, upright poise, wineglass
    g = base(72)
    g += P('M62 92 C58 54 80 38 102 40 C126 42 140 58 138 92 C134 76 128 66 118 62 C104 72 84 70 70 64 C66 72 64 82 62 92 Z', 'H')  # swept hair
    g += shade() + eyes(90) + C(64, 100, 4, 'A')  # single earring
    g += P('M80 140 L100 160 L120 140 Z', 'K', 'opacity=".5"') + R(44, 168, 112, 6, 'K', 3, 'opacity=".35"')  # coverall collar & seam
    g += S('M160 132 L170 150 L180 132 Z M170 150 L170 168 M162 168 L178 168', 'A', 3)  # wineglass
    return g
def imani():  # luxury companion-grade sleeve, conditioned for compliance; protector's strap and stance
    g = shoulders(70) + neck()
    g += P('M100 22 C116 22 124 30 122 42 C134 48 140 64 138 86 C134 72 124 60 100 58 C76 60 66 72 62 86 C60 64 66 48 78 42 C76 30 84 22 100 22 Z', 'H')  # updo
    g += P('M100 50 C122 50 134 66 134 88 C134 112 120 128 100 128 C80 128 66 112 66 88 C66 66 78 50 100 50 Z')
    g += shade('M100 50 C122 50 134 66 134 88 C134 112 120 128 100 128 Z') + eyes(90, w=11)
    g += P('M86 140 L100 152 L114 140 L118 146 L100 162 L82 146 Z', 'A')  # choker / high neckline
    g += S('M58 150 L138 200', 'A', 9) + R(98, 170, 14, 10, 'K', 2)  # tactical strap + buckle
    return g
def cass():  # decommissioned police synthetic with evidence serials; collar up
    g = base(80) + P('M66 78 C66 52 82 42 100 42 C118 42 134 52 134 78 L134 70 L66 70 Z', 'H')  # regulation crew cut
    g += shade() + eyes(90, 'A', w=10)
    g += S('M68 112 C80 126 120 126 132 112', 'K', 3, 'opacity=".5"')  # synthetic jaw seam
    g += P('M48 150 L84 138 L92 176 L60 200 L40 200 Z M152 150 L116 138 L108 176 L140 200 L160 200 Z', 'K', 'opacity=".55"')  # turned-up collar
    g += T(60, 108, 'EVD-5', 9, 'A', 'transform="rotate(-8 60 108)"') + R(140, 160, 22, 16, 'A', 2) + R(144, 166, 14, 3, 'K')  # stencil + tag
    return g
def edda():  # middle-aged prison infirmary body: grey bun, glasses, scrubs with number, lamp
    g = base(72)
    g += C(100, 40, 15, 'G') + P('M64 86 C62 60 78 46 100 46 C122 46 138 60 136 86 C128 68 116 60 100 60 C84 60 72 68 64 86 Z', 'G')  # silver bun + hair
    g += shade() + S('M72 90 m0 0 a10 9 0 1 0 20 0 a10 9 0 1 0 -20 0 M108 90 a10 9 0 1 0 20 0 a10 9 0 1 0 -20 0 M92 90 L108 90', 'K', 4)  # glasses
    g += P('M78 140 L100 166 L122 140 Z', 'K', 'opacity=".45"') + T(56, 186, '7741', 13, 'K', 'opacity=".7"')  # V-neck scrubs, inmate number
    g += P('M150 128 L178 128 L172 140 L156 140 Z', 'A') + S('M164 140 L160 168', 'A', 3) + P('M150 140 L178 140 L190 170 L138 170 Z', 'A', 'opacity=".18"')  # clinical lamp
    return g
def anik():  # administrative synthetic, sensory latency: neat parting, two status lights, tie, lanyard; impossible shadow
    shadow = f'<g transform="translate(-26,-6)" opacity=".55">{shoulders(70)}{neck()}{P(HEAD)}</g>'.replace('fill="B"', 'fill="A"')
    g = shadow + base(70)
    g += P('M64 82 C62 56 78 44 100 44 C122 44 138 56 136 82 L124 64 C110 58 90 58 78 64 L70 72 Z', 'H') + S('M88 50 L84 66', 'K', 3)  # neat parting
    g += shade() + C(84, 90, 4, 'A') + C(116, 90, 4, 'A')  # status lights
    g += P('M94 140 L106 140 L110 188 L100 198 L90 188 Z', 'K', 'opacity=".75"') + S('M78 142 L92 186 M122 142 L108 186', 'A', 3) + R(84, 182, 32, 18, 'A', 2)  # tie, lanyard, ID
    return g
def solenne():  # industrial maintenance body: broad shoulders, tied hair, respirator, harness, microphone
    g = base(86, 136)
    g += P('M64 84 C62 56 80 42 100 42 C122 42 138 56 136 84 C130 64 116 58 100 58 C84 58 70 64 64 84 Z', 'H') + P('M128 60 C146 62 152 78 146 96 C140 84 134 76 128 74 Z', 'H')  # hair tied back
    g += shade() + eyes(86)
    g += P('M74 98 L126 98 L122 120 C114 128 86 128 78 120 Z') + C(86, 112, 6, 'K') + C(114, 112, 6, 'K') + R(94, 104, 12, 14, 'A', 3)  # respirator
    g += S('M40 160 L80 200 M160 160 L120 200 M50 176 L150 176', 'K', 6, 'opacity=".5"')  # harness
    g += R(158, 132, 10, 22, 'A', 5) + S('M163 154 L163 168', 'A', 3)  # microphone
    return g

PREGENS = [('PC01', 'Nia Calder', 'Continuity Investigator', nia, '#78ecf3'), ('PC02', 'Tomas “Latch” Araya', 'Needlecast Engineer', latch, '#ffc467'),
           ('PC03', 'Sabine Kade', 'Meth Defector', sabine, '#e9cc8c'), ('PC04', 'Imani Voss', 'Tactical Protector', imani, '#ff5a6e'),
           ('PC05', 'Cass Ren', 'Grounder Fixer', cass, '#ff7fb0'), ('PC06', 'Dr Edda Sorn', 'Psychosurgeon', edda, '#5ef0c4'),
           ('PC07', 'Anik Rao', 'Virtuality Architect', anik, '#b9a2ff'), ('PC08', 'Solenne Pryce', 'Investigative Broadcaster', solenne, '#ff8a3d')]

def colorize(g, acc, mode):
    if mode == 'main': g = g.replace('fill="H"', f'fill="#525a5e" stroke="{acc}" stroke-width="2.2"').replace('fill="G"', f'fill="#a7aeb1" stroke="{acc}" stroke-width="2.2"')
    if mode == 'main': return g.replace('fill="B"', 'fill="url(#bone)"').replace('stroke="B"', 'stroke="url(#bone)"').replace('fill="A"', f'fill="{acc}"').replace('stroke="A"', f'stroke="{acc}"').replace('fill="K"', f'fill="{INK}"').replace('stroke="K"', f'stroke="{INK}"')
    if mode == 'shadow': return re.sub(r'(fill|stroke)="[BAK]"', lambda m: f'{m.group(1)}="#000"', g.replace('fill="H"', 'fill="B"').replace('fill="G"', 'fill="B"'))
    if mode == 'mask': g = g.replace('fill="H"', 'fill="B"').replace('fill="G"', 'fill="B"')
    if mode == 'mask': return re.sub(r'(fill|stroke)="([BAK])"', lambda m: f'{m.group(1)}="{"#000" if m.group(2) == "K" else "#fff"}"', g)

def defs(acc, seed, clip):
    return f'''<defs>
<radialGradient id="ink" cx="34%" cy="24%" r="85%"><stop offset="0" stop-color="#1d262c"/><stop offset=".55" stop-color="#0d1215"/><stop offset="1" stop-color="#050607"/></radialGradient>
<linearGradient id="bone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BONE_TOP}"/><stop offset="1" stop-color="{BONE_BOT}"/></linearGradient>
<linearGradient id="key" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<pattern id="blinds" width="512" height="38" patternUnits="userSpaceOnUse" patternTransform="rotate(-28 256 256)"><rect width="512" height="15" fill="#fff" opacity=".06"/></pattern>
<pattern id="shade" width="512" height="38" patternUnits="userSpaceOnUse" patternTransform="rotate(-28 256 256)"><rect y="15" width="512" height="23" fill="#000" opacity=".24"/></pattern>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="{seed}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0"/></filter>
<clipPath id="frame">{clip}</clipPath></defs>'''

def figure(g, acc, t):
    return (f'<g transform="translate(10,12)" opacity=".7"><g transform="{t}">{colorize(g, acc, "shadow")}</g></g>'
            f'<g transform="{t}">{colorize(g, acc, "main")}</g>'
            f'<mask id="fm" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><g transform="{t}">{colorize(g, acc, "mask")}</g></mask>'
            f'<rect width="512" height="512" fill="url(#shade)" mask="url(#fm)"/>')

def token(pid, name, fn, acc):
    clip = '<circle cx="256" cy="256" r="236"/>'
    t = 'translate(26,24) scale(2.3)'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>{html.escape(name)} — Cold Storage token</title>{defs(acc, int(pid[2:]) * 7, clip)}
<circle cx="256" cy="256" r="236" fill="url(#ink)"/><g clip-path="url(#frame)"><rect width="512" height="512" fill="url(#blinds)"/><rect width="512" height="512" fill="url(#key)"/><circle cx="256" cy="230" r="170" fill="{acc}" opacity=".08"/>
{figure(fn(), acc, t)}<rect width="512" height="512" filter="url(#grain)"/></g>
<circle cx="256" cy="256" r="236" fill="none" stroke="{BONE_TOP}" stroke-width="12"/><circle cx="256" cy="256" r="222" fill="none" stroke="{acc}" stroke-width="4" opacity=".9"/>
<g transform="translate(256,256)">{''.join(f'<rect x="-3" y="-246" width="6" height="16" fill="{acc}" transform="rotate({a})"/>' for a in range(0, 360, 30))}</g>
<rect x="196" y="452" width="120" height="34" rx="4" fill="{INK}" stroke="{BONE_TOP}" stroke-width="3"/><text x="256" y="476" text-anchor="middle" font-family="'Courier New',monospace" font-size="20" font-weight="700" letter-spacing="3" fill="{acc}">{pid}</text></svg>'''

def portrait(pid, name, role, fn, acc):
    clip = '<rect x="16" y="16" width="480" height="480" rx="10"/>'
    t = 'translate(36,14) scale(2.2)'
    n = html.escape(name.upper()); fs = 30 if len(n) <= 16 else 24
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>{html.escape(name)} — Cold Storage portrait</title>{defs(acc, int(pid[2:]) * 11, clip)}
<rect x="16" y="16" width="480" height="480" rx="10" fill="url(#ink)"/><g clip-path="url(#frame)"><rect width="512" height="512" fill="url(#blinds)"/><rect width="512" height="512" fill="url(#key)"/><circle cx="256" cy="220" r="180" fill="{acc}" opacity=".08"/>
{figure(fn(), acc, t)}<rect width="512" height="512" filter="url(#grain)"/></g>
<rect x="16" y="16" width="480" height="480" rx="10" fill="none" stroke="{BONE_TOP}" stroke-width="8"/><rect x="28" y="28" width="456" height="456" rx="6" fill="none" stroke="{acc}" stroke-width="2.5" opacity=".85"/>
<text x="44" y="64" font-family="'Courier New',monospace" font-size="17" font-weight="700" letter-spacing="3" fill="{acc}">DHF // {pid} // 2384</text>
<g transform="translate(256,420)"><rect x="-200" y="-26" width="400" height="66" fill="{INK}" stroke="{BONE_TOP}" stroke-width="3"/><rect x="-194" y="-20" width="388" height="54" fill="none" stroke="{acc}" stroke-width="1.2" opacity=".7"/>
<text x="0" y="6" text-anchor="middle" font-family="Oswald,'Bebas Neue','Roboto Condensed','Arial Narrow',Impact,sans-serif" font-size="{fs}" font-weight="700" letter-spacing="2" fill="{BONE_TOP}">{n}</text>
<text x="0" y="28" text-anchor="middle" font-family="'Courier New',monospace" font-size="14" letter-spacing="4" fill="{BONE_BOT}">{html.escape(role.upper())}</text></g></svg>'''

def slug(pid, name): return pid.lower() + '-' + re.sub(r'[^a-z0-9]+', '-', name.lower().replace('“', '').replace('”', '')).strip('-')

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for pid, name, role, fn, acc in PREGENS:
        s = slug(pid, name)
        open(os.path.join(out, f'{s}-token.svg'), 'w').write(token(pid, name, fn, acc))
        open(os.path.join(out, f'{s}-portrait.svg'), 'w').write(portrait(pid, name, role, fn, acc))
        print(pid, s)
