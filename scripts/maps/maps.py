"""Cold Storage zoned scene maps (noir schematic style, matching the emblems).
Usage: python3 maps.py OUT_DIR CONTENT_JSON  -> OUT_DIR/<slug>.svg + CONTENT_JSON (zones, adjacency, exits)
Grid: 28 x 18 cells of 100 px (2800 x 1800). Zones are rectangles in cell units [x, y, w, h].
"""
import json, math, os, sys, html

CELL = 100
W, H = 28, 18
INK, BONE, BONE2 = '#0a0d10', '#ece4cf', '#b9ae95'

def px(v): return round(v * CELL, 1)
def esc(s): return html.escape(str(s))

# --------------------------------------------------------------------------- furniture
def shadowed(svg): return f'<g transform="translate(9,11)" opacity=".55">{svg.replace(BONE, "#000").replace(BONE2, "#000")}</g>{svg}'
def rect(x, y, w, h, fill=BONE, rx=8, extra=''): return f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" rx="{rx}" fill="{fill}" {extra}/>'
def line(x1, y1, x2, y2, c=INK, w=6, extra=''): return f'<line x1="{px(x1)}" y1="{px(y1)}" x2="{px(x2)}" y2="{px(y2)}" stroke="{c}" stroke-width="{w}" stroke-linecap="round" {extra}/>'
def circ(x, y, r, fill=BONE, extra=''): return f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(r)}" fill="{fill}" {extra}/>'
def text(x, y, s, size=26, fill=BONE2, anchor='middle', mono=True, weight=700, ls=3, extra=''):
    fam = "'Courier New',Courier,monospace" if mono else "Oswald,'Bebas Neue','Roboto Condensed','Arial Narrow',Impact,sans-serif"
    return f'<text x="{px(x)}" y="{px(y)}" text-anchor="{anchor}" font-family="{fam}" font-size="{size}" font-weight="{weight}" letter-spacing="{ls}" fill="{fill}" {extra}>{esc(s)}</text>'

def f_bed(x, y, acc, w=1.3, h=2.4, empty=False):
    g = rect(x, y, w, h, BONE, 10) + rect(x + .12, y + .12, w - .24, .45, INK if empty else BONE2, 6)
    if not empty: g += rect(x + .1, y + 1.0, w - .2, h - 1.1, BONE2, 6) + line(x + .1, y + 1.0, x + w - .1, y + 1.0, INK, 4)
    else: g += line(x + .2, y + .8, x + w - .2, y + h - .2, INK, 3, 'opacity=".5"') + line(x + w - .2, y + .8, x + .2, y + h - .2, INK, 3, 'opacity=".5"')
    g += rect(x + w + .08, y + .1, .32, .5, acc, 4)  # bed monitor
    return shadowed(g)
def f_table(x, y, w, h, chairs=0, cups=0, acc='#fff'):
    g = ''
    if chairs:
        per = max(1, chairs // 2)
        for i in range(per):
            cx = x + (i + .5) * w / per - .3
            g += rect(cx, y - .75, .6, .55, BONE2, 6) + rect(cx, y + h + .2, .6, .55, BONE2, 6)
    g += rect(x, y, w, h, BONE, 12)
    for i in range(cups):
        cx = x + .45 + i * (w - .9) / max(1, cups - 1)
        g += circ(cx, y + h / 2, .17, INK) + circ(cx, y + h / 2, .1, acc)
    return shadowed(g)
def f_desk(x, y, acc='#fff', w=2.4, h=1.0, screen=True):
    g = rect(x, y, w, h, BONE, 8)
    if screen: g += rect(x + .25, y + .18, w * .45, .3, acc, 3)
    return shadowed(g)
def f_console(x, y, w, h, acc, label=''):
    g = rect(x, y, w, h, BONE, 10) + rect(x + .2, y + .2, w - .4, h * .45, INK, 6) + rect(x + .32, y + .32, (w - .64) * .7, h * .12, acc, 3) + rect(x + .32, y + .32 + h * .18, (w - .64) * .45, h * .1, acc, 3, 'opacity=".6"')
    out = shadowed(g)
    if label: out += text(x + w / 2, y + h + .42, label, 22, acc)
    return out
def f_cabinets(x, y, n, w=.9, h=2.6, horizontal=True, acc='#fff'):
    g = ''
    for i in range(n):
        cx, cy = (x + i * (w + .25), y) if horizontal else (x, y + i * (w + .25))
        ww, hh = (w, h) if horizontal else (h, w)
        g += rect(cx, cy, ww, hh, BONE, 5)
        for k in range(1, 5):
            if horizontal: g += line(cx + .1, cy + k * hh / 5, cx + ww - .1, cy + k * hh / 5, INK, 3, 'opacity=".55"')
            else: g += line(cx + k * ww / 5, cy + .1, cx + k * ww / 5, cy + hh - .1, INK, 3, 'opacity=".55"')
        g += circ(cx + ww - .18, cy + .2, .07, acc)
    return shadowed(g)
def f_crates(x, y, n=3, s=.8):
    g = ''
    for i in range(n):
        cx, cy = x + (i % 3) * (s + .15), y + (i // 3) * (s + .15)
        g += rect(cx, cy, s, s, BONE2, 4) + line(cx + .1, cy + .1, cx + s - .1, cy + s - .1, INK, 3, 'opacity=".5"') + line(cx + s - .1, cy + .1, cx + .1, cy + s - .1, INK, 3, 'opacity=".5"')
    return shadowed(g)
def f_stairs(x, y, w, h, vertical=True):
    g = rect(x, y, w, h, BONE2, 6)
    steps = 7
    for i in range(1, steps):
        if vertical: g += line(x + .08, y + i * h / steps, x + w - .08, y + i * h / steps, INK, 4)
        else: g += line(x + i * w / steps, y + .08, x + i * w / steps, y + h - .08, INK, 4)
    return shadowed(g)
def f_lift(x, y, s, acc):
    g = rect(x, y, s, s, BONE, 8) + rect(x + .15, y + .15, s - .3, s - .3, INK, 6) + line(x + .3, y + .3, x + s - .3, y + s - .3, acc, 5) + line(x + s - .3, y + .3, x + .3, y + s - .3, acc, 5)
    return shadowed(g)
def f_pool(x, y, w, h, acc):
    g = f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" rx="26" fill="#0f1c22" stroke="{BONE}" stroke-width="6"/>'
    for i in range(1, int(h / .6)):
        yy = y + i * .6
        g += f'<path d="M{px(x+.3)} {px(yy)} q{px(.35)} -10 {px(.7)} 0 t{px(.7)} 0 t{px(.7)} 0" fill="none" stroke="{acc}" stroke-width="2" opacity=".18"/>'
    return g
def f_water(x, y, w, h, acc):
    g = f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" fill="#0c1a20"/>'
    for i in range(int(h / .45)):
        yy = y + .25 + i * .45
        for k in range(int(w / 2.2)):
            xx = x + .2 + k * 2.2 + (i % 2) * 1.1
            g += f'<path d="M{px(xx)} {px(yy)} q{px(.3)} -9 {px(.6)} 0 t{px(.6)} 0" fill="none" stroke="{acc}" stroke-width="2" opacity=".22"/>'
    return g
def f_chairs(x, y, n, gap=1.05, s=.6):
    return shadowed(''.join(rect(x + i * gap, y, s, s, BONE2, 6) + rect(x + i * gap, y - .18, s, .16, BONE, 3) for i in range(n)))
def f_bench(x, y, w, h, acc):
    return shadowed(rect(x, y, w, h, BONE, 6) + rect(x + .3, y + h - .35, w - .6, .2, INK, 3) + rect(x + w / 2 - .5, y + .2, 1, .3, acc, 3))
def f_cradle(x, y, acc):
    return shadowed(f'<rect x="{px(x)}" y="{px(y)}" width="{px(1.4)}" height="{px(3)}" rx="{px(.7)}" fill="{BONE}"/>' + f'<rect x="{px(x+.2)}" y="{px(y+.3)}" width="{px(1)}" height="{px(2.4)}" rx="{px(.5)}" fill="{acc}" opacity=".35"/>')
def f_lightwall(x, y, h, acc):
    g = line(x, y, x, y + h, BONE, 10)
    for i, (dy, dx) in enumerate(((.6, -1.2), (1.4, -1.6), (2.1, -1.0), (2.9, -1.8), (3.6, -1.1), (4.4, -1.5))):
        if y + dy > y + h: break
        g += line(x, y + dy, x + dx, y + dy - .4, acc, 4, 'opacity=".9"') + circ(x + dx, y + dy - .4, .1, acc)
    return g
def f_transmitter(x, y, acc):
    g = f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(2.1)}" fill="none" stroke="{BONE}" stroke-width="10"/>' + f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(1.4)}" fill="none" stroke="{acc}" stroke-width="3" stroke-dasharray="14 10"/>' + circ(x, y, .55, BONE) + circ(x, y, .2, acc)
    return shadowed(g)
def f_billboard(x, y, w, acc):
    g = rect(x, y, w, 1.6, BONE, 6) + rect(x + .15, y + .15, w - .3, 1.3, INK, 4)
    cols = ('#ffffff', '#cfd6d8', '#78ecf3')
    for i in range(3):
        cx = x + (i + .5) * w / 3
        g += circ(cx, y + .55, .2, cols[i]) + f'<path d="M{px(cx-.35)} {px(y+1.4)} Q{px(cx)} {px(y+.7)} {px(cx+.35)} {px(y+1.4)} Z" fill="{cols[i]}"/>'
    g += rect(x + w / 2 - .2, y + 1.6, .4, .9, BONE2, 3) + circ(x + w / 2 + .5, y + 2.4, .15, acc) + circ(x + w / 2 + .75, y + 2.3, .12, acc)
    return shadowed(g)
def f_memorial(x, y, acc):
    g = f'<path d="M{px(x)} {px(y-1.3)} L{px(x+.45)} {px(y+.6)} L{px(x-.45)} {px(y+.6)} Z" fill="{BONE}"/>' + rect(x - .7, y + .6, 1.4, .3, BONE2, 3)
    for i in range(5): g += circ(x - .55 + i * .27, y + 1.05, .09, acc)
    return shadowed(g)
def f_bowls(x, y, cols, rows, acc):
    g = ''
    for r in range(rows):
        g += line(x - .3, y + r * 1.25 - .55, x + cols * .9, y + r * 1.25 - .55, BONE2, 2, 'opacity=".7"')
        for c in range(cols):
            cx = x + c * .9
            g += line(cx, y + r * 1.25 - .55, cx, y + r * 1.25 - .25, BONE, 3) + circ(cx, y + r * 1.25, .22, BONE) + circ(cx, y + r * 1.25, .12, acc, 'opacity=".55"')
    return g
def f_fan(x, y, r, acc):
    g = circ(x, y, r, BONE) + circ(x, y, r * .82, INK)
    for a in (0, 120, 240):
        g += f'<path d="M{px(x)} {px(y)} L{px(x + r*.75*math.cos(math.radians(a)))} {px(y + r*.75*math.sin(math.radians(a)))} L{px(x + r*.75*math.cos(math.radians(a+40)))} {px(y + r*.75*math.sin(math.radians(a+40)))} Z" fill="{BONE2}"/>'
    return shadowed(g + circ(x, y, r * .15, acc))
def f_lockers(x, y, n, acc):
    return shadowed(''.join(rect(x + i * .5, y, .42, 1.1, BONE2, 3) + circ(x + i * .5 + .3, y + .55, .05, acc) for i in range(n)))
def f_pump(x, y, acc):
    return shadowed(circ(x, y, .7, BONE) + circ(x, y, .4, INK) + circ(x, y, .2, acc) + rect(x + .6, y - .12, 1.4, .24, BONE2, 3) + rect(x - 2, y - .12, 1.4, .24, BONE2, 3))
def f_grate(x, y, w, h):
    g = rect(x, y, w, h, BONE2, 4)
    for i in range(1, int(w / .25)): g += line(x + i * .25, y + .08, x + i * .25, y + h - .08, INK, 3)
    return shadowed(g)
def f_door_label(x, y, w, label, acc):
    return shadowed(rect(x, y, w, .5, BONE, 4)) + text(x + w / 2, y + .95, label, 19, acc)
def f_wafer(x, y, acc):
    return shadowed(f'<path d="M{px(x)} {px(y-.8)} L{px(x+.8)} {px(y)} L{px(x)} {px(y+.8)} L{px(x-.8)} {px(y)} Z" fill="{BONE}"/>' + f'<path d="M{px(x)} {px(y-.45)} L{px(x+.45)} {px(y)} L{px(x)} {px(y+.45)} L{px(x-.45)} {px(y)} Z" fill="{acc}"/>') + f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(1.25)}" fill="none" stroke="{acc}" stroke-width="3" stroke-dasharray="8 8"/>'
def f_window(x1, y1, x2, y2, acc):
    return line(x1, y1, x2, y2, acc, 10, 'opacity=".55"') + line(x1, y1, x2, y2, BONE, 3, 'stroke-dasharray="16 12"')
def f_wallpaper(x, y, w, h, acc):
    g = ''
    for i in range(int(w / .7)):
        g += line(x + .35 + i * .7, y + .2, x + .35 + i * .7, y + h - .2, acc, 2, 'opacity=".22" stroke-dasharray="6 10"')
    return g
def f_partition(x1, y1, x2, y2):
    return line(x1, y1, x2, y2, BONE, 14) + line(x1, y1, x2, y2, INK, 4, 'stroke-dasharray="8 14"')
COVER_RADIUS = 1.4  # cells; a token whose centre is inside this ring is in cover
COVER_NAMES = {'brush': 'GLASS', 'wood': 'WOOD', 'concrete': 'CONCRETE', 'metal': 'METAL', 'steel': 'STEEL', 'ferrocrete': 'FERROCRETE'}
def f_cover(x, y, acc, heavy=False, kind='wood', partial=True):
    s = .42
    ring = f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(COVER_RADIUS)}" fill="{acc}" fill-opacity=".05" stroke="{acc}" stroke-width="3" stroke-dasharray="10 10" opacity=".75"/>'
    d = f'M{px(x)} {px(y-s)} L{px(x+s*.85)} {px(y-s*.6)} L{px(x+s*.85)} {px(y+s*.05)} C{px(x+s*.85)} {px(y+s*.6)} {px(x+s*.35)} {px(y+s*.9)} {px(x)} {px(y+s)} C{px(x-s*.35)} {px(y+s*.9)} {px(x-s*.85)} {px(y+s*.6)} {px(x-s*.85)} {px(y+s*.05)} L{px(x-s*.85)} {px(y-s*.6)} Z'
    g = f'<path d="{d}" fill="{INK}" stroke="{acc}" stroke-width="4"/>'
    if heavy: g += f'<path d="{d}" fill="{acc}" opacity=".55" transform="translate({px(x)},{px(y)}) scale(.55) translate({-px(x)},{-px(y)})"/>'
    label = ('HEAVY · ' if heavy else '') + COVER_NAMES[kind] + (' · PARTIAL' if partial else '')
    return ring + g + text(x, y + s + .38, label, 17, acc, ls=2)
def f_label(x, y, s, acc, size=19): return text(x, y, s, size, acc, ls=2)

FURNITURE = dict(bed=f_bed, table=f_table, desk=f_desk, console=f_console, cabinets=f_cabinets, crates=f_crates, stairs=f_stairs, lift=f_lift,
                 pool=f_pool, water=f_water, chairs=f_chairs, bench=f_bench, cradle=f_cradle, lightwall=f_lightwall, transmitter=f_transmitter,
                 billboard=f_billboard, memorial=f_memorial, bowls=f_bowls, fan=f_fan, lockers=f_lockers, pump=f_pump, grate=f_grate,
                 doorlabel=f_door_label, wafer=f_wafer, window=f_window, wallpaper=f_wallpaper, partition=f_partition, cover=f_cover, label=f_label)

# --------------------------------------------------------------------------- map composition
def shared_edge(a, b):
    ax, ay, aw, ah = a; bx, by, bw, bh = b
    for (x1, x2, ox1, ox2, fixed_a, fixed_b, vertical) in ((ay, ay + ah, by, by + bh, ax + aw, bx, True), (ay, ay + ah, by, by + bh, ax, bx + bw, True),
                                                          (ax, ax + aw, bx, bx + bw, ay + ah, by, False), (ax, ax + aw, bx, bx + bw, ay, by + bh, False)):
        if abs(fixed_a - fixed_b) < 1e-6:
            lo, hi = max(x1, ox1), min(x2, ox2)
            if hi - lo >= .9:
                mid = (lo + hi) / 2
                return (fixed_a, mid, True) if vertical else (mid, fixed_a, False)
    return None
def door(x, y, vertical, acc, label=''):
    gap = .9
    if vertical:
        g = f'<rect x="{px(x-.09)}" y="{px(y-gap/2)}" width="{px(.18)}" height="{px(gap)}" fill="{INK}"/>' + line(x - .22, y - gap / 2, x + .22, y - gap / 2, acc, 6) + line(x - .22, y + gap / 2, x + .22, y + gap / 2, acc, 6)
        lx, ly = x, y + gap / 2 + .42
    else:
        g = f'<rect x="{px(x-gap/2)}" y="{px(y-.09)}" width="{px(gap)}" height="{px(.18)}" fill="{INK}"/>' + line(x - gap / 2, y - .22, x - gap / 2, y + .22, acc, 6) + line(x + gap / 2, y - .22, x + gap / 2, y + .22, acc, 6)
        lx, ly = x, y + .62
    if label: g += f'<rect x="{px(lx)-len(label)*7-10}" y="{px(ly)-21}" width="{len(label)*14+20}" height="30" rx="4" fill="{INK}" opacity=".85"/>' + text(lx, ly, label, 18, acc, ls=2)
    return g
def edge_point(r, toward):
    x, y, w, h = r; cx, cy = x + w / 2, y + h / 2; tx, ty = toward
    dx, dy = tx - cx, ty - cy
    sx = (w / 2) / abs(dx) if dx else 1e9; sy = (h / 2) / abs(dy) if dy else 1e9
    s = min(sx, sy)
    return cx + dx * s, cy + dy * s
def connector(a, b, acc, label='', via=None):
    if via:
        pts = [edge_point(a, via[0])] + via + [edge_point(b, via[-1])]
    else:
        ca, cb = (a[0] + a[2] / 2, a[1] + a[3] / 2), (b[0] + b[2] / 2, b[1] + b[3] / 2)
        pts = [edge_point(a, cb), edge_point(b, ca)]
    d = 'M' + ' L'.join(f'{px(x)} {px(y)}' for x, y in pts)
    g = f'<path d="{d}" fill="none" stroke="{acc}" stroke-width="5" stroke-dasharray="18 12" opacity=".9"/>'
    for p in (pts[0], pts[-1]): g += circ(p[0], p[1], .14, acc)
    if label:
        m = pts[len(pts) // 2] if len(pts) > 2 else ((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2)
        g += f'<rect x="{px(m[0])-len(label)*7-10}" y="{px(m[1])-20}" width="{len(label)*14+20}" height="30" rx="4" fill="{INK}" opacity=".9"/>' + text(m[0], m[1] + .02, label, 18, acc, ls=2)
    return g
def exit_marker(x, y, label, acc, direction='right'):
    w = len(label) * .16 + 1.0
    rot = {'right': 0, 'left': 180, 'up': -90, 'down': 90}[direction]
    arrow = f'<path d="M-28 -18 L0 0 L-28 18" fill="none" stroke="{acc}" stroke-width="7" stroke-linejoin="round" transform="translate({px(x)},{px(y)}) rotate({rot})"/>'
    bx = x - w - .25 if direction == 'right' else x + .25 if direction == 'left' else x - w / 2
    by = y - .3 if direction in ('right', 'left') else (y + .35 if direction == 'up' else y - .95)
    return (f'<rect x="{px(bx)}" y="{px(by)}" width="{px(w)}" height="{px(.6)}" rx="4" fill="{INK}" stroke="{acc}" stroke-width="3"/>' +
            text(bx + w / 2, by + .41, 'EXIT · ' + label, 19, acc, ls=2) + arrow)
def zone_plaque(z, i, acc):
    x, y, w, h = z['rect']
    name = z['name'].upper()
    pw = min(w - .4, .55 + len(name) * .2 + .9)
    fs = 28 if len(name) * .2 + 1.4 <= w - .4 else 22
    return (f'<rect x="{px(x+.22)}" y="{px(y+.22)}" width="{px(pw)}" height="{px(.62)}" fill="{INK}" stroke="{BONE}" stroke-width="3"/>' +
            f'<rect x="{px(x+.22)}" y="{px(y+.22)}" width="{px(.78)}" height="{px(.62)}" fill="{acc}"/>' +
            text(x + .61, y + .67, f'Z{i}', 24, INK, ls=1) +
            text(x + 1.1, y + .67, name, fs, BONE, 'start', mono=False, ls=2, extra=f'textLength="{px(pw-1.0)}" lengthAdjust="spacingAndGlyphs"' if len(name) * .2 + 1.4 > pw else ''))

def render(m):
    acc = m['accent']
    zones = m['zones']; byid = {z['id']: z for z in zones}
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*CELL}" height="{H*CELL}" viewBox="0 0 {W*CELL} {H*CELL}">',
           f'<title>{esc(m["name"])} — Cold Storage zone map</title>',
           f'''<defs><radialGradient id="ink" cx="30%" cy="22%" r="95%"><stop offset="0" stop-color="#1b242a"/><stop offset=".6" stop-color="#0c1114"/><stop offset="1" stop-color="#040506"/></radialGradient>
<pattern id="grid" width="{CELL}" height="{CELL}" patternUnits="userSpaceOnUse"><path d="M{CELL} 0H0V{CELL}" fill="none" stroke="#9fc7cf" stroke-width="1" opacity=".05"/></pattern>
<pattern id="blinds" width="2800" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-28 1400 900)"><rect width="2800" height="46" fill="#fff" opacity=".035"/></pattern>
<pattern id="hatch" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="22" fill="{acc}" opacity=".07"/></pattern>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="{len(m["id"])}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter>
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs>''',
           f'<rect width="{W*CELL}" height="{H*CELL}" fill="url(#ink)"/><rect width="{W*CELL}" height="{H*CELL}" fill="url(#grid)"/>']
    for f in m.get('under', []): out.append(FURNITURE[f[0]](*f[1:]))
    for z in zones:
        x, y, w, h = z['rect']
        out.append(f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" fill="url(#hatch)"/>')
        out.append(f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" fill="{acc}" opacity=".035"/>')
    for f in m.get('items', []): out.append(FURNITURE[f[0]](*f[1:]))
    for z in zones:
        x, y, w, h = z['rect']
        out.append(f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" fill="none" stroke="{BONE}" stroke-width="7"/>')
        out.append(f'<rect x="{px(x+.12)}" y="{px(y+.12)}" width="{px(w-.24)}" height="{px(h-.24)}" fill="none" stroke="{acc}" stroke-width="2" opacity=".6"/>')
    for link in m['links']:
        a, b = byid[link[0]], byid[link[1]]; label = link[2] if len(link) > 2 else ''
        via = link[3] if len(link) > 3 else None
        e = None if via else shared_edge(a['rect'], b['rect'])
        out.append(door(e[0], e[1], e[2], acc, label) if e else connector(a['rect'], b['rect'], acc, label, via))
    for f in m.get('over', []): out.append(FURNITURE[f[0]](*f[1:]))
    for ex in m.get('exits', []): out.append(exit_marker(ex['at'][0], ex['at'][1], ex['label'], acc, ex.get('dir', 'right')))
    for i, z in enumerate(zones, 1): out.append(zone_plaque(z, i, acc))
    out.append(f'<rect width="{W*CELL}" height="{H*CELL}" fill="url(#blinds)"/><rect width="{W*CELL}" height="{H*CELL}" filter="url(#grain)"/><rect width="{W*CELL}" height="{H*CELL}" fill="url(#vig)"/>')
    # title cartouche
    cx, cy = m.get('cartouche', (19.6, 15.2))
    cw, ch = 8.0, 2.6
    title = m['name'].upper()
    tfs = 54 if len(title) <= 20 else 44 if len(title) <= 26 else 36
    out.append(f'<g><rect x="{px(cx)}" y="{px(cy)}" width="{px(cw)}" height="{px(ch)}" fill="{INK}" stroke="{BONE}" stroke-width="6"/><rect x="{px(cx+.14)}" y="{px(cy+.14)}" width="{px(cw-.28)}" height="{px(ch-.28)}" fill="none" stroke="{acc}" stroke-width="2"/>'
               + text(cx + .4, cy + .62, f'COLD STORAGE // {m["code"]} // {m["journal"]}', 22, acc, 'start')
               + text(cx + .4, cy + 1.38, title, tfs, BONE, 'start', mono=False, ls=2, extra=f'textLength="{px(cw-.8)}" lengthAdjust="spacingAndGlyphs"' if len(title) * tfs * .62 > px(cw - .8) else '')
               + line(cx + .4, cy + 1.62, cx + cw - .4, cy + 1.62, acc, 2, 'opacity=".6"')
               + line(cx + .45, cy + 1.9, cx + .45, cy + 2.2, acc, 5) + line(cx + .95, cy + 1.9, cx + .95, cy + 2.2, acc, 5) + line(cx + .45, cy + 2.05, cx + .95, cy + 2.05, BONE, 3, 'opacity=".5"') + text(cx + 1.15, cy + 2.15, 'ADJACENT', 18, BONE2, 'start', ls=2)
               + f'<path d="M{px(cx+2.95)} {px(cy+2.05)} L{px(cx+3.55)} {px(cy+2.05)}" stroke="{acc}" stroke-width="5" stroke-dasharray="12 8"/>' + text(cx + 3.7, cy + 2.15, 'CONNECTED', 18, BONE2, 'start', ls=2)
               + text(cx + cw - .4, cy + 2.15, f'{len(zones)} ZONES', 18, acc, 'end', ls=2) + '</g>')
    out.append('</svg>')
    return '\n'.join(out)

# --------------------------------------------------------------------------- the adventure's locations
CY, RED, AMB, GOLD, TEAL, VIO, PINK = '#78ecf3', '#ff5a6e', '#ffc467', '#e9cc8c', '#5ef0c4', '#b9a2ff', '#ff7fb0'
MAPS = [
 dict(id='SCENE-WARD', slug='sc01-resurrection-ward', code='SC01', journal='G08', name='The Resurrection Ward', accent=CY,
  zones=[dict(id='bed-row', name='Bed Row', rect=[1, 1, 16, 10]), dict(id='reserve-bays', name='Reserve Bays', rect=[17, 1, 10, 6]),
         dict(id='nurse-station', name='Nurse Station', rect=[1, 11, 10, 6]), dict(id='service-door', name='Service Door', rect=[17, 7, 10, 6.6])],
  links=[('bed-row', 'reserve-bays', 'LOCKED PARTITION'), ('bed-row', 'nurse-station'), ('bed-row', 'service-door', 'HAND-OPERATED')],
  items=[*[('bed', 2.2 + i * 4.8, 2.6, CY) for i in range(3)], *[('bed', 2.2 + i * 4.8, 7.0, CY) for i in range(3)], ('window', 1.6, 1.15, 16.4, 1.15, CY),
         ('bed', 19.2, 2.6, CY, 1.3, 2.4, True), ('bed', 23.0, 2.6, CY, 1.3, 2.4, True), ('label', 22, 6.3, 'OFF-SITE COLD ANNEX // NOT ACTIVATED', CY, 17),
         ('desk', 2.0, 12.6, CY), ('crates', 5.4, 12.6, 6, .62), ('table', 2.2, 14.9, 2.6, .9), ('label', 3.5, 16.4, 'TROLLEY · PRINTER · INTERCOM', CY, 16),
         ('label', 6.6, 14.6, '6 BAGS', CY, 17), ('cover', 9.6, 13.4, CY, False, 'wood', True), ('stairs', 23.6, 9.0, 2.4, 3.6, True), ('label', 21.0, 10.6, 'SERVICE CORRIDOR', CY, 18)],
  exits=[dict(at=[11.0, 16.0], label='FRONT DESK', dir='right'), dict(at=[27.6, 10.8], label='CORRIDOR', dir='right')]),
 dict(id='SCENE-BREACH', slug='sc02-breach-of-cold-storage', code='SC02', journal='G09', name='Breach of Cold Storage', accent=RED,
  zones=[dict(id='ward', name='The Ward', rect=[1, 1, 11, 15.6]), dict(id='ward-entrance', name='Ward Entrance', rect=[12, 1, 6, 7]),
         dict(id='viewing-corridor', name='Viewing Corridor', rect=[18, 1, 9, 7]), dict(id='service-stair', name='Service Stair', rect=[12, 8, 7, 7.6])],
  links=[('ward', 'ward-entrance'), ('ward-entrance', 'viewing-corridor'), ('ward', 'service-stair', 'LATCH'), ('ward-entrance', 'service-stair')],
  items=[*[('bed', 2.0, 2.4 + i * 3.4, RED) for i in range(4)], ('partition', 5.6, 2.0, 5.6, 9.0), ('cover', 6.5, 9.9, RED, False, 'wood', False), ('table', 7.6, 12.0, 2.4, 1.0),
         ('cover', 8.8, 13.9, RED, False, 'metal', True), ('label', 8.8, 11.6, 'MOVABLE TROLLEY', RED, 16), ('window', 18.2, 7.85, 26.8, 7.85, RED), ('label', 22.6, 7.35, 'REINFORCED VIEWING PANEL', RED, 17),
         ('desk', 13.0, 3.0, RED, 2.2, .9), ('crates', 21.0, 3.0, 2, .7), ('stairs', 14.2, 10.0, 2.6, 4.6, True)],
  exits=[dict(at=[27.6, 4.0], label='RECOVERY VAN', dir='right'), dict(at=[19.0, 13.8], label='THE RAINLINE', dir='right')],
  cartouche=(19.6, 15.0)),
 dict(id='SCENE-RAINLINE', slug='sc03-rainline', code='SC03', journal='G10', name='The Rainline', accent=AMB,
  zones=[dict(id='canal-walk', name='Canal Walk', rect=[1, 1, 26, 3.6]), dict(id='memorial-corner', name='Memorial Corner', rect=[1, 4.6, 7.6, 6.4]),
         dict(id='billboard-plaza', name='Billboard Plaza', rect=[8.6, 4.6, 10.8, 6.4]), dict(id='clinic-intake', name='Clinic Intake', rect=[19.4, 4.6, 7.6, 6.4]),
         dict(id='chapel-lane', name='Chapel Lane', rect=[1, 11, 8.6, 6]), dict(id='bathhouse-steps', name='Bathhouse Steps', rect=[9.6, 11, 8.4, 6])],
  links=[('canal-walk', 'memorial-corner'), ('canal-walk', 'billboard-plaza'), ('canal-walk', 'clinic-intake'), ('memorial-corner', 'billboard-plaza'),
         ('billboard-plaza', 'clinic-intake'), ('memorial-corner', 'chapel-lane'), ('billboard-plaza', 'bathhouse-steps'), ('chapel-lane', 'bathhouse-steps')],
  under=[('water', 1, 1, 26, 1.7, AMB)],
  items=[('memorial', 4.8, 7.6, AMB), ('billboard', 11.2, 5.6, 5.6, AMB), ('label', 14.0, 10.5, 'FLOWERS AT THE MAINTENANCE HATCH', AMB, 16),
         ('desk', 21.0, 6.4, AMB, 2.6, 1.0), ('chairs', 21.0, 8.6, 4), ('label', 23.2, 10.5, 'CERTIFICATE: PENDING', AMB, 16), ('crates', 13.0, 12.6, 3, .7),
         ('label', 14.0, 3.9, 'CONCRETE CANAL WALL', AMB, 17)],
  exits=[dict(at=[27.6, 3.1], label='RELAY SEVENTEEN', dir='right'), dict(at=[1.0, 15.6], label='QUIET ARCHIVE', dir='left'), dict(at=[13.8, 17.0], label='BLUE LOTUS', dir='down')],
  cartouche=(19.4, 14.4)),
 dict(id='SCENE-ARCHIVE', slug='lead-a-quiet-archive', code='LEAD A', journal='G11', name='The Quiet Archive', accent=GOLD,
  zones=[dict(id='nave', name='The Nave', rect=[1, 1, 14, 16]), dict(id='reading-table', name='Reading Table', rect=[15, 1, 12, 7.5]),
         dict(id='records-cabinet', name='Records Cabinet', rect=[15, 8.5, 7, 6.5]), dict(id='public-back-door', name='Public Back Door', rect=[22, 8.5, 5, 6.5])],
  links=[('nave', 'reading-table'), ('nave', 'records-cabinet'), ('reading-table', 'records-cabinet'), ('reading-table', 'public-back-door'), ('records-cabinet', 'public-back-door')],
  items=[('bowls', 2.6, 3.4, 12, 4, GOLD), ('label', 8.0, 15.6, 'NAMES ON PAPER STRIPS ABOVE SHALLOW WATER', GOLD, 17), ('table', 17.5, 3.6, 5.6, 1.8, 6, 0),
         ('label', 20.3, 7.4, 'DRY ENVELOPE · H03', GOLD, 17), ('cabinets', 16.0, 10.0, 4, .9, 2.8, True, GOLD), ('label', 18.4, 14.4, 'SEALED STACK — NO CONSENT', GOLD, 15),
         ('stairs', 23.4, 10.4, 2.2, 3.2, True)],
  exits=[dict(at=[1.0, 9.0], label='STREET', dir='left'), dict(at=[27.6, 13.0], label='BACK DOOR', dir='right')]),
 dict(id='SCENE-LOTUS', slug='lead-b-blue-lotus', code='LEAD B', journal='G12', name='Blue Lotus, Black Water', accent=PINK,
  zones=[dict(id='street-entrance', name='Street Entrance', rect=[1, 1, 6, 5]), dict(id='pool-deck', name='Pool Deck', rect=[7, 1, 20, 4.4]),
         dict(id='deep-pool', name='The Deep Pool', rect=[7, 5.4, 12, 11.2]), dict(id='cracked-window', name='Cracked Window', rect=[19, 5.4, 8, 6]),
         dict(id='maintenance-stair', name='Maintenance Stair', rect=[1, 6, 6, 10.6])],
  links=[('street-entrance', 'pool-deck'), ('pool-deck', 'deep-pool', 'LADDER'), ('pool-deck', 'cracked-window'), ('deep-pool', 'cracked-window'),
         ('street-entrance', 'maintenance-stair'), ('maintenance-stair', 'deep-pool')],
  under=[('pool', 7.6, 6.0, 10.8, 10.0, PINK)],
  items=[('table', 10.0, 9.4, 3.6, 1.6, 4), ('crates', 14.4, 8.0, 9, .7), ('fan', 11.0, 13.6, .55, PINK), ('label', 11.0, 14.8, 'HEATER', PINK, 16),
         ('label', 12.2, 12.7, "NIKO'S TABLE", PINK, 17), ('window', 26.8, 5.8, 26.8, 11.0, PINK), ('desk', 21.0, 7.8, PINK, 2.4, 1.0), ('label', 22.6, 9.5, 'SECURE CASE · H04', PINK, 16),
         ('cover', 16.4, 14.6, PINK, False, 'metal', True), ('stairs', 2.4, 9.0, 3.0, 6.0, True), ('label', 17.0, 2.6, 'CHLORINE · EMPTY POOLS', PINK, 17)],
  exits=[dict(at=[1.0, 3.6], label='STREET', dir='left'), dict(at=[1.0, 15.4], label='CANAL / ANANSI', dir='left')]),
 dict(id='SCENE-RELAY', slug='lead-c-relay-seventeen', code='LEAD C', journal='G13', name='Relay Seventeen', accent=TEAL,
  zones=[dict(id='canal-gantry', name='Canal Gantry', rect=[1, 1, 7, 16]), dict(id='cabinet-hall', name='Cabinet Hall', rect=[8, 1, 12, 9]),
         dict(id='diagnostic-store', name='Diagnostic Store', rect=[8, 10, 11.4, 6]), dict(id='fan-shaft', name='Fan Shaft', rect=[20, 1, 7, 9])],
  links=[('canal-gantry', 'cabinet-hall'), ('canal-gantry', 'diagnostic-store'), ('cabinet-hall', 'diagnostic-store'), ('cabinet-hall', 'fan-shaft', 'SERVICE HATCH')],
  under=[('water', 1, 1, 2.4, 16, TEAL)],
  items=[('grate', 3.8, 3.0, 3.6, 12.0), ('cabinets', 9.2, 2.4, 9, .9, 2.4, True, TEAL), ('cabinets', 9.2, 6.0, 9, .9, 2.4, True, TEAL),
         ('console', 10.0, 11.6, 4.2, 2.2, TEAL, 'READ / MIRROR / PURGE'), ('crates', 15.6, 11.4, 2, .8), ('label', 16.4, 13.4, "LENA'S OPEN PANEL", TEAL, 16),
         ('fan', 23.5, 4.2, 1.6, TEAL), ('stairs', 22.0, 6.8, 3.0, 2.6, False), ('label', 23.5, 1.9, 'WARM AIR UPLINK', TEAL, 16)],
  exits=[dict(at=[1.0, 9.0], label='CANAL', dir='left'), dict(at=[27.6, 8.0], label='SERVICE LADDER', dir='right')]),
 dict(id='SCENE-SAFEHOUSE', slug='sc04-anansi-house', code='SC04', journal='G14', name='Anansi House', accent=AMB,
  zones=[dict(id='lobby', name='Lobby & Desk', rect=[1, 1, 9, 9]), dict(id='dining-room', name='Dining Room', rect=[10, 1, 10, 9]),
         dict(id='guest-rooms', name='Guest Rooms', rect=[20, 1, 7, 13]), dict(id='parlour', name='Replay Parlour', rect=[1, 10, 12, 7])],
  links=[('lobby', 'dining-room'), ('dining-room', 'guest-rooms'), ('lobby', 'parlour'), ('dining-room', 'parlour')],
  items=[('desk', 2.0, 3.0, AMB, 4.0, 1.2), ('label', 4.0, 4.9, "MARLOWE'S SPEAKER · LOOSE CAMERA CABLE", AMB, 15), ('label', 4.0, 2.6, 'RESERVATION BOOK · 2274', AMB, 16),
         ('chairs', 2.0, 7.0, 4), ('table', 11.6, 4.0, 6.8, 1.8, 8, 6, AMB), ('label', 15.0, 8.8, 'SIX PLACES · SIX DIFFERENT CUPS', AMB, 16),
         *[('doorlabel', 21.0, 2.2 + i * 1.5, 1.6, f'ROOM {i+1}', AMB) for i in range(4)], *[('doorlabel', 24.2, 2.2 + i * 1.5, 1.6, f'ROOM {i+5}', AMB) for i in range(4)],
         ('label', 23.5, 9.2, 'ONE OLD OBJECT PER ROOM', AMB, 15), ('wallpaper', 1.2, 10.2, 11.6, 6.6, AMB), ('chairs', 3.0, 13.2, 6, 1.3, .8), ('label', 7.0, 15.8, 'EXTERNAL REPLAY ON THE WALLS', AMB, 16)],
  exits=[dict(at=[1.0, 5.6], label='STREET', dir='left')], cartouche=(19.6, 14.8)),
 dict(id='SCENE-VIRTUAL', slug='sc05-palimpsest-virtuality', code='SC05', journal='G15', name='Palimpsest Virtuality', accent=VIO,
  zones=[dict(id='exit-anchor', name='Exit Anchor', rect=[1, 5, 6, 6]), dict(id='archive-atrium', name='Archive Atrium', rect=[8.6, 2, 9.4, 10]),
         dict(id='court-gate', name='Court Gate', rect=[19.6, 1, 7.4, 4.2]), dict(id='theatre-gate', name='Theatre Gate', rect=[19.6, 5.9, 7.4, 4.2]),
         dict(id='broadcast-gate', name='Broadcast Gate', rect=[19.6, 10.8, 7.4, 4.2]), dict(id='fourth-window', name='Fourth Window', rect=[8.6, 13.4, 9.4, 3.6])],
  links=[('exit-anchor', 'archive-atrium', 'EXIT STAYS HERE'), ('archive-atrium', 'court-gate', 'NODE A'), ('archive-atrium', 'theatre-gate', 'NODE B'),
         ('archive-atrium', 'broadcast-gate', 'NODE C'), ('archive-atrium', 'fourth-window', 'AFTER NODE 1')],
  items=[('wallpaper', 1.2, 5.2, 5.6, 5.6, VIO), ('label', 4.0, 10.4, "ANANSI'S DAMP WALLPAPER", VIO, 15), ('transmitter', 13.3, 7.0, VIO),
         ('label', 13.3, 10.6, 'PAUSE · COMPARE · EXIT', VIO, 18), ('bench', 21.0, 2.6, 4.6, .9, VIO), ('cradle', 22.6, 7.0, VIO), ('label', 25.4, 9.2, '', VIO),
         ('cabinets', 21.2, 12.2, 4, .7, 2.0, True, VIO), ('desk', 11.2, 14.6, VIO, 4.2, 1.0), ('label', 13.3, 16.4, 'THERAPEUTIC INTERVENTION REQUEST', VIO, 15)],
  exits=[]),
 dict(id='SCENE-COURT', slug='node-a-court-of-unreliable-witnesses', code='NODE A', journal='G16', name='The Court of Unreliable Witnesses', accent=VIO,
  zones=[dict(id='service-door', name='Service Door', rect=[1, 1, 7, 5]), dict(id='judges-bench', name="Judge's Bench", rect=[8, 1, 12, 5]),
         dict(id='witness-chairs', name='Witness Chairs', rect=[1, 6, 13, 8]), dict(id='clerks-desk', name="Clerk's Desk", rect=[14, 6, 6, 8]), dict(id='gallery', name='Gallery', rect=[20, 1, 7, 13])],
  links=[('service-door', 'judges-bench'), ('service-door', 'witness-chairs'), ('judges-bench', 'witness-chairs'), ('judges-bench', 'clerks-desk'),
         ('witness-chairs', 'clerks-desk'), ('clerks-desk', 'gallery'), ('judges-bench', 'gallery')],
  items=[('bench', 9.6, 2.6, 8.8, 1.4, VIO), ('label', 14.0, 5.3, 'THREE BENEFICIARY CODES', VIO, 16), ('chairs', 2.0, 8.6, 6, 1.05, .7), ('chairs', 2.0, 11.0, 2, 1.05, .7),
         ('label', 7.6, 13.3, 'EIGHT CHAIRS · EIGHT OUTLINES', VIO, 16), ('desk', 15.0, 8.6, VIO, 4.0, 1.2), ('label', 17.0, 10.6, 'SECOND TIMESTAMP · H07', VIO, 16),
         ('chairs', 21.0, 3.0, 5, 1.05), ('chairs', 21.0, 5.0, 5, 1.05), ('chairs', 21.0, 7.0, 5, 1.05), ('label', 23.5, 9.0, 'OBSERVERS', VIO, 16), ('stairs', 2.2, 2.6, 2.4, 2.0, False)],
  exits=[dict(at=[1.0, 3.6], label='DIRTY MIRRORS', dir='left')]),
 dict(id='SCENE-THEATRE', slug='node-b-operating-theatre', code='NODE B', journal='G17', name='The Operating Theatre', accent=VIO,
  zones=[dict(id='observation-gallery', name='Observation Gallery', rect=[1, 1, 26, 3]), dict(id='clone-cradle', name='Clone Cradle', rect=[1, 4, 6, 9]),
         dict(id='operating-floor', name='Operating Floor', rect=[7, 4, 12, 9]), dict(id='interface-wall', name='Interface Wall', rect=[19, 4, 8, 9]), dict(id='records-desk', name='Records Desk', rect=[1, 13, 12, 4])],
  links=[('observation-gallery', 'operating-floor', 'GLASS'), ('observation-gallery', 'clone-cradle', 'GLASS'), ('observation-gallery', 'interface-wall', 'GLASS'),
         ('clone-cradle', 'operating-floor'), ('operating-floor', 'interface-wall'), ('records-desk', 'clone-cradle'), ('records-desk', 'operating-floor')],
  items=[('window', 1.4, 4.0, 26.6, 4.0, VIO), ('chairs', 3.0, 2.0, 18, 1.2, .6), ('cradle', 3.3, 6.2, VIO), ('label', 4.0, 12.4, 'BREATHING, EMPTY', VIO, 15),
         ('table', 10.4, 7.4, 5.2, 1.6), ('label', 13.0, 10.2, 'NO PATIENT', VIO, 18), ('lightwall', 26.2, 5.0, 7.4, VIO), ('label', 22.6, 12.4, 'CLIENT CODE ONLY', VIO, 16),
         ('desk', 2.4, 14.6, VIO, 4.2, 1.1), ('crates', 7.4, 14.6, 3, .7), ('label', 7.0, 16.6, 'TWO CONSENT DOCUMENTS · H08', VIO, 16)],
  exits=[], cartouche=(19.6, 14.6)),
 dict(id='SCENE-BROADCAST', slug='node-c-last-broadcast', code='NODE C', journal='G18', name='The Last Broadcast', accent=VIO,
  zones=[dict(id='rain-window', name='Rain Window', rect=[1, 1, 7, 12]), dict(id='archive-racks', name='Archive Racks', rect=[8, 1, 11, 3]),
         dict(id='transmitter', name='Transmitter', rect=[8, 4, 11, 9]), dict(id='attestation-door', name='Attestation Door', rect=[19, 1, 8, 6]), dict(id='service-entrance', name='Service Entrance', rect=[19, 7, 8, 6])],
  links=[('rain-window', 'transmitter'), ('rain-window', 'archive-racks'), ('archive-racks', 'transmitter'), ('transmitter', 'attestation-door'),
         ('transmitter', 'service-entrance'), ('attestation-door', 'service-entrance'), ('archive-racks', 'attestation-door')],
  under=[('water', 1.2, 1.2, 1.6, 11.6, VIO)],
  items=[('window', 3.0, 1.4, 3.0, 12.6, VIO), ('label', 4.8, 12.4, 'RAIN ACROSS THE GLASS', VIO, 15), ('cabinets', 8.8, 1.5, 4, .7, 2.2, False, VIO),
         ('transmitter', 13.5, 8.6, VIO), ('label', 13.5, 12.4, 'FOUR SHARES · NO SINGLE CARRIER', VIO, 15), ('doorlabel', 21.0, 3.6, 4.0, 'CLIENT EMBODIMENT ATTESTATION', VIO),
         ('cover', 25.6, 9.4, VIO, False, 'concrete', True), ('stairs', 21.0, 8.8, 2.6, 3.4, True), ('label', 23.0, 12.6, "ASHA'S SECOND TEAM", VIO, 15)],
  exits=[dict(at=[27.6, 11.0], label='CANAL ACCESS', dir='right')], cartouche=(19.6, 14.6)),
 dict(id='SCENE-SPIRE', slug='sc06-entering-the-spire', code='SC06 · I', journal='G19', name='Entering the Spire', accent=CY,
  zones=[dict(id='public-reception', name='Public Reception', rect=[1, 1, 10, 10]), dict(id='interview-room', name='Interview Room', rect=[11, 1, 6, 5]),
         dict(id='final-corridor', name='Final Corridor', rect=[17, 1, 10, 5]), dict(id='lift-lobby', name='Lift Lobby', rect=[11, 6, 10, 5]),
         dict(id='maintenance-station', name='Maintenance Station', rect=[21, 6, 6, 5]), dict(id='canal-quay', name='Canal Quay', rect=[1, 11, 10, 6]),
         dict(id='pump-walkway', name='Pump Walkway', rect=[11, 11, 8.4, 6])],
  links=[('public-reception', 'interview-room'), ('public-reception', 'lift-lobby', 'FORTIFIED LIFT'), ('public-reception', 'canal-quay', 'PUBLIC ENTRANCE'),
         ('interview-room', 'final-corridor'), ('interview-room', 'lift-lobby'), ('lift-lobby', 'final-corridor'), ('lift-lobby', 'maintenance-station', 'SERVICE LIFT'),
         ('lift-lobby', 'pump-walkway'), ('canal-quay', 'pump-walkway', 'LOCKED GRATE'), ('pump-walkway', 'maintenance-station', 'ADMIN GATE', [[20.6, 13.2], [22.6, 13.2]])],
  under=[('water', 1, 15.2, 10, 1.8, CY)],
  items=[('desk', 2.2, 3.0, CY, 5.6, 1.2), ('label', 5.0, 2.5, 'CLINIC · ARBITRATION · TRANSIT', CY, 15), ('lockers', 2.2, 6.0, 10, CY), ('label', 4.6, 7.6, 'MONITORED LOCKERS', CY, 15),
         ('chairs', 2.2, 9.0, 6), ('table', 12.2, 2.6, 3.4, 1.2, 4), ('doorlabel', 17.8, 2.6, 2.4, 'LIFE-SAFETY', CY), ('doorlabel', 20.9, 2.6, 2.4, 'CIVIC ROOT', CY),
         ('doorlabel', 24.0, 2.6, 2.6, 'CLINICAL PALIMPSEST', CY), ('lift', 14.6, 7.0, 2.6, CY), ('cover', 18.4, 9.0, CY, True, 'ferrocrete', False), ('pump', 15.0, 13.4, CY), ('grate', 11.3, 15.0, 2.0, 1.2),
         ('console', 22.0, 7.4, 3.6, 2.0, CY, 'STAFFED STATION')],
  exits=[dict(at=[1.0, 13.0], label='CANAL', dir='left')], cartouche=(19.6, 14.6)),
 dict(id='SCENE-COUNCIL', slug='sc06-council-beneath-the-skin', code='SC06 · II', journal='G20', name='The Council Beneath the Skin', accent=GOLD,
  zones=[dict(id='genesis-register', name='Genesis Register', rect=[1, 3, 6, 5]), dict(id='runtime-wafer', name='Runtime Wafer', rect=[1, 8, 6, 4]),
         dict(id='council-table', name='Council Table', rect=[7, 3, 13, 9]), dict(id='clinical-console', name='Clinical Console', rect=[20, 3, 7, 9]), dict(id='antechamber', name='Antechamber', rect=[7, 12, 13, 4.6])],
  links=[('genesis-register', 'council-table'), ('runtime-wafer', 'council-table', 'ISOLATED'), ('genesis-register', 'runtime-wafer'), ('council-table', 'clinical-console'), ('council-table', 'antechamber')],
  items=[('console', 2.2, 4.4, 3.6, 2.0, GOLD, 'WRITE-PROTECTED · H10'), ('wafer', 4.0, 10.0, GOLD), ('table', 9.6, 6.4, 8.0, 2.2, 6, 3, GOLD),
         ('label', 13.6, 10.2, 'A CUP · A CUFF · AN ORANGE', GOLD, 17), ('console', 21.6, 5.0, 3.8, 2.2, GOLD, 'ELIAS NORTH'), ('cover', 25.6, 10.4, GOLD, False, 'steel', True),
         ('chairs', 9.0, 14.2, 8, 1.3, .7), ('label', 13.5, 2.5, 'SMALLER THAN A THRONE ROOM SHOULD BE', GOLD, 17)],
  exits=[dict(at=[13.5, 16.6], label='THE WAY IN', dir='down')], cartouche=(19.6, 14.4)),
 dict(id='SCENE-CORE', slug='sc06-final-operation', code='SC06 · III', journal='G21', name='The Final Operation', accent=RED,
  zones=[dict(id='evidence-port', name='Evidence Port', rect=[1, 1, 8, 6]), dict(id='chamber-floor', name='Chamber Floor', rect=[9, 4, 10, 9]),
         dict(id='civic-lease', name='Civic Lease', rect=[19, 1, 8, 6]), dict(id='palimpsest-engine', name='Palimpsest Engine', rect=[19, 7, 8, 6]),
         dict(id='life-safety-bus', name='Life-Safety Bus', rect=[1, 8.6, 7, 8.4]), dict(id='secure-exit', name='Secure Exit', rect=[9, 13, 10, 4])],
  links=[('evidence-port', 'chamber-floor'), ('civic-lease', 'chamber-floor'), ('palimpsest-engine', 'chamber-floor'), ('chamber-floor', 'secure-exit'),
         ('chamber-floor', 'life-safety-bus', 'SEPARATE CATWALK')],
  items=[('console', 2.4, 2.6, 4.6, 2.2, RED, 'READ-ONLY CASE PACKET'), ('console', 20.6, 2.6, 4.6, 2.2, RED, 'RENEW · SUSPEND · TRANSFER'),
         ('console', 20.6, 8.4, 4.6, 2.4, RED, 'QUARANTINE · RETAIN · DISABLE'), ('pump', 4.5, 11.6, RED), ('pump', 4.5, 14.6, RED), ('label', 4.5, 16.4, 'QUALIFIED STAFF ONLY', RED, 15),
         ('transmitter', 14.0, 8.4, RED), ('cover', 10.6, 11.4, RED, False, 'steel', True), ('cover', 17.4, 5.4, RED, False, 'steel', True), ('lift', 12.8, 13.8, 2.4, RED)],
  exits=[dict(at=[19.0, 16.0], label='OUTSIDE', dir='right')], cartouche=(19.6, 14.4)),
]

if __name__ == '__main__':
    out_dir, content = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    data = []
    for m in MAPS:
        open(os.path.join(out_dir, m['slug'] + '.svg'), 'w').write(render(m))
        adj = {z['id']: [] for z in m['zones']}
        for l in m['links']:
            adj[l[0]].append(l[1]); adj[l[1]].append(l[0])
        data.append({'id': m['id'], 'name': m['name'], 'code': m['code'], 'journal': m['journal'], 'file': m['slug'] + '.webp', 'width': W * CELL, 'height': H * CELL, 'gridSize': CELL,
                     'zones': [{'id': z['id'], 'name': z['name'], 'rect': [px(v) for v in z['rect']], 'adjacent': sorted(set(adj[z['id']]))} for z in m['zones']],
                     'exits': [e['label'] for e in m.get('exits', [])],
                     'cover': [{'id': f"{m['id'].lower()}-cover-{i}", 'x': px(c[1]), 'y': px(c[2]), 'radius': px(COVER_RADIUS),
                                'kind': c[5] if len(c) > 5 else 'wood', 'partial': bool(c[6]) if len(c) > 6 else True,
                                'zone': next((z['id'] for z in m['zones'] if z['rect'][0] <= c[1] <= z['rect'][0] + z['rect'][2] and z['rect'][1] <= c[2] <= z['rect'][1] + z['rect'][3]), '')}
                               for i, c in enumerate(f for f in m.get('items', []) if f[0] == 'cover')]})
    json.dump({'version': '1.7.0', 'maps': data}, open(content, 'w'), indent=1)
    print(len(MAPS), 'maps')
