from __future__ import annotations
import csv
import hashlib
import io
import json
import math
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FILES = [
    ROOT / 'public/data/GOLD_M15_IST_20260402_2026071.csv',
    ROOT / 'public/data/GOLD_M15_IST_20260402_20260710 copy.csv',
]


def detect_hidden(text: str):
    out = []
    for i, ch in enumerate(text):
        if ch in {'\u200b', '\u200c', '\u200d', '\ufeff', '\u2060', '\u00a0'} or unicodedata.category(ch)[0] == 'C':
            out.append((i, repr(ch), unicodedata.category(ch)))
    return out[:20]


def parse_date(dt: str):
    dt = dt.strip()
    try:
        return datetime.strptime(dt, '%d-%m-%Y %H:%M')
    except Exception:
        return None

for p in FILES:
    data = p.read_bytes()
    print(f'FILE: {p.name}')
    print(f'  size: {len(data)} bytes')
    print(f'  md5: {hashlib.md5(data).hexdigest()}')
    print(f'  sha256: {hashlib.sha256(data).hexdigest()}')
    print('  bom:', data.startswith(b'\xef\xbb\xbf'))
    print('  contains-null:', b'\x00' in data)
    print('  crlf:', data.count(b'\r\n'), 'lf:', data.count(b'\n'), 'cr:', data.count(b'\r'))

    for enc in ('utf-8', 'utf-8-sig', 'cp1252', 'latin-1'):
        try:
            text = data.decode(enc)
            print(f'  decode-{enc}: ok')
            print(f'  first-200: {text[:200]!r}')
            print(f'  hidden/control-chars: {detect_hidden(text)}')
            break
        except Exception:
            pass
    else:
        print('  decode: failed all encodings')

    reader = csv.DictReader(io.StringIO(data.decode('utf-8-sig')))
    rows = list(reader)
    print(f'  rows: {len(rows)}')
    print(f'  columns: {reader.fieldnames}')

    if rows:
        times = [r.get('time') or r.get('datetime') or r.get('date') for r in rows]
        parsed = [parse_date(t) for t in times]
        valid = [x for x in parsed if x is not None]
        valid_count = len(valid)
        print(f'  parsed-timestamps: {valid_count}')
        if valid_count:
            print(f'  min-time: {min(valid)}')
            print(f'  max-time: {max(valid)}')
            print(f'  duplicates: {sum(1 for x in Counter(times).values() if x > 1)}')
            print(f'  sorted: {all(valid[i] <= valid[i+1] for i in range(len(valid)-1))}')
        print('  sample-row:', rows[0])
    print('-' * 80)

# bytewise compare
b1 = FILES[0].read_bytes()
b2 = FILES[1].read_bytes()
if b1 == b2:
    print('FILES ARE BYTE IDENTICAL')
else:
    print('FILES ARE NOT BYTE IDENTICAL')
    # first differing byte
    for i, (a, b) in enumerate(zip(b1, b2)):
        if a != b:
            print(f'first-diff-byte: index={i}, file1={a}, file2={b}')
            break
    else:
        if len(b1) != len(b2):
            print(f'length-diff: {len(b1)} vs {len(b2)}')
