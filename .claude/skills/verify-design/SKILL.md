---
name: verify-design
description: Check that a UI built in this repo matches its design (usually a Claude Design artifact, otherwise an exported image). Gets the design as the reference, captures the built screen at the same size and state, then compares it and reports each mismatch with numbers where the design allows them. Use after building or changing any screen, dialog or component from a design, before saying the UI is done, or when told the result "does not look like the design".
---

# Verify design

"Looks fine to me" is not verification: the usual failure is a build that is close but wrong in
spacing, size, colour, radius, font or states. Compare against the design with images and numbers,
not by eye from memory. Run this after `verify` step 3 passes (the flows must work first), and keep
to the rules at the end.

What you can measure depends on the kind of design. Decide first, and tell the user which path you
are on:

| Design is | Reference you get | Pixel diff | Numbers |
| --- | --- | --- | --- |
| A single-page Claude Design artifact (one self-contained HTML page) | HTML you render yourself in Playwright | Yes (step 3) | Yes, both sides (step 4) |
| A Claude Design canvas (has `project/canvas.json`, many boards) | Screenshot from Claude in Chrome | No: visual reading only | From the artifact source and tokens, not from the rendered DOM (step 4b) |
| An image / PDF from the user | The file | Yes if its size matches | Only what you can read off the image |

## 1. Get the reference (the design is the source of truth)

**Single-page artifact.** `Artifact` `read` its URL, save the HTML in the scratchpad (never in the
repo; designs are private), render with Playwright (`page.goto('file://...')`) at the design width.
It needs network for Google Fonts, and the font may differ from the app's: check this before
blaming layout.

**Canvas.** Use **Claude in Chrome** (`mcp__claude-in-chrome__*`, the user's real Chrome, normally
already signed in to claude.ai), not the built-in browser pane. The pane is small (one run had it at
about 514 px wide): the canvas opened at 1% zoom, a double-click on a board did not zoom it, and the
check was abandoned.

1. If the Chrome tools are deferred, load the core set in one `ToolSearch` call (`select:` list from
   the server instructions: `tabs_context_mcp`, `navigate`, `computer`, `read_page`,
   `tabs_create_mcp`, `tabs_close_mcp`, plus `resize_window`). Then `tabs_context_mcp`, open a tab
   with `tabs_create_mcp` and `navigate` to the artifact URL. If you land on a sign-in page, ask the
   user to sign in in Chrome; do not enter credentials yourself.
2. **Work in the interactive prototype, not on the canvas.** The canvas opens zoomed out to about
   1%, and double-clicking or using the hash does not focus a board, so never try to zoom it or hunt
   for a board on it. Enter prototype mode once, then move between screens by using the prototype
   like a user (click its own buttons, links and menu items):
   - `resize_window` the window to a large size, for example 1600×1000, then `wait` a few seconds.
   - Click the ▷ Play button at the top right, next to the zoom indicator, then pick the first entry
     under "Prototypes". That is the only Play click you need: do not open the list again to look for
     each screen. The prototype opens alone. **Fit / Fill** are at the top right; use Fill to make it
     larger.
   - Reach each screen on your list by interacting inside the prototype (sign in, open a menu, open a
     dialog). Take the screenshot (step 3) on each screen as you arrive.
   - Fall back to "Static artboards" in the same Play list **only** for a state the prototype flow
     cannot reach (empty, loading, error, dark, tablet, mobile, a dialog with no trigger). Pick the
     board by its state title, for example "Danh sách · có dữ liệu". If there is no "Prototypes"
     entry at all, use the artboards for everything.
   - A board's state title and `w`×`h` come from `project/canvas.json` (`Artifact` `read` with
     `path`). In prototype mode the screen is sized by the window, not by the board, so set the
     build's viewport to the same window size (or the board's `w`×`h` when you compare against an
     artboard) before capturing in step 2.
3. `computer` `screenshot` shows the page; use `computer` `zoom` on a region to read small details
   (spacing, icons, copy). A screenshot is a scaled image of the window, not the board's `w`×`h`
   pixels, so it is for *looking at* and describing, not for pixel-diffing against a Playwright
   capture.
4. The board renders inside a cross-origin iframe: `javascript_tool` and `find` cannot read its DOM
   (established in the built-in pane; assume the same in Chrome). Do not promise computed styles
   from the rendered design.

Only if Claude in Chrome is not connected, fall back to the built-in pane (`mcp__Claude_Browser__*`):
`navigate`, `wait`, then `resize_window` and the zoom control before any screenshot, and expect to
need the export below.

If neither can show the board (sign-in blocked, board will not open), ask the user to export the
board as an image and send it; say that you could not verify without it.

Read what the design says outside the picture too: the screens × states it shows (empty, loading,
error, hover, focus, dark, tablet, mobile), the tokens, spacing and copy. Write that list; a design
with six states needs six comparisons, not one.

## 2. Capture the build in the same conditions

Use a throwaway spec (`e2e/scratch.spec.ts`, git-ignored; delete it afterwards) with `mockApi` and
`signIn` (see `verify` step 4):

- Viewport = the board's `w`×`h` (`page.setViewportSize`), same colour scheme, same state reached by
  real interaction or by the mock (`mockApi` options).
- Wait for data and fonts with `await expect(...).toBeVisible()`, never a sleep.
- Taller than the board: `fullPage: true` and compare against the board's full height.

## 3. Compare the pixels (single-page artifact or an image of the same size)

Put the reference PNG where Playwright expects a baseline and let `toHaveScreenshot` diff it (no new
dependency; it uses pixelmatch):

```ts
// e2e/scratch.spec.ts
await expect(page).toHaveScreenshot('login.png', { maxDiffPixelRatio: 0.02, fullPage: true })
// reference copied to e2e/__screenshots__/scratch.spec.ts/login-chromium-linux.png (git-ignored)
```

On failure `test-results/<test>/` holds `login-expected.png`, `login-actual.png` and
`login-diff.png`. `Read` all three and describe each difference in words: which element, how much,
which direction. A ratio under the threshold can hide a wrong colour on one small element, so do
not stop at "passed". Ignore, and say you ignored: font anti-aliasing, a different fallback font,
scrollbars, placeholder images.

**Canvas:** there is no file to diff. Put the design screenshot and your own capture side by side in
one reply (`Read` both PNG/JPEG files), go region by region (header, each section, controls, spacing
between blocks, icons, copy) and list every difference. Say plainly this is visual comparison, so
differences under a few px are not ruled out.

## 4. Compare the numbers

**4a. Both sides rendered by you (single-page artifact).** Run the same targets on the design page
and the build with [e2e/support/design-compare.ts](../../../e2e/support/design-compare.ts):

```ts
import { diffMeasures, measure, type Target } from './support/design-compare'

const targets: Target[] = [
  { role: 'heading', name: 'Đăng nhập' },
  { role: 'textbox', name: 'Tên đăng nhập' },
  { role: 'button', name: 'Đăng nhập' },
]
const issues = diffMeasures(await measure(designPage, targets), await measure(page, targets))
console.log(issues.join('\n') || 'khớp')
```

Targets are found by accessible role and name, so choose the ones that matter: headings, inputs,
buttons, cards, table headers. It reports position and size beyond 1 px, and any difference in
colour (normalised to rgb, so a design's hex and the app's oklch compare fairly), font size,
weight, line height, radius, border, padding, gap and shadow. Verified on this repo: identical
pages give no issues, an injected radius, colour or font size is reported.

**4b. Canvas.** Numbers come from the source, not the render: `Artifact` `read` the design system
(`project/ds/<ns>/tokens.json`, `tokens.css`, `components/bundle.css`) and the board's own file or
`Main.dc.html` (large; save it and `grep` for the element's class, `style=` or component). Compare
the token values (colours, radius, spacing, type scale) with `src/app/styles/index.css`, and the
component dimensions (heights, paddings, gaps) with what the build resolves to. Measure the build
with `design-compare.ts` and compare against those source values by hand. Treat anything you could
not trace to a source value as unverified.

## 5. Check the tokens, not just the result

A screen can match today and still be built wrong. Look for hard-coded colours and arbitrary sizes in
everything you changed, including **new, untracked and staged files**:

```bash
git add -N . && git diff -U0 HEAD -- 'src/**/*.tsx' 'src/**/*.css' | grep -nE '^\+.*(#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(|\[[0-9.]+(px|rem)\])'; git reset -q
```

(`git add -N` only marks new files so `git diff` can see them; `git reset -q` at the end undoes it
and keeps your changes. Checked on a new untracked file containing `#ff0000`: it is reported.)

Each hit is a hard-coded value. Use a token from `src/app/styles/index.css` or a `shared/ui`
component instead. If the design uses a value the app has no token for, say so and ask before adding
one. A different `--primary`, `--radius` or font changes every screen: report it as a design-system
gap instead of patching one component.

## 6. Fix, then repeat

Fix the code, never the reference or the threshold. Re-run steps 2–4 for the changed screen. After
**three rounds** with differences left, stop and report the remaining list, what you tried and your
best guess for the cause.

## Report (end with this)

- Path used (single page, canvas or image) and the reference (artifact URL and board, or file), with
  the viewport and state compared. For a canvas, say for each screen whether it came from the
  prototype or from a static artboard.
- A table: element · design · build · fixed? Include mismatches you found, not only those you fixed.
- Pixel diff ratio and what the diff image showed (single page), or the region-by-region list
  (canvas), saying which it was.
- Differences accepted on purpose and why; what you could not check (states not in the design,
  hover and focus not driven, canvas pixel-level detail, other browsers).
- Never write "matches the design" unless every state in your list was compared.

## Rules of the road

- The design wins. Do not edit the reference, loosen `maxDiffPixelRatio` or drop a target to get
  green. If the design looks wrong or contradicts the app's rules (a11y, i18n, FSD), report it
  instead of choosing silently.
- Keep UI strings in `src/shared/i18n/messages.vi.ts`, not copied into JSX, even when the design
  shows literal text.
- Designs are private user data: read them only for this task, keep copies in the scratchpad, and
  never commit design HTML, reference images or the scratch spec (`.gitignore` covers the scratch
  paths). Permanent visual baselines live in `e2e/visual.spec.ts` and are for regression only, not
  design fidelity.
