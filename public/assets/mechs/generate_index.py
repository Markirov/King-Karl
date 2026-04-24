#!/usr/bin/env python3
"""
Generate index.json for BattleTech TRO catalog from SSW/MTF files.
Usage: python3 generate_index.py <directory> [--type vehicle]

Scans a directory for .ssw and .mtf files, extracts name and BV2,
and outputs an index.json file.

For vehicles, add --type vehicle to include the vehicle type field.

Examples:
  python3 generate_index.py assets/mechs/
  python3 generate_index.py assets/vehicles/ --type vehicle
"""
import os, sys, json, re
from xml.etree import ElementTree as ET

def parse_ssw(filepath):
    """Extract name, model, BV2, and type from SSW file."""
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        name = root.get('name', '')
        model = root.get('model', '')
        full_name = f"{name} {model}".strip()
        
        bv_el = root.find('battle_value')
        bv2 = int(bv_el.text) if bv_el is not None and bv_el.text else 0
        
        motive = root.findtext('motive_type', '')
        vtype = ''
        if 'hover' in motive.lower(): vtype = 'Hover'
        elif 'track' in motive.lower(): vtype = 'Tracked'
        elif 'wheel' in motive.lower(): vtype = 'Wheeled'
        elif 'vtol' in motive.lower(): vtype = 'VTOL'
        elif 'naval' in motive.lower(): vtype = 'Naval'
        
        return {'name': full_name, 'bv2': bv2, 'file': os.path.basename(filepath), 'type': vtype}
    except Exception as e:
        print(f"  Warning: {filepath}: {e}", file=sys.stderr)
        return None

def parse_mtf(filepath):
    """Extract name, model from MTF file. BV not available in MTF."""
    try:
        with open(filepath, 'r', errors='ignore') as f:
            lines = [l.strip() for l in f.readlines()]
        
        if lines[0].startswith('Version:'):
            chassis = lines[1] if len(lines) > 1 else ''
            model = lines[2] if len(lines) > 2 else ''
        else:
            chassis = model = ''
            for l in lines:
                if l.lower().startswith('chassis:'): chassis = l.split(':',1)[1].strip()
                elif l.lower().startswith('model:'): model = l.split(':',1)[1].strip()
        
        full_name = f"{chassis} {model}".strip()
        return {'name': full_name, 'bv2': 0, 'file': os.path.basename(filepath)}
    except Exception as e:
        print(f"  Warning: {filepath}: {e}", file=sys.stderr)
        return None

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    directory = sys.argv[1]
    is_vehicle = '--type' in sys.argv and 'vehicle' in sys.argv
    
    items = []
    for fname in sorted(os.listdir(directory)):
        fpath = os.path.join(directory, fname)
        if fname.endswith('.ssw'):
            entry = parse_ssw(fpath)
        elif fname.endswith('.mtf'):
            entry = parse_mtf(fpath)
        else:
            continue
        
        if entry:
            if not is_vehicle and 'type' in entry:
                del entry['type']
            items.append(entry)
    
    output_path = os.path.join(directory, 'index.json')
    with open(output_path, 'w') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    
    print(f"Generated {output_path}: {len(items)} units")
    bv_count = sum(1 for i in items if i.get('bv2', 0) > 0)
    print(f"  With BV2: {bv_count}, Without: {len(items) - bv_count}")

if __name__ == '__main__':
    main()
