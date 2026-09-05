# Brand source assets

Originals, kept out of `public/` on purpose — nothing here is served to the
web. `public/` holds the web-optimized derivatives that the site actually
loads; this folder holds the full-resolution files those were made from, so a
future resize starts from the original rather than from an already-compressed
copy.

## id4g-logo-source.png

1274x1235 PNG, white-on-transparent. Source for `public/idfg-logo.webp`,
which is downscaled to 640px because the header renders the logo at 104px and
the footer at 36px.

Regenerate the web copy with the repo's own `sharp`:

```js
import sharp from "sharp";
await sharp("assets/brand/id4g-logo-source.png")
  .resize({ width: 640 })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile("public/idfg-logo.webp");
```

Do not use `sips` for this. On at least one of these Macs it reads webp fine
but exits 1 when writing one, reporting success while leaving the destination
file untouched — a silent no-op that looks like a completed conversion.
