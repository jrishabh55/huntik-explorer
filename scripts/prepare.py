"""Read the verified archive without mutation; emit only allowlisted public wiki data."""
import json,re,html,os
from urllib.parse import quote
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(os.environ.get('HUNTIK_SOURCE',ROOT.parent/'reference-export-2026-10-26'))
OUT=ROOT/'public/data'
PRIVATE={'local_supplement_ids','local_supplements','original_path','packaged_path','source_file','file_metadata_source','diagnostic_rejected_source','local_path'}
def public_record(value):
 if isinstance(value,dict):return {k:public_record(v) for k,v in value.items() if k not in PRIVATE}
 if isinstance(value,list):return [public_record(v) for v in value]
 return value

def clean_text(value):
 value=html.unescape(value or '')
 value=re.sub(r'<(?:br|/p|/div)\s*/?>','\n',value,flags=re.I)
 value=re.sub(r'<[^>]*>','',value)
 value=re.sub(r'\[\[(?:File|Image|Category):[^\]]*\]\]','',value,flags=re.I)
 value=re.sub(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]',lambda m:m[2] or m[1],value)
 for _ in range(15):
  new=re.sub(r'\{\{[^{}]*\}\}','',value)
  if new==value:break
  value=new
 value=re.sub(r"'{2,5}",'',value)
 value=re.sub(r'^\s*[|!].*$', '',value,flags=re.M)
 value=re.sub(r'[ \t]+',' ',value)
 return re.sub(r'\n{3,}','\n\n',value).strip()

CONTENT_TEMPLATES={'titanrow','international titles','international names','internationalnamessmall','profile','eplist','eplist2b','eplistcomic'}
LANGUAGES={'FR':'French','GER':'German','IT':'Italian','POL':'Polish','RUS':'Russian','SPA':'Spanish','POR':'Portuguese','DUT':'Dutch','ENG':'English'}
def split_template(value):
 parts=[];current=[];depth=0;i=0
 while i<len(value):
  pair=value[i:i+2]
  if pair=='[[':depth+=1;current.append(pair);i+=2
  elif pair==']]':depth=max(0,depth-1);current.append(pair);i+=2
  elif value[i]=='|' and depth==0:parts.append(''.join(current).strip());current=[];i+=1
  else:current.append(value[i]);i+=1
 parts.append(''.join(current).strip());return parts

def expand_content_template(match):
 parts=split_template(match[1]);name=parts[0].lower().strip();args=parts[1:]
 if name=='country':return args[0] if args else ''
 if name=='source':return '['+' · '.join(args)+']'
 if name not in CONTENT_TEMPLATES:return ''
 if name=='titanrow':return '\n\n'+' — '.join(a for a in args if a.strip())+'\n\n'
 lines=[]
 for arg in args:
  if '=' in arg:
   key,value=arg.split('=',1);key=key.strip();value=value.strip()
   if key.lower() in {'image','link','width','align','color','background'} or not value:continue
   label=' '.join(LANGUAGES.get(part,part) for part in key.split())
   lines.append(label.capitalize()+': '+value)
  elif arg:lines.append(arg)
 return '\n\n'+'\n'.join(lines)+'\n\n'

def readable_section(section):
 raw=section.get('wikitext','')
 names={n.strip().lower() for n in re.findall(r'\{\{\s*([^|}\n]+)',raw)}
 if not names.intersection(CONTENT_TEMPLATES) and '{|' not in raw:return clean_text(section.get('text',''))
 raw=re.sub(r'<!--.*?-->','',raw,flags=re.S)
 for _ in range(20):
  expanded=re.sub(r'\{\{([^{}]*)\}\}',expand_content_template,raw)
  if expanded==raw:break
  raw=expanded
 if '{|' in raw:
  lines=[]
  for line in raw.splitlines():
   line=line.strip()
   if line.startswith(('{|','|-','|}')):continue
   if line.startswith(('|','!')):
    cells=re.split(r'\|\||!!',line[1:])
    cells=[re.sub(r'^(?:[^|]*(?:style|span|class|align|width)\s*=)[^|]*\|','',c).strip() for c in cells]
    line=' — '.join(cells)
   lines.append(line)
  raw='\n'.join(lines)
 return clean_text(raw)

def image_path(image):
 return 'media/'+image['sha256'][:24]+'.webp' if image.get('local_path') and image.get('sha256') else None

def portrait(page,images):
 for ident in page.get('primary_image_ids',[]):
  im=images.get(ident,{})
  if im.get('local_path') and not im.get('is_placeholder'):return image_path(im)
 return None

def write(path,data):
 p=OUT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
def read(name):return json.loads((SOURCE/'data'/f'{name}.json').read_text())
def values(profile,key):
 p=profile.get(key,{})
 return list(dict.fromkeys([clean_text(x) for x in p.get('text','').split('\n') if clean_text(x)]))
def main():
 pages=read('pages');images=read('images');aliases=read('aliases');episodes=read('episodes');extras=read('episode-extras')
 ims={i['id']:i for i in images};eps={e['id']:e for e in episodes};extra_ids={e['id'] for e in extras}
 entries=[];search={};jobs={};gallery=[]
 destinations={p['id']:'#/entry/'+quote(p['id'],safe='') for p in pages}
 destinations.update({c['id']:'#/categories?name='+quote(c['title'].replace('Category:',''),safe='') for c in read('categories')})
 def attach_links(value):
  if isinstance(value,dict):
   if value.get('target_id'):value['href']=destinations.get(value['target_id'],value.get('target_url'))
   for v in list(value.values()):attach_links(v)
  elif isinstance(value,list):
   for v in value:attach_links(v)
 for im in images:
  if im.get('local_path'):
   target=image_path(im)
   jobs.setdefault(target,{'source':im['local_path'],'target':target,'sha256':im['sha256']})
  gallery.append({'id':im['id'],'filename':im['filename'],'preview':image_path(im),'pages':im.get('associated_page_ids',[]),'categories':im.get('file_categories',[]),'placeholder':im.get('is_placeholder',False),'chunk':len(gallery)//100})
 for start in range(0,len(images),100):
  write(f'gallery/{start//100}.json',[{**public_record(im),'preview':image_path(im)} for im in images[start:start+100]])
 write('gallery/index.json',gallery)
 for page in pages:
  p=page.get('profile',{});ep=eps.get(page['id'],{})
  facets={k:values(p,k) for k in ['type','size','group','users','rarity','deck','hero type','gender'] if values(p,k)}
  titan_categories=[x for x in page.get('categories',[]) if x.endswith('Titans') or x.endswith('-Titans')]
  if page['kind']=='titan':facets['class']=titan_categories
  entry={'id':page['id'],'title':page['title'],'kind':page['kind'],'summary':clean_text(page.get('summary',''))[:400],'image':portrait(page,ims),'aliases':page.get('aliases',[]),'categories':page.get('categories',[]),'facets':facets,'stats':page.get('stats_values',{}),'season':ep.get('season'),'number':ep.get('season_number'),'extra':page['id'] in extra_ids}
  if page['kind']=='tcg_card':entry['subtitle']=' — '.join(values(p,'card name')+values(p,'version'))
  entries.append(entry)
  detail=public_record(page)
  attach_links(detail)
  detail['summary']=clean_text(page.get('summary',''))
  for section in detail.get('sections',[]):section['text']=readable_section(section)
  write('detail/'+str(page['page_id'])+'.json',detail)
  search[page['id']]=(clean_text(page.get('full_text',''))+'\n'+'\n'.join(s['text'] for s in detail.get('sections',[]))).lower()
 write('catalog.json',{'entries':entries,'aliases':[{'title':a['title'],'target_id':a['target_id'],'target_title':a['target_title'],'href':destinations.get(a['target_id'],'https://huntik.fandom.com/wiki/'+quote(a['target_title'].replace(' ','_'),safe=''))} for a in aliases],'episodes':[e['id'] for e in episodes],'extras':[e['id'] for e in extras]})
 write('search.json',search)
 write('relationships.json',public_record(read('relationships')))
 write('categories.json',public_record(read('categories')))
 manifest=json.loads((SOURCE/'manifest.json').read_text())
 write('info.json',{'snapshot':'2026-10-26','counts':manifest['counts'],'source':'https://huntik.fandom.com','text_license':{'label':'CC-BY-SA 3.0','url':'https://creativecommons.org/licenses/by-sa/3.0/'},'gaps':{'missing_image_references':4,'missing_internal_targets':64,'unresolved_citation_labels':12},'public_pages':len(pages),'image_entries':len(images),'downloaded_image_entries':sum(bool(i.get('local_path')) for i in images),'unique_image_files':len({i['local_path'] for i in images if i.get('local_path')}),'deduplicated_previews':len(jobs),'relationships':len(read('relationships')),'image_rights_note':'Images retain their individual copyright and file-page rights statements. Wiki text licensing does not apply to images. This is an unofficial fan reference.'})
 (ROOT/'.cache').mkdir(exist_ok=True)
 (ROOT/'.cache/image-jobs.json').write_text(json.dumps(list(jobs.values())))
 print(f'Prepared {len(pages)} pages, {len(aliases)} aliases, {len(gallery)} image records, {len(jobs)} unique image jobs; no supplements read.')
if __name__=='__main__':main()
