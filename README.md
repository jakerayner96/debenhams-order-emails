# Group order emails — order confirmation + dispatch

The transactional order confirmation and dispatch emails rebuilt in the same format as the gift card email ([debenhams-giftcard-email](https://github.com/jakerayner96/debenhams-giftcard-email)), for **every fascia** from one source template. Light and dark mode.

**Live preview:** https://jakerayner96.github.io/debenhams-order-emails/: brand tabs across the top; email, scenario, products per parcel, light/dark and device on the left. · **Figma:** [Order Emails](https://www.figma.com/design/fZlGOMy8NZR9PdWKDJ8HAG/Order-Emails) (Order Confirmation 169-1440, Dispatch Email 390-3683 … 390-5089). The template is the source of truth.

## What's here

| Path | What |
|---|---|
| `template/order.src.html` | **The source.** One template, both emails (`is_dispatch`). Table layout, inline styles, 600px, MSO guards, Mailgun handlebars (`#if`, `#unless`, `#each`, `@first`), `[[TOKEN]]` placeholders for the fascia values. Edit this. |
| `brands.json` | One entry per fascia (17, DS picker order), copied from the gift card email: font, weights, button case and radius, `surface/action`, `text/on-action`, `text/link`, `surface/page`, hairline, tile surface, domain. |
| `build.mjs` | `node build.mjs` → `template/<brand>.html` for every fascia. Also derives the dark-mode button and link colours (kept when they reach contrast on the dark page, else white). Generated files; don't hand-edit. |
| `template/<brand>.html` | The built emails, one per fascia. Hand one to Mailgun per fascia. |
| `products.json` | Preview data only: sample products per fascia from the DS (PLP template sets matched to their images by name, else the PDP template product). Images stay on the DS Pages site. `node tools/products.mjs <debenhamsgroup.design clone>` regenerates it. |
| `tools/logos.py` · `tools/icons.py` | Render the wordmarks (`assets/logos/svg/`, from the DS) and the DS icons (`assets/icons/svg/`: delivery-fast, return, question, info) to 2× PNGs, black for light and white for dark. Need Chrome + Pillow. |
| `index.html` | Preview shell. Renders the chosen fascia's template with Handlebars and the scenario's merge data; **Copy merge data** gives the JSON for that scenario. Serve over HTTP (`python3 -m http.server 3000`). |

## Scenarios (from the Figma use cases)

**Order confirmation**: *One delivery* (1 product = no banner, 2+ = Delivery information banner) · *Several deliveries + brand partners* (grouped by who delivers and how, fastest to slowest delivery, brand partners last; totals with discounts).

**Dispatch**: *Full order, 1 parcel* · *Full order, 2+ parcels* (a Track parcel per parcel) · *Part sent, part awaiting* · *Sent + brand partners* · *All scenarios together* (sent, already sent, awaiting dispatch, two brand partners).

## Design decisions

- **Same system as the gift card email.** Wordmark, then "Hi {{recipient_name}}," then the headline at 36 strong, the order number, 32px gutters (20 on mobile), a 400px Track parcel button, black on every fascia as in the Figma (white in dark mode), in the fascia's case and radius. Totals run full width, with "Discounts Included:" and its lines right-aligned under Delivery (Figma 745-5971).
- **Safety message** closes every email (Figma "Safety Message Section"): 12 light in Grey 4 (#767676), two paragraphs, 80px below. It replaces the footer links. Type, weights, button case and radius per fascia from the DS tokens.
- **Copy is the Figma's, word for word** (frames 747-1765 and 756-6038): "Hi Paul" · "Thank you for your order." + "We will let you know when it's on the way." · "Your order is on its way!" · "Part of your order is on its way!" · "Order Number:" · Delivery Details / Order Details (Shipping Address on the confirmation, Delivery Address on dispatch) · Your Order (centred) · We've Sent These Items · Awaiting Dispatch From Us · Coming from our brand partners · "Delivered by:" · "Colour: Blue, Size: 10" · "Quantity: 1" · "SKU:".
- **Delivery banner** = DS Message banner, warning tone `.msg--warning` (Figma "Safety Message Banner" 745-3513: Yellow bar, Light Yellow body, 20px black info icon, 14 light black text), under the details. Confirmation: "may be delivered…", shown for 2+ products. Dispatch: "will be delivered…", shown when the order ships in 2+ parcels.
- **Items**: 88×132 image, brand line (when it isn't the fascia), name, colour · size, quantity, SKU in grey (#767676). Price on the right on desktop and under the details on mobile. Sale price in `text/error` red, then the was price. Delivery method in `text/success` green.
- **Track parcel** under every sent parcel. Brand partner and awaiting items have no button.
- **Help tiles** (Delivery Information · Returns Information · FAQs): `surface/media` tiles with DS icons, in a row on desktop and stacked on mobile.
- **Dark mode**: `color-scheme: light dark` plus `prefers-color-scheme` rules (Apple Mail, iOS Mail, Outlook for Mac/iOS/Android) and `[data-ogsc]`/`[data-ogsb]` rules (Outlook.com). Page #0F0F0F, white ink, #323232 hairlines, #242424 tiles, the wordmark and icons swap to white PNGs, a black button turns white with black ink, the success green and sale red lighten (#70C474 / #FF6B6B). The banner and product images stay as they are. Gmail apps apply their own inversion and ignore these rules.

## Merge fields

`recipient_name` · `order_ref` · `order_date` · `payment_method` · `address_lines[]` · `is_dispatch` · `is_partial` · `show_banner` · `sections[]` (`is_order` | `is_sent` | `is_awaiting` | `is_partner`, `shipments[]` → `delivered_by`, `method`, `track_url`, `items[]` → `brand`, `name`, `colour`, `size`, `qty`, `sku`, `price`, `was`, `image_url`, `url`) · `has_totals` · `subtotal` · `delivery` · `discounts[]` (`label`, `amount`) · `total` · `shop_url` · `delivery_url` · `returns_url` · `faq_url`

## Working on it

Edit `template/order.src.html` or `brands.json`, run `node build.mjs`, check in `index.html`, push to `main`. GitHub Pages serves the repo root.
