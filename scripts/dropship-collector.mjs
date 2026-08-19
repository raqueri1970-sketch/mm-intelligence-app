import { chromium } from 'playwright';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.MM_SUPABASE_URL;
const SERVICE_KEY = process.env.MM_SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_STATE_B64 = process.env.DROPSHIP_STORAGE_STATE_B64;
const MARKET = process.env.DROPSHIP_MARKET || 'US';
const MAX_PRODUCTS = Number(process.env.DROPSHIP_MAX_PRODUCTS || 100);
const PAGE_URL = process.env.DROPSHIP_LIBRARY_URL || 'https://app.dropship.io/products/product-library';

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing MM_SUPABASE_URL or MM_SUPABASE_SERVICE_ROLE_KEY');
if (!STORAGE_STATE_B64) throw new Error('Missing DROPSHIP_STORAGE_STATE_B64');

const storageState = JSON.parse(Buffer.from(STORAGE_STATE_B64, 'base64').toString('utf8'));

function num(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  if (!s) return null;
  // Dropship may render pt-BR or en-US numbers. Resolve the most likely decimal separator.
  let n;
  if (s.includes(',') && s.includes('.')) {
    n = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? Number(s.replace(/\./g, '').replace(',', '.'))
      : Number(s.replace(/,/g, ''));
  } else if (s.includes(',')) {
    const parts = s.split(',');
    n = parts.at(-1)?.length === 2 ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s.replace(/,/g, ''));
  } else {
    n = Number(s);
  }
  return Number.isFinite(n) ? n : null;
}

function hashKey(parts) {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 40);
}

function walk(obj, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    for (const x of obj) walk(x, out);
    return out;
  }
  const keys = Object.keys(obj).map(k => k.toLowerCase());
  const looksProduct = keys.some(k => ['productname','product_name','title','name'].includes(k)) &&
    keys.some(k => ['revenue','sales','price','orders','sold','sales30d','sales_30d'].includes(k));
  if (looksProduct) out.push(obj);
  for (const v of Object.values(obj)) walk(v, out);
  return out;
}

function pick(o, names) {
  for (const name of names) {
    if (o?.[name] != null) return o[name];
    const found = Object.keys(o || {}).find(k => k.toLowerCase() === name.toLowerCase());
    if (found) return o[found];
  }
  return null;
}

function normalizeApiProduct(o) {
  const name = pick(o, ['productName','product_name','title','name']);
  if (!name || String(name).length < 3) return null;
  const productUrl = pick(o, ['productUrl','product_url','url','link']);
  const storeName = pick(o, ['shopName','shop_name','storeName','store_name','sellerName']);
  const storeUrl = pick(o, ['shopUrl','shop_url','storeUrl','store_url','sellerUrl']);
  const imageUrl = pick(o, ['imageUrl','image_url','thumbnail','image','cover']);
  const revenue = num(pick(o, ['revenue30d','revenue_30d','revenue','gmv30d','gmv']));
  const units = num(pick(o, ['sales30d','sales_30d','orders30d','sold30d','sales','orders','sold']));
  const growth = num(pick(o, ['growthRate','growth_rate','growth','salesGrowth']));
  const pmin = num(pick(o, ['priceMin','price_min','minPrice','price']));
  const pmax = num(pick(o, ['priceMax','price_max','maxPrice']));
  const external = pick(o, ['productId','product_id','id','uuid','itemId','item_id']);
  return {
    external_key: String(external || hashKey([name, storeName, productUrl])),
    source_name: 'dropship.io', market_code: MARKET, product_name: String(name).slice(0, 500),
    product_url: productUrl ? String(productUrl) : null, image_url: imageUrl ? String(imageUrl) : null,
    store_name: storeName ? String(storeName).slice(0, 300) : null, store_url: storeUrl ? String(storeUrl) : null,
    price_min: pmin, price_max: pmax ?? pmin, currency: 'USD', sales_30d: revenue,
    units_30d: units == null ? null : Math.round(units), growth_rate: growth,
    shipping_text: null, platform: 'TikTok/Shopify', raw_data: o, last_seen_at: new Date().toISOString()
  };
}

async function scrapeVisibleRows(page) {
  return await page.evaluate((limit) => {
    const money = /\$\s*[0-9][0-9.,]*/g;
    const salesRe = /([0-9][0-9.,]*)\s*vendas/i;
    const anchors = [...document.querySelectorAll('a')];
    const candidates = [];
    const seen = new Set();
    for (const a of anchors) {
      const text = (a.textContent || '').trim();
      if (text.length < 3) continue;
      let row = a.closest('tr,[role="row"]');
      if (!row) {
        let p = a.parentElement;
        for (let i=0; p && i<7; i++, p=p.parentElement) {
          const t = (p.innerText || '');
          if (/vendas/i.test(t) && /\$/.test(t)) { row = p; break; }
        }
      }
      if (!row) continue;
      const rt = (row.innerText || '').replace(/\s+/g, ' ').trim();
      if (!/vendas/i.test(rt) || !/\$/.test(rt) || rt.length > 1800) continue;
      const key = rt.slice(0, 250);
      if (seen.has(key)) continue;
      seen.add(key);
      const links = [...row.querySelectorAll('a')].map(x => ({text:(x.textContent||'').trim(), href:x.href})).filter(x=>x.href);
      const imgs = [...row.querySelectorAll('img')].map(x=>x.src).filter(Boolean);
      const ms = rt.match(money) || [];
      const sales = rt.match(salesRe);
      candidates.push({ rawText: rt, links, images: imgs, money: ms, unitsText: sales?.[1] || null });
      if (candidates.length >= limit) break;
    }
    return candidates;
  }, MAX_PRODUCTS);
}

function normalizeVisibleRow(r) {
  const links = r.links || [];
  const productLink = links.find(x => /product/i.test(x.href)) || links[0];
  const storeLink = links.find(x => /shop|store/i.test(x.href) && x.href !== productLink?.href) || links[1];
  const name = productLink?.text || r.rawText.split('$')[0].trim();
  if (!name) return null;
  const amounts = (r.money || []).map(num).filter(x => x != null);
  const units = num(r.unitsText);
  // In the current Product Library row the first currency amount is price and the larger amount is 30d revenue.
  const price = amounts.length ? amounts[0] : null;
  const revenue = amounts.length > 1 ? Math.max(...amounts.slice(1)) : null;
  return {
    external_key: hashKey([productLink?.href, storeLink?.href, name]), source_name:'dropship.io', market_code: MARKET,
    product_name:name.slice(0,500), product_url:productLink?.href || null, image_url:r.images?.[0] || null,
    store_name:storeLink?.text || null, store_url:storeLink?.href || null, price_min:price, price_max:price,
    currency:'USD', sales_30d:revenue, units_30d:units == null ? null : Math.round(units), growth_rate:null,
    shipping_text:r.rawText.match(/frete gr[aá]tis|\d+\s*a\s*\d+\s*dias/ig)?.join(' | ') || null,
    platform:'TikTok/Shopify', raw_data:r, last_seen_at:new Date().toISOString()
  };
}

async function upsert(rows) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mm_dropship_products?on_conflict=source_name,external_key,market_code`, {
    method:'POST',
    headers:{
      apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`, 'Content-Type':'application/json',
      Prefer:'resolution=merge-duplicates,return=minimal'
    },
    body:JSON.stringify(rows)
  });
  if (!res.ok) throw new Error(`Supabase upsert failed ${res.status}: ${await res.text()}`);
}

const browser = await chromium.launch({headless:true});
const context = await browser.newContext({storageState, locale:'pt-BR'});
const page = await context.newPage();
const apiObjects = [];
page.on('response', async (resp) => {
  try {
    const ct = resp.headers()['content-type'] || '';
    const u = resp.url();
    if (!ct.includes('application/json') || !/product|library|search|tiktok|shop/i.test(u)) return;
    const body = await resp.json();
    apiObjects.push(...walk(body).slice(0, 500));
  } catch {}
});

await page.goto(PAGE_URL, {waitUntil:'domcontentloaded', timeout:90000});
await page.waitForTimeout(12000);
if (/login|sign-in|auth/i.test(page.url())) throw new Error('Dropship session expired. Refresh DROPSHIP_STORAGE_STATE_B64.');

// Scroll to load more rows without aggressively hammering the service.
for (let i=0;i<6;i++) {
  await page.mouse.wheel(0, 1100);
  await page.waitForTimeout(1300);
}

let rows = apiObjects.map(normalizeApiProduct).filter(Boolean);
const visible = (await scrapeVisibleRows(page)).map(normalizeVisibleRow).filter(Boolean);
rows.push(...visible);

const dedup = new Map();
for (const r of rows) {
  const k = `${r.source_name}|${r.external_key}|${r.market_code}`;
  const prev = dedup.get(k);
  // Prefer API-derived rows when they include more structured data.
  if (!prev || Object.keys(r.raw_data || {}).length > Object.keys(prev.raw_data || {}).length) dedup.set(k, r);
}
rows = [...dedup.values()].slice(0, MAX_PRODUCTS);

await upsert(rows);
console.log(JSON.stringify({ok:true, collected:rows.length, market:MARKET, page:page.url(), api_candidates:apiObjects.length}, null, 2));
await browser.close();
