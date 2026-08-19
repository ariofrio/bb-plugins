# Changesets

Run `npm run changeset` in a feature branch when a user-visible plugin change
should produce a release. Select every affected plugin package, choose its
patch, minor, or major bump, and write the release-note summary.

After the feature merges, the Changesets workflow maintains a `Version
plugins` pull request. Merging that pull request updates the selected package
versions and changelogs, runs each affected plugin's release checks, and
creates immutable `<plugin-id>/vX.Y.Z` Git tags.

Documentation, test-only, and repository-maintenance changes do not need a
changeset.
