-- Turn Markdown blockquotes into a tinted, bordered "Callout" box (reference-doc
-- paragraph style "Callout"). Lets important asides stand out from body text.
function BlockQuote(el)
  return pandoc.Div(el.content, pandoc.Attr('', {}, { ['custom-style'] = 'Callout' }))
end
