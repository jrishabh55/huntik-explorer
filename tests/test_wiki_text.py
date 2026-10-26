"""Regression inputs are minimized fragments from the public Huntik wiki snapshot."""
import json,re,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from prepare import clean_text,readable_section,prepare_record
from wiki_text import article_links,render_lead

class WikiTextTests(unittest.TestCase):
 def test_lok_nested_image_caption_recovers_lost_words(self):
  raw='[[File:S1E02_Dante_Lok_Cherit_invoke.jpg|thumb|170px|Lok invokes [[Freelancer]] for the first time]]\nThough born into a family of [[Seekers]], Lok remained unaware.'
  result=readable_section({'wikitext':raw,'text':'for the first time]]\nThough born into a family of Seekers, Lok remained unaware.'})
  self.assertIn('Lok invokes Freelancer for the first time',result)
  self.assertIn('Though born into a family of Seekers, Lok remained unaware.',result)
  self.assertNotRegex(result,r'\[\[|\]\]|thumb|170px')
 def test_multiple_piped_caption_links_preserve_meaning(self):
  raw='[[File:S2E35 Lok Kipperin Willblade.png||thumb|200px|Lok, fused with [[Kipperin|Powerbonded Kipperin]], fights with the [[Willblade]]]]'
  self.assertIn('Lok, fused with Powerbonded Kipperin, fights with the Willblade',clean_text(raw))
  self.assertNotIn(']]',clean_text(raw))
 def test_dante_caption_and_body_both_survive(self):
  raw='[[File:S2E37 Dante Caliban eyes.png|thumb|200px|Dante and [[Caliban|Powerbonded Caliban]] have perfect telepathic communication]]\nDante is a leader and tactician. {{source|A Seeker Is Born}}'
  result=clean_text(raw)
  self.assertIn('Dante and Powerbonded Caliban have perfect telepathic communication',result)
  self.assertIn('Dante is a leader and tactician.',result)
  self.assertIn('[A Seeker Is Born]',result)
 def test_legitimate_history_heading_links_entities_and_lists_remain(self):
  result=clean_text('== History ==\n* [[Dante Vale|Dante]] &amp; [[Lok]]\n* {{nowrap|[[Caliban]]}}\n[https://example.com Source] <ref>A cited fact</ref>')
  for text in ['History','Dante & Lok','Caliban','Source','A cited fact']:self.assertIn(text,result)
  self.assertNotRegex(result,r'\[\[|\]\]|\{\{|\}\}|<ref>')
 def test_table_and_nested_template_content_remain(self):
  raw='{{TitanRow|[[Freelancer]]|tv||Given by [[Dante]] {{source|A Seeker Is Born}}.}}\n{| class="wikitable"\n! Name !! Attack\n|-\n| [[Caliban]] || 8\n|}'
  result=readable_section({'wikitext':raw,'text':''})
  for text in ['Freelancer','Given by Dante','A Seeker Is Born','Caliban','8','Attack']:self.assertIn(text,result)
  self.assertNotRegex(result,r'\[\[|\]\]|\{\{|\}\}|class=')
 def test_gallery_keeps_descriptive_captions_without_file_options(self):
  result=clean_text('<gallery>\nCaliban.jpg|alt=Caliban portrait|[[Caliban]] with [[Dante]]\nSabriel.jpg\n</gallery>')
  self.assertIn('Caliban with Dante',result)
  self.assertNotIn('.jpg',result)
  self.assertNotIn('alt=',result)
 def test_extra_category_closer_does_not_escape_hidden_metadata(self):
  raw='*Episode 33 - "[[Den vs Harrison]]"\n[[Category:Appearances by Location]]]]\nNext paragraph.'
  result=clean_text(raw)
  self.assertIn('Den vs Harrison',result)
  self.assertIn('Next paragraph.',result)
  self.assertNotIn(']]',result)
  self.assertIn(']]',clean_text('<nowiki>]]</nowiki>'))
 def test_recoverable_source_template_typos_keep_labels(self):
  result=clean_text('He protects the town. {Source|The Headless Horseman}}')
  self.assertIn('[The Headless Horseman]',result)
  self.assertNotIn('}}',result)
  result=clean_text('{{InternationalNamesSmall|FR=Fore-givre|DUT=Ogervorst}|POR=Bomba de gelo}}')
  for text in ['Fore-givre','Ogervorst','Bomba de gelo']:self.assertIn(text,result)
  self.assertNotRegex(result,r'[{}]')
 def test_plain_comparisons_and_literal_code_are_not_html_deletions(self):
  self.assertIn('attack < 10',clean_text('attack < 10 and defense > 3'))
  self.assertIn("joo'-do",clean_text("'''''joo'<nowiki/>'''-do''"))
  self.assertEqual(clean_text("<nowiki>''literal''</nowiki>"),"''literal''")
 def test_nested_caption_links_are_complete_and_clickable(self):
  self.assertEqual(list(article_links('[[File:a.jpg|thumb|[[Caliban|Powerbonded Caliban]] with [[Dante Vale|Dante]]]]')),
   [('Caliban','Powerbonded Caliban'),('Dante Vale','Dante')])
 def test_summary_preserves_inline_words_and_citations(self):
  self.assertEqual(render_lead('{{Infobox titan|attack=8}}A {{nowrap|powerful Titan}}. {{source|S1E01}}\n== History ==\nLater.'),
   'A powerful Titan. [S1E01]')
 def test_pipeline_ignores_lossy_projections_and_preserves_raw(self):
  raw='[[File:a.jpg|thumb|Lok invokes [[Freelancer]] for the first time]]'
  page={'raw_wikitext':'Lok is a [[Seeker]].\n== History ==\n'+raw,
   'summary':'broken summary','full_text':'broken body','sections':[{'heading':'History','wikitext':raw,'text':'for the first time]]'}],
   'profile':{'type':{'wikitext':'[[Seeker]]','text':'broken fact'}}}
  detail=prepare_record(page,{'freelancer':{'target_id':'huntik:page:123','status':'resolved'}})
  self.assertEqual(detail['summary'],'Lok is a Seeker.')
  self.assertEqual(detail['profile']['type']['text'],'Seeker')
  for text in [detail['full_text'],detail['sections'][0]['text']]:
   self.assertIn('Lok invokes Freelancer for the first time',text)
   self.assertNotIn(']]',text)
  self.assertEqual(detail['raw_wikitext'],page['raw_wikitext'])
  self.assertEqual(detail['links'][-1]['target_id'],'huntik:page:123')
  self.assertEqual(page['sections'][0]['text'],'for the first time]]')
