#!/usr/bin/env python3
"""Recolour the colour-lexicon swatch labels in a pandoc-built .docx so each
colour name prints in its own colour (Amber in amber, Red in red, …) instead of
the template's teal accent. Matches the "**<Colour> — meaning.**" bold labels in
the Colour & iconography chapter; harmless elsewhere.

Run AFTER pandoc (before/after the table fix; before add_cover):
  python3 scripts/recolour-swatches.py <book.docx>
"""
import sys
from docx import Document
from docx.shared import RGBColor

# Colour name -> Tailwind-600 hex (legible on white, matches the app's usage).
COLOURS = {
    'Sky blue': '0284C7',   # check before 'Blue'
    'Amber':    'D97706',
    'Emerald':  '059669',
    'Orange':   'EA580C',
    'Red':      'DC2626',
    'Fuchsia':  'C026D3',
    'Rose':     'E11D48',
    'Indigo':   '4F46E5',
    'Violet':   '7C3AED',
    'Cyan':     '0891B2',
    'Blue':     '2563EB',
    'Slate':    '64748B',
}
# Longest names first so 'Sky blue' wins over 'Blue'.
NAMES = sorted(COLOURS, key=len, reverse=True)


def recolour_run(run):
    t = (run.text or '').lstrip()
    for name in NAMES:
        if t.startswith(name + ' —') or t.startswith(name + '—'):
            run.font.color.rgb = RGBColor.from_string(COLOURS[name])
            return True
    return False


def main():
    path = sys.argv[1]
    doc = Document(path)
    n = 0
    for p in doc.paragraphs:
        for run in p.runs:
            if run.bold and recolour_run(run):
                n += 1
    doc.save(path)
    print(f"  swatch recolour: {n} colour labels recoloured")


if __name__ == '__main__':
    main()
