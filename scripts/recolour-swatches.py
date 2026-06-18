#!/usr/bin/env python3
"""Recolour the colour-lexicon words in a pandoc-built .docx so each colour name
prints in its own colour instead of the template's teal accent.

Two cases in the Colour & iconography chapter:
  1. Swatch list — bold label starting with a colour name: "**Amber - cost.**"
     -> the whole bold run is recoloured.
  2. Caption list — colour word embedded in a bold run: "**Cost-to-date - amber,
     receipt**" -> the run is split and only the colour word is recoloured.

Scoped to the "- <colour>," caption shape and to leading colour-name labels, so
ordinary prose words (e.g. "rose", "blue") are never touched. Harmless elsewhere.

Run AFTER pandoc, before add_cover:
  python3 scripts/recolour-swatches.py <book.docx>
"""
import sys, re
from copy import deepcopy
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# Colour name -> Tailwind-600 hex. Title-case keys = swatch labels; the lowercase
# short forms used in captions are derived below (plus 'sky' -> Sky blue).
SWATCH = {
    'Sky blue': '0284C7', 'Amber': 'D97706', 'Emerald': '059669', 'Orange': 'EA580C',
    'Red': 'DC2626', 'Fuchsia': 'C026D3', 'Rose': 'E11D48', 'Indigo': '4F46E5',
    'Violet': '7C3AED', 'Cyan': '0891B2', 'Blue': '2563EB', 'Slate': '64748B',
}
SWATCH_NAMES = sorted(SWATCH, key=len, reverse=True)
WORD = {k.lower(): v for k, v in SWATCH.items()}
WORD['sky'] = '0284C7'  # caption short form for "Sky blue"
CAPTION_RE = re.compile(r'[—-] (' + '|'.join(sorted(WORD, key=len, reverse=True)) + r')(?=,)')


def set_colour(rPr, hexc):
    c = OxmlElement('w:color'); c.set(qn('w:val'), hexc); rPr.append(c)


def split_and_colour(run, start, length, hexc):
    """Replace `run` with up to three runs, colouring text[start:start+length]."""
    r = run._r
    rPr = r.find(qn('w:rPr'))
    txt = run.text
    pieces = [(txt[:start], None), (txt[start:start + length], hexc), (txt[start + length:], None)]
    parent = r.getparent(); idx = list(parent).index(r)
    made = 0
    for seg, colour in pieces:
        if not seg:
            continue
        nr = OxmlElement('w:r')
        nrPr = deepcopy(rPr) if rPr is not None else OxmlElement('w:rPr')
        nr.append(nrPr)
        if colour:
            set_colour(nrPr, colour)
        t = OxmlElement('w:t'); t.set(qn('xml:space'), 'preserve'); t.text = seg
        nr.append(t)
        parent.insert(idx + made, nr); made += 1
    parent.remove(r)


def main():
    path = sys.argv[1]
    doc = Document(path)
    swatches = captions = 0
    for p in doc.paragraphs:
        for run in list(p.runs):
            if not run.bold:
                continue
            t = (run.text or '').lstrip()
            # 1) swatch label: leading colour name
            hit = next((n for n in SWATCH_NAMES if t.startswith(n + ' —') or t.startswith(n + '—')), None)
            if hit:
                run.font.color.rgb = None  # clear, then set via rPr for reliability
                rPr = run._r.get_or_add_rPr()
                existing = rPr.find(qn('w:color'))
                if existing is not None:
                    rPr.remove(existing)
                set_colour(rPr, SWATCH[hit])
                swatches += 1
                continue
            # 2) caption: colour word embedded as "… — <colour>, …"
            m = CAPTION_RE.search(run.text or '')
            if m:
                split_and_colour(run, m.start(1), len(m.group(1)), WORD[m.group(1)])
                captions += 1
    doc.save(path)
    print(f"  swatch recolour: {swatches} labels, {captions} caption words")


if __name__ == '__main__':
    main()
