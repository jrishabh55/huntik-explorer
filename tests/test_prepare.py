import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
loader=importlib.util.spec_from_file_location('prepare',ROOT/'scripts/prepare.py')
m=importlib.util.module_from_spec(loader);loader.loader.exec_module(m)
class PublicDataTests(unittest.TestCase):
 def test_private_fields_never_cross_boundary(self):
  self.assertEqual(m.public_record({'title':'Lok','local_supplement_ids':['private'],'profile':{'original_path':'/Users/private'},'text':'Public'}),{'title':'Lok','profile':{},'text':'Public'})
 def test_placeholder_is_not_portrait(self):
  self.assertIsNone(m.portrait({'primary_image_ids':['placeholder']},{'placeholder':{'is_placeholder':True,'local_path':'image.png'}}))
 def test_clean_prose_preserves_content_without_markup(self):
  self.assertEqual(m.clean_text("'''Lok''' <b>Lambert</b> {{Clear}} [[Caliban|his Titan]]"),'Lok Lambert his Titan')
 def test_aliases_route_to_categories_and_policies(self):
  catalog=json.loads((ROOT/'public/data/catalog.json').read_text())
  germany=next(a for a in catalog['aliases'] if a['title']=='Germany')
  self.assertEqual(germany.get('href'),'#/categories?name=Germany')
  caliban=json.loads((ROOT/'public/data/detail/2107.json').read_text())
  link=next(l for l in caliban['links'] if l['target_title']=='Meso-Titan')
  self.assertEqual(link.get('href'),'#/categories?name=Meso-Titans')
 def test_real_source_coverage_and_exact_unknown_stats(self):
  catalog=json.loads((ROOT/'public/data/catalog.json').read_text()); entries=catalog['entries']
  self.assertEqual(len(entries),2539)
  self.assertEqual(sum(e['kind']=='titan' for e in entries),233)
  self.assertEqual(len(catalog['episodes']),52)
  caliban=next(e for e in entries if e['title']=='Caliban');sabriel=next(e for e in entries if e['title']=='Sabriel')
  self.assertEqual([caliban['stats'][k] for k in ['attack','defense','powerbonded_attack','powerbonded_defense']],[8,4,7,7])
  self.assertIsNone(sabriel['stats']['powerbonded_attack'])
  self.assertEqual(len(catalog['aliases']),1075)
if __name__=='__main__':unittest.main()
