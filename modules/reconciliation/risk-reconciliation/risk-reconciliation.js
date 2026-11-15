/* BaselTrack - Risk Reconciliation module */
(function () {
    "use strict";

    const STORAGE_KEY = "baseltrack-risk-reconciliation-results";
    const SAMPLE_RECORDS = [
        { riskId: "RSK007", riskType: "CREDIT", metric: "Credit RWA", calculated: 1250000, reported: 1250000 },
        { riskId: "RSK002", riskType: "MARKET", metric: "Market RWA", calculated: 850000, reported: 840000 },
        { riskId: "RSK003", riskType: "OPERATIONAL", metric: "Operational RWA", calculated: 450000, reported: 450000 },
        { riskId: "RSK004", riskType: "LIQUIDITY", metric: "Liquidity Coverage", calculated: 600000, reported: 594000 }
    ];

    window.baselTrackReconciliationData = window.baselTrackReconciliationData || {};
    const sharedData = window.baselTrackReconciliationData;
    sharedData.reconciliationResults = Array.isArray(sharedData.reconciliationResults)
        ? sharedData.reconciliationResults
        : loadResults();
    sharedData.auditLogs = Array.isArray(sharedData.auditLogs) ? sharedData.auditLogs : [];

    let app;

    function $(selector) {
        return app.querySelector(selector);
    }

    function loadResults() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            return Array.isArray(stored) ? stored : [];
        } catch (error) {
            return [];
        }
    }

    function saveResults() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedData.reconciliationResults));
        } catch (error) {
            console.warn("Risk Reconciliation: unable to save results", error);
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
    }

    function markup() {
        return `
            <header class="rr-header">
                <div>
                    <div class="rr-breadcrumb">Reconciliation <span>/</span> Risk Reconciliation</div>
                    <h2 id="rrTitle">Risk Data Reconciliation</h2>
                    <p>Compare calculated Basel IV metrics with reported values and review exceptions before variance analysis.</p>
                </div>
                <div class="rr-header-icon" aria-hidden="true">⇄</div>
            </header>
            <section class="rr-card" aria-labelledby="rrCriteriaTitle">
                <div class="rr-section-heading"><div><h3 id="rrCriteriaTitle">Reconciliation Criteria</h3><p>Choose the reporting period, risk category, and acceptable variance.</p></div></div>
                <div class="rr-filter-grid">
                    <label class="rr-field" for="rrPeriod"><span>Reporting period</span><select id="rrPeriod"><option value="Q3-2026">Q3 2026</option><option value="Q4-2026">Q4 2026</option><option value="Q1-2027">Q1 2027</option></select></label>
                    <label class="rr-field" for="rrRiskType"><span>Risk category</span><select id="rrRiskType"><option value="ALL">All risk categories</option><option value="CREDIT">Credit risk</option><option value="MARKET">Market risk</option><option value="OPERATIONAL">Operational risk</option><option value="LIQUIDITY">Liquidity risk</option></select></label>
                    <label class="rr-field" for="rrTolerance"><span>Match tolerance (%)</span><input id="rrTolerance" type="number" min="0" max="100" step="0.1" value="0.5"></label>
                    <div class="rr-actions"><button type="button" class="rr-button rr-primary" data-action="run">Run reconciliation</button><button type="button" class="rr-button rr-secondary" data-action="reset">Reset results</button></div>
                </div>
                <p class="rr-helper">Demo source: illustrative calculated and reported Basel IV values.</p>
                <p class="rr-message" data-role="message" role="status" aria-live="polite" hidden></p>
            </section>
            <section class="rr-kpis" aria-label="Reconciliation summary">
                <article class="rr-kpi"><span>Total records</span><strong data-kpi="total">0</strong></article>
                <article class="rr-kpi"><span>Matched</span><strong data-kpi="matched">0</strong></article>
                <article class="rr-kpi rr-kpi-warning"><span>Unmatched</span><strong data-kpi="unmatched">0</strong></article>
                <article class="rr-kpi"><span>Match rate</span><strong data-kpi="rate">0%</strong></article>
                <article class="rr-kpi"><span>Reporting period</span><strong data-kpi="period">—</strong></article>
            </section>
            <section class="rr-card">
                <div class="rr-table-toolbar"><div><h3>Reconciliation Results</h3><p data-role="record-count">0 records</p></div>
                    <div class="rr-table-actions"><button type="button" class="rr-button rr-secondary" data-action="export" disabled>Export CSV</button><a class="rr-button rr-link" href="#variance-analysis" data-page="variance-analysis">Continue to Variance Analysis <span aria-hidden="true">→</span></a></div>
                </div>
                <div class="rr-table-wrap"><table class="rr-table"><thead><tr><th>Risk ID</th><th>Risk category</th><th>Metric</th><th>Calculated value</th><th>Reported value</th><th>Difference</th><th>Variance</th><th>Status</th></tr></thead><tbody data-role="rows"><tr><td class="rr-empty" colspan="8">Run reconciliation to generate results.</td></tr></tbody></table></div>
            </section>`;
    }

    function setMessage(message, isError) {
        const element = $("[data-role='message']");
        element.textContent = message;
        element.hidden = !message;
        element.classList.toggle("error", Boolean(isError));
    }

    function render() {
        const results = sharedData.reconciliationResults;
        const matched = results.filter(function (item) { return item.status === "MATCHED"; }).length;
        const unmatched = results.length - matched;
        const period = $("#rrPeriod").value;
        const rows = $("[data-role='rows']");

        $("[data-kpi='total']").textContent = results.length;
        $("[data-kpi='matched']").textContent = matched;
        $("[data-kpi='unmatched']").textContent = unmatched;
        $("[data-kpi='rate']").textContent = (results.length ? Math.round(matched / results.length * 100) : 0) + "%";
        $("[data-kpi='period']").textContent = results.length ? escapeHTML(results[0].reportingPeriod || period) : "—";
        $("[data-role='record-count']").textContent = results.length + (results.length === 1 ? " record" : " records");
        $("[data-action='export']").disabled = results.length === 0;

        if (!results.length) {
            rows.innerHTML = '<tr><td class="rr-empty" colspan="8">Run reconciliation to generate results.</td></tr>';
            return;
        }

        rows.innerHTML = results.map(function (item) {
            const statusClass = item.status === "MATCHED" ? "matched" : "unmatched";
            return `<tr><td><strong>${escapeHTML(item.riskId)}</strong></td><td>${escapeHTML(item.riskType)}</td><td>${escapeHTML(item.metric)}</td><td>${formatNumber(item.calculated)}</td><td>${formatNumber(item.reported)}</td><td>${item.difference > 0 ? "+" : ""}${formatNumber(item.difference)}</td><td>${Number(item.variancePct).toFixed(2)}%</td><td><span class="rr-status ${statusClass}">${escapeHTML(item.status)}</span></td></tr>`;
        }).join("");
    }

    function addAuditLog(action, details, type) {
        sharedData.auditLogs.unshift({
            id: "AUD-REC-" + Date.now(),
            timestamp: new Date().toLocaleString("en-IN"),
            module: "Reconciliation",
            user: typeof window.getCurrentUser === "function"
                ? (window.getCurrentUser()?.name || "Demo User")
                : "Demo User",
            action: action,
            reference: "Risk Metrics/BATCH",
            type: type || "SUCCESS",
            status: "Completed",
            details: details
        });
    }

    function runReconciliation() {
        const period = $("#rrPeriod").value;
        const riskType = $("#rrRiskType").value;
        const toleranceInput = $("#rrTolerance");
        const tolerance = Number(toleranceInput.value);
        if (toleranceInput.value.trim() === "" || !Number.isFinite(tolerance) || tolerance < 0 || tolerance > 100) {
            setMessage("Enter a match tolerance from 0 to 100 percent.", true);
            toleranceInput.focus();
            return;
        }

        sharedData.reconciliationResults = SAMPLE_RECORDS
            .filter(function (item) { return riskType === "ALL" || item.riskType === riskType; })
            .map(function (item) {
                const difference = item.calculated - item.reported;
                const variancePct = item.reported === 0
                    ? (item.calculated === 0 ? 0 : 100)
                    : Math.abs(difference) / Math.abs(item.reported) * 100;
                return Object.assign({}, item, {
                    difference: difference,
                    variancePct: variancePct,
                    tolerancePct: tolerance,
                    reportingPeriod: period,
                    status: variancePct <= tolerance ? "MATCHED" : "UNMATCHED"
                });
            });

        saveResults();
        addAuditLog("Executed reconciliation", "Compared " + sharedData.reconciliationResults.length + " metric(s) for " + period + ".", "SUCCESS");
        setMessage("Reconciliation completed. Results are available to the reconciliation audit log.", false);
        render();
    }

    function resetResults() {
        sharedData.reconciliationResults = [];
        saveResults();
        addAuditLog("Reset reconciliation results", "Current reconciliation results were cleared.", "INFO");
        setMessage("Reconciliation results have been reset.", false);
        render();
    }

    function exportCSV() {
        const results = sharedData.reconciliationResults;
        if (!results.length) return;
        function cell(value) { return '"' + String(value ?? "").replace(/"/g, '""') + '"'; }
        const headers = ["Reporting Period", "Risk ID", "Risk Category", "Metric", "Calculated Value", "Reported Value", "Difference", "Variance (%)", "Tolerance (%)", "Status"];
        const lines = results.map(function (item) {
            return [item.reportingPeriod, item.riskId, item.riskType, item.metric, item.calculated, item.reported, item.difference, Number(item.variancePct).toFixed(2), item.tolerancePct, item.status].map(cell).join(",");
        });
        const blob = new Blob([[headers.map(cell).join(",")].concat(lines).join("\r\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "baseltrack-reconciliation.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function handleClick(event) {
        const button = event.target.closest("[data-action]");
        if (!button || !app.contains(button)) return;
        if (button.dataset.action === "run") runReconciliation();
        if (button.dataset.action === "reset") resetResults();
        if (button.dataset.action === "export") exportCSV();
    }

    window.initRiskReconciliationModule = function () {
        app = document.getElementById("riskReconciliationApp");
        if (!app || app.dataset.initialized === "true") return;
        app.dataset.initialized = "true";
        app.innerHTML = markup();
        app.addEventListener("click", handleClick);
        render();
    };
})();
