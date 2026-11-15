/* =========================================
   BASELTRACK - VARIANCE ANALYSIS MODULE
========================================= */

(function () {
    "use strict";

    // Shared reconciliation data.
    // Other reconciliation modules can use this same object later.
    window.baselTrackReconciliationData =
        window.baselTrackReconciliationData || {};

    const sharedData = window.baselTrackReconciliationData;

    sharedData.varianceResults = sharedData.varianceResults || [];
    sharedData.auditLogs = sharedData.auditLogs || [];

    // Illustrative demo data.
    const sampleMetrics = [
        {
            risk: "RSK001",
            riskType: "CREDIT",
            metric: "Credit RWA",
            current: 1250000,
            previous: 1200000
        },
        {
            risk: "RSK002",
            riskType: "MARKET",
            metric: "Market RWA",
            current: 850000,
            previous: 700000
        },
        {
            risk: "RSK003",
            riskType: "OPERATIONAL",
            metric: "Operational RWA",
            current: 450000,
            previous: 448000
        },
        {
            risk: "RSK004",
            riskType: "LIQUIDITY",
            metric: "Liquidity Coverage",
            current: 600000,
            previous: 500000
        }
    ];

    function formatNumber(value) {
        return new Intl.NumberFormat("en-IN", {
            maximumFractionDigits: 2
        }).format(value);
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function calculateVariance(current, previous) {
        if (previous === 0) {
            return current === 0 ? 0 : 100;
        }

        return Math.abs(current - previous) / Math.abs(previous) * 100;
    }

    function getSeverity(variance) {
        if (variance >= 10) {
            return "HIGH";
        }

        if (variance >= 5) {
            return "MEDIUM";
        }

        return "LOW";
    }

    function getBreachStatus(variance, threshold) {
        return variance > threshold ? "YES" : "NO";
    }

    function addAuditLog(details) {
        const now = new Date();

        sharedData.auditLogs.unshift({
            id: "AUD-" + Date.now(),
            timestamp: now.toLocaleString("en-IN"),
            module: "Variance Analysis",
            user: getAuditUser(),
            action: "Generated breaches",
            reference: "Risk Metric/BATCH",
            type: "SUCCESS",
            status: "Completed",
            details: details
        });
    }

    function getAuditUser() {
        if (typeof getCurrentUser === "function") {
            const currentUser = getCurrentUser();

            if (currentUser) {
                return currentUser.name || currentUser.username || "Demo User";
            }
        }

        return "Demo User";
    }

    function showToast(message) {
        const toast = document.getElementById("vaToast");

        if (!toast) {
            return;
        }

        toast.textContent = message;
        toast.hidden = false;

        window.clearTimeout(toast._timer);

        toast._timer = window.setTimeout(function () {
            toast.hidden = true;
        }, 3000);
    }

    function renderMetrics(results, threshold) {
        const high = results.filter(item => item.severity === "HIGH").length;
        const medium = results.filter(item => item.severity === "MEDIUM").length;
        const low = results.filter(item => item.severity === "LOW").length;
        const breaches = results.filter(item => item.breach === "YES").length;

        document.getElementById("vaMetricCount").textContent = results.length;
        document.getElementById("vaHighCount").textContent = high;
        document.getElementById("vaMediumCount").textContent = medium;
        document.getElementById("vaLowCount").textContent = low;
        document.getElementById("vaBreachCount").textContent = breaches;
        document.getElementById("vaThresholdValue").textContent =
            threshold.toFixed(2).replace(/\.00$/, "") + "%";
    }

    function renderTable(results) {
        const tableBody = document.getElementById("vaTableBody");
        const recordCount = document.getElementById("vaRecordCount");

        recordCount.textContent =
            results.length + (results.length === 1 ? " record" : " records");

        if (results.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="va-empty">
                        <span class="va-empty-icon">▤</span>
                        No metrics found for the selected risk type.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = results.map(function (item) {
            const severityClass = item.severity.toLowerCase();
            const breachClass = item.breach === "YES" ? "yes" : "no";

            return `
                <tr>
                    <td>
                        <span class="va-risk-id">
                            ${escapeHTML(item.risk)}
                        </span>
                    </td>

                    <td>${escapeHTML(item.metric)}</td>

                    <td>${formatNumber(item.current)}</td>

                    <td>${formatNumber(item.previous)}</td>

                    <td>${item.variance.toFixed(2)}%</td>

                    <td>
                        <span class="va-severity ${severityClass}">
                            ${item.severity}
                        </span>
                    </td>

                    <td>
                        <span class="va-breach ${breachClass}">
                            ${item.breach}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function runAnalysis() {
        const thresholdInput = document.getElementById("vaThreshold");
        const riskType = document.getElementById("vaRiskType").value;

        const threshold = Number(thresholdInput.value);

        if (
            thresholdInput.value.trim() === "" ||
            !Number.isFinite(threshold) ||
            threshold < 0 ||
            threshold > 100
        ) {
            alert("Please enter a valid threshold between 0 and 100.");
            thresholdInput.focus();
            return;
        }

        const filteredMetrics = sampleMetrics.filter(function (item) {
            return riskType === "ALL" || item.riskType === riskType;
        });

        const results = filteredMetrics.map(function (item) {
            const variance = calculateVariance(
                item.current,
                item.previous
            );

            return {
                ...item,
                variance: variance,
                severity: getSeverity(variance),
                breach: getBreachStatus(variance, threshold)
            };
        });

        // Store latest analysis results for future reconciliation modules.
        sharedData.varianceResults = results;

        renderMetrics(results, threshold);
        renderTable(results);

        addAuditLog(
            results.length + " risk metrics analysed using " +
            threshold + "% threshold. " +
            results.filter(item => item.breach === "YES").length +
            " breach(es) identified."
        );

        showToast("Variance analysis completed successfully.");
    }

    // Called by navigation.js whenever this module is opened.
    window.initVarianceAnalysisModule = function () {
        const app = document.getElementById("varianceAnalysisApp");

        if (!app || app.dataset.initialized === "true") {
            return;
        }

        app.dataset.initialized = "true";

        const runButton = document.getElementById("vaRunAnalysis");

        runButton.addEventListener("click", runAnalysis);

        // Display initial state.
        renderMetrics([], 5);

        document.getElementById("vaRecordCount").textContent = "0 records";
    };

})();