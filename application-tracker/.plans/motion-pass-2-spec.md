# Motion pass 2: spec

Second animation pass over the redesigned app. Decisions come from an interview on 2026-10-18.
Motion tokens live in `app/globals.css` (`--ease-out`, `--ease-in-out`) and `lib/motion.ts`.
Every item ships with its `prefers-reduced-motion` behavior and any hover gating.

## Out of scope (decided)

- **Filter chips and search on the dashboard stay instant.** They are used many times a day; the chip's color change is enough feedback.
- **Theme and accent switching stay instant.**
- **Dashboard stats and counts don't animate.** They are data the user reads.
- **No skeleton screens.**

## 1. Loading screen: mini crest

Adapted from the user's Sass "crest" loader. Only the shape is kept: a triangle with three dots tracing its edges.

- `components/LoadingScreen.tsx`, plain CSS in `globals.css` (`.crest-loader`). No Sass, no Montserrat, no global resets.
- 40px triangle outline, 2px stroke in `var(--accent)`, rounded joins. Three 6px dots in `var(--accent)` move vertex to vertex with `transform: translate()` keyframes. They loop with `linear` easing at 1.8s per lap, offset by a third of a lap each, so they're evenly spaced.
- Motion starts immediately (the original's 5s wait is removed). No flicker: the original's 5Hz opacity flicker breaks the WCAG 2.3.1 limit of 3 flashes per second.
- The whole loader is invisible for 300ms, then fades in over 200ms `--ease-out`. Fast loads show nothing.
- Accessibility: `role="status"` with a visually hidden "Loading..." text.
- Reduced motion: dots hidden; the triangle pulses its opacity between 0.4 and 1 over 1.6s `ease-in-out`, alternating.

## 2. Dashboard delete: undo toast

Replaces the instant delete. Uses **Sonner** (toast library; don't hand-roll one).

- `<Toaster position="bottom-center">` mounted once in the root layout through a client wrapper (`components/AppToaster.tsx`). The wrapper passes the app's theme mode and styles the toast with theme tokens.
- **Click delete:** the row fades out (200ms, already built), then the rows below slide up (FLIP, already built). The row is removed from local state right away, but **not** from the database yet.
- **One merged toast** (fixed toast id): "Contoso deleted · Undo". A second delete changes it to "2 applications deleted · Undo". Sonner's own timer is turned off (`duration: Infinity`). The dashboard keeps a 5s commit timer that restarts on each delete.
- **Timer runs out:** a single `delete ... in (ids)` for every pending id, then the toast is dismissed.
- **Undo:** restores all pending rows in `created_at` desc order (the table's order). The rows below slide down (FLIP) and restored rows fade in (200ms `--ease-out`). Then the toast is dismissed.
- **Ctrl/Cmd+Z** runs Undo while deletes are pending. It's ignored when focus is in an input, textarea, select or contenteditable element, so text undo still works there.
- **Leaving the dashboard commits pending deletes right away.**
  - In-app navigation (component unmount): normal Supabase delete.
  - Tab close or reload (`pagehide`): a `fetch` with `keepalive` to the PostgREST endpoint `DELETE /rest/v1/jobs?id=in.(...)`, with the anon key and the user's access token. The token is cached when the delete starts, because `pagehide` can't await.
- **If the database delete fails:** restore the rows and show an error toast.
- New i18n keys (en + es): `dashboard.deleted`, `dashboard.deletedMany`, `dashboard.undo`, `dashboard.deleteFailed`.
- Sonner's own motion is accepted as-is (slide up from the bottom, exit back down). It handles reduced motion itself.

## 3. Upload: AI-fill reveal

- After Gemini extraction or the paste parser fills fields, each filled field plays a one-time reveal. Fields stagger in form order, 40ms apart, counting only filled fields.
- Per field: the background goes from `--surface` to the existing accent tint while a 3px `--accent-soft` ring appears and fades. 500ms `--ease-out` (allowed for a rare delight moment). The sparkle icon fades in with `scale(0.9) → 1`.
- The tint moves from an inline style to a `.field-filled` class so the keyframe can end on it.
- Re-runs on every extract or autofill: a `fillRun` counter keys `JobFields`.
- Reduced motion: no ring, no scale; only the background fade.

## 4. Sliding segmented indicator

- Applies to every `.segmented` control: upload tabs (Screenshot/Paste/Manual), the settings controls, and the landing page language switch.
- Uses the "tab indicator with a color transition" clip technique: an `aria-hidden` copy of the options, styled as the active state, sits on top. It's clipped (`clip-path: inset(...)`) to the selected option's box, and the clip moves on change, 250ms `--ease-in-out`. Text color and background change together.
- A shared `components/Segmented.tsx` renders both layers and keeps the existing roles (`tab` / `radio`) on the real buttons only.
- No transition on the first measure. Re-measures with a `ResizeObserver` (language change changes text widths).
- Reduced motion: the clip changes instantly.

## 5. Settings save bar

- **Hidden while saved and clean.** It slides up from the bottom when the form becomes dirty: `translateY(calc(100% + 16px))` + opacity → in place, 250ms `--ease-out`. It exits the same way.
- Hidden state is `inert` and `aria-hidden`, so it can't take focus.
- **After a successful save:** a check icon replaces the dot (`scale(0.9) → 1` + opacity, 200ms `--ease-out`) next to "All changes saved". After 1.5s the bar slides away. Editing again during those 1.5s keeps it visible.
- **Error:** the bar stays visible with the error text.
- The status dot color crossfades (200ms `ease`).
- The bar moves to the end of the form, after the Account section. A hidden sticky bar still takes up space in the page flow, so this avoids a gap between sections.
- Reduced motion: opacity only, no translate.

## 6. Landing page

Marketing surface, so longer timings are allowed.

- **Hero entrance:** the badge, headline, subhead, CTAs and reassurance line fade in and rise 12px over 600ms `--ease-out`, staggered 60ms apart.
- **Scroll reveal:** each section below the hero reveals once, using the clip-path recipe (`inset(0 0 100% 0)` → `inset(0)`, 600ms `--ease-in-out`). It's triggered by `IntersectionObserver` with a `-100px` bottom margin and fires only once.
- **Preview demo**, played once when the preview scrolls into view:
  1. The extracted fields fill in one by one (80ms stagger).
  2. The job row appears in the dashboard panel.
  3. Everything stays in its finished state.
- **FAQ:** answers open smoothly using `::details-content` + `interpolate-size: allow-keywords` (height + opacity, 200ms `--ease-out`). Browsers without support open instantly, as they do now.
- Reduced motion: hero and reveal become opacity-only fades, the demo shows its finished state immediately, and the FAQ opens instantly.

## Verification

- `tsc --noEmit` and `eslint` pass.
- Feel checks in a browser, at slowed playback (DevTools Animations panel):
  - toast + FLIP on delete and undo
  - segmented clip on language change
  - AI-fill stagger timing
  - landing reveal
