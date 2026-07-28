# web — LOKUS console (T004)

React + Vite. The shell for all 14 screens, plus the four shared data states
every panel must implement.

```bash
npm run dev            # from the repo root, or: npm run dev --workspace web
npm run test  --workspace web
npm run build --workspace web
```

## Design values

`src/main.jsx` imports `design/tokens.css` **once**, and that is the only place
a design value enters the app. `src/styles/shell.css` writes no hex, no
`border-radius`, no gradient, and no shadow — colours, font stacks and generic
spacing come from `var(--*)`. Layout geometry that `design/SCREENS.md`
prescribes literally (238px rail, `18px 28px` header padding, 26px title) is
written as given, because paraphrasing it into tokens would change the design.

Every card, panel and figure is a `Blueprint` — hairline frame, square corners,
transparent fill, four registration marks.

## The four states

`design/UI-GUIDELINES.md` requires every data panel to implement loading,
empty, error and needs-permission. `DataPanel` makes that mechanical:

```jsx
<DataPanel
  status={PANEL_STATUS.EMPTY}
  title="Kotak masuk review"
  empty={{ title: 'Tidak ada review baru', description: '…', onAction: recheck }}
>
  <ReviewList reviews={reviews} />
</DataPanel>
```

A panel in any state other than `ready` does not render its children, so a
half-loaded panel cannot leak a partial list. The status is mirrored onto
`data-status`, which is what the T055 four-state audit reads.

The defaults carry no counts or dates. The worked examples in the guidelines
("Agen sedang membaca 18 review…", "42 lokasi milik Anda") belong to the screen
that knows the real number — a count rendered by a generic component would be a
number with no source, which constitution I forbids.

`NeedsPermission` takes `canConnect`: a viewer sees the state but not the
connect button, because granting access is a write (AC-6.3).

## Routing

Fourteen static paths, no nested routes, no data loaders. `src/app/useRoute.js`
is the History API plus a `popstate` listener — a router library would be a
dependency `plan.md` does not list, for a problem this size. Rail items are
real `<a href>` elements, so middle-click and ctrl-click still open a tab.

## Screens

`src/app/screens.js` is the registry: id, path, rail label, title, subtitle, and
the phase that fills the screen in. Titles and subtitles are verbatim from
`design/SCREENS.md`. Until its phase lands, a screen renders
`PlaceholderScreen` — a real `DataPanel` in its empty state naming the phase,
so the shell is navigable and the four-state wiring exists from the first
commit rather than being retrofitted.

Screen 01 hides the header's "Jalankan agen" action: no tenant is selected yet,
so there is nothing to run an agent against. Once a tenant is chosen, a
`viewer` role hides it too — running an agent writes data (AC-6.3).

### Screen 01 · Masuk & pilih tenant (T005)

Sign-in card (400px) plus the tenant panel. The tenant panel is a `DataPanel`,
so it carries all four states — including "perlu izin" for an account that
signed in but was granted no tenant.

Each row shows branch count, segment, and **role**, which is what makes AC-6.3
visible from the first screen. The tag follows `SCREENS.md`: last-opened wins,
then a trial countdown, then read-only.

Choosing a tenant stores `tenantId` + `role`, clears the client cache, and
opens screen 02. `src/data/tenantCache.js` is where that clearing happens —
every tenant-scoped value the client keeps must live under the
`lokus:tenant:` prefix so a switch can drop all of it at once, rather than each
screen being trusted to remember (constitution IV).

### Session source

`src/data/sessionSource.js` has two implementations behind one interface, the
pattern `plan.md` prescribes for external dependencies (Q1):

- **HTTP** — calls the Fastify API. Active when `VITE_LOKUS_API_URL` is set.
- **Seeded** — the fixtures from `design/SCREENS.md`, so the console runs and
  demos before Identity Platform is wired up.

Which one is active is visible on screen: the seeded source reports
`isSeeded: true` and the tenant panel carries a "data contoh" tag. Seeded data
is never presented as real.

## Responsive

- ≥ 1200px — 238px rail plus content.
- 900–1200px — subtitle relaxes to 52ch.
- < 900px — rail becomes a four-item bottom nav (Briefing · Peta · Review ·
  Agen), 60px tall, 19px icons, 10px labels, touch targets ≥ 44px.
