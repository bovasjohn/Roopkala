# Roopkala themes — how they work and how to ask for a new one

A theme is **one CSS file**. It can change how the whole site looks and can add
new decorative elements. It can never change the layout, the content or how
anything works. So you can ask for a new theme at any time and I only have to
build that one file (plus optional ornament images).

## The three layers

| Layer | File | Who edits it |
|---|---|---|
| Structure (layout, behaviour) | `index.html` (later: the Astro components) and `base.css` | Only when a feature changes. Not for looks. |
| Look | `themes/<name>.css` | A theme author. This is the file you swap. |
| Optional artwork | `themes/<name>/*.svg` | The same author. |

`base.css` defines a default value for every setting, so a theme only needs to
list what it wants to change. Light and dark mode come from the same file.

## 1. Settings you can change (tokens)

Set these inside `:root{ }` for light mode and `:root[data-mode=dark]{ }` for dark mode.

**Colour:** `--bg` page · `--card` cards and panels · `--ink` text · `--muted` secondary text ·
`--line` borders · `--accent` buttons, links, selected options, prices (HEX only) ·
`--onacc` text on the accent · `--gold` optional second accent ·
`--hero-ink`, `--hero-overlay` text colour and shading on the hero image ·
`--ok-bg/-ink`, `--warn-bg/-ink`, `--bad-bg/-ink` stock labels ·
`--wa`, `--wa-ink` WhatsApp buttons · `--sold-bg/-ink` SOLD OUT badge ·
`--tab-on-bg/-ink` selected tab · `--tint-mix` (0–100) how strongly the product-photo
colour tints the product page · `--img-filter` filter over product photos.

**Type:** `--font-body`, `--font-display`, `--h-weight`, `--h-case`, `--h-track`,
`--logo-font`, `--logo-name-size`, `--logo-name-weight`, `--logo-name-track`, `--logo-by-size`, `--logo-align`, `--label-case`, `--label-track`,
`--hero-title-size`, `--btn-size`, `--btn-weight`, `--btn-case`, `--btn-track`, `--btn-pad`, `--btn-shadow`.

**Shape and depth:** `--r-card`, `--r-hero`, `--r-panel`, `--r-btn`, `--r-pill`, `--r-input`,
`--r-gal`, `--r-thumb`, `--r-small` (corner radii) · `--card-border`, `--panel-border` ·
`--shadow`, `--shadow-hover`, `--shadow-lg` · `--card-lift` (hover rise) · `--blur`.

**Layout dials** (these adjust spacing and alignment inside the same structure):
`--maxw`, `--gutter`, `--grid-min`, `--grid-min-lg`, `--grid-gap`, `--grid-gap-lg`,
`--card-ratio` and `--gal-ratio` (photo shape of cards and of the product-page gallery, e.g. `4/5` or `1/1`), `--card-w-car`, `--card-align`,
`--hero-h`, `--hero-pad`, `--hero-items`, `--hero-justify`, `--hero-align`, `--hero-in`,
`--tabs-justify`, `--header-bg`, `--header-border`, `--dur`, `--ease`.

## 2. Restyling any element (hooks)

Themes can use ordinary CSS on these stable names. They won't be renamed.

`header` `.logo` `.hero` `.hero-in` `.hs-dots` `.tabs` `.tab` `.sec` (section heading) `.card` `.ph` (photo)
`.cb` (card text) `.price` `.pill` `.sold` `.pdp` (product page) `.panel` `.dot` (colour swatch) `.chip` (size)
`.qty` `.btn` (`.dark` `.ghost` `.wa`) `.share` `.lines` (cart) `.box` (login) `footer` `.soc` `.bnav` `.toast`

Two page-level hooks: `body[data-page]` is `home`, `shop`, `product`, `cart`, `about`, `account` or `admin`
(for example `body[data-page=product] .panel{…}`), and `html[data-mode]` is `light` or `dark`.

Every element also has free `::before` and `::after`, so a theme can add lines, badges, frames and
ornaments to almost anything without new markup.

## 3. New decorative elements (slots)

Six empty, hidden elements exist in the page. A theme switches one on with `display:block` and
draws whatever it likes (shapes, gradients, SVG backgrounds, even a text label via `::after`).

| Slot | Where it sits | Positioning |
|---|---|---|
| `.deco-bg` | Full-page background layer | `position:fixed` |
| `.deco-hero-a` `.deco-hero-b` | Inside every hero slide | `position:absolute` over the photo |
| `.deco-card` | Inside each product card's photo | `position:absolute` |
| `.deco-pdp` | Top of the product page info panel | `position:absolute` |
| `.deco-footer` | Above the footer logo | in the flow, centred |

`themes/modern.css` and `themes/heritage.css` show how: a grid or lattice backdrop, a corner
mark or flourish on each card, a frame on the hero, a divider on the product page.

## 4. Rules for theme authors

- CSS only. No JavaScript, and no changes to `base.css` or the page.
- Light **and** dark must both work. Check them both.
- `--accent` must be a HEX colour (the admin colour picker reads it). Keep text contrast at least 4.5:1.
- Never hide or disguise functional things: price, stock label, SOLD OUT, Add to bag, WhatsApp, Enquire.
- Decorative text added with `::after` is not read by screen readers and is not translated. Keep it ornamental.
- Fonts: one `@import` of Google Fonts on the very first line. Keep it to two families.
- Artwork goes in `themes/<name>/` and is referenced with a relative `url()`.

## 5. What a theme cannot do

Move or reorder sections, change what a product grid contains, add clickable buttons or links,
change any text, or alter behaviour. If you later want structural choices (for example a list view
instead of a grid), I add a switch to the structure **once**, and every theme can then use it.

## 6. Adding and switching themes

**In this mockup:** copy `themes/_template.css` to `themes/mytheme.css`, then add
`{id:'mytheme',name:'My theme'}` to the `SKINS` list near the top of the script in `index.html`.
Pick it from the Theme menu in the top bar or in Admin → Appearance. The choice is remembered in your browser only.

**In the real site:** the theme list becomes a small registry file, Admin → Appearance → Theme saves
the choice in `site_settings` (key `appearance`, field `theme`), and the server writes
`<link rel="stylesheet" href="/themes/<theme>.css">` into every page, so there is no flash of the wrong
style. The admin's accent colour is optional: left empty, the theme's own accent is used; set it, and it
overrides the theme. Themes are code, so only trusted files are installed by you. The admin chooses from
a list and never uploads or pastes CSS, which avoids style-injection problems.

## 7. How to ask me for a theme

Send something like this, as much or as little as you know:

> Build a theme called **Pastel Boutique**. Mood: soft, playful, feminine. Colours: blush pink background,
> mint accent, dark plum text. Fonts: a rounded serif for headings, clean sans for text. Very round corners,
> no borders, soft shadows. Add small floral corner marks on product cards and a scalloped divider
> in the footer. Light and dark mode.

I deliver `themes/pastel-boutique.css` (and its artwork folder if needed) plus the one line to register it.
Nothing else in the site changes.

## Optional theme script (animations / effects)
A theme may ship a small `public/themes/<id>.js` for effects CSS cannot do (scroll reveals, parallax, a header that shrinks on scroll).
To switch it on, add the theme id to `THEME_SCRIPTS` in `src/lib/config.ts`. The script loads only when that theme is active.
Keep it small, never read or write customer data, and respect `prefers-reduced-motion`.

## Adding a theme (v0.4.0+)
1. Put `public/themes/<id>.css` in the project (copy `THEME-TEMPLATE.css`).
2. Add one line to `THEME_INFO` in `src/lib/config.ts`: `{ id, label, vibe, swatch: [bg, accent, gold] }`.
3. Push. It appears in Admin → Settings → Look, with a Preview link.
