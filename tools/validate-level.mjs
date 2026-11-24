#!/usr/bin/env node
// Vérifie un niveau JSON : node tools/validate-level.mjs levels/prologue.json
import { readFileSync } from 'node:fs';
import { checkLevel } from '../js/core/level-check.js';
const file = process.argv[2] || 'levels/prologue.json';
const { errors, warnings } = checkLevel(JSON.parse(readFileSync(file, 'utf8')));
for (const w of warnings) console.log('⚠ ' + w);
for (const e of errors) console.log('✗ ' + e);
console.log(errors.length ? `✗ ${errors.length} erreur(s), ${warnings.length} avertissement(s)` : `✓ ${file} valide (${warnings.length} avertissement(s))`);
process.exit(errors.length ? 1 : 0);
