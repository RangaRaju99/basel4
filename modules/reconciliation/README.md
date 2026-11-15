# Reconciliation modules

Each feature is grouped in its own folder and keeps its HTML shell, stylesheet, and controller together:

- `risk-reconciliation/`
- `variance-analysis/`
- `exception-management/`
- `investigation/`
- `evidence-repository/`
- `approval-closure/`
- `reconciliation-audit-logs/`

The workspace loads each feature's CSS and JavaScript from these folders. To keep the workspace compatible with direct `file://` opening, its navigation view templates remain embedded in the root `workspace.html`; the HTML files here provide the feature-level mount structure. Controllers and audit data continue to share `window.baselTrackReconciliationData`.
