# bb-plugin-project-icons

## 0.4.0

### Minor Changes

- a013ccc: Let each icon placement be turned off on its own.
  
  **Show in the thread header** and **Show in the sidebar** are both on by
  default, so an update never takes an icon away from anyone. The thread header
  reads them through `useSettings()`; the sidebar half runs in a content script
  where no hook reaches, so it asks the backend over `listPlacements` before it
  places a single node — an anchor left in bb's sidebar would space the group
  label out even with nothing drawn in it.
- c54050c: Let a bb thread section hold an icon the way a project does.
  
  Icons are now keyed by an owner kind and an id rather than a project id, so the
  two never collide, and the RPC contract follows: `listIcons`, `setIcon`, and
  `clearIcon` in place of their project-only spellings. Existing choices migrate
  across untouched.
  
  Sections default to bb's own section mark. Projects default to a folder and the
  personal project to a chat bubble because bb draws them that way itself, and a
  section has the same claim — but Hugeicons has no matching glyph, which is why
  Thread stages already composes its own SectionAdd. This is that mark without
  the plus.
  
  bb publishes no event when a section is created, renamed, or removed, so an
  icon whose section is gone can only be found by comparing against the live
  list. The cleanup service sweeps on start and after each write, which keeps the
  read path free of a round-trip it would otherwise pay on every header mount.
- fd9cd78: Draw the icon in bb's own sidebar, on every project and section header.
  
  The icon sits at the head of the group's label row, where Thread stages puts a
  stage icon, which is what lines the group name up with the New thread,
  Extensions, and Automations labels above it. Clicking it opens the same picker
  the thread header offers.
  
  bb has no always-mounted React slot and a thread-header action only exists on a
  thread route, so this half runs as a content script — outside bb's provider
  tree, where no SDK hook reaches, so it talks to its own backend over fetch.
  One React tree portals into every header rather than a root per header, because
  bb replaces all of them at once when the sidebar's Organize mode changes:
  project groups appear under By project and section groups only under Manually.

### Patch Changes

- c8f4fc0: Give every control this repo adds to bb's thread header the hover bb's own
  controls use: the fill snaps in and eases out, and an open menu holds the
  active fill.
  
  The ChatGPT theme also stops reaching into what plugins draw. One rule matched
  icon-only buttons by shape — `size-7` and `text-muted-foreground` — rather than
  by where they are, which caught the icon this repo adds to the header and gave
  it a dimmer fill than the button beside it, with a colour that never lifted on
  hover. It now skips anything inside a plugin's own root.
- 7e303d6: Open the icon picker whole, instead of letting it fill in afterwards.
  
  The catalog is deliberately not in the bundle, so a cold picker used to appear
  and then land its categories and icon grid a beat later — one movement answered
  by a second, which bb's own menus never do because their content is fixed. It
  is now fetched when the pointer reaches the icon rather than when it is
  clicked, so a click that follows a pointer finds it ready. Keyboard focus does
  the same.
  
  The category row also animated itself in: a chip carries `transition-colors`,
  and the first category was chosen in an effect after mount, so it faded from
  unselected to selected once the popover had settled. It is chosen while
  rendering now.
- 2100dbd: Open the icon picker without building the whole catalog first.
  
  Every one of the 2,532 icons was rendered on open, putting over fourteen
  thousand nodes in the popover where bb's own menus hold about twenty-five. The
  cost landed where it shows: the browser built the grid before it could paint,
  so the picker was slow to arrive, and its entrance animation ran on a blocked
  thread, dropping frames until it snapped into place rather than easing.
  
  Categories are now drawn as they approach the viewport, behind placeholders
  sized to the grid they stand in for, so the scrollbar never shifts under the
  pointer. First paint is 534 nodes, the picker appears 45ms after the click
  instead of 127ms, and the entrance animation runs 133ms of its 150ms.
- 35f2fc0: Let the icon and the crumbs share bb's thread header.
  
  Both plugins put a node of their own at the head of that header, and both
  looked for bb's title at `center.firstElementChild` — so whichever arrived
  first became that child and the other found a sibling plugin's node with no
  title in it and gave up. The title is now found by what it holds, skipping
  anything marked as a plugin's root, which makes it independent of who arrives
  first.
  
  The crumbs also render in a React root of their own, scheduled on an animation
  frame. bb refuses to put a React-owned node under a container React does not
  own while any plugin is attributed on its stack, and it keeps that attribution
  across `setTimeout` and `queueMicrotask`; `requestAnimationFrame` is left
  native, so a frame callback runs unattributed.
- 877f8ee: Draw the icon catalog a row at a time rather than a category at a time.
  
  A category holds its true height whether or not its rows exist, so the
  scrollbar describes the whole catalog and never shifts under the pointer.
  Browsing the entire catalog now leaves 188 buttons in the popover rather than
  1,116 and climbing, and the scroll height holds steady where it used to move by
  several hundred pixels as categories materialised.
  
  Rows are measured from `offsetTop` and `scrollTop` rather than bounding rects:
  thirty-two categories each asking for a rect forces the browser to lay the
  scroller out again, dozens of times, in the frame the popover is trying to
  appear in. The picker's entrance now runs 132–152ms of its 150ms, against
  117–144ms for bb's own menus.
- 716aebc: Describe what each plugin now does.
  
  Icons covers projects and thread sections, on bb's own sidebar headers as well
  as the thread header, with either placement switchable. Breadcrumbs shows a
  thread's section, its project, and the threads it came from, each switchable.
  
  The screenshot fixture seeded icons through the RPC name the rename replaced,
  so a capture failed on the first project it reached.

## 0.3.0

### Minor Changes

- 14f160a: Rename Project icons to Icons and Project breadcrumbs to Breadcrumbs, ahead of
  both widening past projects to bb's thread sections.
  
  bb takes a plugin's id from its package name and namespaces routes, storage,
  settings, and CLI commands by it, so each renamed plugin installs as a new one
  and starts on an empty database. Neither is published to the BB Community
  marketplace, so nothing carries over: reinstall as `icons` and `breadcrumbs`,
  remove `project-icons` and `project-breadcrumbs`, and pick the project icons
  again.
  
  Thread stages reads these icons over the neighbouring plugin's id and hears
  edits on a shared broadcast channel; both move with the rename, to `icons` and
  `bb.icons`. The DOM markers each plugin leaves in bb's thread header follow:
  `data-icons-root` and `data-breadcrumbs-root`.

### Patch Changes

- 31d676c: Reword the plugin description so bb, the marketplace listing, npm, and the
  repository README all show the same sentence.

## 0.2.1

### Patch Changes

- a63f22b: Add `npm run check:catalog`, which derives the icon catalog from Hugeicons'
  index again and reports the icons whose tags or category moved without writing
  anything, so upstream rewrites can be read before they are adopted. Adopt
  upstream's current tags for the five icons it has rewritten since the catalog
  was first generated.
- 4e0d644: Move each plugin's TypeScript sources under `src/`, leaving only packaging and
  tooling configuration in the plugin root. Published tarballs now ship `src/`
  without its co-located tests.
- 78345a9: Drop vendored components no entry point reaches, and point the shadcn
  registry at the bb release this plugin targets.
- 4e0d644: Follow the surrounding color scheme in each plugin's icon, so the marketplace's Browse screen stops painting it a fixed grey.

## 0.2.0

### Minor Changes

- e9ead62: Ship each plugin's own Hugeicons branding icon: Shapes01 for Project icons, Command for Missing keyboard shortcuts, ChatGPT for ChatGPT theme, and a folder holding ArrowRight01 for Project breadcrumbs.

### Patch Changes

- a0bae2c: Follow the Project breadcrumbs rename when locating the breadcrumb root in the thread header.

## 0.1.2

### Patch Changes

- 548b490: Use bb's hand cursor and standard 28px control size for the project icon trigger and selector buttons, with a full-width, evenly spaced icon grid.

## 0.1.1

### Patch Changes

- 728ffc9: Replace the project icon dialog with a compact popover that groups searchable icons by category, keeps filtered category navigation visible, and improves color, reset, scrolling, and search controls.

## 0.1.0

### Minor Changes

- Initial release: an icon and optional color for each bb project.
