-- Colour bold key terms via the reference doc's "Keyword" character style.
function Strong(el)
  return pandoc.Span(el.content, { ['custom-style'] = 'Keyword' })
end
