#!/usr/bin/env node
/*
 * ROB RUN Wiki · build data
 *
 * Reads the generated atlas data (dist/data.js and dist/db.js from the
 * rob-run-atlas project, built from the robrun_wiki Supabase schema) and writes
 * data/items.js plus the item icons this wiki needs.
 *
 * Usage:  node scripts/build-data.js <path-to-rob-run-atlas>
 *
 * Which items belong in the wiki: everything that has a use or a way to get it
 * other than world loot (purchase, barter, filling, doors, safes, base). Items
 * that are "sell only" and only lie around in the open world are left out.
 */
const fs = require('fs');
const path = require('path');

const atlas = process.argv[2];
if (!atlas) { console.error('Usage: node scripts/build-data.js <path-to-rob-run-atlas>'); process.exit(1); }
const dist = path.join(atlas, 'dist');
const root = path.join(__dirname, '..');

global.window = {};
eval(fs.readFileSync(path.join(dist, 'data.js'), 'utf8'));
eval(fs.readFileSync(path.join(dist, 'db.js'), 'utf8'));
const D = window.ATLAS_DATA, DB = window.ATLAS_DB;
const byId = new Map(D.items.map(i => [i.id, i]));

// Sections of the wiki and the game item types that go into each one.
const SECTIONS = [
  ['weapons', 'Оружие', ['assault-rifle', 'smg', 'handgun', 'shotgun']],
  ['ammo', 'Боеприпасы', ['ammo']],
  ['gear', 'Броня и снаряжение', ['armor', 'armor-plate', 'backpack', 'belt']],
  ['meds', 'Медицина', ['medicine']],
  ['grenades', 'Гранаты', ['grenade']],
  ['tools', 'Инструменты и прочее', ['police-radio', 'police-badge', 'bolt-cutter', 'sell']],
  ['keys', 'Ключи и доступ', ['key-container', 'key-warehouse', 'lockpick', 'car', 'helicopter']],
  ['barter', 'Бартер и заполняемые предметы', ['cumulative', 'video-card', 'bill-of-sale', 'roulette-chip', 'consumable']],
  ['base', 'База: постройки и мебель', ['main-building', 'compound-wall', 'outbuilding', 'furniture']],
  ['upgrades', 'Улучшения базы и авто', ['cargo-open-workbench-upgrade', 'cargo-exchange-workbench-upgrade', 'collection-table-upgrade', 'money-workbench-upgrade', 'car-upgrade', 'cargo-charge-workbench-upgrade', 'crypto-workbench-upgrade', 'cargo-production-workbench-upgrade']],
  ['raid', 'Рейд', ['plot-building-defense-module', 'plot-building-special-module', 'plot-building-decoder']],
];

// Items shown with a full page in this demo.
const SAMPLE = ['rc556_m3', 'rifle_ammo_1', 'vest3_m1', 'injector_1', 'smoke_grenade_1', 'mini_drill_1', 'usb_1_cumulative', 'vip_key_6', 'narco_farm_1', 'money_workbench_speedup_1'];

const USE_KEYS = ['purchases', 'barters', 'usedInBarters', 'conversions', 'fills', 'usedForDoors', 'usedForContainers'];
const inWiki = i => {
  const g = DB.items[i.id] || {}, a = D.acquisition[i.id] || {};
  return i.id !== 'cash_1' && (g.typeId !== 'sell' || USE_KEYS.some(k => (a[k] || []).length));
};
const sectionOf = id => { const t = DB.items[id]?.typeId; const s = SECTIONS.find(s => s[2].includes(t)); return s ? s[0] : 'tools'; };
const counts = {};
D.items.filter(inWiki).forEach(i => { const s = sectionOf(i.id); counts[s] = (counts[s] || 0) + 1; });

const clean = s => (s || '').replace(/<[^>]+>/g, '');
const building = pid => { const p = D.points.find(p => p.id === pid); return p ? p.building || p.region : null; };
const icons = new Set();
const useIcon = id => { if (byId.has(id)) icons.add(id); };

const items = SAMPLE.map(id => {
  const i = byId.get(id), g = DB.items[id] || {}, a = D.acquisition[id] || {};
  useIcon(id);
  const o = { id, name: i.name, desc: clean(i.description), rarity: i.rarity, price: i.price, sell: g.sell, sellMul: g.sellMultiplier, stack: g.stack, cells: i.cells, type: g.type, cat: sectionOf(id) };
  if (g.weapon) {
    const w = g.weapon, r = w.raw;
    o.weapon = { damage: r.maxDamage, head: r.headModifier, range: r.maxDamageDistance, rpm: Math.round(60000 / r.cooldown), mag: w.magazine, reload: r.reload / 1000, reloadMin: r.reloadMin / 1000, aim: r.aimIn / 1000, draw: r.takeIn / 1000, auto: w.automatic, ammo: w.ammo };
    useIcon(w.ammo);
  }
  if (g.armor) o.armor = g.armor;
  if (g.ammoFor) { o.ammoFor = g.ammoFor; g.ammoFor.forEach(useIcon); }
  o.buy = (a.purchases || []).map(p => ({ vendor: p.vendorName, tier: p.tier, mod: p.buyPriceModifier, role: p.roleRestricted, unlock: (p.unlock?.ingredients || []).map(e => ({ id: e.id, n: e.amount })) }));
  o.barters = a.barters || [];
  o.usedIn = D.barterRecipes.filter(r => r.ingredients.some(e => e.id === id || e.id === a.fills?.[0]?.result));
  o.usedIn.forEach(r => { useIcon(r.result); r.ingredients.forEach(e => useIcon(e.id)); });
  o.fills = (a.fills || []).map(f => ({ result: f.result, max: f.maxPoints, action: f.action, places: [...new Set(f.actionPoints.map(x => building(x.pointId)).filter(Boolean))] }));
  o.fills.forEach(f => useIcon(f.result));
  o.doors = (a.usedForDoors || []).map(building);
  o.containers = (a.usedForContainers || []).length;
  o.containerPlaces = [...new Set((a.usedForContainers || []).map(building).filter(Boolean))];
  return o;
});
useIcon('cash_1');

const iconIds = [...icons].sort();
const names = {};
for (const id of [...icons]) { const i = byId.get(id); names[id] = { name: i.name, rarity: i.rarity }; }

const out = {
  cats: SECTIONS.map(([k, n]) => ({ k, n, count: counts[k] || 0 })),
  total: D.items.filter(inWiki).length,
  all: D.items.length,
  items, names,
  rarities: D.rarities,
  version: '0.1-demo',
  source: 'robrun_wiki · build ' + (D.build || '26342425'),
  icons: Object.fromEntries(iconIds.map(id => [id, 'assets/items/' + id + '.webp'])),
};

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'items.js'),
  '/* Generated by scripts/build-data.js from the ROB RUN atlas data (robrun_wiki, build 26342425). Do not edit by hand. */\nwindow.WIKI_DATA=' + JSON.stringify(out, null, 1) + ';\n');

fs.mkdirSync(path.join(root, 'assets', 'items'), { recursive: true });
let copied = 0;
for (const id of iconIds) {
  const src = path.join(dist, byId.get(id).icon);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(root, 'assets', 'items', id + '.webp')); copied++; }
  else console.warn('Icon missing (run npm run build in rob-run-atlas first):', src);
}
console.log(`Wiki items: ${out.total} of ${out.all}. Sample pages: ${items.length}. Icons copied: ${copied}/${iconIds.length}.`);
