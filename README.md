# PawStay brand patch

Drop the contents of this folder over the root of your **`Trusted Housekeepers/`** Expo project. Existing files are overwritten with the new brand-aligned versions.

## What's in this patch

```
assets/
  icon.png                          ← iOS app icon (Heel-Home mark on cream)
  splash-icon.png                   ← Expo splash (transparent · forest mark)
  favicon.png                       ← Web favicon
  android-icon-foreground.png       ← Adaptive icon · white mark in safe zone
  android-icon-background.png       ← Adaptive icon · solid sage #6DB88E
  android-icon-monochrome.png       ← Themed icon · black mark
app.json                            ← Android adaptive bg #C084FC → #6DB88E
lib/constants/themes.ts             ← Warm-cream palette for sitter + host
lib/constants/colors.ts             ← Legacy lavender removed; now mirrors sitter
tailwind.config.js                  ← Tailwind tokens synced to new palette
```

## Apply

From the repo root:

```bash
# (back up the originals first if you want)
cp -r path/to/pawstay-brand-patch/* .

# Sanity check
git status        # should show ~10 changed/added files
git diff app.json # should show only the backgroundColor flip
```

Then rebuild app icons in Expo's pipeline as you normally would:

```bash
npx expo prebuild --clean   # if you run prebuild
# or just `npx expo start` — Expo picks up the new PNGs on next launch
```

## What this changes visually

| Surface | Before | After |
|---|---|---|
| Sitter background | `#F4FFF7` minty white | `#FBF8F0` warm cream |
| Sitter primary container | `#C8EDD4` | `#C5E8C9` (slightly warmer) |
| Host background | `#EEF8F2` cool mint | `#FAF6ED` warm cream |
| Host surface variant | `#BDDFC8` | `#DCE8D5` (warmer sage) |
| Android adaptive bg | `#C084FC` lavender | `#6DB88E` sage |
| App icon | Expo placeholder "A" | Heel-Home paw + house mark |

## What this does NOT touch

- `app/`, `components/`, `stores/`, `types/` — your screens and component code stay exactly as they are. The new colors flow through `useAppTheme()` automatically since the theme object keys didn't change.
- `lib/constants/typography.ts` — Nunito + size scale unchanged.
- Schema, API, or any other behavioural code.

## After applying

If you want the full design system (cards, UI kits, SKILL.md, etc.) alongside the codebase for future reference, download the whole **PawStay Design System** project — this patch is just the production drop-in.
