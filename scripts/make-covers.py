#!/usr/bin/env python3
"""Generate the AI PMO book cover images (vector -> PNG via cairosvg).
Covers are static (brand art), so this only needs running when the design
changes. Outputs docs/book/figures/cover-business.png and cover-technical.png."""
import cairosvg, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'book', 'figures')

def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

def cover(edition_label, sub1, sub2, bg_top, bg_bot):
    AMBER='#F59E0B'; WHITE='#FFFFFF'; T100='#CCFBF1'; T200='#99F6E4'; T300='#5EEAD4'
    # earned-value hero: portfolio bars + planned (dashed) and earned (amber) S-curves
    bars=''
    heights=[44,76,104,150,176,232,286,338]
    for i,h in enumerate(heights):
        x=196+i*60
        bars+=f'<rect x="{x}" y="{556-h}" width="34" height="{h}" rx="4" fill="{T300}" opacity="0.16"/>'
    planned='M 176 556 C 300 552 344 470 432 384 C 520 298 566 276 684 258'
    earned ='M 176 556 C 308 554 358 502 446 424 C 536 344 590 304 684 286'
    nodes=''
    for (nx,ny) in [(176,556),(330,512),(446,424),(566,318),(684,286)]:
        nodes+=f'<circle cx="{nx}" cy="{ny}" r="7" fill="{AMBER}"/><circle cx="{nx}" cy="{ny}" r="13" fill="none" stroke="{AMBER}" stroke-opacity="0.35" stroke-width="2"/>'
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1100" viewBox="0 0 850 1100" font-family="Segoe UI, DejaVu Sans, Arial, sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="{bg_top}"/><stop offset="1" stop-color="{bg_bot}"/>
    </linearGradient>
  </defs>
  <rect width="850" height="1100" fill="url(#bg)"/>
  <!-- ambient arcs -->
  <g stroke="{WHITE}" stroke-opacity="0.05" fill="none" stroke-width="2">
    <circle cx="800" cy="70" r="120"/><circle cx="800" cy="70" r="200"/><circle cx="800" cy="70" r="290"/>
    <circle cx="40" cy="1050" r="150"/><circle cx="40" cy="1050" r="240"/>
  </g>
  <!-- eyebrow -->
  <g text-anchor="middle">
    <text x="425" y="118" fill="{T200}" font-size="22" letter-spacing="7" font-weight="600">◆  AI PMO  ·  INTELLIGENCE LAYER</text>
  </g>
  <!-- hero chart -->
  <g>
    <line x1="176" y1="556" x2="700" y2="556" stroke="{WHITE}" stroke-opacity="0.18" stroke-width="2"/>
    {bars}
    <path d="{planned}" fill="none" stroke="{WHITE}" stroke-opacity="0.55" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
    <path d="{earned}" fill="none" stroke="{AMBER}" stroke-width="5" stroke-linecap="round"/>
    {nodes}
    <text x="700" y="250" fill="{AMBER}" font-size="20" font-weight="700" text-anchor="end">EV</text>
    <text x="176" y="588" fill="{T200}" font-size="16" opacity="0.7">SAP PS · P6 / MS Project · AI synthesis</text>
  </g>
  <!-- title block -->
  <g text-anchor="middle">
    <text x="425" y="760" fill="{WHITE}" font-size="150" font-weight="800" letter-spacing="2">AI PMO</text>
    <rect x="357" y="792" width="136" height="6" rx="3" fill="{AMBER}"/>
    <text x="425" y="866" fill="{AMBER}" font-size="46" font-weight="700" letter-spacing="2">{esc(edition_label)}</text>
    <text x="425" y="926" fill="{T100}" font-size="25">{esc(sub1)}</text>
    <text x="425" y="960" fill="{T100}" font-size="25">{esc(sub2)}</text>
  </g>
  <!-- footer -->
  <line x1="220" y1="1018" x2="630" y2="1018" stroke="{WHITE}" stroke-opacity="0.18" stroke-width="1.5"/>
  <text x="425" y="1052" fill="{T300}" font-size="20" text-anchor="middle" letter-spacing="1">An AI-assisted PMO intelligence layer  ·  2026</text>
</svg>'''
    return svg

specs=[
  ('cover-business.png','BUSINESS EDITION',
     'How It Works: Capabilities, Formulas,', 'and the Reasoning Behind Them',
     '#0B3B38','#0F766E'),
  ('cover-technical.png','TECHNICAL EDITION',
     'Inside the Build: Architecture, Data Model,', 'Agents, and Synthesis Libraries',
     '#0E2230','#134E4A'),
]
for fn,lab,s1,s2,bt,bb in specs:
    svg=cover(lab,s1,s2,bt,bb)
    out=os.path.join(OUT,fn)
    cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=out, output_width=1700, output_height=2200)
    print('wrote', out)
