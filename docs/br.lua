function Inlines(inlines)
  local out = {}
  local i = 1
  while i <= #inlines do
    local el = inlines[i]
    if el.t == 'RawInline'
        and el.format:match('html')
        and el.text:match('^<br%s*/?>$') then
      if #out > 0 and out[#out].t == 'Space' then
        table.remove(out)
      end
      table.insert(out, pandoc.LineBreak())
      if inlines[i + 1] and inlines[i + 1].t == 'Space' then
        i = i + 2
      else
        i = i + 1
      end
    else
      table.insert(out, el)
      i = i + 1
    end
  end
  return out
end
