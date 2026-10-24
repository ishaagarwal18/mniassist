"""Find English UI text missing from the backend ABP AutoReach localization resource.

    python tools/i18n/extract.py --missing        English with no entry yet, one per line
    python tools/i18n/extract.py src/app out.json  every string found, as a JSON list

Reads template text, translatable attributes, string literals inside template expressions, and
UI-looking string literals in TypeScript (mock and sample data skipped). It is a heuristic: a few
codes and fragments come through, and those are simply left out of the dictionary.
"""
import html
import json
import os
import re
import sys

MISSING = sys.argv[1:2] == ['--missing']
ROOT = 'src/app' if MISSING else sys.argv[1]
CURRENT = ['']
OUT = None if MISSING else sys.argv[2]

ATTRS = ('placeholder', 'title', 'label', 'help', 'subtitle', 'aria-label', 'alt', 'hint', 'emptyText',
         'confirmText', 'cancelText', 'heading', 'description', 'text', 'caption', 'headerText', 'tooltip',
         'empty', 'emptyTitle', 'emptyBody', 'message', 'note', 'eyebrow', 'lede', 'cta', 'name')

ws = lambda s: ' '.join(s.split())
has_word = lambda s: re.search(r'[A-Za-z]{2}', s) is not None


def interp_to_pattern(text):
    """'Showing {{ a }} of {{ b | number }}' -> 'Showing {0} of {1}'."""
    i = [0]

    def rep(_):
        r = '{%d}' % i[0]
        i[0] += 1
        return r
    return re.sub(r'\{\{.*?\}\}', rep, text, flags=re.S)


QUOTED = re.compile(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"")


def ui_literal(s):
    s = s.strip()
    if not s or not has_word(s) or len(s) > 600:
        return False
    if re.search(r'^(https?:|/|\.|#|@|--|\$|mailto:)', s) or '=>' in s:
        return False
    if re.fullmatch(r'[a-z][A-Za-z0-9]*', s):            # camelCase identifiers, lowercase words used as keys
        return False
    if re.fullmatch(r'[a-z0-9]+([-_.:/][a-z0-9]+)+', s, re.I):  # kebab, snake, dotted, paths
        return False
    if re.fullmatch(r'[A-Z0-9_]+', s) and '_' in s:
        return False
    if re.search(r'[<>{};=]', s) and not re.search(r'\{\d\}', s):
        return False
    if re.fullmatch(r'[\w-]+(\s+[\w-]+)*', s) and s == s.lower() and ' ' in s and re.search(r'\b(flex|grid|var|px|rem|none|auto|solid|block|ar-|e-|btn|card|is-)\b', s):
        return False                                       # css class lists
    if s.startswith('ar-') or s.startswith('e-'):
        return False
    # Starts with a capital, or is a phrase with a space.
    return s[0].isupper() or s[0].isdigit() and ' ' in s or (' ' in s and re.search(r'[a-z]{3}', s) is not None) or s[0] in '“‘(…+—–·•✓'


def from_template(t, out):
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S)
    # string literals inside interpolations and bound attributes
    for expr in re.findall(r'\{\{(.*?)\}\}', t, flags=re.S) + re.findall(r'\[[\w.\-]+\]="([^"]*)"', t) + re.findall(r'\(\w+\)="([^"]*)"', t):
        for a, b in QUOTED.findall(expr):
            v = a or b
            if ui_literal(v):
                out.add(ws(v))
    # plain attributes
    for name, val in re.findall(r'\s([\w\-]+)="([^"]*)"', t):
        if name in ATTRS and '{{' not in val and has_word(val):
            out.add(ws(val))
        elif name in ATTRS and '{{' in val:
            out.add(ws(interp_to_pattern(val)))
    # text between tags, with control-flow syntax removed
    body = re.sub(r'<[^>]*>', '\x00', t)
    body = re.sub(r'@(if|for|switch|case|defer|placeholder|loading)\s*(\((?:[^()]|\([^()]*\))*\))?\s*\{', '\x00', body)
    body = re.sub(r'\}\s*@else\s+if\s*\((?:[^()]|\([^()]*\))*\)\s*\{|\}\s*@else\s*\{|\}\s*@empty\s*\{|@default\s*\{', '\x00', body)
    body = re.sub(r'@let\s+[^;]*;', '\x00', body)
    for frag in body.split('\x00'):
        # stray closing braces of blocks (not interpolation braces)
        frag = re.sub(r'(?<!\})\}(?!\})', ' ', frag.replace('}}', '\x01')).replace('\x01', '}}')
        frag = ws(frag)
        if not frag:
            continue
        if '{{' in frag:
            stripped = ws(re.sub(r'\{\{.*?\}\}', '', frag))
            if has_word(stripped):
                out.add(interp_to_pattern(frag))
        elif has_word(frag) and not frag.startswith('@'):
            out.add(frag)


MOCK_DECL = re.compile(r'(?:const|let|var|readonly|private|protected|public|static)\s+(?:readonly\s+)?\w*(?:mock|Mock|MOCK|sample|Sample|SAMPLE|demo|Demo|DEMO|fake|Fake|FAKE|seed|Seed|SEED)\w*\s*(?::[^=;]{0,200})?=\s*')
MOCK_BRANCH = re.compile(r'if\s*\(\s*(?:environment\.useMockData|MOCK|this\.mock\w*|isMock\w*|useMock\w*)\s*\)\s*')


def skip_balanced(code, i):
    """Index just past the bracketed (or single) expression starting at i."""
    depth = 0
    q = None
    j = i
    while j < len(code):
        c = code[j]
        if q:
            if c == '\\':
                j += 2
                continue
            if c == q:
                q = None
        elif c in '\'"`':
            q = c
        elif c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
            if depth <= 0:
                return j + 1
        elif c == ';' and depth == 0:
            return j
        j += 1
    return j


def strip_mock(code):
    for pat in (MOCK_DECL, MOCK_BRANCH):
        while True:
            m = pat.search(code)
            if not m:
                break
            end = skip_balanced(code, m.end())
            code = code[:m.start()] + code[end:]
    return code


def from_ts(src, out):
    if re.search(r'mock', os.path.basename(CURRENT[0]), re.I):
        return
    src = strip_mock(src)
    code = re.sub(r'template:\s*`.*?`', '', src, flags=re.S)
    code = re.sub(r'styles:\s*`.*?`', '', code, flags=re.S)
    code = re.sub(r'^\s*import .*?;\s*$', '', code, flags=re.M | re.S)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.S)
    code = re.sub(r'(?m)^\s*//.*$', '', code)
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", code):
        v = m.group(1) or m.group(2)
        if v is None:
            tl = m.group(3)
            if tl is None:
                continue
            i = [0]

            def rep(_):
                r = '{%d}' % i[0]
                i[0] += 1
                return r
            v = re.sub(r'\$\{[^}]*\}', rep, tl)
            if not has_word(re.sub(r'\{\d\}', '', v)):
                continue
        v = v.replace("\\'", "'").replace('\\"', '"').replace('\\n', ' ')
        pre = code[max(0, m.start() - 40):m.start()]
        if re.search(r'(selector|templateUrl|styleUrl|styleUrls|url|path|loadComponent|apiName|method|icon|key|code|type|tone|variant|kind|id|route|routerLink|queryParams|field|format|cssClass|class|prop|name|sort|localStorage\.\w+|sessionStorage\.\w+|getItem|setItem|removeItem|get|set|has|includes|startsWith|endsWith|split|join|replace|test|match|console\.\w+)\s*[:=(,]\s*$', pre):
            continue
        if ui_literal(v):
            out.add(ws(v))


def main():
    out = set()
    for dp, _, fns in os.walk(ROOT):
        # generated API clients, and the dictionaries themselves
        if {'proxy', 'i18n'} & set(re.split(r'[\\/]', dp)):
            continue
        for f in fns:
            p = os.path.join(dp, f)
            if f.endswith('.spec.ts') or not (f.endswith('.ts') or f.endswith('.html')):
                continue
            s = open(p, encoding='utf-8').read()
            CURRENT[0] = p
            if f.endswith('.html'):
                from_template(s, out)
            else:
                for t in re.findall(r'template:\s*`(.*?)`', s, flags=re.S):
                    from_template(t, out)
                from_ts(s, out)
    # Templates render entities (&#10003; is ✓, &nbsp; a space): key by what the page shows.
    out = {ws(html.unescape(x).replace('\xa0', ' ')) for x in out}

    def junk(x):
        return (
            # template fragments the regex parser cut through an expression
            re.search(r'\(\)|"\s*\[|\]="|\?\.|&&|\|\||\$any|"\s*/?>|\?\s*\'|\'\s*:|^[=,;:)\]]|^\d+"|`', x)
            # values, not text: dates, times, phone numbers, GSTINs, sizes
            or re.fullmatch(r'\d{1,2} [A-Z][a-z]{2}( \d{4})?|\d{1,2}:\d{2} ?[ap]m.*|\+\d[\d x]+|\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9]{2}|/api/.*', x)
            or not re.search(r'[A-Za-z]{2}', x)
        )
    out = sorted(x for x in out if x and len(x) <= 600 and not junk(x))
    if MISSING:
        resource_path = os.path.join(os.path.dirname(__file__), '../../../autoreach-api/src/AutoReach.Domain.Shared/Localization/AutoReach/en.json')
        with open(resource_path, encoding='utf-8') as resource_file:
            texts = json.load(resource_file)['texts']
        known = {value for key, value in texts.items() if key.startswith('Ui:')}
        sys.stdout.reconfigure(encoding='utf-8')
        for s in out:
            if s not in known:
                print(s)
        return
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(len(out), sum(len(x) for x in out))


main()
