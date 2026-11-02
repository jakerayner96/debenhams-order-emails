// Sample products for the preview, per fascia, from the DS: the PLP template's live product sets (projects/plp-alignment/data.js,
// images img/<brand>/p<n>.jpg) or, for fascias without a PLP set, the Debenhams set filtered to that brand, else the PDP template's
// product (templates/products.js, images 1–4.webp). Images stay on the DS Pages site (absolute URLs). Preview data only: the real
// email gets its items from the order.
// Usage: node tools/products.mjs <path to a debenhamsgroup.design clone>   → products.json
import fs from 'node:fs';
import vm from 'node:vm';
const DS = process.argv[2];
if (!DS) throw new Error('usage: node tools/products.mjs <debenhamsgroup.design clone>');
const PAGES = 'https://jakerayner96.github.io/debenhamsgroup.design/';
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(`${DS}/projects/plp-alignment/data.js`, 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(`${DS}/templates/products.js`, 'utf8'), ctx);
const PLP = ctx.window.PRODUCTS_ALL, PDP = ctx.window.DG_PDP_PRODUCTS;
const { brands } = JSON.parse(fs.readFileSync('brands.json', 'utf8'));

// the image map (p0=NavyOversizedArgyleJumperNavy): which picture is which product, and its colour
const colours = id => {
  const f = `${DS}/projects/plp-alignment/img/${id}/map.txt`;
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(fs.readFileSync(f, 'utf8').trim().split('\n').map(l => l.split('=')).filter(x => x[1]).map(([k, v]) => [k.trim(), v.trim()]));
};
const squash = s => String(s).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
const colourOf = (map, key, name) => {
  const v = map[key]; if (!v) return null;
  const n = squash(name), raw = v.replace(/[^A-Za-z0-9]/g, '');
  const rest = raw.toLowerCase().startsWith(n) ? raw.slice(n.length) : '';
  return rest ? rest.replace(/([a-z])([A-Z])/g, '$1 $2') : null;
};
const SIZES = ['10', '12', 'M', '8', '14', 'S'];
const sku = (id, i) => 'M' + String(5063110842620 + (id.length * 7919 + i * 104729)).slice(0, 13);
const name = s => String(s).replace(/\s+/g, ' ').trim();

// The PLP image index isn't always the list position, so each product takes the image whose map entry starts with its name
// (map.txt covers p0–p15); products without a matching image are left out rather than shown with someone else's picture.
const fromPlp = (dir, list, id, fascia) => {
  const map = colours(dir), keys = Object.keys(map);
  // a brand field that is really a product name (the Debenhams set's "Long Waxed Coat" on a cardigan) is a capture slip: leave the row out
  const slip = p => p.brand && Object.values(map).some(v => squash(v).startsWith(squash(p.brand)));
  return list.filter(p => !slip(p)).map((p, i) => {
    const key = keys.find(k => squash(map[k]).startsWith(squash(p.name)));
    if (!key) return null;
    return {
      brand: p.brand && squash(p.brand) !== squash(fascia) ? name(p.brand) : '', // the brand line only when it isn't the fascia itself
      name: name(p.name), colour: colourOf(map, key, p.name) || 'Black', size: SIZES[i % SIZES.length], qty: 1,
      sku: sku(id, i), price: p.price, was: p.was || '', image_url: `${PAGES}projects/plp-alignment/img/${dir}/${key}.jpg`,
    };
  }).filter(p => p && fs.existsSync(`${DS}/projects/plp-alignment/img/${dir}/${p.image_url.split('/').pop()}`));
};

const out = {};
const group = brands.map(b => squash(b.name));
const debs = () => PLP.debenhams.map((p, i) => ({ ...p, img: p.img ?? i }));
for (const b of brands) {
  let items = [];
  if (PLP[b.id]) items = fromPlp(b.id, PLP[b.id], b.id, b.name);
  if (items.length < 6) {
    const mine = debs().filter(p => p.brand && squash(p.brand) === squash(b.name));
    if (mine.length) items = items.concat(fromPlp('debenhams', mine, b.id, b.name));
  }
  if (items.length < 4 && PDP[b.id]) {
    const p = PDP[b.id];
    items = items.concat(p.imgs.map((img, i) => ({
      brand: p.brand && squash(p.brand) !== squash(b.name) ? p.brand : '', name: name(p.name), colour: p.colour || 'Black',
      size: (p.sizes || SIZES)[i % (p.sizes || SIZES).length], qty: 1, sku: sku(b.id, 40 + i), price: p.price, was: p.was || '', image_url: PAGES + img,
    })));
  }
  // last resort (Coast, Dorothy Perkins: no PLP set, no PDP product, their Debenhams items past the image map): Debenhams' own
  // group-brand items, without a brand line so they read as the fascia's
  if (items.length < 4) items = items.concat(fromPlp('debenhams', debs().filter(p => p.brand && group.includes(squash(p.brand))), b.id, b.name).map(p => ({ ...p, brand: '' })));
  // marketplace: on Debenhams the brand partners are the non-group brands in its set (Living and Home, OHS, Regatta …)
  const partners = b.id === 'debenhams'
    ? fromPlp('debenhams', debs().filter(p => p.brand && !group.includes(squash(p.brand))), 'partner', b.name)
    : [];
  const own = b.id === 'debenhams' ? items.filter(p => !partners.some(q => q.image_url === p.image_url)) : items;
  out[b.id] = { items: own.slice(0, 12), partners: partners.slice(0, 6) };
  console.log(b.id, out[b.id].items.length, 'items', out[b.id].partners.length, 'partner items');
}
fs.writeFileSync('products.json', JSON.stringify(out, null, 1) + '\n');
