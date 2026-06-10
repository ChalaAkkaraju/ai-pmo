#!/usr/bin/env python3
"""Prepend a full-page cover image as page 1 of a pandoc-built .docx.
Uses only the Python standard library (zipfile) — no extra deps.
  python3 scripts/add_cover.py <book.docx> <cover.png>
Run AFTER pandoc. Safe to re-run (replaces any prior cover)."""
import sys, os, zipfile, shutil, struct

def png_size(path):
    with open(path,'rb') as f:
        head=f.read(26)
    if head[:8]!=b'\x89PNG\r\n\x1a\n': raise ValueError('not a PNG')
    w,h=struct.unpack('>II', head[16:24]); return w,h

def main():
    docx, png = sys.argv[1], sys.argv[2]
    if not os.path.exists(png):
        print('  cover skipped — image not found:', png); return
    w,h = png_size(png)
    EMU_W = 5943600                      # 6.5in content width
    EMU_H = round(EMU_W * h / w)
    RID='rIdCover9'

    zin=zipfile.ZipFile(docx,'r')
    names=zin.namelist()
    parts={n:zin.read(n) for n in names}
    zin.close()

    # already has a cover? strip the old media + we just overwrite parts below
    # 1) media
    parts['word/media/cover.png']=open(png,'rb').read()

    # 2) content types — ensure png default
    ct=parts['[Content_Types].xml'].decode('utf-8')
    if 'Extension="png"' not in ct:
        ct=ct.replace('</Types>','<Default Extension="png" ContentType="image/png" /></Types>')
        parts['[Content_Types].xml']=ct.encode('utf-8')

    # 3) relationship
    rl=parts['word/_rels/document.xml.rels'].decode('utf-8')
    if RID not in rl:
        rl=rl.replace('</Relationships>',
          f'<Relationship Id="{RID}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/cover.png" /></Relationships>')
        parts['word/_rels/document.xml.rels']=rl.encode('utf-8')

    # 4) document.xml — insert cover paragraph right after <w:body>
    doc=parts['word/document.xml'].decode('utf-8')
    cover_p=(
      '<w:p><w:pPr><w:jc w:val="center" /><w:spacing w:before="0" w:after="0" /></w:pPr>'
      '<w:r><w:drawing>'
      '<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
      f'<wp:extent cx="{EMU_W}" cy="{EMU_H}" /><wp:docPr id="990001" name="Cover" />'
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      '<pic:nvPicPr><pic:cNvPr id="990001" name="Cover" /><pic:cNvPicPr /></pic:nvPicPr>'
      f'<pic:blipFill><a:blip r:embed="{RID}" /><a:stretch><a:fillRect /></a:stretch></pic:blipFill>'
      f'<pic:spPr><a:xfrm><a:off x="0" y="0" /><a:ext cx="{EMU_W}" cy="{EMU_H}" /></a:xfrm>'
      '<a:prstGeom prst="rect"><a:avLst /></a:prstGeom></pic:spPr>'
      '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
    )
    # remove any previously injected cover paragraph (idempotent)
    import re
    doc=re.sub(r'<w:p><w:pPr><w:jc w:val="center" /><w:spacing w:before="0" w:after="0" /></w:pPr><w:r><w:drawing><wp:inline[^>]*>.*?name="Cover".*?</w:drawing></w:r></w:p>','',doc,flags=re.S)
    i=doc.find('<w:body>')+len('<w:body>')
    doc=doc[:i]+cover_p+doc[i:]
    parts['word/document.xml']=doc.encode('utf-8')

    tmp=docx+'.tmp'
    zout=zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED)
    for n in names:
        zout.writestr(n, parts[n])
    if 'word/media/cover.png' not in names:
        zout.writestr('word/media/cover.png', parts['word/media/cover.png'])
    zout.close()
    shutil.move(tmp, docx)
    print(f'  cover added (page 1) — {w}x{h}px @ 6.5in')

if __name__=='__main__': main()
