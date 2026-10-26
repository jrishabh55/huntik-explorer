"""Readable MediaWiki text from a syntax tree, never from regex-stripped projections.

The immutable source remains the authority. Rendering emits inert text for React;
file captions, nested links, source citations, content templates and table cells
are walked as complete nodes. It does not expand remote templates or execute HTML.
"""
import html
import re

import mwparserfromhell as mw
from mwparserfromhell import nodes
from mwparserfromhell.wikicode import Wikicode

CONTENT_TEMPLATES = {
    'titanrow', 'international titles', 'international names',
    'internationalnamessmall', 'profile', 'eplist', 'eplist2b', 'eplistcomic',
}
LANGUAGES = {'FR':'French', 'GER':'German', 'IT':'Italian', 'POL':'Polish',
             'RUS':'Russian', 'SPA':'Spanish', 'POR':'Portuguese', 'DUT':'Dutch',
             'ENG':'English'}
IMAGE_OPTION = re.compile(
    r'^(?:thumb(?:nail)?|frame(?:less)?|border|right|left|center|none|baseline|'
    r'sub|super|top|text-top|middle|bottom|text-bottom|\d*(?:x\d+)?px|'
    r'upright(?:\s*=.*)?|(?:alt|link|class|page|lang|start|end|thumbtime)\s*=.*)$', re.I)


def parse_source(raw):
    # Two source citations have one opening brace, but a complete Source label
    # and closing pair. Recover this narrow syntax typo without erasing text.
    raw = re.sub(r'(?<!\{)\{([Ss]ource\|[^{}\n]+)\}\}', r'{{\1}}', raw or '')
    return mw.parse(raw, skip_style_tags=True)


def split_top_level(code, separator='|'):
    """Split only Text nodes; pipes inside nested links/templates remain inside."""
    parts = [[]]
    for node in code.nodes:
        if isinstance(node, nodes.Text):
            chunks = str(node).split(separator)
            for i, chunk in enumerate(chunks):
                if i:
                    parts.append([])
                parts[-1].append(nodes.Text(chunk))
        else:
            parts[-1].append(node)
    return [Wikicode(part) for part in parts]


class TextRenderer:
    def __init__(self, image_captions=True, templates=True):
        self.image_captions = image_captions
        self.templates = templates

    def code(self, code):
        result = []
        previous = None
        for node in code.nodes:
            text = self.node(node)
            if (isinstance(previous, nodes.Wikilink)
                    and str(previous.title).strip().lower().startswith('category:')
                    and isinstance(node, nodes.Text)):
                # A source category has a duplicated closing pair. Consume it
                # only directly after that hidden node, at the end of its line.
                text = re.sub(r'^\]\](?=[ \t]*(?:\n|$))', '', text)
            result.append(text)
            previous = node
        return ''.join(result)

    def image(self, code):
        if not self.image_captions or code is None:
            return ''
        captions = [p for p in split_top_level(code)
                    if str(p).strip() and not IMAGE_OPTION.fullmatch(str(p).strip())]
        if not captions:
            return ''
        caption = self.code(captions[-1]).strip()
        return '\n\nImage caption: ' + caption + '\n\n' if caption else ''

    def template(self, node):
        name = str(node.name).strip().replace('_', ' ').lower()
        values = {str(p.name).strip():p.value for p in node.params}
        if name == 'source':
            value = values.get('2', values.get('1'))
            return '[' + self.code(value).strip() + ']' if value is not None else ''
        if name == 'country':
            return self.code(values['1']) if '1' in values else ''
        if name in {'nowrap', 'nobr', 'small', 'big', 'quote', 'quotation', 'cquote', 'lang'}:
            value = values.get('2') if name == 'lang' else values.get('1')
            return self.code(value) if value is not None else ''
        if not self.templates:
            return ''
        if name not in CONTENT_TEMPLATES:
            # Layout/navigation/infobox templates have dedicated app views or
            # preserved raw source; their parameters are not article prose.
            return ''
        if name == 'titanrow':
            cells = [self.code(p.value).strip() for p in node.params]
            return '\n\n' + ' — '.join(c for c in cells if c) + '\n\n'
        lines = []
        for param in node.params:
            key = str(param.name).strip()
            if key.lower() in {'image', 'link', 'width', 'align', 'color', 'background'}:
                continue
            value = self.code(param.value).strip()
            # One international-name value ends in a stray source brace.
            # Treat it as a delimiter typo only in this named-template field.
            if name.startswith('international') and value.endswith('}') and '{' not in value:
                value = value[:-1].rstrip()
            if not value:
                continue
            label = ' '.join(LANGUAGES.get(p, p) for p in key.split())
            lines.append((label.capitalize() + ': ' if param.showkey else '') + value)
        return '\n\n' + '\n'.join(lines) + '\n\n'

    def node(self, node):
        if isinstance(node, nodes.Text):
            # Strip style delimiters before adjacent nodes are joined; a
            # <nowiki/> boundary can protect a meaningful single apostrophe.
            return re.sub(r"'{2,5}", '', str(node))
        if isinstance(node, nodes.Comment):
            return ''
        if isinstance(node, nodes.HTMLEntity):
            return html.unescape(str(node))
        if isinstance(node, nodes.Wikilink):
            title = str(node.title).strip()
            namespace = title.split(':', 1)[0].lower()
            if namespace in {'file', 'image'}:
                return self.image(node.text)
            if namespace == 'category':
                return ''
            return self.code(node.text if node.text is not None else node.title)
        if isinstance(node, nodes.ExternalLink):
            return self.code(node.title if node.title is not None else node.url)
        if isinstance(node, nodes.Heading):
            return '\n\n' + self.code(node.title).strip() + '\n\n'
        if isinstance(node, nodes.Template):
            return self.template(node)
        if isinstance(node, nodes.Argument):
            return self.code(node.default) if node.default is not None else ''
        if isinstance(node, nodes.Tag):
            tag = str(node.tag).strip().lower()
            if tag in {'script', 'style', 'references', 'templatestyles', 'youtube', 'videogallery'}:
                return ''
            if tag in {'br', 'hr'}:
                return '\n'
            if tag == 'nowiki':
                return str(node.contents or '')
            if tag == 'gallery':
                rows = []
                for line in str(node.contents or '').splitlines():
                    parts = split_top_level(parse_source(line))
                    if len(parts) > 1:
                        # Keep option boundaries; concatenating nodes would let
                        # an alt= option swallow the following real caption.
                        rows.append(self.image(parse_source('|'.join(str(p) for p in parts[1:]))))
                return ''.join(rows)
            contents = self.code(node.contents) if node.contents is not None else ''
            if tag == 'ref':
                return ' [Reference: ' + contents.strip() + '] ' if contents.strip() else ''
            if tag in {'table', 'tr', 'p', 'div', 'section'}:
                return '\n' + contents + '\n'
            if tag in {'td', 'th'}:
                return contents.strip() + ' — '
            if tag == 'li':
                return '\n• ' + contents if contents else '• '
            if tag in {'dt', 'dd'}:
                return '\n' + contents if contents else ''
            if tag == 'tabber':
                return contents.replace('|-|', '\n')
            return contents
        return str(node)


def normalize_text(text):
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r' —\s*(?=\n|$)', '', text)
    text = '\n'.join(line.strip() for line in text.splitlines())
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def render_text(raw, image_captions=True, templates=True):
    return normalize_text(TextRenderer(image_captions, templates).code(parse_source(raw)))


def render_lead(raw):
    code = parse_source(raw)
    lead = []
    for node in code.nodes:
        if isinstance(node, nodes.Heading):
            break
        lead.append(node)
    return normalize_text(TextRenderer(image_captions=False, templates=False).code(Wikicode(lead)))


def article_links(raw):
    """Yield complete display links, including links nested inside captions."""
    for node in parse_source(raw).filter_wikilinks():
        title = str(node.title).strip().replace('_', ' ')
        if title.lower().startswith(('file:', 'image:')):
            continue
        label = render_text(str(node.text if node.text is not None else node.title))
        yield title, label
