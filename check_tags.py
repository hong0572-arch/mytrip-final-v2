import re
from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.line_offset = 0

    def handle_starttag(self, tag, attrs):
        if tag not in ['input', 'img', 'br', 'hr']:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if not self.stack:
            print(f"Error: closing tag </{tag}> without opening tag at line {self.getpos()[0]+self.line_offset}")
            return
        last_tag, line = self.stack.pop()
        if last_tag != tag:
            print(f"Error: unmatched tag </{tag}>. Expected </{last_tag}> from line {line+self.line_offset}. (Found at line {self.getpos()[0]+self.line_offset})")

with open('src/components/AIResult.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Since JSX has components like <Sparkles /> and { ... }, this simple parser might fail inside inline expressions.
# Let's just find all <div> and </div>
div_starts = [m.start() for m in re.finditer(r'<div\b', text)]
div_ends = [m.start() for m in re.finditer(r'</div\b', text)]
print(f"div tags: start={len(div_starts)}, end={len(div_ends)}")

# Let's output all unbalanced things. We can use a script that just removes balanced `{}` and `<tag></tag>` iteratively.
