"""Noir emblem glyph library. Every glyph draws in a 200x200 box.
'B' = bone ink (primary silhouette), 'A' = accent (neon highlight), 'K' = ink (cut-outs).
Glyph functions return SVG fragments using those placeholder colours."""
import math

def P(d, c='B', extra=''): return f'<path d="{d}" fill="{c}" {extra}/>'
def R(x, y, w, h, c='B', rx=0, extra=''): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{c}" {extra}/>'
def C(x, y, r, c='B', extra=''): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" {extra}/>'
def S(d, c='B', w=6, extra=''): return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def G(inner, t): return f'<g transform="{t}">{inner}</g>'
def poly(pts): return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + ' Z'
def star(cx, cy, n, r1, r2, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r1 if i % 2 == 0 else r2
        a = math.radians(rot + i * 180 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return poly(pts)
def ngon(cx, cy, n, r, rot=-90):
    return poly([(cx + r * math.cos(math.radians(rot + i * 360 / n)), cy + r * math.sin(math.radians(rot + i * 360 / n))) for i in range(n)])

# ---------- small sigils (accent marks used to differentiate variants) ----------
def sig_bolt(x, y, s=1): return G(P('M8 0 L-6 22 L4 22 L-4 44 L16 14 L6 14 L14 0 Z', 'A'), f'translate({x},{y}) scale({s})')
def sig_flame(x, y, s=1): return G(P('M10 0 C22 14 26 24 20 34 C16 42 4 42 0 34 C-4 26 2 18 6 14 C6 22 10 24 12 20 C14 14 12 8 10 0 Z', 'A'), f'translate({x},{y}) scale({s})')
def sig_skull(x, y, s=1): return G(P('M14 0 C26 0 30 8 30 16 C30 22 26 26 24 28 L24 34 L4 34 L4 28 C2 26 -2 22 -2 16 C-2 8 2 0 14 0 Z', 'A') + C(7, 15, 4, 'K') + C(21, 15, 4, 'K') + R(10, 28, 2, 6, 'K') + R(16, 28, 2, 6, 'K'), f'translate({x},{y}) scale({s})')
def sig_cross(x, y, s=1): return G(R(9, 0, 10, 28, 'A') + R(0, 9, 28, 10, 'A'), f'translate({x},{y}) scale({s})')
def sig_orb(x, y, s=1): return G(C(14, 14, 13, 'A') + C(10, 10, 4, 'K', 'opacity=".5"'), f'translate({x},{y}) scale({s})')
def sig_ring(x, y, s=1): return G(S('M14 1 A13 13 0 1 1 13.9 1', 'A', 5), f'translate({x},{y}) scale({s})')
def sig_dot3(x, y, s=1): return G(C(4, 4, 4, 'A') + C(16, 4, 4, 'A') + C(28, 4, 4, 'A'), f'translate({x},{y}) scale({s})')
def sig_arrow(x, y, s=1): return G(P('M14 0 L28 16 L19 16 L19 32 L9 32 L9 16 L0 16 Z', 'A'), f'translate({x},{y}) scale({s})')
def sig_star(x, y, s=1): return G(P(star(14, 14, 5, 14, 6), 'A'), f'translate({x},{y}) scale({s})')
def sig_chev(x, y, s=1): return G(S('M0 0 L14 12 L28 0 M0 12 L14 24 L28 12', 'A', 5), f'translate({x},{y}) scale({s})')
def sig_wave(x, y, s=1): return G(S('M0 10 C6 0 10 0 14 10 C18 20 22 20 28 10', 'A', 5), f'translate({x},{y}) scale({s})')
def sig_tungsten(x, y, s=1): return G(P(ngon(14, 14, 6, 14), 'A') + C(14, 14, 5, 'K'), f'translate({x},{y}) scale({s})')
SIGILS = dict(bolt=sig_bolt, flame=sig_flame, skull=sig_skull, cross=sig_cross, orb=sig_orb, ring=sig_ring, dot3=sig_dot3,
              arrow=sig_arrow, star=sig_star, chev=sig_chev, wave=sig_wave, hex=sig_tungsten)

# ---------- firearms ----------
def pistol(v=''):
    g = (P('M30 64 L162 64 L168 70 L168 90 L30 90 Z') + R(166, 72, 16, 10) +            # slide + muzzle
         P('M52 90 L92 90 L84 150 L48 150 L44 140 Z') +                                  # grip
         S('M92 92 C100 112 112 112 116 92', 'B', 6) + R(98, 92, 4, 12) +                 # trigger guard
         R(36, 70, 120, 3, 'K', extra='opacity=".45"') + R(60, 104, 20, 4, 'K', extra='opacity=".4"') + R(58, 116, 20, 4, 'K', extra='opacity=".4"'))
    if v == 'vector':  # boxy compact SMG pistol
        g += R(70, 90, 16, 44) + R(18, 70, 14, 10)
    if v == 'sunjet':
        g += C(178, 77, 7, 'A') + R(120, 66, 40, 4, 'A')
    return g
def revolver():
    return (R(78, 66, 100, 14, rx=3) + R(170, 62, 6, 6) + C(80, 82, 22) +
            P('M60 76 L70 96 L62 154 L30 154 L26 144 L40 96 Z') + S('M84 102 C88 120 104 118 106 100', 'B', 6) +
            R(52, 60, 12, 10) + R(64, 74, 32, 3, 'K', extra='opacity=".55"') + R(64, 84, 32, 3, 'K', extra='opacity=".55"') + R(64, 94, 32, 3, 'K', extra='opacity=".55"'))
def derringer(v=''):
    g = (R(70, 74, 70, 14, rx=3) + R(70, 90, 70, 12, rx=3) + R(138, 74, 6, 28) +
         P('M70 74 L86 74 L80 140 L52 140 L54 104 Z') + S('M86 104 C90 118 102 118 104 104', 'B', 5) + C(64, 72, 6))
    if v == 'virtual':
        g += S('M40 40 L160 40 M40 160 L160 160 M40 40 L40 160 M160 40 L160 160', 'A', 2, 'opacity=".8" stroke-dasharray="6 8"')
    return g
def smg():
    return (P('M24 70 L150 70 L156 76 L156 94 L24 94 Z') + R(154, 78, 26, 8) + R(96, 94, 16, 56, rx=2) +
            P('M44 94 L72 94 L66 140 L40 140 Z') + R(10, 74, 16, 14) + S('M72 96 C76 110 88 110 90 96', 'B', 5))
def rifle(v='ak'):
    g = (P('M8 84 L40 72 L52 72 L52 98 L40 98 L8 112 Z') + R(50, 72, 104, 22, rx=2) + R(152, 78, 40, 8) +
         P('M100 94 L120 94 C124 118 120 134 110 150 L96 146 C104 130 104 114 100 94 Z') + P('M62 94 L82 94 L76 130 L58 130 Z') +
         R(186, 70, 4, 10))
    if v == 'frag': g += R(150, 74, 30, 16, rx=4) + sig_flame(162, 38, .9)
    return g
def shotgun():
    return (P('M6 88 L44 74 L60 74 L60 98 L44 98 L6 114 Z') + R(58, 74, 136, 12, rx=2) + R(58, 88, 120, 8, rx=2) +
            R(110, 86, 44, 14, rx=4) + P('M70 98 L90 98 L84 128 L64 128 Z') + R(116, 87, 4, 12, 'K', extra='opacity=".4"') + R(128, 87, 4, 12, 'K', extra='opacity=".4"') + R(140, 87, 4, 12, 'K', extra='opacity=".4"'))
def energyrifle(v='beam'):
    g = (P('M8 86 L40 72 L56 72 L56 102 L40 102 L8 116 Z') + R(54, 70, 96, 30, rx=6) + R(148, 78, 36, 12, rx=3) +
         P('M74 100 L96 100 L90 136 L68 136 Z'))
    for i in range(4): g += R(100 + i * 12, 66, 6, 38, 'A', 2)
    g += C(188, 84, 8, 'A')
    if v == 'snipe': g += R(70, 50, 56, 12, rx=6) + C(70, 56, 8)
    if v == 'rail': g = (P('M8 86 L40 72 L56 72 L56 102 L40 102 L8 116 Z') + R(54, 74, 80, 24, rx=4) + R(130, 70, 66, 6) + R(130, 96, 66, 6) +
                         R(134, 82, 60, 8, 'A') + P('M76 98 L98 98 L92 134 L70 134 Z') + R(70, 56, 44, 10, rx=5))
    return g
def blaster():
    return (P('M40 62 L140 62 L152 74 L152 96 L40 96 Z') + R(150, 70, 14, 22, rx=4) + C(172, 81, 10, 'A') +
            P('M58 96 L96 96 L88 152 L52 152 Z') + S('M96 98 C102 114 116 114 118 98', 'B', 6) +
            R(70, 54, 6, 8) + R(84, 54, 6, 8) + R(98, 54, 6, 8) + R(48, 72, 90, 4, 'A', extra='opacity=".85"'))
def flechette():
    g = pistol()
    for i, dy in enumerate((-18, -6, 6, 18)):
        g += S(f'M188 {77+dy/3:.0f} L{196} {77+dy:.0f}', 'A', 3)
    return g
def shard():
    return (P('M40 64 L130 64 L140 74 L140 92 L40 92 Z') + P('M140 70 L176 58 L160 78 L182 82 L150 92 L140 92 Z', 'A') +
            P('M56 92 L92 92 L84 148 L50 148 Z') + S('M92 94 C98 110 110 110 112 94', 'B', 6))

# ---------- melee / thrown ----------
def baton(v=''):
    g = G(R(-8, -80, 16, 130, rx=6) + R(-11, 40, 22, 44, rx=5) + R(-14, 36, 28, 8, rx=3) +
          R(-11, 52, 22, 3, 'K', extra='opacity=".5"') + R(-11, 62, 22, 3, 'K', extra='opacity=".5"'), 'translate(100,100) rotate(40)')
    if v == 'stun': g += sig_bolt(122, 28, 1.1) + S('M138 48 L156 40 M144 62 L164 62', 'A', 4)
    return g
def blade():
    return G(P('M-10 -84 C8 -60 12 -20 10 20 L-10 20 Z') + R(-24, 20, 48, 9, rx=3) + R(-9, 29, 18, 50, rx=4) +
             R(-9, 42, 18, 3, 'K', extra='opacity=".5"') + R(-9, 54, 18, 3, 'K', extra='opacity=".5"') + C(0, 82, 7), 'translate(100,100) rotate(35)')
def sword():
    return G(P('M-6 -92 C4 -70 8 -30 8 30 L-8 30 C-8 -20 -10 -60 -6 -92 Z') + P('M-20 30 L20 30 L22 38 L-22 38 Z') +
             R(-7, 38, 14, 48, rx=3) + R(-7, 48, 14, 3, 'K', extra='opacity=".5"') + R(-7, 60, 14, 3, 'K', extra='opacity=".5"') + R(-7, 72, 14, 3, 'K', extra='opacity=".5"'), 'translate(100,100) rotate(40)')
def staff():
    return G(R(-7, -92, 14, 184, rx=7) + R(-9, -30, 18, 10, 'A', 3) + R(-9, 20, 18, 10, 'A', 3) + R(-9, -92, 18, 16, rx=4) + R(-9, 76, 18, 16, rx=4), 'translate(100,100) rotate(45)')
def knuckles(v=''):
    g = R(34, 104, 132, 34, rx=14)
    for i in range(4): g += C(52 + i * 32, 92, 19) + C(52 + i * 32, 92, 10, 'K')
    g += R(56, 112, 88, 4, 'K', extra='opacity=".45"')
    if v == 'force':
        g += S('M30 70 C40 50 30 40 44 30 M100 60 L100 30 M170 70 C160 50 170 40 156 30', 'A', 5)
    return g
def hammer():
    return G(R(-6, -40, 12, 130, rx=5) + R(-36, -80, 72, 44, rx=6) + R(-36, -64, 72, 8, 'A') + R(-8, 70, 16, 22, rx=4), 'translate(100,100) rotate(-35)')
def grenade(v=''):
    g = (P('M100 56 C134 56 150 84 150 112 C150 142 128 164 100 164 C72 164 50 142 50 112 C50 84 66 56 100 56 Z') +
         R(86, 40, 28, 18, rx=3) + S('M114 46 C132 34 150 40 150 60', 'B', 6) + C(150, 64, 7) +
         S('M54 96 L146 96 M50 122 L150 122 M54 146 L146 146 M86 58 L80 162 M114 58 L120 162', 'K', 4, 'opacity=".5"'))
    if v == 'termite': g += sig_flame(84, 92, 1.1)
    if v == 'frag': g += P(star(100, 112, 8, 22, 9), 'A')
    return g
def canister(v='stun'):
    g = R(64, 58, 72, 104, rx=10) + R(82, 42, 36, 18, rx=3) + S('M118 48 C136 36 150 44 148 62', 'B', 6) + R(64, 84, 72, 6, 'K', extra='opacity=".5"') + R(64, 132, 72, 6, 'K', extra='opacity=".5"')
    if v == 'stun': g += P(star(100, 111, 8, 30, 12), 'A')
    if v == 'gas': g += S('M38 160 C20 140 40 120 30 100 M162 160 C180 140 160 120 170 100', 'A', 6) + sig_wave(86, 104, 1)
    return g
def clip():
    g = R(30, 128, 140, 18, rx=4)
    for i in range(3): g += C(56 + i * 44, 98, 22) + R(48 + i * 44, 66, 16, 12, rx=2) + R(52 + i * 44, 112, 8, 18)
    g += C(100, 98, 9, 'A')
    return g
def throwing():
    g = ''
    for r in (0, 120, 240):
        g += G(P('M0 -78 L10 -20 L0 -8 L-10 -20 Z'), f'translate(100,104) rotate({r})')
    return g + C(100, 104, 14, 'A') + C(100, 104, 5, 'K')

# ---------- ammunition ----------
def bullet(sig=None, kind='round'):
    if kind == 'round':
        g = (P('M100 30 C116 46 120 64 120 80 L80 80 C80 64 84 46 100 30 Z') + R(78, 84, 44, 76, rx=3) + R(74, 160, 52, 10, rx=2) +
             R(78, 80, 44, 4, 'K', extra='opacity=".5"'))
        sx, sy = 86, 100
    else:  # shotgun shell
        g = R(72, 40, 56, 100, rx=6) + R(66, 140, 68, 26, rx=3) + S('M72 140 L128 140', 'K', 3, 'opacity=".5"') + R(76, 46, 48, 6, 'K', extra='opacity=".35"')
        sx, sy = 86, 74
    if sig: g += R(76, sy - 8, 48, 50, 'K', 4, 'opacity=".75"') + SIGILS[sig](sx - 2, sy - 2, 1.15)
    return g
def bullets_pair(sig):  # two cartridges
    return G(bullet(sig), 'translate(-26,0)') + G(bullet(None), 'translate(30,8) scale(.92)')

# ---------- apparel / armour ----------
def belt():
    return R(14, 86, 172, 28, rx=4) + R(76, 72, 48, 56, rx=6) + R(88, 84, 24, 32, rx=3, c='K') + R(98, 92, 26, 6) + C(40, 100, 4, 'K') + C(160, 100, 4, 'K')
def clothes():  # suit jacket and tie
    return (P('M40 50 L80 36 L100 70 L120 36 L160 50 L176 168 L24 168 Z') + P('M80 36 L100 100 L120 36 L110 36 L100 60 L90 36 Z', 'K', 'opacity=".55"') +
            P('M95 64 L105 64 L110 120 L100 136 L90 120 Z', 'A') + S('M100 140 L100 168', 'K', 3, 'opacity=".5"'))
def coat():  # trench / flak coat
    return (P('M50 40 L84 30 L100 58 L116 30 L150 40 L166 176 L112 176 L100 120 L88 176 L34 176 Z') + P('M84 30 L70 70 L92 92 L100 58 Z M116 30 L130 70 L108 92 L100 58 Z', 'K', 'opacity=".5"') +
            R(56, 108, 88, 10, 'A', 2) + C(110, 136, 4, 'K') + C(110, 154, 4, 'K'))
def plate():
    return (P('M50 44 L80 36 C88 48 112 48 120 36 L150 44 L158 120 C150 150 128 166 100 172 C72 166 50 150 42 120 Z') +
            S('M70 80 C90 92 110 92 130 80 M70 110 C90 122 110 122 130 110', 'K', 5, 'opacity=".5"') + P(ngon(100, 140, 6, 10), 'A'))
def combatsuit():
    return (C(100, 40, 20) + P('M64 64 L136 64 L150 120 L134 122 L128 96 L126 176 L106 176 L100 120 L94 176 L74 176 L72 96 L66 122 L50 120 Z') +
            R(80, 78, 40, 6, 'A') + R(84, 36, 32, 8, 'K', extra='opacity=".6"'))
def helmet(v='ctac'):
    g = P('M40 120 C40 64 66 36 100 36 C134 36 160 64 160 120 L160 150 L120 150 L116 128 L84 128 L80 150 L40 150 Z')
    if v == 'ctac': g += P('M56 88 L144 88 L140 112 L60 112 Z', 'A') + R(96, 40, 8, 40, 'K', extra='opacity=".4"')
    if v == 'marine': g += P('M60 84 L140 84 L132 118 L68 118 Z', 'K', 'opacity=".75"') + R(66, 92, 68, 6, 'A') + R(22, 96, 20, 28, rx=4) + R(158, 96, 20, 28, rx=4)
    return g
def riot():
    return (P('M44 34 L156 34 L156 120 C156 150 130 170 100 178 C70 170 44 150 44 120 Z') + R(44, 64, 112, 18, 'A') +
            R(58, 98, 84, 4, 'K', extra='opacity=".5"') + R(58, 112, 84, 4, 'K', extra='opacity=".5"') + R(90, 40, 20, 18, 'K', extra='opacity=".5"'))

# ---------- devices ----------
def battery(v=''):
    g = R(56, 44, 88, 132, rx=10) + R(84, 30, 32, 16, rx=3) + R(68, 120, 64, 44, 'A', 4)
    if v == 'power': g += sig_bolt(86, 60, 1.2)
    else: g += R(94, 70, 12, 32, 'K') + R(84, 80, 32, 12, 'K')
    return g
def welder():
    return G(R(-12, -10, 24, 96, rx=6) + R(-8, -40, 16, 32, rx=3) + R(-3, -60, 6, 22), 'translate(100,100) rotate(30)') + sig_flame(104, 22, 1.4) + C(70, 150, 6, 'K')
def chassis():
    return R(40, 40, 120, 120, rx=12) + R(62, 62, 76, 76, 'K', 6, 'opacity=".6"') + C(56, 56, 7, 'A') + C(144, 56, 7, 'A') + C(56, 144, 7, 'A') + C(144, 144, 7, 'A') + P(ngon(100, 100, 6, 24))
def chip():
    g = R(56, 56, 88, 88, rx=8) + R(76, 76, 48, 48, 'A', 4)
    for i in range(5):
        x = 66 + i * 17
        g += R(x - 3, 36, 6, 20) + R(x - 3, 144, 6, 20) + R(36, x - 3, 20, 6) + R(144, x - 3, 20, 6)
    return g
def drone():
    g = R(76, 88, 48, 26, rx=10) + C(100, 116, 10, 'A') + S('M80 92 L44 60 M120 92 L156 60 M80 110 L44 140 M120 110 L156 140', 'B', 7)
    for x, y in ((44, 56), (156, 56), (44, 144), (156, 144)): g += P(f'M{x-30} {y} L{x+30} {y} L{x+30} {y+6} L{x-30} {y+6} Z') + C(x, y + 3, 5)
    return g
def harness():
    return (S('M66 40 L80 160 M134 40 L120 160 M66 40 L134 40 M74 100 L126 100', 'B', 12) + R(88, 86, 24, 28, rx=4) + sig_arrow(86, 14, 1) +
            R(70, 156, 60, 14, rx=4))
def bug():
    return (P('M100 60 C124 60 136 82 136 110 C136 140 120 160 100 160 C80 160 64 140 64 110 C64 82 76 60 100 60 Z') + S('M100 60 L100 160', 'K', 3, 'opacity=".6"') +
            S('M66 90 L40 76 M64 112 L36 112 M66 134 L40 150 M134 90 L160 76 M136 112 L164 112 M134 134 L160 150 M90 62 L78 40 M110 62 L122 40', 'B', 5) +
            S('M140 30 A26 26 0 0 1 166 56 M150 18 A40 40 0 0 1 180 48', 'A', 5))
def toolkit():
    return (G(P('M-8 -60 L8 -60 L8 50 L-8 50 Z') + P('M-22 -86 C-22 -66 -14 -58 0 -58 C14 -58 22 -66 22 -86 L10 -86 L10 -72 L-10 -72 L-10 -86 Z'), 'translate(100,104) rotate(45)') +
            G(R(-6, -70, 12, 80, rx=3) + R(-12, 10, 24, 50, 'A', 6), 'translate(100,104) rotate(-45)'))
def upgradekit():
    g = P(star(90, 106, 10, 54, 42, rot=0)) + C(90, 106, 20, 'K')
    return g + C(150, 52, 24, 'A') + R(146, 38, 8, 28, 'K') + R(136, 48, 28, 8, 'K')
def deck(v='full'):
    if v == 'full':
        return (R(40, 40, 120, 76, rx=6) + R(52, 52, 96, 52, 'K', 3, 'opacity=".7"') + S('M60 70 L80 70 M60 82 L104 82 M60 94 L92 94', 'A', 4) +
                P('M30 128 L170 128 L182 164 L18 164 Z') + S('M40 140 L160 140 M36 152 L164 152', 'K', 3, 'opacity=".55"'))
    return (R(58, 30, 84, 140, rx=12) + R(70, 46, 60, 64, 'K', 4, 'opacity=".7"') + S('M78 62 L110 62 M78 76 L120 76 M78 90 L100 90', 'A', 4) +
            C(84, 134, 7) + C(116, 134, 7) + C(100, 150, 7) + R(84, 40, 32, 3, 'K', extra='opacity=".6"'))
def media():
    return C(100, 100, 66) + C(100, 100, 18, 'K') + C(100, 100, 8) + S('M100 46 A54 54 0 0 1 152 92', 'A', 6) + S('M58 120 A44 44 0 0 0 86 144', 'K', 4, 'opacity=".5"')
def virus():
    g = C(100, 100, 40)
    for i in range(10):
        a = math.radians(i * 36)
        x, y = 100 + 52 * math.cos(a), 100 + 52 * math.sin(a)
        g += S(f'M{100+38*math.cos(a):.1f} {100+38*math.sin(a):.1f} L{x:.1f} {y:.1f}', 'B', 6) + C(x, y, 8, 'A')
    return g + C(88, 92, 8, 'K') + C(112, 110, 6, 'K') + C(104, 82, 4, 'K')
def brain():
    return (P('M100 50 C70 40 44 56 46 84 C30 92 30 122 48 132 C50 152 74 164 96 156 L100 150 L104 156 C126 164 150 152 152 132 C170 122 170 92 154 84 C156 56 130 40 100 50 Z') +
            S('M100 54 L100 150 M66 74 C80 80 80 94 70 102 M64 120 C78 118 86 128 84 140 M134 74 C120 80 120 94 130 102 M136 120 C122 118 114 128 116 140', 'K', 4, 'opacity=".55"') +
            G(R(-4, -52, 8, 64, 'A', 2) + P('M-4 -52 L4 -52 L0 -70 Z', 'A'), 'translate(158,150) rotate(-40)'))

# ---------- drugs ----------
def vial(sig=None):
    g = R(76, 30, 48, 18, rx=4) + R(72, 48, 56, 122, rx=14) + R(80, 100, 40, 62, 'A', 10) + R(84, 58, 10, 36, 'K', 4, 'opacity=".35"')
    if sig: g += SIGILS[sig](86, 106, 1)
    return g
def syringe():
    return G(R(-14, -60, 28, 100, rx=4) + R(-10, -20, 20, 56, 'A', 2) + R(-24, 40, 48, 8, rx=3) + R(-4, 48, 8, 30) + R(-20, 78, 40, 8, rx=3) +
             R(-2, -94, 4, 36) + S('M-14 -40 L-4 -40 M-14 -20 L-4 -20 M-14 0 L-4 0', 'K', 3), 'translate(100,100) rotate(40)')
def pill():
    return G(R(-30, -66, 60, 132, rx=30) + P('M-30 0 L30 0 L30 36 C30 52 16 66 0 66 C-16 66 -30 52 -30 36 Z', 'A'), 'translate(100,100) rotate(40)') + C(56, 150, 12) + C(150, 56, 9)
def crystal():
    return (P('M100 26 L124 70 L112 170 L88 170 L76 70 Z') + P('M100 26 L112 170 L100 170 Z', 'K', 'opacity=".35"') +
            P('M60 80 L78 104 L70 170 L52 170 L46 104 Z', 'A') + P('M140 70 L156 100 L150 170 L132 170 L128 98 Z'))
def merge():
    return S('M80 70 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0', 'B', 14) + S('M120 130 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0', 'A', 14)

# ---------- augmentations ----------
def eye(v=''):
    g = P('M20 100 C50 56 150 56 180 100 C150 144 50 144 20 100 Z') + C(100, 100, 32, 'K') + C(100, 100, 22, 'A') + C(100, 100, 9, 'K')
    if v == 'hud': g += S('M100 40 L100 60 M100 140 L100 160 M40 100 L60 100 M140 100 L160 100', 'A', 5)
    return g
def bone():
    return G(R(-10, -60, 20, 120, rx=4) + C(-14, -64, 16) + C(14, -64, 16) + C(-14, 64, 16) + C(14, 64, 16) +
             S('M-10 -30 L10 -30 M-10 0 L10 0 M-10 30 L10 30', 'A', 4), 'translate(100,100) rotate(45)')
def cyberarm():
    return (P('M40 160 L60 100 L90 92 L104 120 L80 168 Z') + P('M90 92 L124 54 L146 64 L120 106 Z') + C(98, 104, 12, 'A') +
            P('M124 54 L132 30 L142 34 L136 56 Z M136 56 L156 36 L162 44 L146 62 Z M146 64 L170 54 L172 64 L150 72 Z') + C(66, 128, 5, 'K') + C(128, 76, 4, 'K'))
def plug():
    return (R(70, 70, 60, 66, rx=8) + R(80, 40, 10, 32) + R(110, 40, 10, 32) + R(90, 136, 20, 20) +
            S('M100 156 C100 180 140 180 150 160', 'A', 8) + R(80, 92, 40, 6, 'K', extra='opacity=".5"'))
def scales():
    g = ''
    for row in range(4):
        for col in range(4 - row % 2):
            x, y = 52 + col * 32 + (16 if row % 2 else 0), 56 + row * 28
            g += P(f'M{x-16} {y} A16 16 0 0 0 {x+16} {y} L{x+16} {y-6} L{x-16} {y-6} Z', 'A' if (row * 4 + col) % 7 == 3 else 'B')
    return g
def claw():
    g = ''
    for i, (dx, rot) in enumerate(((-40, -20), (0, 0), (40, 20))):
        g += G(P('M-10 50 C-14 10 -8 -30 14 -60 C4 -24 8 10 10 50 Z', 'A' if i == 1 else 'B'), f'translate({100+dx},100) rotate({rot})')
    return g
def fang():
    return (P('M30 60 C70 40 130 40 170 60 L160 80 L40 80 Z') + P('M56 80 L72 150 L88 80 Z M112 80 L128 150 L144 80 Z', 'A') +
            P('M92 80 L100 106 L108 80 Z'))
def mask(n=1):
    g = ''
    for i in range(n):
        off = (i - (n - 1) / 2) * 26
        c = 'B'
        g += G(P('M0 -70 C40 -70 54 -40 54 -4 C54 40 30 70 0 70 C-30 70 -54 40 -54 -4 C-54 -40 -40 -70 0 -70 Z', c, 'opacity=".95"') +
               P('M-34 -10 C-26 -18 -14 -18 -8 -10 C-14 -4 -26 -4 -34 -10 Z M34 -10 C26 -18 14 -18 8 -10 C14 -4 26 -4 34 -10 Z', 'A' if i == n - 1 else 'K') + P('M0 -70 C40 -70 54 -40 54 -4 C54 40 30 70 0 70 Z', 'K', 'opacity=".35"') +
               S('M-16 34 C-6 40 6 40 16 34', 'K', 4), f'translate({100+off},100)')
    return g
def coil():
    return S('M100 30 C150 30 150 60 100 60 C50 60 50 90 100 90 C150 90 150 120 100 120 C50 120 50 150 100 150 C150 150 150 170 100 172', 'B', 12) + C(100, 30, 10, 'A') + C(100, 172, 10, 'A')
def nwire():
    return S('M30 160 C70 120 40 80 80 60 C120 40 120 100 170 40', 'B', 6) + S('M30 160 C70 120 40 80 80 60 C120 40 120 100 170 40', 'A', 2) + P('M160 30 L184 26 L176 50 Z') + C(30, 160, 10)
def plating():
    g = ''
    for x, y in ((70, 66), (130, 66), (40, 118), (100, 118), (160, 118), (70, 170), (130, 170)):
        g += P(ngon(x, y - 14, 6, 30, rot=-90))
    return g + P(ngon(100, 104, 6, 18), 'A')
def molecule(sig=None):
    g = S('M100 54 L140 77 L140 123 L100 146 L60 123 L60 77 Z', 'B', 10) + S('M140 77 L172 58 M60 123 L28 142 M100 146 L100 180', 'B', 8)
    g += C(172, 58, 12, 'A') + C(28, 142, 12) + C(100, 180, 0)
    if sig: g += SIGILS[sig](86, 86, 1)
    return g
def heart():
    return (P('M100 168 C40 124 24 92 34 66 C44 40 82 36 100 66 C118 36 156 40 166 66 C176 92 160 124 100 168 Z') +
            S('M30 104 L74 104 L86 80 L102 132 L116 96 L124 104 L170 104', 'A', 6))

# ---------- weapon upgrades ----------
def layers():
    return P('M100 40 L176 76 L100 112 L24 76 Z') + P('M24 100 L100 136 L176 100 L176 112 L100 148 L24 112 Z', 'A') + P('M24 124 L100 160 L176 124 L176 136 L100 172 L24 136 Z')
def barrel():
    return R(20, 86, 160, 28, rx=4) + R(176, 80, 10, 40, rx=2) + R(20, 92, 160, 6, 'K', extra='opacity=".45"') + sig_arrow(150, 30, 1) + R(30, 70, 18, 60, rx=3)
def magazine(v=''):
    h = 120 if v == 'ext' else 76
    g = P(f'M76 40 L124 40 L124 {40+h} C124 {50+h} 116 {56+h} 106 {56+h} L94 {56+h} C84 {56+h} 76 {50+h} 76 {40+h} Z')
    for i in range(3 if not v else 5): g += R(84, 54 + i * 22, 32, 8, 'A' if i == 0 else 'K', 3, '' if i == 0 else 'opacity=".45"')
    return g
def fingerprint():
    g = ''
    for r in (16, 30, 44, 58):
        g += S(f'M{100-r} 110 A{r} {r*1.2:.0f} 0 0 1 {100+r} 110', 'B' if r != 30 else 'A', 7)
    return g + S('M100 110 L100 170 M70 120 L70 160 M130 120 L130 162', 'B', 7)
def magnet():
    return S('M60 50 L60 110 A40 40 0 0 0 140 110 L140 50', 'B', 30) + R(45, 36, 30, 22, 'A') + R(125, 36, 30, 22, 'A') + S('M40 170 L60 150 M100 176 L100 150 M160 170 L140 150', 'A', 5)
def scope(v=''):
    g = R(34, 80, 132, 32, rx=12) + R(20, 72, 30, 48, rx=8) + R(150, 72, 30, 48, rx=8) + R(80, 112, 14, 16) + R(108, 112, 14, 16) + C(35, 96, 12, 'A')
    if v == 'long': g = G(g, 'translate(100,96) scale(1.1,0.9) translate(-100,-96)') + R(20, 140, 160, 6, 'A', 3)
    if v == 'sniper': g += S('M100 22 L100 60 M100 132 L100 176 M140 44 L160 44', 'A', 0) + C(166, 150, 22, 'K') + S('M166 124 L166 176 M140 150 L192 150', 'A', 4) + S('M166 150 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', 'A', 4)
    return g
def laser():
    return G(R(-46, -16, 70, 32, rx=6) + R(20, -10, 16, 20, rx=3) + C(-30, 0, 6, 'K'), 'translate(70,120)') + S('M108 120 L190 70', 'A', 5) + C(190, 70, 8, 'A')
def stock():
    return P('M24 96 L84 60 L104 60 L104 82 L60 108 L60 140 L40 150 Z') + R(100, 64, 80, 16, rx=4) + C(100, 72, 8, 'A') + S('M120 120 A30 30 0 0 0 150 90', 'A', 5) + P('M150 82 L162 94 L144 100 Z', 'A')

# ---------- networks ----------
def building():
    g = P('M30 70 L100 34 L170 70 Z') + R(30, 72, 140, 10) + R(30, 158, 140, 12) + R(24, 170, 152, 10)
    for i in range(5): g += R(42 + i * 26, 88, 14, 66)
    return g + C(100, 56, 8, 'A')
def policebadge():
    return P(star(100, 104, 7, 76, 50)) + C(100, 104, 34, 'K') + P(star(100, 104, 5, 24, 10), 'A')
def wingedblade():
    g = G(P('M0 -86 L10 -40 L10 50 L0 66 L-10 50 L-10 -40 Z') + R(-26, 40, 52, 8), 'translate(100,100)')
    for side in (-1, 1):
        for i in range(4):
            g += G(P(f'M0 0 L{side*70} {-30+i*14} L{side*66} {-20+i*14} Z', 'A' if i == 0 else 'B'), 'translate(100,100)')
    return g
def skyscraper():
    g = R(76, 30, 48, 146) + R(40, 80, 34, 96) + R(126, 64, 34, 112) + P('M76 30 L100 10 L124 30 Z', 'A')
    for y in range(44, 170, 16): g += R(84, y, 32, 6, 'K', extra='opacity=".5"')
    for y in range(90, 170, 16): g += R(46, y, 22, 5, 'K', extra='opacity=".5"') + R(132, y - 8, 22, 5, 'K', extra='opacity=".5"')
    return g
def rose():
    return (C(100, 66, 30, 'A') + S('M86 56 C96 46 114 54 110 68 C106 80 88 78 90 66 C92 58 104 60 102 68', 'K', 4) +
            S('M100 96 C96 130 104 150 98 184', 'B', 8) + P('M100 132 C120 116 146 118 156 128 C140 140 116 142 100 132 Z') + P('M98 150 C80 140 56 144 48 154 C64 164 86 162 98 150 Z') +
            P('M100 112 L112 108 L104 118 Z M96 166 L84 162 L94 172 Z'))
def chain():
    g = ''
    for i, x in enumerate((50, 100, 150)):
        g += S(f'M{x-26} 100 m0 0 a26 18 0 1 0 52 0 a26 18 0 1 0 -52 0', 'A' if i == 1 else 'B', 12)
    return g
def fedora():
    return (P('M40 118 C40 106 64 100 100 100 C136 100 160 106 160 118 C160 128 136 132 100 132 C64 132 40 128 40 118 Z') +
            P('M64 104 C62 72 74 50 100 50 C126 50 138 72 136 104 Z') + P('M64 92 L136 92 L136 104 L64 104 Z', 'A') + P('M88 50 C96 62 104 62 112 50 Z', 'K', 'opacity=".5"') +
            P('M58 140 C70 168 130 168 142 140 Z', 'K', 'opacity=".0"'))

# ---------- people (opponent busts) ----------
def bust(head='', extra=''):
    base = P('M30 196 C30 150 58 132 100 132 C142 132 170 150 170 196 Z') + R(86, 112, 28, 26) + P('M100 40 C126 40 138 60 138 84 C138 110 122 126 100 126 C78 126 62 110 62 84 C62 60 74 40 100 40 Z')
    halfshade = P('M100 40 C126 40 138 60 138 84 C138 110 122 126 100 126 Z', 'K', 'opacity=".55"')
    return base + halfshade + head + extra
def opp_dipper(): return bust(P('M50 196 C46 120 56 40 100 30 C144 40 154 120 150 196 L134 196 C138 130 130 60 100 56 C70 60 62 130 66 196 Z', 'B') + P('M78 84 L122 84 L118 98 L82 98 Z', 'A') + S('M140 140 C170 150 176 176 186 196', 'A', 5) + C(140, 140, 6, 'A'))
def opp_hitman(): return bust(P('M64 76 L136 76 L132 100 L68 100 Z', 'K', 'opacity=".7"') + P('M36 64 C36 54 60 48 100 48 C140 48 164 54 164 64 C164 72 140 76 100 76 C60 76 36 72 36 64 Z') + P('M64 56 C62 28 76 14 100 14 C124 14 138 28 136 56 Z') + R(64, 46, 72, 10, 'A') +
                              P('M70 132 L100 170 L130 132 L150 140 L100 196 L50 140 Z', 'K', 'opacity=".55"') + P('M74 92 L126 92 L126 98 L74 98 Z', 'K', 'opacity=".7"'))
def opp_thug(): return bust(S('M84 62 L96 78', 'K', 4) + P('M80 96 L120 96 L116 102 L84 102 Z', 'K', 'opacity=".6"'), P('M14 196 C14 140 50 128 100 128 C150 128 186 140 186 196 Z') + knuckles_small())
def knuckles_small(): return G(R(0, 18, 64, 18, 'A', 7) + C(8, 12, 9, 'A') + C(24, 12, 9, 'A') + C(40, 12, 9, 'A') + C(56, 12, 9, 'A'), 'translate(118,160) scale(.9)')
def opp_freak(): return bust(P('M64 64 C44 50 40 26 50 10 C56 30 68 42 78 48 Z M136 64 C156 50 160 26 150 10 C144 30 132 42 122 48 Z', 'A') + P('M84 104 L90 118 L96 104 Z M104 104 L110 118 L116 104 Z', 'K') + P('M76 80 L94 86 L76 90 Z M124 80 L106 86 L124 90 Z', 'A'))
def opp_officer(crack=False):
    h = (P('M56 66 C56 38 76 26 100 26 C124 26 144 38 144 66 Z') + R(52, 62, 96, 12, rx=3) + P('M60 74 L140 74 C134 84 66 84 60 74 Z', 'K', 'opacity=".6"') + P(star(100, 46, 6, 12, 6), 'A') +
         P(star(130, 164, 6, 14, 8), 'A'))
    if crack: h += S('M92 30 L100 44 L94 54 L104 64', 'K', 4)
    return bust(h)
def opp_praetorian(): return (P('M100 24 C128 24 148 52 148 100 L148 128 L100 128 Z', 'K', 'opacity=".45"') + P('M30 196 C30 146 58 128 100 128 C142 128 170 146 170 196 Z') + R(40, 140, 30, 50, rx=6) + R(130, 140, 30, 50, rx=6) +
                              P('M52 100 C52 52 72 24 100 24 C128 24 148 52 148 100 L148 128 L52 128 Z') + P('M62 72 L138 72 L134 98 L66 98 Z', 'A') + R(96, 26, 8, 44, 'K', extra='opacity=".4"'))
def opp_stooge(): return bust(P('M62 76 C60 44 80 32 104 34 C126 36 140 50 138 74 C128 60 110 54 90 58 C76 60 68 66 62 76 Z'),
                              P('M70 132 L100 160 L130 132 Z', 'K', 'opacity=".5"') + P('M94 140 L106 140 L110 186 L100 196 L90 186 Z', 'A'))
def opp_meth(): return bust(P('M60 48 L72 22 L86 40 L100 14 L114 40 L128 22 L140 48 Z', 'A'),
                            P('M40 196 L52 130 L74 120 L100 160 L126 120 L148 130 L160 196 Z', 'K', 'opacity=".5"') + P('M64 120 L60 96 L74 112 Z M136 120 L140 96 L126 112 Z'))
def benefactor(kind):
    m = (P('M100 30 C136 30 152 60 152 96 C152 140 128 168 100 168 C72 168 48 140 48 96 C48 60 64 30 100 30 Z') +
         P('M66 86 C74 78 86 78 92 86 C86 92 74 92 66 86 Z M134 86 C126 78 114 78 108 86 C114 92 126 92 134 86 Z', 'K') + S('M88 136 L112 136', 'K', 3, 'opacity=".6"'))
    if kind == 'medic': m += sig_cross(86, 40, 1) + S('M100 168 L100 196', 'A', 6)
    if kind == 'judge': m += S('M60 192 L140 192 M100 168 L100 192 M60 176 L140 176', 'A', 5) + S('M60 176 L50 190 L70 190 Z M140 176 L130 190 L150 190 Z', 'A', 3)
    if kind == 'director': m += C(100, 52, 12, 'A') + R(97, 60, 6, 22, 'A') + R(103, 72, 8, 4, 'A')
    return m

# ---------- Cold Storage specials ----------
def briefcase():
    return R(28, 66, 144, 104, rx=10) + S('M78 66 L78 46 L122 46 L122 66', 'B', 10) + R(28, 104, 144, 8, 'K', extra='opacity=".5"') + R(88, 98, 24, 22, 'A', 4)
def fragment():
    return (P('M100 30 L150 50 L170 100 L120 96 Z') + P('M114 104 L168 110 L150 154 L100 170 Z', 'A') + P('M30 100 L50 50 L94 32 L110 98 L94 168 L50 150 Z') +
            C(84, 100, 12, 'K') + R(80, 100, 8, 30, 'K'))
def credits():
    g = ''
    for i in range(4): g += P(f'M50 {150-i*22} C50 {140-i*22} 150 {140-i*22} 150 {150-i*22} L150 {160-i*22} C150 {170-i*22} 50 {170-i*22} 50 {160-i*22} Z', 'A' if i == 3 else 'B')
    return g + S('M150 40 L176 40 L176 70', 'A', 4)
def stack():
    return R(70, 40, 60, 120, rx=14) + R(80, 56, 40, 10, 'A', 3) + R(80, 74, 40, 4, 'K', extra='opacity=".5"') + R(80, 86, 40, 4, 'K', extra='opacity=".5"') + R(88, 160, 24, 20, rx=3)

GLYPHS = {k: v for k, v in globals().items() if callable(v) and not k.startswith('sig_') and k not in ('P', 'R', 'C', 'S', 'G', 'poly', 'star', 'ngon', 'bust', 'knuckles_small')}
