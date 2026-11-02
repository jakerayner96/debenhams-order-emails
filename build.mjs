// Builds template/<brand>.html for every active fascia in brands.json from template/order.src.html.
// Usage: node build.mjs        Logos: python3 tools/logos.py · Icons: python3 tools/icons.py (once, or when one changes)
import fs from 'node:fs';
const BASE = 'https://jakerayner96.github.io/debenhams-order-emails/assets/';
const { brands } = JSON.parse(fs.readFileSync('brands.json', 'utf8'));
const src = fs.readFileSync('template/order.src.html', 'utf8');
const hasSvg = id => fs.existsSync(`assets/logos/svg/${id}.svg`);

// Header wordmark size from the SVG's aspect: wide marks fit 136px, squarer marks sit at 28px high (same rule as the gift card email).
const logoDims = id => {
  if (!hasSvg(id)) return { w: 0, h: 0 };
  const svg = fs.readFileSync(`assets/logos/svg/${id}.svg`, 'utf8');
  const vb = svg.match(/viewBox="([\d.\s-]+)"/)[1].split(/\s+/).map(Number);
  const aspect = vb[2] / vb[3];
  if (aspect >= 5) { const h = Math.max(14, Math.round(136 / aspect)); return { w: Math.round(h * aspect), h }; }
  return { w: Math.round(28 * aspect), h: 28 };
};

// WCAG contrast, to pick the dark-mode button and link colours
const lum = hex => { const c = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// Dark mode: DS Soft Black page, white ink, Grey 6 hairlines; the fascia's button and link stay when they read on the dark page, else go white.
const DARK = { page: '#0F0F0F', ink: '#FFFFFF', hair: '#323232', tile: '#242424', grey: '#B5B5B5', success: '#70C474', sale: '#FF6B6B' };
const darkTokens = b => {
  const btnOk = contrast(b.action, DARK.page) >= 3;
  const action = btnOk ? b.action : '#FFFFFF', onAction = btnOk ? b.onAction : '#000000';
  const link = contrast(b.link, DARK.page) >= 4.5 ? b.link : contrast(b.action, DARK.page) >= 4.5 ? b.action : '#FFFFFF';
  return { action, onAction, link };
};

// Light/dark image pair: the light PNG shows by default; the dark one is hidden until the dark-mode media query swaps them (Outlook never sees it).
const swap = (light, dark, w, h, alt, extra = '') =>
  `<img class="lm" src="${light}" width="${w}" height="${h}" alt="${alt}" style="display:block;width:${w}px;height:${h}px;${extra}">` +
  `<!--[if !mso]><!--><div class="dm" style="display:none;max-height:0;overflow:hidden"><img src="${dark}" width="${w}" height="${h}" alt="${alt}" style="display:block;width:${w}px;height:${h}px;${extra}"></div><!--<![endif]-->`;

// DS Message banner, warning tone (.msg--warning) = Figma "Safety Message Banner" 745:3513: 4px Yellow bar, Light Yellow body,
// padding 12 16 12 12, 20px Grey 4 info icon, 12 gap, 14 light black text. Stays light in dark mode.
const banner = (b, verb) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="4" bgcolor="#FFD600" style="width:4px;background:#FFD600;border-radius:4px 0 0 4px;font-size:1px;line-height:1px">&nbsp;</td>
            <td bgcolor="#FFFBE6" style="background:#FFFBE6;border-radius:0 4px 4px 0;padding:12px 16px 12px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="20" valign="middle" style="width:20px;padding:0 12px 0 0"><img src="${BASE}icons/info-grey.png" width="20" height="20" alt="" style="display:block;width:20px;height:20px"></td>
                  <td valign="middle" style="font-family:${b.font};font-size:14px;line-height:18px;font-weight:${b.light};color:#000000">Your order ${verb} delivered in multiple parcels and arrive at different times. Please see below for delivery information on the specific items in your order.</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;

const TILES = [['delivery_url', 'delivery-fast', 'Delivery Information'], ['returns_url', 'return', 'Returns Information'], ['faq_url', 'question', 'FAQs']];
const tiles = b => TILES.map(([url, icon, label], i) => `${i ? '            <td class="tile-gap" width="12" style="width:12px;font-size:1px;line-height:1px">&nbsp;</td>\n' : ''}            <td class="stack d-tile" width="33%" align="center" valign="top" bgcolor="${b.bannerBg}" style="background:${b.bannerBg};border-radius:${b.radius}px">
              <a class="d-ink" href="{{${url}}}" style="display:block;padding:20px 12px;font-family:${b.font};font-size:12px;line-height:16px;font-weight:${b.mid};color:${b.ink};text-decoration:none">
                <span style="display:block;width:24px;height:24px;margin:0 auto 8px auto">${swap(`${BASE}icons/${icon}.png`, `${BASE}icons/${icon}-white.png`, 24, 24, '')}</span>${label}
              </a>
            </td>`).join('\n');

const today = new Date().toISOString().slice(0, 10);
for (const b of brands) {
  if (b.disabled) { try { fs.unlinkSync(`template/${b.id}.html`); } catch {} console.log(`template/${b.id}.html — skipped (disabled)`); continue; }
  // Track parcel is a black button on every fascia (Figma 756-6038 / 747-1765), in the fascia's type, case and radius
  const btn = { ...b, action: '#000000', onAction: '#FFFFFF', actionHover: '#242424' };
  const d = logoDims(b.id), dk = darkTokens(btn);
  const map = {
    BRAND: b.name, BRAND_ID: b.id, DOMAIN: b.domain, MAIL_DOMAIN: b.domain.split('/')[0], DATE: today,
    FONT: b.font, FONT_LINK: b.gfont ? `<link href="https://fonts.googleapis.com/css2?family=${b.gfont}&display=swap" rel="stylesheet" type="text/css">` : '',
    W_LIGHT: b.light, W_MID: b.mid, W_STRONG: b.strong, W_BTN: b.btn, CTA_CASE: b.ctaCase, RADIUS: b.radius + 'px',
    ACTION: btn.action, ACTION_HOVER: btn.actionHover, ON_ACTION: btn.onAction, LINK: b.link, PAGE: b.page, INK: b.ink,
    HAIRLINE: b.hairline, TILE: b.bannerBg, SUCCESS: '#1F7A25', SALE: '#C90000', GREY: '#767676', WARN_BAR: '#FFD600', WARN_BG: '#FFFBE6',
    D_PAGE: DARK.page, D_INK: DARK.ink, D_HAIR: DARK.hair, D_TILE: DARK.tile, D_GREY: DARK.grey, D_SUCCESS: DARK.success, D_SALE: DARK.sale,
    D_ACTION: dk.action, D_ON_ACTION: dk.onAction, D_LINK: dk.link,
    BANNER: banner(b, 'may be'), BANNER_WILL: banner(b, 'will be'), TILES: tiles(b),
    // wordmark: black PNG on light, white PNG in dark mode; a text wordmark for fascias the DS has no mark for yet
    HEADER_LOGO: hasSvg(b.id)
      ? swap(`${BASE}logos/${b.id}.png`, `${BASE}logos/${b.id}-white.png`, d.w, d.h, b.name)
      : `<span class="d-ink" style="display:inline-block;font-family:${b.font};font-size:20px;line-height:24px;font-weight:${b.strong};letter-spacing:-0.01em;color:${b.ink}">${b.name}</span>`,
  };
  const out = src.replace(/\[\[([A-Z_]+)\]\]/g, (m, k) => { if (!(k in map)) throw new Error(`no value for ${m}`); return String(map[k]); });
  fs.writeFileSync(`template/${b.id}.html`, out);
  console.log(`template/${b.id}.html`, d, dk);
}
