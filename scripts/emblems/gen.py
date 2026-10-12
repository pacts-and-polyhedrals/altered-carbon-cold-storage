"""Cold Storage noir emblem generator -> assets/emblems/*.svg + emblems.json"""
import json, math, os, re, sys, html
sys.path.insert(0, os.path.dirname(__file__))
import glyphs as g

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
INK = '#0a0d10'
BONE_TOP, BONE_BOT = '#f1e9d6', '#b9ae95'

LABELS = {'BCPD Sidearm .357MAG': 'BCPD .357 Magnum', 'CTAC 9mm Praetorian Sidearm': 'Praetorian 9mm', 'CTAC Shocktrooper AK (AKS-74U)': 'Shocktrooper AK',
 'UTAS UTS-15 Shotgun': 'UTS-15 Shotgun', 'CTAC Praetorian Railgun': 'Praetorian Railgun', 'Ingram-40 Flechette Pistol': 'Ingram-40 Flechette', 'Nemesis X (NEMEX)': 'Nemesis X',
 'Hallucinogen Grenade': 'Hallucinogen', 'Grenade Dispenser Clip': 'Dispenser Clip', 'Battery Pack, D.E. Weapon Power Cell': 'D.E. Power Cell', 'Intel/Instructional Media': 'Intel Media',
 'Interrogation/Virus': 'Interrogation', 'Carbon Fiber Skeletal Structure': 'Carbon Skeleton', 'Protectorate Marine Armor': 'Marine Armor', 'CTAC Praetorian Armor': 'Praetorian Armor',
 'Stallion (Synamorphestrone)': 'Stallion', 'Merge (Empathin)': 'Merge', 'Reaper (Bethanatine)': 'Reaper', 'Rapid Regrowth Bios': 'Regrowth Bios', 'Armor Penetrating Rounds': 'AP Rounds',
 'Composite Construction': 'Composite Frame', 'Genemapped Security': 'Genemapped Lock', 'Trade Union / Guild / Social Organization': 'Union & Guild', 'Influential Individual': 'Individual',
 'Protectorate Agency': 'Protectorate', 'Criminal Syndicate': 'Syndicate'}
FAMILIES = {
 # family: (frame, accent, department label)
 'opponent':   ('badge',   '#ff3b55', 'WANTED // BAY CITY'),
 'benefactor': ('badge',   '#c9a24a', 'CLASSIFIED // GM'),
 'network':    ('seal',    '#d8b46a', 'NETWORK'),
 'weapon':     ('ring',    '#ff8a3d', 'ARMORY'),
 'ammunition': ('ammo',    '#ffc467', 'MUNITIONS'),
 'armour':     ('shield',  '#78ecf3', 'APPAREL'),
 'equipment':  ('hex',     '#78ecf3', 'FIELD KIT'),
 'deck':       ('diamond', '#b9a2ff', 'DECKS'),
 'software':   ('diamond', '#b9a2ff', 'VIRTUAL'),
 'drug':       ('capsule', '#ff5fa2', 'PHARMA'),
 'augmentation': ('octagon', '#5ef0c4', 'SLEEVE MOD'),
 'upgrade':    ('hex',     '#ffc467', 'WEAPON MOD'),
 'special':    ('ring',    '#78ecf3', 'COLD STORAGE'),
}

def frame_path(shape):
    c = 256
    if shape == 'ring' or shape == 'ammo': return f'M{c} 28 A228 228 0 1 1 {c-0.1} 28 Z'
    if shape == 'seal':
        pts = []
        for i in range(64):
            r = 232 if i % 2 == 0 else 218
            a = math.radians(-90 + i * 360 / 64)
            pts.append((c + r * math.cos(a), c + r * math.sin(a)))
        return g.poly(pts)
    if shape == 'badge': return 'M256 22 L452 112 L452 330 C452 400 360 462 256 492 C152 462 60 400 60 330 L60 112 Z'
    if shape == 'shield': return 'M256 24 L448 74 L448 250 C448 370 360 446 256 490 C152 446 64 370 64 250 L64 74 Z'
    if shape == 'hex': return g.ngon(256, 256, 6, 236, rot=0)
    if shape == 'diamond': return 'M256 22 L490 256 L256 490 L22 256 Z'
    if shape == 'octagon': return g.ngon(256, 256, 8, 236, rot=-22.5)
    if shape == 'capsule': return 'M146 30 L366 30 C430 30 474 74 474 138 L474 374 C474 438 430 482 366 482 L146 482 C82 482 38 438 38 374 L38 138 C38 74 82 30 146 30 Z'
    raise ValueError(shape)

def inner_scale(shape):  # inset factor for the inner hairline
    return {'diamond': .86, 'badge': .9, 'shield': .9}.get(shape, .92)

def colorize(frag, accent, mode):
    if mode == 'main': return frag.replace('fill="B"', 'fill="url(#bone)"').replace('stroke="B"', 'stroke="url(#bone)"').replace('fill="A"', f'fill="{accent}"').replace('stroke="A"', f'stroke="{accent}"').replace('fill="K"', f'fill="{INK}"').replace('stroke="K"', f'stroke="{INK}"')
    if mode == 'shadow': return re.sub(r'(fill|stroke)="[BAK]"', lambda m: f'{m.group(1)}="#000"', frag)
    if mode == 'mask': return re.sub(r'(fill|stroke)="([BAK])"', lambda m: f'{m.group(1)}="{"#000" if m.group(2)=="K" else "#fff"}"', frag)

def fit_text(text, max_w, size, weight_factor=.62):
    est = len(text) * size * weight_factor + max(0, len(text) - 1) * 2
    attr = f' textLength="{max_w}" lengthAdjust="spacingAndGlyphs"' if est > max_w else ''
    return attr

def emblem(slug, family, glyph_svg, name, code):
    shape, accent, dept = FAMILIES[family]
    fp = frame_path(shape)
    s = inner_scale(shape)
    name_u = html.escape(LABELS.get(name, name).upper())
    code_u = html.escape(code.upper())
    gs = {'diamond': 1.32, 'badge': 1.36, 'shield': 1.42, 'capsule': 1.5, 'hex': 1.45, 'octagon': 1.45, 'seal': 1.42}.get(shape, 1.5)
    cy = {'diamond': 228, 'badge': 240, 'shield': 216}.get(shape, 226)
    gx, gy = 256 - 100 * gs, cy - 100 * gs
    gt = f'translate({gx:.1f},{gy:.1f}) scale({gs})'
    main = colorize(glyph_svg, accent, 'main'); shadow = colorize(glyph_svg, accent, 'shadow'); mask = colorize(glyph_svg, accent, 'mask')
    plaque_y = {'diamond': 356, 'badge': 392, 'shield': 380}.get(shape, 398)
    plaque_w = 300 if shape not in ('diamond', 'badge', 'shield') else 260
    if shape == 'diamond': plaque_w = 236
    fs = 30 if len(name_u) <= 12 else 26 if len(name_u) <= 17 else 23
    ammo_ticks = ''
    if shape == 'ammo':
        for i in range(36):
            a = math.radians(i * 10)
            ammo_ticks += f'<rect x="-3" y="-218" width="6" height="16" rx="2" fill="{accent}" opacity=".55" transform="translate(256,256) rotate({i*10})"/>'
    cross_ticks = ''
    if shape == 'ring':
        for r in (0, 90, 180, 270):
            cross_ticks += f'<rect x="-4" y="-232" width="8" height="34" fill="{BONE_TOP}" transform="translate(256,256) rotate({r})"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<title>{html.escape(name)} — Cold Storage emblem</title>
<defs>
<radialGradient id="ink" cx="34%" cy="26%" r="85%"><stop offset="0" stop-color="#1d262c"/><stop offset=".55" stop-color="#0d1215"/><stop offset="1" stop-color="#050607"/></radialGradient>
<linearGradient id="bone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BONE_TOP}"/><stop offset="1" stop-color="{BONE_BOT}"/></linearGradient>
<linearGradient id="key" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<pattern id="blinds" width="512" height="38" patternUnits="userSpaceOnUse" patternTransform="rotate(-28 256 256)"><rect width="512" height="15" fill="#fff" opacity=".06"/></pattern>
<pattern id="shade" width="512" height="38" patternUnits="userSpaceOnUse" patternTransform="rotate(-28 256 256)"><rect y="15" width="512" height="23" fill="#000" opacity=".22"/></pattern>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="{sum(map(ord, slug)) % 97}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0"/></filter>
<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="frame"><path d="{fp}"/></clipPath>
<mask id="gm" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><g transform="{gt}">{mask}</g></mask>
</defs>
<path d="{fp}" fill="url(#ink)"/>
<g clip-path="url(#frame)">
<rect width="512" height="512" fill="url(#blinds)"/>
<rect width="512" height="512" fill="url(#key)"/>
<circle cx="256" cy="226" r="150" fill="{accent}" opacity=".07"/>
{ammo_ticks}
<g transform="translate(9,11)" opacity=".75"><g transform="{gt}">{shadow}</g></g>
<g transform="{gt}">{main}</g>
<rect width="512" height="512" fill="url(#shade)" mask="url(#gm)"/>
<rect width="512" height="512" filter="url(#grain)"/>
</g>
<path d="{fp}" fill="none" stroke="{BONE_TOP}" stroke-width="8"/>
<path d="{fp}" fill="none" stroke="{accent}" stroke-width="2.5" opacity=".85" transform="translate(256,256) scale({s}) translate(-256,-256)"/>
{cross_ticks}
<text x="256" y="{'84' if shape not in ('diamond','badge') else '108' if shape=='diamond' else '88'}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="17" font-weight="700" letter-spacing="3" fill="{accent}" opacity=".9">{code_u}</text>
<g transform="translate(256,{plaque_y})">
<rect x="{-plaque_w/2}" y="-24" width="{plaque_w}" height="52" fill="{INK}" stroke="{BONE_TOP}" stroke-width="3"/>
<rect x="{-plaque_w/2+6}" y="-18" width="{plaque_w-12}" height="40" fill="none" stroke="{accent}" stroke-width="1.2" opacity=".7"/>
<text x="0" y="{fs*0.36+1:.0f}" text-anchor="middle" font-family="Oswald,'Bebas Neue','Roboto Condensed','Arial Narrow',Impact,sans-serif" font-size="{fs}" font-weight="700" letter-spacing="2" fill="{BONE_TOP}"{fit_text(name_u, plaque_w-30, fs)}>{name_u}</text>
</g>
<text x="256" y="{plaque_y+52}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="13" letter-spacing="4" fill="{BONE_BOT}" opacity=".85">{html.escape(dept)}</text>
</svg>'''

# ----------------------------------------------------------------------------
SPECS = []  # (slug, family, glyph_svg, display name, code, keys)
def add(slug, family, glyph_svg, label, code, **keys): SPECS.append((slug, family, glyph_svg, label, code, keys))

# Core items (system item-catalog ids)
W = {
 'WPN001': g.baton(), 'WPN002': g.blade(), 'WPN003': g.knuckles(), 'WPN004': g.staff(), 'WPN005': g.sword(), 'WPN006': g.hammer(), 'WPN007': g.knuckles('force'),
 'WPN008': g.revolver(), 'WPN009': g.pistol(), 'WPN010': g.derringer(), 'WPN011': g.pistol(), 'WPN012': g.pistol('sunjet'), 'WPN013': g.revolver(), 'WPN014': g.smg(),
 'WPN015': g.rifle(), 'WPN016': g.rifle('frag'), 'WPN017': g.shotgun(), 'WPN018': g.energyrifle(), 'WPN019': g.energyrifle('rail'), 'WPN020': g.blaster(), 'WPN021': g.energyrifle('snipe'),
 'WPN022': g.flechette(), 'WPN023': g.smg(), 'WPN024': g.shard(), 'WPN025': g.grenade('termite'), 'WPN026': g.canister('stun'), 'WPN027': g.grenade('frag'), 'WPN028': g.canister('gas'),
 'WPN029': g.clip(), 'WPN030': g.throwing(),
 'AMM001': g.bullet('arrow'), 'AMM002': g.bullet('bolt'), 'AMM003': g.bullet('orb'), 'AMM004': g.bullet('skull'), 'AMM005': g.bullet('ring'), 'AMM006': g.bullet('chev', 'shell'),
 'AMM007': g.bullet('dot3', 'shell'), 'AMM008': g.bullet('bolt', 'shell'), 'AMM009': g.bullet('star', 'shell'), 'AMM010': g.bullet('orb', 'shell'), 'AMM011': g.bullet(None, 'shell'),
 'AMM012': g.bullet('wave', 'shell'), 'AMM013': g.bullet('hex', 'shell'),
 'APP001': g.belt(), 'APP002': g.clothes(), 'APP003': g.plate(), 'APP004': g.combatsuit(), 'APP005': g.helmet('ctac'), 'APP006': g.helmet('marine'), 'APP007': g.coat(), 'APP008': g.riot(),
 'EQP001': g.battery(), 'EQP002': g.battery('power'), 'EQP003': g.welder(), 'EQP004': g.chassis(), 'EQP005': g.chip(), 'EQP006': g.drone(), 'EQP007': g.harness(), 'EQP008': g.bug(), 'EQP009': g.toolkit(), 'EQP010': g.upgradekit(),
 'SW001': g.deck('full'), 'SW002': g.deck('port'), 'SW003': g.media(), 'SW004': g.virus(), 'SW005': g.brain(),
 'DRG001': g.merge(), 'DRG002': g.vial('skull'), 'DRG003': g.syringe(), 'DRG004': g.vial('cross'), 'DRG005': g.pill(), 'DRG006': g.vial('bolt'), 'DRG007': g.crystal(),
 'AUG001': g.eye(), 'AUG002': g.bone(), 'AUG003': g.cyberarm(), 'AUG004': g.plug(), 'AUG005': g.scales(), 'AUG006': g.claw(), 'AUG007': g.fang(), 'AUG008': g.mask(1),
 'AUG009': g.coil(), 'AUG010': g.nwire(), 'AUG011': g.eye('hud'), 'AUG012': g.mask(2), 'AUG013': g.mask(1), 'AUG014': g.mask(3), 'AUG015': g.plating(),
 'AUG016': g.molecule('star'), 'AUG017': g.molecule('flame'), 'AUG018': g.molecule('ring'), 'AUG019': g.heart(), 'AUG020': g.molecule('chev'), 'AUG021': g.molecule('bolt'), 'AUG022': g.molecule('arrow'),
}
S = os.environ.get('AC_SYSTEM_PATH')
catalog = json.load(open(os.path.join(S, 'data', 'item-catalog.json')))['items']
fam = {'weapon': 'weapon', 'ammunition': 'ammunition', 'armour': 'armour', 'equipment': 'equipment', 'software': 'software', 'drug': 'drug', 'augmentation': 'augmentation'}
for it in catalog:
    f = 'deck' if it.get('category') == 'Decks' else fam[it['type']]
    add(f"item-{it['id'].lower()}", f, W[it['id']], it['name'], f"{it['id'][:3]}·{it['id'][3:]}", catalogId=it['id'], name=it['name'], type=it['type'])

UPG = [('Composite Construction', g.layers()), ('Enhanced Power Cell', g.battery('power')), ('Extended Barrel', g.barrel()), ('Extended Magazine', g.magazine('ext')),
       ('Genemapped Security', g.fingerprint()), ('Mag-Plating', g.magnet()), ('Magazine', g.magazine()), ('Scope', g.scope()), ('Scope, Longshot', g.scope('long')),
       ('Scope, Sniper', g.scope('sniper')), ('Sight, Laser', g.laser()), ('Stock, Folding', g.stock())]
for i, (n, gl) in enumerate(UPG, 1):
    add('upgrade-' + re.sub('[^a-z0-9]+', '-', n.lower()).strip('-'), 'upgrade', gl, n, f'MOD·{i:03d}', name=n, type='equipment')

NET = [('NET-PROTECTORATE', g.building(), ['protectorate', 'bureaucracy', 'government', 'military', 'department']),
       ('NET-POLICE', g.policebadge(), ['police', 'precinct', 'bcpd', 'law enforcement']),
       ('NET-CTAC', g.wingedblade(), ['ctac', 'colonial tactical']),
       ('NET-CORPORATION', g.skyscraper(), ['corporation', 'corporate', 'company', 'house']),
       ('NET-SYNDICATE', g.rose(), ['criminal', 'syndicate', 'gang', 'cartel', 'yakuza', 'triad']),
       ('NET-UNION', g.chain(), ['union', 'guild', 'social', 'religious', 'community', 'entertainment', 'venue', 'agency']),
       ('NET-INDIVIDUAL', g.fedora(), ['individual', 'person', 'fixer', 'broker'])]
nc = {r['id']: r for r in json.load(open(os.path.join(S, 'data', 'network-catalog.json')))['records']}
for nid, gl, kw in NET:
    add('network-' + nid[4:].lower(), 'network', gl, nc[nid]['name'].split(' / ')[0], nid.replace('NET-', 'NET // '), catalogId=nid, name=nc[nid]['name'], keywords=kw)

ADV = {'ADV-DIPPER': g.opp_dipper(), 'ADV-HITMAN': g.opp_hitman(), 'ADV-THUG': g.opp_thug(), 'ADV-FREAK': g.opp_freak(), 'ADV-BCPD': g.opp_officer(),
       'ADV-CTAC': g.opp_praetorian(), 'ADV-STOOGE': g.opp_stooge(), 'ADV-METH': g.opp_meth()}
ac = {r['id']: r for r in json.load(open(os.path.join(S, 'data', 'adversary-catalog.json')))['records']}
for aid, gl in ADV.items():
    short = {'ADV-BCPD': 'BCPD Officer', 'ADV-CTAC': 'CTAC Praetorian'}.get(aid, ac[aid]['name'])
    add('opponent-' + aid[4:].lower(), 'opponent', gl, short, aid.replace('ADV-', 'FILE // '), adversaryId=aid, name=ac[aid]['name'])

# Cold Storage opponents and Benefactors
for sid, gl, n, code in (('ADV01', g.opp_dipper(), 'Recovery Dipper', 'PALIMPSEST // 01'), ('ADV02', g.opp_hitman(), 'Retrieval Hitman', 'PALIMPSEST // 02'),
                         ('ADV03', g.opp_officer(True), 'Compromised Officer', 'BCPD // 03'), ('ADV04', g.opp_praetorian(), 'Black-Recovery', 'PRAETORIAN // 04')):
    add('opponent-cs-' + sid.lower(), 'opponent', gl, n, code, sourceId=sid)
for sid, kind, n in (('GOD01', 'medic', 'Dr Adria Sen'), ('GOD02', 'judge', 'Magistrate Holt'), ('GOD03', 'director', 'Director Thale')):
    add('opponent-cs-' + sid.lower(), 'benefactor', g.benefactor(kind), n, 'BENEFACTOR // ' + sid[-1], sourceId=sid)

# Cold Storage authored attacks and records
CS_ITEMS = [('ADV01-weapon-0', g.derringer('virtual'), 'weapon', 'Virtual Derringer'), ('ADV01-weapon-1', g.virus(), 'software', 'Viral Strike'),
            ('ADV02-weapon-0', g.pistol(), 'weapon', 'Sidearm'), ('ADV02-weapon-1', g.blade(), 'weapon', 'Close Weapon'),
            ('ADV03-weapon-0', g.revolver(), 'weapon', 'BCPD Sidearm'), ('ADV03-weapon-1', g.baton('stun'), 'weapon', 'Stun Baton'),
            ('ADV04-weapon-0', g.energyrifle('rail'), 'weapon', 'Praetorian Railgun'), ('ADV04-weapon-1', g.pistol(), 'weapon', 'Praetorian Sidearm')]
for sid, gl, f, n in CS_ITEMS:
    add('cs-' + sid.lower(), f, gl, n, sid.split('-')[0] + ' // ATTACK', sourceId=sid)
add('cs-starting-package', 'special', g.briefcase(), 'Starting Package', 'CS // PACKAGE', sourceSuffix='-package')
add('cs-palimpsest-fragment', 'special', g.fragment(), 'Palimpsest Fragment', 'CS // ENCRYPTED', sourceSuffix='-fragment')
add('cs-credits', 'special', g.credits(), 'Credits', 'CS // CREDIT SET', type='creditSet')

index = {'version': 1, 'base': 'modules/cold-storage/assets/emblems/', 'byCatalogId': {}, 'byName': {}, 'byAdversaryId': {}, 'bySourceId': {}, 'bySourceSuffix': {}, 'byType': {}, 'networks': []}
for slug, family, gl, name, code, keys in SPECS:
    open(os.path.join(OUT, slug + '.svg'), 'w').write(emblem(slug, family, gl, name, code))
    file = slug + '.svg'
    if 'catalogId' in keys: index['byCatalogId'][keys['catalogId']] = file
    if 'name' in keys and family != 'network' and family != 'opponent': index['byName'][keys['name'].lower()] = file
    if 'adversaryId' in keys: index['byAdversaryId'][keys['adversaryId']] = file; index['byName'][keys['name'].lower()] = file
    if 'sourceId' in keys: index['bySourceId'][keys['sourceId']] = file
    if 'sourceSuffix' in keys: index['bySourceSuffix'][keys['sourceSuffix']] = file
    if family == 'network': index['networks'].append({'catalogId': keys['catalogId'], 'file': file, 'keywords': keys['keywords']})
    if keys.get('type') == 'creditSet': index['byType']['creditSet'] = file
json.dump(index, open(os.path.join(OUT, 'emblems.json'), 'w'), indent=1)
print(len(SPECS), 'emblems')
