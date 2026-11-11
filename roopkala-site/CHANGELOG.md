# Changelog

## 0.4.0
- Ten new themes with looping CSS animation, icons and light + dark modes: Christmas, Diwali, Onam, Eid / Ramadan, Wedding, Valentine, New Year Gala, Holi, Celebration, Noir (new collection). Animations stop for visitors who prefer reduced motion.
- Admin → Settings → Look: tap-to-choose theme cards with colour swatches and a Preview link (`/?theme_preview=<id>`, not indexed, visitors unaffected).
- New "R" monogram icon: favicon, Apple touch icon, PWA icons (incl. maskable). Installed PWAs may need removing and re-adding to refresh the icon.
- Theme registry (`THEME_INFO` in config.ts): a new theme is one CSS file plus one line.

## 0.3.2
- Customer **Sign in with Google**: account icon in the header, Account item in the bottom bar, and an `/account` page with a Continue with Google button, greeting and sign out. Ordering still needs no login.
- New logo lockup: ROOPKALA in light, widely spaced sans-serif capitals with "by Preetha Mary" beneath, in header and footer.

## 0.3.1
- Product page: tap a photo (or the corner button) for a full-screen viewer with pinch, wheel and double-tap zoom, drag, swipe between photos, arrows and Esc.
- Tall photos keep the top (heads are no longer cut off) in the square crop; new Settings option to show the whole photo instead.
- Sold-out photos are no longer drained of colour on cards (only the SOLD OUT label remains; themes can set `--so-filter`).

## 0.3.0
- Shop search (name, code, category, description) and sorting (newest, price, name). Search result pages are kept out of Google.
- Admin: search box on the product list; new **Stock log** tab showing the latest 200 stock changes.
- Home banner is a normal high-priority image for faster first view; logo upload in Settings.

## 0.2.2
- Fix: product photos were stretched tall because the image height attribute overrode the square shape. Photos now follow the theme shape (1:1 by default) on cards, the product gallery and thumbnails.

## 0.2.1
- Product-page thumbnail strip follows the square photo shape.
- Stylesheets are loaded with the version number, so a new version is never shown with an old cached stylesheet.

## 0.2.0
- Admin **Homepage** screen: top carousel slides (up to 5, photo upload with automatic shrinking), homepage product sections, categories (add, rename, reorder, delete).
- Admin **Settings** screen: WhatsApp number, "few left" level, Google Analytics ID, theme and accent colour, About page (text and photo), social links, payments (locked until a gateway exists).
- Product and gallery photos are square (1:1) by default; `--card-ratio` and `--gal-ratio` are theme settings.
- Optional per-theme script hook (`THEME_SCRIPTS`).
- Install to home screen (web manifest and icons).
- Admin shows the version number.

## 0.1.x
- First storefront, product editor with photo upload, stock buttons, enquiries inbox, Google sign-in.

## Not built yet
Online payments, spam protection on the enquiry form, notify-me emails, offline mode.
