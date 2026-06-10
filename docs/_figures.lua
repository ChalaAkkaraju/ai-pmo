-- Auto-number figures as "Figure N — <caption>". Handles pandoc 3.x (Figure
-- block) and pandoc 2.9 (implicit-figure: a Para holding one Image whose title
-- starts with "fig:"). The caption itself is styled via the reference doc's
-- "Image Caption" style.
local n = 0

local function prefix_inlines(inlines)
  n = n + 1
  table.insert(inlines, 1, pandoc.Str('Figure ' .. n .. ' \u{2014} '))
end

-- pandoc 3.x
function Figure(el)
  local cap = el.caption
  if cap and cap.long and #cap.long > 0 then
    local b = cap.long[1]
    if b.content then prefix_inlines(b.content) end
  end
  return el
end

-- pandoc 2.9 implicit figures
function Image(el)
  if el.title and el.title:sub(1, 4) == 'fig:' and #el.caption > 0 then
    prefix_inlines(el.caption)
    return el
  end
end
