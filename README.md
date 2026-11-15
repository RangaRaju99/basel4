# BaselTrack project structure

The maintainable application sources live under `src/`:

- `src/core/` contains the workspace shell, navigation, permissions, roles, and shared styles.
- `src/modules/` groups module templates, styles, and scripts by dashboard area and feature.
- `src/pages/` contains the source HTML for the landing page and workspace.
- `src/assets/` contains shared static assets.

The root `index.html` and `workspace.html` are generated entry pages. Rebuild them after changing source files:

```powershell
node scripts/build.mjs
```

Run the project checks with:

```powershell
node scripts/check.mjs
```

The generated root pages keep direct `file://` opening supported; module templates are assembled at build time, so the app does not need runtime HTML fetching or an iframe.

## Role permissions

`src/core/permissions/permissions.js` is the source of truth for the supplied
R/C/U matrix. Unspecified permissions and unsupported actions such as Delete
and Approve are denied. The System actor is kept separate from the 11 human
login roles. These are client-side demo checks; a production backend must
enforce authorization independently.

The matrix grants Super Admin access to System Configuration, but no source
template or data workflow is registered for that route. It is reported as
unavailable rather than backed by an invented settings screen. The PDF also contains an unresolved View Reports label (`Query`) and
two Generate Report rows with different role grants; the ambiguous
reconciliation-specific grant is not inferred.
