#!/usr/bin/env python3
"""Régénère la liste de pré-cache du service worker (à lancer avant chaque déploiement)."""
import os, re, json, time
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = ['./', 'index.html', 'play.html', 'manifest.webmanifest']
for d in ['css', 'js', 'assets', 'vendor']:
    for dp, _, fs in os.walk(os.path.join(root, d)):
        files += [os.path.relpath(os.path.join(dp, f), root).replace(os.sep, '/') for f in fs]
sw = open(os.path.join(root, 'sw.js')).read()
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'grimoire-{int(time.time())}';", sw)
sw = re.sub(r"const PRECACHE = \[.*?\];", "const PRECACHE = " + json.dumps(sorted(set(files)), indent=0) + ";", sw, flags=re.S)
open(os.path.join(root, 'sw.js'), 'w').write(sw)
stamp = time.strftime('%Y-%m-%d %H:%M', time.localtime())
open(os.path.join(root, 'js', 'version.js'), 'w').write("// Mis à jour par tools/build-sw.py à chaque préparation de déploiement\nexport const VERSION = '%s';\n" % stamp)
print(f'{len(set(files))} fichiers pré-cachés')
