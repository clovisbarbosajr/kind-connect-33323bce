import re

with open('debug_acesso-starck.com.html', encoding='utf-8', errors='ignore') as f:
    html = f.read()

print("=== BUTTONS/LINKS ===")
buttons = re.findall(r'<(button|a)([^>]*)>(.*?)</', html, re.IGNORECASE | re.DOTALL)
for tag, attrs, text in buttons:
    t = re.sub(r'<[^>]+>', '', text).strip()[:60]
    if t:
        print(f"  <{tag}> attrs={attrs[:80].strip()!r}  text={t!r}")

print("\n=== ALL IDs ===")
ids = re.findall(r'id=["\']([^"\']+)["\']', html)
print(list(dict.fromkeys(ids)))

print("\n=== ALL CLASSES (unique, short) ===")
classes = re.findall(r'class=["\']([^"\']+)["\']', html)
flat = []
for c in classes:
    flat.extend(c.split())
flat = list(dict.fromkeys(flat))[:40]
print(flat)

print("\n=== BODY TEXT ===")
body = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', '', html, flags=re.DOTALL)
body = re.sub(r'<[^>]+>', ' ', body)
body = re.sub(r'\s+', ' ', body).strip()
print(body[:2000].encode('ascii', 'replace').decode())
