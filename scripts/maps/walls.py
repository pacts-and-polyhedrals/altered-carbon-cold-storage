"""Cold Storage 1.10: Foundry walls, doors and windows for every zoned map, derived from the same geometry
that draws the map art (maps.py), so every wall sits on a printed wall line and every door on a printed door.

Usage: python3 walls.py CONTENT_JSON [PREVIEW_DIR]
  - adds `walls` to every map in CONTENT_JSON (pixel coordinates, Foundry wall data shape)
  - optional PREVIEW_DIR: writes <slug>-walls.png overlays for visual QA

Rules
  * A zone outline is a wall unless both sides are open air (OUTDOOR zones or the map edge beside one).
  * Linked zones sharing an edge get a door in the printed door gap (0.9 cells); labels with LOCKED are locked doors;
    GLASS links are windows, not doors.
  * Connected zones that do not touch (dashed routes) get a door where the route leaves each indoor zone.
  * Labelled exits get a door on the nearest indoor wall.
  * `window` furniture becomes a window wall (blocks movement, not sight or light; muffles sound), snapped onto
    the wall it is drawn on; `partition` furniture becomes an interior wall.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from maps import MAPS, CELL, W, H, shared_edge, edge_point

# Open-air zones: their shared borders with other open-air zones and the map edge get no wall.
OUTDOOR = {
    'SCENE-RAINLINE': {'canal-walk', 'memorial-corner', 'billboard-plaza', 'chapel-lane', 'bathhouse-steps'},
    'SCENE-RELAY': {'canal-gantry'},
    'SCENE-SPIRE': {'canal-quay'},
    'SCENE-LOTUS': set(),
}
DOOR_GAP = .9
# Doors the art does not label but play needs (sandbox access); cells (x, y, vertical).
EXTRA_DOORS = {'SCENE-THEATRE': [(26.0, 4.0, False, 'GALLERY DOOR')]}
EPS = 1e-6
WINDOW_LABELS = {'GLASS'}

def edges(rect):
    x, y, w, h = rect
    return [('h', y, x, x + w), ('h', y + h, x, x + w), ('v', x, y, y + h), ('v', x + w, y, y + h)]

def build(m):
    zones = m['zones']; byid = {z['id']: z for z in zones}
    outdoor = OUTDOOR.get(m['id'], set())
    lines = {}  # (orient, coord) -> list of [a, b, kind, extra]
    def add(o, c, a, b, kind, extra=None):
        if b - a < .05: return
        lines.setdefault((o, round(c, 4)), []).append([min(a, b), max(a, b), kind, extra or {}])
    # 1. walls on zone outlines
    for z in zones:
        for (o, c, a, b) in edges(z['rect']):
            # breakpoints from other zones on the same line
            pts = {a, b}
            for z2 in zones:
                if z2 is z: continue
                for (o2, c2, a2, b2) in edges(z2['rect']):
                    if o2 == o and abs(c2 - c) < EPS:
                        for p in (a2, b2):
                            if a < p < b: pts.add(p)
            pts = sorted(pts)
            for s, e in zip(pts, pts[1:]):
                mid = (s + e) / 2
                # who is on the other side of this piece?
                other = None
                for z2 in zones:
                    if z2 is z: continue
                    for (o2, c2, a2, b2) in edges(z2['rect']):
                        if o2 == o and abs(c2 - c) < EPS and a2 - EPS <= mid <= b2 + EPS: other = z2
                if z['id'] in outdoor and (other is None or other['id'] in outdoor): continue
                add(o, c, s, e, 'wall')
    # 2. doors / windows between linked zones
    for link in m['links']:
        a, b = byid[link[0]], byid[link[1]]; label = link[2] if len(link) > 2 else ''
        via = link[3] if len(link) > 3 else None
        e = None if via else shared_edge(a['rect'], b['rect'])
        locked = 'LOCKED' in label
        if e:
            if a['id'] in outdoor and b['id'] in outdoor: continue
            x, y, vertical = e
            if label in WINDOW_LABELS:
                # the whole shared edge is glass
                lo, hi = overlap(a['rect'], b['rect'], vertical)
                add('v' if vertical else 'h', x if vertical else y, lo, hi, 'window', {'label': label})
            elif vertical: add('v', x, y - DOOR_GAP / 2, y + DOOR_GAP / 2, 'door', {'label': label, 'locked': locked})
            else: add('h', y, x - DOOR_GAP / 2, x + DOOR_GAP / 2, 'door', {'label': label, 'locked': locked})
        else:
            if via: ends = [(a, edge_point(a['rect'], via[0])), (b, edge_point(b['rect'], via[-1]))]
            else:
                ca = (a['rect'][0] + a['rect'][2] / 2, a['rect'][1] + a['rect'][3] / 2); cb = (b['rect'][0] + b['rect'][2] / 2, b['rect'][1] + b['rect'][3] / 2)
                ends = [(a, edge_point(a['rect'], cb)), (b, edge_point(b['rect'], ca))]
            for z, (px_, py_) in ends:
                if z['id'] in outdoor: continue
                door_on_outline(add, z['rect'], px_, py_, label, locked)
    for (x, y, vertical, label) in EXTRA_DOORS.get(m['id'], []):
        if vertical: add('v', x, y - DOOR_GAP / 2, y + DOOR_GAP / 2, 'door', {'label': label})
        else: add('h', y, x - DOOR_GAP / 2, x + DOOR_GAP / 2, 'door', {'label': label})
    # 3. labelled exits
    for ex in m.get('exits', []):
        ax, ay = ex['at']; best = None
        for z in zones:
            if z['id'] in outdoor: continue
            for (o, c, a, b) in edges(z['rect']):
                if o == 'v' and a - EPS <= ay <= b + EPS: d = abs(ax - c); p = (c, ay)
                elif o == 'h' and a - EPS <= ax <= b + EPS: d = abs(ay - c); p = (ax, c)
                else: continue
                if d <= 1.2 and (best is None or d < best[0]): best = (d, z, p)
        if best:
            z, (px_, py_) = best[1], best[2]
            door_on_outline(add, z['rect'], px_, py_, 'EXIT · ' + ex['label'], False, gap=1.0)
    # 4. windows and partitions drawn on the map
    for f in m.get('items', []) + m.get('over', []):
        if f[0] not in ('window', 'partition'): continue
        x1, y1, x2, y2 = f[1:5]
        kind = 'window' if f[0] == 'window' else 'wall'
        if abs(y1 - y2) < EPS: o, c, a, b = 'h', y1, x1, x2
        else: o, c, a, b = 'v', x1, y1, y2
        if kind == 'window':
            # snap onto the wall it is drawn against (the art insets windows a fraction of a cell)
            snap = min((k[1] for k in lines if k[0] == o and abs(k[1] - c) <= .4 and any(s[0] - .5 <= a and b <= s[1] + .5 for s in lines[k] if s[2] == 'wall')), key=lambda v: abs(v - c), default=None)
            if snap is not None: c = snap
        add(o, c, a, b, kind, {'label': 'window' if kind == 'window' else 'partition'})
    return resolve(lines)

def overlap(r1, r2, vertical):
    if vertical: return max(r1[1], r2[1]), min(r1[1] + r1[3], r2[1] + r2[3])
    return max(r1[0], r2[0]), min(r1[0] + r1[2], r2[0] + r2[2])

def door_on_outline(add, rect, px_, py_, label, locked, gap=DOOR_GAP):
    x, y, w, h = rect
    d = {'l': abs(px_ - x), 'r': abs(px_ - (x + w)), 't': abs(py_ - y), 'b': abs(py_ - (y + h))}
    side = min(d, key=d.get)
    if side in 'lr':
        c = x if side == 'l' else x + w; py_ = min(max(py_, y + gap / 2 + .1), y + h - gap / 2 - .1)
        add('v', c, py_ - gap / 2, py_ + gap / 2, 'door', {'label': label, 'locked': locked})
    else:
        c = y if side == 't' else y + h; px_ = min(max(px_, x + gap / 2 + .1), x + w - gap / 2 - .1)
        add('h', c, px_ - gap / 2, px_ + gap / 2, 'door', {'label': label, 'locked': locked})

PRIORITY = {'door': 3, 'window': 2, 'wall': 1}
def resolve(lines):
    """Flatten each line: doors cut walls and windows, windows cut walls; merge contiguous walls."""
    out = []
    for (o, c), segs in lines.items():
        pts = sorted({p for s in segs for p in (s[0], s[1])})
        pieces = []
        for s, e in zip(pts, pts[1:]):
            mid = (s + e) / 2
            cover = [g for g in segs if g[0] - EPS <= mid <= g[1] + EPS]
            if not cover: continue
            top = max(cover, key=lambda g: PRIORITY[g[2]])
            pieces.append([s, e, top[2], top[3], id(top)])
        merged = []
        for p in pieces:
            # merge walls/windows that touch; doors stay one segment per authored door
            if merged and merged[-1][2] == p[2] and abs(merged[-1][1] - p[0]) < EPS and (p[2] != 'door' or merged[-1][4] == p[4]):
                merged[-1][1] = p[1]
            else: merged.append(p)
        for s, e, kind, extra, _ in merged:
            if e - s < .05: continue
            c_px = [s * CELL, c * CELL, e * CELL, c * CELL] if o == 'h' else [c * CELL, s * CELL, c * CELL, e * CELL]
            wall = {'c': [round(v, 1) for v in c_px], 'kind': kind}
            if kind == 'door':
                wall['locked'] = bool(extra.get('locked'))
                if extra.get('label'): wall['label'] = extra['label']
            out.append(wall)
    out.sort(key=lambda w: (w['kind'], w['c']))
    return out

def preview(m, walls, path, src):
    from PIL import Image, ImageDraw
    im = Image.open(src).convert('RGB'); d = ImageDraw.Draw(im)
    col = {'wall': (255, 40, 40), 'door': (40, 255, 90), 'window': (60, 160, 255)}
    for w in walls:
        d.line(w['c'], fill=col[w['kind']] if not w.get('locked') else (255, 210, 0), width=9)
    im.thumbnail((1400, 900)); im.save(path)

if __name__ == '__main__':
    content = sys.argv[1]; prev = sys.argv[2] if len(sys.argv) > 2 else None
    data = json.load(open(content))
    defs = {m['id']: m for m in MAPS}
    for md in data['maps']:
        md['walls'] = build(defs[md['id']])
        if prev:
            os.makedirs(prev, exist_ok=True)
            preview(md, md['walls'], os.path.join(prev, defs[md['id']]['slug'] + '-walls.png'), os.path.join(os.path.dirname(content), '..', 'assets', 'maps', md['file']))
        k = {t: sum(1 for w in md['walls'] if w['kind'] == t) for t in ('wall', 'door', 'window')}
        print(md['id'], k)
    data['version'] = '1.10.0'
    json.dump(data, open(content, 'w'), indent=1)
