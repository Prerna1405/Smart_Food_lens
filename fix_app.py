import os

path = 'backend/app.py'
with open(path, 'rb') as f:
    content = f.read()

# Aggressively remove all BOM-like prefixes
while content.startswith(b'\xef\xbb\xbf'):
    content = content[3:]

text = content.decode('utf-8', errors='ignore')
lines = text.splitlines()

# Clean up any remaining BOMs that might be mid-line or at start of other lines
lines = [line.replace('\ufeff', '') for line in lines]

# Ensure import os is at the very beginning
if not any(line.strip() == 'import os' for line in lines):
    lines.insert(0, 'import os')

# Write back as PURE UTF-8 (no sig)
with open(path, 'wb') as f:
    f.write('\n'.join(lines).encode('utf-8'))

print("Aggressively cleaned backend/app.py (Removed all U+FEFF characters)")
