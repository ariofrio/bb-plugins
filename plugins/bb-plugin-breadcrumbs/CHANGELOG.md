# bb-plugin-project-breadcrumbs

## 0.4.0

### Minor Changes

- 9544123: Show the thread's section and the threads it came from, each switchable on its
  own.
  
  The section crumb opens the menu bb's own sidebar section header opens —
  Rename and Remove, with bb's wording for both — backed by bb's section SDK.
  Ancestor crumbs walk from the thread to its root, so a fork or a side chat
  reads `Section > Project > Parent > This thread`, and each one opens that
  thread.
  
  The section is resolved on the backend from a thread id rather than read from
  the sidebar's live view, because that view hydrates a thread's `sectionId`
  separately from the thread itself and bb publishes no event when a section
  changes.

### Patch Changes

- 0ad30ec: Say that the trail follows parents, not forks.
  
  The setting and the README both promised "every thread this one was forked or
  spawned under", which the trail never did and should not: bb gives a thread
  spawned under another a `parentThreadId` and nests it in the sidebar, while a
  fork gets a `sourceThreadId` and no parent, and bb shows a fork's origin
  elsewhere. Only the wording changes; a test now holds the line.
- c8f4fc0: Give every control this repo adds to bb's thread header the hover bb's own
  controls use: the fill snaps in and eases out, and an open menu holds the
  active fill.
  
  The ChatGPT theme also stops reaching into what plugins draw. One rule matched
  icon-only buttons by shape — `size-7` and `text-muted-foreground` — rather than
  by where they are, which caught the icon this repo adds to the header and gave
  it a dimmer fill than the button beside it, with a colour that never lifted on
  hover. It now skips anything inside a plugin's own root.
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

- 4e0d644: Move each plugin's TypeScript sources under `src/`, leaving only packaging and
  tooling configuration in the plugin root. Published tarballs now ship `src/`
  without its co-located tests.
- 78345a9: Drop vendored components no entry point reaches, and point the shadcn
  registry at the bb release this plugin targets.
- 4e0d644: Follow the surrounding color scheme in each plugin's icon, so the marketplace's Browse screen stops painting it a fixed grey.

## 0.2.0

### Minor Changes

- e9ead62: Ship each plugin's own Hugeicons branding icon: Shapes01 for Project icons, Command for Missing keyboard shortcuts, ChatGPT for ChatGPT theme, and a folder holding ArrowRight01 for Project breadcrumbs.
- a0bae2c: Rename Project header breadcrumb to Project breadcrumbs, matching the plural naming the other plugins use for what they add, and rename its DOM marker to `data-project-breadcrumbs-root`.

## 0.1.0

### Minor Changes

- Initial release: the current project and its actions menu in bb thread headers.
