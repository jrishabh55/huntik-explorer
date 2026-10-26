"""Read the verified archive without mutation; emit only allowlisted public wiki data."""
import json,os
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

from wiki_text import render_text, render_lead, article_links

def clean_text(value):
 return render_text(value or '')

def readable_section(section):
 return render_text(section.get('wikitext',section.get('text','')))


def render_record_fields(value):
 if isinstance(value,dict):
  if 'wikitext' in value and 'text' in value:
   value['text']=render_text(value['wikitext'])
  if 'value_wikitext' in value and 'value_text' in value:
   value['value_text']=render_text(value['value_wikitext'])
  for child in value.values():render_record_fields(child)
 elif isinstance(value,list):
  for child in value:render_record_fields(child)

def prepare_record(page, link_targets=None):
 detail=public_record(page)
 render_record_fields(detail)
 detail['summary']=render_lead(page['raw_wikitext'])
 if page.get('episode_type')=='regular':
  detail['summary']=next((s['text'] for s in detail['sections'] if s['heading'].lower()=='synopsis'),detail['summary'])
 detail['full_text']=render_text(page['raw_wikitext'])
 if link_targets is not None:
  detail['links']=[]
  for title,label in article_links(page['raw_wikitext']):
   target=link_targets.get(title.split('#')[0].casefold(),{})
   detail['links'].append({**target,'target_title':title,'label':label,
    'target_id':target.get('target_id'),'target_url':'https://huntik.fandom.com/wiki/'+quote(title.replace(' ','_'),safe=':/'),
    'status':target.get('status','unexpanded_template' if '{{' in title else 'unresolved')})
 if 'plot_text' in detail:detail['plot_text']='\n\n'.join(s['text'] for s in detail.get('plot_sections',[]))
 return detail

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
 link_targets={link['target_title'].replace('_',' ').split('#')[0].casefold():link
  for page in pages for link in page['links']}
 for page in pages:
  link_targets[page['title'].casefold()]={'target_id':page['id'],'status':'resolved'}
 for alias in aliases:
  if alias.get('target_id'):link_targets[alias['title'].casefold()]={'target_id':alias['target_id'],'status':'resolved'}
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
  detail=prepare_record(page,link_targets)
  p=detail.get('profile',{});ep=eps.get(page['id'],{})
  facets={k:values(p,k) for k in ['type','size','group','users','rarity','deck','hero type','gender'] if values(p,k)}
  titan_categories=[x for x in page.get('categories',[]) if x.endswith('Titans') or x.endswith('-Titans')]
  if page['kind']=='titan':facets['class']=titan_categories
  entry={'id':page['id'],'title':page['title'],'kind':page['kind'],'summary':detail['summary'][:400],'image':portrait(page,ims),'aliases':page.get('aliases',[]),'categories':page.get('categories',[]),'facets':facets,'stats':page.get('stats_values',{}),'season':ep.get('season'),'number':ep.get('season_number'),'extra':page['id'] in extra_ids}
  if page['kind']=='tcg_card':entry['subtitle']=' — '.join(values(p,'card name')+values(p,'version'))
  entries.append(entry)
  attach_links(detail)
  write('detail/'+str(page['page_id'])+'.json',detail)
  search[page['id']]=(detail['full_text']+'\n'+'\n'.join(v['text'] for v in detail['profile'].values())).lower()
 write('catalog.json',{'entries':entries,'aliases':[{'title':a['title'],'target_id':a['target_id'],'target_title':a['target_title'],'href':destinations.get(a['target_id'],'https://huntik.fandom.com/wiki/'+quote(a['target_title'].replace(' ','_'),safe=''))} for a in aliases],'episodes':[e['id'] for e in episodes],'extras':[e['id'] for e in extras]})
 write('search.json',search)
 write('relationships.json',public_record(read('relationships')))
 categories=public_record(read('categories'))
 for category in categories:
  render_record_fields(category)
  category['description']=render_lead(category.get('wikitext',''))
 write('categories.json',categories)
 manifest=json.loads((SOURCE/'manifest.json').read_text())
 write('info.json',{'snapshot':'2026-10-26','counts':manifest['counts'],'source':'https://huntik.fandom.com','text_license':{'label':'CC-BY-SA 3.0','url':'https://creativecommons.org/licenses/by-sa/3.0/'},'gaps':{'missing_image_references':4,'missing_internal_targets':64,'unresolved_citation_labels':12},'public_pages':len(pages),'image_entries':len(images),'downloaded_image_entries':sum(bool(i.get('local_path')) for i in images),'unique_image_files':len({i['local_path'] for i in images if i.get('local_path')}),'deduplicated_previews':len(jobs),'relationships':len(read('relationships')),'image_rights_note':'Images retain their individual copyright and file-page rights statements. Wiki text licensing does not apply to images. This is an unofficial fan reference.'})
 (ROOT/'.cache').mkdir(exist_ok=True)
 (ROOT/'.cache/image-jobs.json').write_text(json.dumps(list(jobs.values())))
 print(f'Prepared {len(pages)} pages, {len(aliases)} aliases, {len(gallery)} image records, {len(jobs)} unique image jobs; no supplements read.')
if __name__=='__main__':main()
