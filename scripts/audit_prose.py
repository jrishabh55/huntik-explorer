"""Check retained source prose/captions/table cells in every prepared article section.

Layout templates and file options are excluded; source display labels are checked.
The immutable raw fields in each record make this runnable without the archive.
"""
import collections,json,re,sys
from pathlib import Path
from wiki_text import parse_source,split_top_level,IMAGE_OPTION,CONTENT_TEMPLATES
from mwparserfromhell import nodes

def normalized(s):return re.sub(r'\s+',' ',re.sub(r"'{2,5}",'',s)).strip()
counts=collections.Counter();missing=[]
def spans(code):
 for node in code.nodes:
  if isinstance(node,nodes.Text):
   text=normalized(str(node).replace('|-|',' '))
   if len(text)>3 and re.search(r'[A-Za-z]',text):yield text
  elif isinstance(node,nodes.Wikilink):
   title=str(node.title).strip().lower()
   if title.startswith(('file:','image:')):
    parts=split_top_level(node.text) if node.text else []
    captions=[p for p in parts if str(p).strip() and not IMAGE_OPTION.fullmatch(str(p).strip())]
    if captions:counts['imageCaptions']+=1;yield from spans(captions[-1])
   elif not title.startswith('category:'):yield from spans(node.text if node.text is not None else node.title)
  elif isinstance(node,nodes.Template):
   name=str(node.name).strip().lower()
   if name in CONTENT_TEMPLATES:
    counts['contentTemplates']+=1
    for p in node.params:
     if str(p.name).strip().lower() not in {'image','link','width','align','color','background'}:yield from spans(p.value)
   elif name in {'source','country','nowrap','lang'}:
    values={str(p.name).strip():p.value for p in node.params}
    value=values.get('2',values.get('1')) if name in {'source','lang'} else values.get('1')
    if value is not None:yield from spans(value)
  elif isinstance(node,nodes.Tag):
   tag=str(node.tag).lower()
   if tag=='gallery':
    for line in str(node.contents or '').splitlines():
     parts=split_top_level(parse_source(line))
     captions=[p for p in parts[1:] if str(p).strip() and not IMAGE_OPTION.fullmatch(str(p).strip())]
     if captions:counts['galleryCaptions']+=1;yield from spans(captions[-1])
   elif tag not in {'script','style','references','templatestyles','youtube','videogallery'} and node.contents is not None:yield from spans(node.contents)
  elif isinstance(node,nodes.Heading):yield from spans(node.title)
  elif isinstance(node,nodes.ExternalLink):yield from spans(node.title if node.title is not None else node.url)
root=Path(sys.argv[1] if len(sys.argv)>1 else 'public')
for f in (root/'data/detail').glob('*.json'):
 p=json.loads(f.read_text());counts['pages']+=1
 for section in p['sections']:
  counts['sections']+=1;output=normalized(section['text'])
  for text in spans(parse_source(section['wikitext'])):
   # The Dutch-name source typo is independently recorded in regression tests.
   if p['title']=='Augerfrost' and text=='Ogervorst}':text='Ogervorst'
   counts['semanticSpans']+=1
   if text not in output:missing.append([p['title'],section['heading'],text])
assert counts['pages']==2539,counts
assert not missing,json.dumps(missing[:20],ensure_ascii=False)
print(json.dumps({'sourceContentAudit':'passed',**counts,'missingSemanticSpans':len(missing)},indent=2))
