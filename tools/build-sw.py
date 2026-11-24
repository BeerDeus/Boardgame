#!/usr/bin/env python3
"""Régénère la liste de pré-cache du service worker (à lancer avant chaque déploiement)."""
import os, re, json, time
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = ['./', 'index.html', 'play.html', 'editor.html', 'manifest.webmanifest']
for d in ['css', 'js', 'assets', 'vendor', 'levels']:
    for dp, _, fs in os.walk(os.path.join(root, d)):
        files += [os.path.relpath(os.path.join(dp, f), root).replace(os.sep, '/') for f in fs]
BUILD = str(int(time.time()))
sw = open(os.path.join(root, 'sw.js')).read()
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'grimoire-{BUILD}';", sw)
sw = re.sub(r"const PRECACHE = \[.*?\];", "const PRECACHE = " + json.dumps(sorted(set(files)), indent=0) + ";", sw, flags=re.S)
open(os.path.join(root, 'sw.js'), 'w').write(sw)
stamp = time.strftime('%Y-%m-%d %H:%M', time.localtime())
json.dump(sorted(set(files)), open(os.path.join(root, 'files.json'), 'w'))
open(os.path.join(root, 'js', 'version.js'), 'w').write("// Mis à jour par tools/build-sw.py à chaque préparation de déploiement\nexport const VERSION = '%s';\n" % stamp)
# Version dans les URL de code des pages HTML (contourne le cache du CDN de l'hébergeur)
CODE_URL = re.compile(r"""(["'])(\.?/?(?:css|js)/[\w./-]+?\.(?:css|js))(?:\?v=\w+)?(?=["'])""")
for h in ['index.html', 'play.html']:
    hp = os.path.join(root, h)
    html = open(hp).read()
    html = CODE_URL.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={BUILD}", html)
    html = re.sub(r"const BUILD = '\w*'", f"const BUILD = '{BUILD}'", html)
    open(hp, 'w').write(html)
print(f'{len(set(files))} fichiers pré-cachés')
