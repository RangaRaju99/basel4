/* =========================================================
   BASELTRACK - GENERATE REPORTS

   Reads:
   window.baselTrackCalculationData.results

   Saves generated reports:
   localStorage -> baseltrack-generated-reports

   Browser demonstration only.
========================================================= */

(function () {
    "use strict";

    const STORAGE_KEY = "baseltrack-generated-reports";
    const TYPES = ["RWA", "Liquidity", "Capital", "Leverage"];
    const METRIC_ALIASES = {
        creditRWA: ["creditRWA", "creditRiskRWA", "credit"],
        marketRWA: ["marketRWA", "marketRiskRWA", "market"],
        operationalRWA: ["operationalRWA", "operationalRiskRWA", "operational"],
        totalRWA: ["totalRWA", "totalRwa", "total"],
        HQLA: ["HQLA", "hqla"],
        netCashOutflows: ["netCashOutflows", "netCashOutflow", "netOutflows"],
        LCR: ["LCR", "lcr", "lcrRatio"],
        NSFR: ["NSFR", "nsfr", "nsfrRatio"],
        CET1: ["CET1", "cet1", "cet1Capital"],
        AT1: ["AT1", "at1", "additionalTier1Capital"],
        tier2: ["tier2", "Tier2", "tierTwo", "tier2Capital"],
        totalCapital: ["totalCapital", "total"],
        rwa: ["rwa", "riskWeightedAssets"],
        cet1Ratio: ["cet1Ratio"],
        tier1Ratio: ["tier1Ratio"],
        CAR: ["CAR", "car", "carRatio"],
        tier1Capital: ["tier1Capital", "tier1", "Tier1"],
        totalExposure: ["totalExposure", "exposure"],
        leverageRatio: ["leverageRatio", "ratio", "leverage"]
    };

    let allRecords = [];
    let filteredRecords = [];
    let selectedIds = new Set();
    let lastGeneratedReport = null;
    let reviewedRecords = new Map();
    let tablePagination = null;
    let previewZoom = 1;

    let app;
    let modal;
    let toast;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char];
        });
    }

    function formatNumber(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return value ?? "-";
        }

        return number.toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function getStoredReports() {
        try {
            const reports = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return Array.isArray(reports) ? reports : [];
        } catch (error) {
            console.error("Unable to read generated reports:", error);
            return [];
        }
    }

    function saveStoredReports(reports) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
            return true;
        } catch (error) {
            console.error("Unable to save generated reports:", error);
            showToast("Unable to save report in browser storage.");
            return false;
        }
    }

    function getRawCalculationRecords() {
        const data = window.baselTrackCalculationData || {};
        return Array.isArray(data.results) ? data.results : [];
    }

    function normalizeType(record) {
        const value = String(
            record.type ||
            record.calculationType ||
            record.module ||
            ""
        ).toLowerCase();

        if (value.includes("rwa")) return "RWA";
        if (value.includes("liquidity") || value.includes("lcr")) {
            return "Liquidity";
        }
        if (value.includes("capital") || value.includes("car")) {
            return "Capital";
        }
        if (value.includes("leverage")) return "Leverage";

        return record.type || "Other";
    }

    function normalizeStatus(record) {
        const value = String(record.status || "Completed").toLowerCase();

        if (value.includes("fail")) return "Failed";
        if (value.includes("pending")) return "Pending";

        return "Completed";
    }

    function normalizeRecord(record, index) {
        const type = normalizeType(record);

        return {
            ...record,
            id: String(
                record.id ||
                record.calculationId ||
                record.resultId ||
                "CAL-" + (index + 1)
            ),
            type: type,
            bank: record.bank || record.bankName || "Unknown Bank",
            period: record.period || record.reportingPeriod || "-",
            businessDate: record.businessDate || record.date || "",
            status: normalizeStatus(record),
            metrics: getMetricObject(record)
        };
    }

    function getMetricObject(record) {
        const metrics = {};

        const possibleObjects = [
            record.metrics,
            record.details,
            record.results,
            record.calculationDetails,
            record.summary
        ];

        possibleObjects.forEach(function (object) {
            if (object && typeof object === "object" && !Array.isArray(object)) {
                Object.assign(metrics, object);
            }
        });

        [
            "creditRWA",
            "creditRiskRWA",
            "marketRWA",
            "marketRiskRWA",
            "operationalRWA",
            "operationalRiskRWA",
            "totalRWA",
            "HQLA",
            "hqla",
            "netCashOutflows",
            "netCashOutflow",
            "LCR",
            "lcr",
            "NSFR",
            "nsfr",
            "CET1",
            "cet1",
            "cet1Capital",
            "AT1",
            "at1",
            "additionalTier1Capital",
            "tier2",
            "tier2Capital",
            "totalCapital",
            "CAR",
            "car",
            "tier1Capital",
            "totalExposure",
            "leverageRatio",
            "riskWeightedAssets",
            "rwa",
            "cet1Ratio",
            "tier1Ratio"
        ].forEach(function (key) {
            if (record[key] !== undefined) {
                metrics[key] = record[key];
            }
        });

        return metrics;
    }

    function getPrimaryResult(record) {
        if (record.type === "RWA") {
            return "Total RWA: " + getMetricValue(record, "totalRWA");
        }

        if (record.type === "Liquidity") {
            return "LCR: " + getMetricValue(record, "LCR") + "%";
        }

        if (record.type === "Capital") {
            return "CAR: " + getMetricValue(record, "CAR") + "%";
        }

        if (record.type === "Leverage") {
            return "Ratio: " + getMetricValue(record, "leverageRatio") + "%";
        }

        return "-";
    }

    function showToast(message) {
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        window.setTimeout(function () {
            toast.classList.remove("show");
        }, 2800);
    }

    function openModal(title, body, footer) {
        modal.querySelector(".gr-modal-title").textContent = title;
        modal.querySelector(".gr-modal-body").innerHTML = body;
        modal.querySelector(".gr-modal-footer").innerHTML = footer || "";
        modal.classList.add("show");
    }

    function closeModal() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        modal.classList.remove("show");
    }

    function loadRecords() {
        allRecords = getRawCalculationRecords().map(normalizeRecord);
        fillDynamicFilters();
        applyFilters();
        renderOverview();
    }

    function applyFilters() {
        const type = app.querySelector("#grTypeFilter").value;
        const bank = app.querySelector("#grBankFilter").value;
        const period = app.querySelector("#grPeriodFilter").value;
        const status = app.querySelector("#grStatusFilter").value;
        const businessDate = app.querySelector("#grBusinessDateFilter").value;
        const search = app.querySelector("#grSearchInput").value
            .trim()
            .toLowerCase();

        filteredRecords = allRecords.filter(function (record) {
            if (type !== "ALL" && record.type !== type) return false;
            if (bank !== "ALL" && record.bank !== bank) return false;
            if (period !== "ALL" && record.period !== period) return false;
            if (status !== "ALL" && record.status !== status) return false;

            if (businessDate) {
                const recordDate = new Date(record.businessDate);

                if (Number.isNaN(recordDate.getTime())) return false;

                const selectedDate = new Date(businessDate + "T00:00:00");

                if (
                    recordDate.getFullYear() !== selectedDate.getFullYear() ||
                    recordDate.getMonth() !== selectedDate.getMonth() ||
                    recordDate.getDate() !== selectedDate.getDate()
                ) {
                    return false;
                }
            }

            if (search) {
                const searchable = [
                    record.id,
                    record.type,
                    record.bank,
                    record.period,
                    record.status,
                    record.businessDate,
                    ...Object.values(record.metrics || {})
                ].join(" ").toLowerCase();

                if (!searchable.includes(search)) return false;
            }

            return true;
        });

        // All filtered rows are selected by default.
        selectedIds = new Set(filteredRecords.map(record => record.id));

        tablePagination.reset();
        renderCalculationTable();
    }

    function renderCalculationTable() {
        const body = app.querySelector("#grCalculationTableBody");
        const total = filteredRecords.length;
        const pageRecords = tablePagination.paginate(filteredRecords);

        app.querySelector("#grMatchingCount").textContent =
            total + " matching rows";

        app.querySelector("#grSelectedCount").textContent =
            selectedIds.size;

        app.querySelector("#grFilteredTotal").textContent = total;

        app.querySelector("#grSelectAll").checked =
            total > 0 && selectedIds.size === total;

        if (!pageRecords.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="gr-empty">
                            <strong>No calculation records found</strong>
                            Change your filters or run a calculation first.
                        </div>
                    </td>
                </tr>
            `;
        } else {
            body.innerHTML = pageRecords.map(function (record) {
                const checked = selectedIds.has(record.id) ? "checked" : "";
                const displayedRecord = reviewedRecords.get(record.id) || record;

                return `
                    <tr>
                        <td>
                            <input
                                type="checkbox"
                                class="gr-row-checkbox"
                                data-id="${escapeHTML(record.id)}"
                                ${checked}
                            >
                        </td>

                        <td><strong>${escapeHTML(displayedRecord.id)}</strong></td>

                        <td>
                            <span class="gr-type">
                                ${escapeHTML(displayedRecord.type)}
                            </span>
                        </td>

                        <td>${escapeHTML(displayedRecord.bank)}</td>
                        <td>${escapeHTML(displayedRecord.period)}</td>
                        <td>${escapeHTML(formatDate(displayedRecord.businessDate))}</td>
                        <td>${escapeHTML(getPrimaryResult(displayedRecord))}</td>

                        <td>
                            <span class="gr-status gr-status-${displayedRecord.status.toLowerCase()}">
                                ${escapeHTML(displayedRecord.status)}
                            </span>
                        </td>

                        <td>
                            <button
                                class="gr-btn gr-view-calculation"
                                data-id="${escapeHTML(record.id)}"
                            >
                                View
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        app.querySelector("#grReviewBtn").disabled = selectedIds.size === 0;
        app.querySelector("#grPreviewBtn").disabled = selectedIds.size === 0;
        app.querySelector("#grGenerateBtn").disabled = selectedIds.size === 0;
    }

    function getSelectedRecords() {
        return filteredRecords
            .filter(record => selectedIds.has(record.id))
            .map(record => {
                const draft = reviewedRecords.get(record.id);
                return draft
                    ? JSON.parse(JSON.stringify(draft))
                    : JSON.parse(JSON.stringify(record));
            });
    }

    function getRecordDetails(record) {
        return Object.entries(record.metrics || {});
    }

    function getCalculationLogic(record) {
        const values = {
            creditRWA: getMetricValue(record, "creditRWA"),
            marketRWA: getMetricValue(record, "marketRWA"),
            operationalRWA: getMetricValue(record, "operationalRWA"),
            totalRWA: getMetricValue(record, "totalRWA"),
            hqla: getMetricValue(record, "HQLA"),
            netOutflows: getMetricValue(record, "netCashOutflows"),
            lcr: getMetricValue(record, "LCR"),
            cet1: getMetricValue(record, "CET1"),
            at1: getMetricValue(record, "AT1"),
            tier2: getMetricValue(record, "tier2"),
            totalCapital: getMetricValue(record, "totalCapital"),
            rwa: getMetricValue(record, "rwa"),
            car: getMetricValue(record, "CAR"),
            tier1: getMetricValue(record, "tier1Capital"),
            exposure: getMetricValue(record, "totalExposure"),
            leverageRatio: getMetricValue(record, "leverageRatio")
        };

        if (record.type === "RWA") {
            return `Total RWA = ${values.creditRWA} + ${values.marketRWA} + ${values.operationalRWA} = ${values.totalRWA}`;
        }

        if (record.type === "Liquidity") {
            return `LCR = (${values.hqla} / ${values.netOutflows}) × 100 = ${values.lcr}%`;
        }

        if (record.type === "Capital") {
            return `Total Capital = ${values.cet1} + ${values.at1} + ${values.tier2} = ${values.totalCapital}; CAR = (${values.totalCapital} / ${values.rwa}) × 100 = ${values.car}%`;
        }

        if (record.type === "Leverage") {
            return `Leverage Ratio = (${values.tier1} / ${values.exposure}) × 100 = ${values.leverageRatio}%`;
        }

        return "Calculation formula details are unavailable.";
    }

    function showCalculationDetails(id) {
        const record = allRecords.find(item => item.id === id);

        if (!record) return;

        const details = getRecordDetails(record);
        const components = Array.isArray(record.details)
            ? record.details
            : record.details && typeof record.details === "object"
                ? Object.entries(record.details).map(([key, value]) => ({ key, value }))
                : [];

        const detailRows = details.length
            ? details.map(function ([key, value]) {
                return `
                    <tr>
                        <td>${escapeHTML(key)}</td>
                        <td>${escapeHTML(
                            typeof value === "object"
                                ? JSON.stringify(value)
                                : formatNumber(value)
                        )}</td>
                    </tr>
                `;
            }).join("")
            : `
                <tr>
                    <td colspan="2">No detailed metrics available.</td>
                </tr>
            `;

        openModal(
            "Calculation Details",
            `
                <div class="gr-report-meta">
                    <div><span>Calculation ID</span><strong>${escapeHTML(record.id)}</strong></div>
                    <div><span>Type</span><strong>${escapeHTML(record.type)}</strong></div>
                    <div><span>Bank</span><strong>${escapeHTML(record.bank)}</strong></div>
                    <div><span>Period</span><strong>${escapeHTML(record.period)}</strong></div>
                    <div><span>Business Date</span><strong>${escapeHTML(formatDate(record.businessDate))}</strong></div>
                    <div><span>Status</span><strong>${escapeHTML(record.status)}</strong></div>
                </div>

                <div class="gr-report-section">
                    <h3>Calculation Metrics</h3>
                    <div class="gr-table-wrap">
                        <table class="gr-report-table">
                            <thead>
                                <tr><th>Metric</th><th>Value</th></tr>
                            </thead>
                            <tbody>${detailRows}</tbody>
                        </table>
                    </div>
                </div>

                <div class="gr-report-section">
                    <h3>Calculation Components</h3>
                    <div class="gr-table-wrap">
                        <table class="gr-report-table">
                            <thead><tr><th>Component</th><th>Values</th></tr></thead>
                            <tbody>
                                ${components.length
                                    ? components.map(function (component, index) {
                                        const values = component && typeof component === "object"
                                            ? Object.entries(component).map(([key, value]) =>
                                                `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`
                                            ).join(" · ")
                                            : String(component);
                                        return `<tr><td>${index + 1}</td><td>${escapeHTML(values)}</td></tr>`;
                                    }).join("")
                                    : '<tr><td colspan="2">No component details available.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="gr-report-section">
                    <h3>Calculation Logic</h3>
                    <p>${escapeHTML(getCalculationLogic(record))}</p>
                </div>
            `,
            `<button class="gr-btn gr-btn-primary" data-modal-close>Close</button>`
        );
    }

    function getUniqueValues(records, key) {
        return [...new Set(records.map(record => record[key]).filter(Boolean))]
            .sort();
    }

    function renderOverview() {
        const reports = getStoredReports();
        const completed = allRecords.filter(record =>
            record.status.toLowerCase().includes("completed")
        ).length;
        const includedRecords = reports.reduce(function (total, report) {
            const records = Array.isArray(report.records) ? report.records : [];
            return total + (report.recordCount || report.totalRecords || records.length);
        }, 0);

        app.querySelector("#grOverviewCards").innerHTML = [
            ["Total Calculations", allRecords.length],
            ["Completed", completed],
            ["Generated Reports", reports.length],
            ["Included Records", includedRecords]
        ].map(function ([label, value]) {
            return `
                <article class="gr-overview-card">
                    <span>${label}</span>
                    <strong>${value}</strong>
                </article>
            `;
        }).join("");

        app.querySelector("#grTypeBreakdown").innerHTML = TYPES.map(function (type) {
            const count = allRecords.filter(record => record.type === type).length;
            const width = allRecords.length ? (count / allRecords.length) * 100 : 0;

            return `
                <div class="gr-type-row">
                    <strong>${escapeHTML(type)}</strong>
                    <div class="gr-type-track" aria-hidden="true">
                        <span style="width:${width}%"></span>
                    </div>
                    <span class="gr-type-count">${count}</span>
                </div>
            `;
        }).join("");

        const recentReports = reports.slice(0, 4);
        app.querySelector("#grRecentReports").innerHTML = recentReports.length
            ? recentReports.map(function (report) {
                const name = report.reportName || report.name ||
                    "Consolidated Regulatory Report";
                const records = Array.isArray(report.records) ? report.records : [];
                const types = Array.isArray(report.reportTypes) ? report.reportTypes :
                    Array.isArray(report.types) ? report.types :
                    [...new Set(records.map(record => record.type).filter(Boolean))];
                const count = report.recordCount || report.totalRecords || records.length;

                return `
                    <div class="gr-recent-item">
                        <div>
                            <strong>${escapeHTML(name)}</strong>
                            <small>${count} records · ${escapeHTML(types.join(", ") || "No types")}</small>
                        </div>
                        <span class="gr-status gr-status-generated">${escapeHTML(report.status || "Generated")}</span>
                    </div>
                `;
            }).join("")
            : '<p class="gr-empty">No reports generated yet.</p>';
    }

    function fillDynamicFilters() {
        [
            ["#grPeriodFilter", "ALL", "All Periods", "period"],
            ["#grBankFilter", "ALL", "All Banks", "bank"],
            ["#grStatusFilter", "ALL", "All Statuses", "status"]
        ].forEach(function ([selector, value, label, key]) {
            const select = app.querySelector(selector);
            const previousValue = select.value;
            const values = getUniqueValues(allRecords, key);

            select.innerHTML = `
                <option value="${value}">${label}</option>
                ${values.map(item =>
                    `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`
                ).join("")}
            `;

            if (values.includes(previousValue)) {
                select.value = previousValue;
            }
        });
    }

    function buildReportPreview(records, isDraft) {
        const grouped = {};

        TYPES.forEach(type => grouped[type] = []);

        records.forEach(function (record) {
            if (!grouped[record.type]) grouped[record.type] = [];
            grouped[record.type].push(record);
        });

        const banks = [...new Set(records.map(record => record.bank))];
        const periods = [...new Set(records.map(record => record.period))];
        const types = [...new Set(records.map(record => record.type))];

        const generatedAt = new Date().toLocaleString("en-IN");

        let sections = "";

        TYPES.forEach(function (type) {
            const rows = grouped[type] || [];

            if (!rows.length) return;

            const metricColumns = getReportColumns(type);

            sections += `
                <div class="gr-report-section">
                    <h3>${escapeHTML(type)} Calculations (${rows.length})</h3>

                    <div class="gr-table-wrap">
                        <table class="gr-report-table">
                            <thead>
                                <tr>
                                    <th>Calculation ID</th>
                                    <th>Bank</th>
                                    <th>Period</th>
                                    ${metricColumns.map(column =>
                                        `<th>${escapeHTML(column.label)}</th>`
                                    ).join("")}
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${rows.map(record => `
                                    <tr>
                                        <td>${escapeHTML(record.id)}</td>
                                        <td>${escapeHTML(record.bank)}</td>
                                        <td>${escapeHTML(record.period)}</td>
                                        ${metricColumns.map(column =>
                                            `<td>${escapeHTML(
                                                getMetricValue(record, column.key)
                                            )}</td>`
                                        ).join("")}
                                        <td>${escapeHTML(record.status)}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        return `
            <div class="gr-report-cover">
                <div class="gr-report-brand">
                    BASEL IV REGULATORY REPORTING PLATFORM
                </div>

                <h2>Consolidated Regulatory Report</h2>
                <p>Combined calculation report</p>

                <div style="margin-top:12px;">
                    <span class="gr-status ${isDraft ? "gr-status-draft" : "gr-status-generated"}">
                        ${isDraft ? "Draft Preview" : "Generated"}
                    </span>
                </div>

                <div class="gr-report-meta">
                    <div>
                        <span>Bank(s)</span>
                        <strong>${escapeHTML(banks.join(", ") || "-")}</strong>
                    </div>

                    <div>
                        <span>Reporting Period(s)</span>
                        <strong>${escapeHTML(periods.join(", ") || "-")}</strong>
                    </div>

                    <div>
                        <span>Generated At</span>
                        <strong>${escapeHTML(generatedAt)}</strong>
                    </div>

                    <div>
                        <span>Record Count</span>
                        <strong>${records.length}</strong>
                    </div>

                    <div>
                        <span>Report Types</span>
                        <strong>${escapeHTML(types.join(", ") || "-")}</strong>
                    </div>

                    <div>
                        <span>Source</span>
                        <strong>Regulatory calculations</strong>
                    </div>
                </div>
            </div>

            <div class="gr-report-section">
                <h3>Report Summary</h3>

                <div class="gr-report-summary">
                    ${TYPES.map(type => `
                        <div class="gr-summary-card">
                            <strong>${grouped[type].length}</strong>
                            <span>${escapeHTML(type)}</span>
                        </div>
                    `).join("")}
                </div>
            </div>

            ${sections}

            <p class="gr-report-footer">
                Generated by Basel IV Regulatory Reporting Platform using calculation records from this workspace.
            </p>
        `;
    }

    function getReportColumns(type) {
        const columns = {
            RWA: [
                { key: "creditRWA", label: "Credit RWA" },
                { key: "marketRWA", label: "Market RWA" },
                { key: "operationalRWA", label: "Operational RWA" },
                { key: "totalRWA", label: "Total RWA" }
            ],
            Liquidity: [
                { key: "HQLA", label: "HQLA" },
                { key: "netCashOutflows", label: "Net Cash Outflows" },
                { key: "LCR", label: "LCR (%)" },
                { key: "NSFR", label: "NSFR (%)" }
            ],
            Capital: [
                { key: "CET1", label: "CET1 Capital" },
                { key: "AT1", label: "Additional Tier 1 Capital" },
                { key: "tier2", label: "Tier 2 Capital" },
                { key: "tier1Capital", label: "Tier 1 Capital" },
                { key: "totalCapital", label: "Total Capital" },
                { key: "rwa", label: "Risk Weighted Assets" },
                { key: "cet1Ratio", label: "CET1 Ratio (%)" },
                { key: "tier1Ratio", label: "Tier 1 Ratio (%)" },
                { key: "CAR", label: "CAR (%)" }
            ],
            Leverage: [
                { key: "CET1", label: "CET1 Capital" },
                { key: "AT1", label: "Additional Tier 1 Capital" },
                { key: "tier1Capital", label: "Tier 1 Capital" },
                { key: "totalExposure", label: "Total Exposure" },
                { key: "leverageRatio", label: "Leverage Ratio (%)" }
            ]
        };

        return columns[type] || [];
    }

    function getRawMetricValue(record, key) {
        const metrics = record.metrics || {};
        const aliases = METRIC_ALIASES[key] || [key];

        for (const alias of aliases) {
            if (metrics[alias] !== undefined) return metrics[alias];
            if (record[alias] !== undefined) return record[alias];
        }

        return "";
    }

    function getMetricValue(record, key) {
        const value = getRawMetricValue(record, key);
        return value === "" ? "-" : formatNumber(value);
    }

    function getReviewFields(record) {
        const fields = {
            RWA: [
                ["creditRWA", "Credit Risk RWA", true, false],
                ["marketRWA", "Market Risk RWA", true, false],
                ["operationalRWA", "Operational Risk RWA", true, false],
                ["totalRWA", "Total RWA", false, true]
            ],
            Liquidity: [
                ["HQLA", "HQLA", true, false],
                ["netCashOutflows", "Net Cash Outflows", true, false],
                ["LCR", "LCR (%)", false, true],
                ["NSFR", "NSFR (%)", true, false]
            ],
            Capital: [
                ["CET1", "CET1 Capital", true, false],
                ["AT1", "Additional Tier 1 Capital", true, false],
                ["tier2", "Tier 2 Capital", true, false],
                ["tier1Capital", "Tier 1 Capital", false, true],
                ["totalCapital", "Total Capital", false, true],
                ["rwa", "Risk Weighted Assets", true, false],
                ["cet1Ratio", "CET1 Ratio (%)", false, true],
                ["tier1Ratio", "Tier 1 Ratio (%)", false, true],
                ["CAR", "CAR (%)", false, true]
            ],
            Leverage: [
                ["CET1", "CET1 Capital", true, false],
                ["AT1", "Additional Tier 1 Capital", true, false],
                ["tier1Capital", "Tier 1 Capital", false, true],
                ["totalExposure", "Total Exposure", true, false],
                ["leverageRatio", "Leverage Ratio (%)", false, true]
            ]
        };

        return fields[record.type] || [];
    }

    function buildReviewForm(records) {
        return `
            <form id="grReviewForm" class="gr-review-list">
                <p class="gr-review-note">
                    Update editable values for this report draft. Calculated fields are read-only, and source calculation records are not changed.
                </p>
                ${records.map(function (record) {
                    const fields = getReviewFields(record);

                    return `
                        <article class="gr-review-record" data-record-id="${escapeHTML(record.id)}">
                            <div class="gr-review-heading">
                                <div>
                                    <strong>${escapeHTML(record.id)}</strong>
                                    <small>${escapeHTML(record.type)} · ${escapeHTML(record.bank)} · ${escapeHTML(record.period)}</small>
                                </div>
                                <span class="gr-status gr-status-${record.status.toLowerCase()}">${escapeHTML(record.status)}</span>
                            </div>
                            <div class="gr-review-fields">
                                <div class="gr-review-field">
                                    <label>Bank</label>
                                    <input type="text" value="${escapeHTML(record.bank)}" readonly>
                                </div>
                                <div class="gr-review-field">
                                    <label>Reporting Period</label>
                                    <input type="text" value="${escapeHTML(record.period)}" readonly>
                                </div>
                                <div class="gr-review-field">
                                    <label>Business Date</label>
                                    <input type="text" value="${escapeHTML(formatDate(record.businessDate))}" readonly>
                                </div>
                                <div class="gr-review-field">
                                    <label for="grReviewStatus-${escapeHTML(record.id)}">Status</label>
                                    <select id="grReviewStatus-${escapeHTML(record.id)}" data-review-status required>
                                        ${["Completed", "Pending", "Failed"].map(status =>
                                            `<option value="${status}"${record.status === status ? " selected" : ""}>${status}</option>`
                                        ).join("")}
                                    </select>
                                </div>
                                ${fields.map(function ([key, label, editable, derived]) {
                                    const value = getRawMetricValue(record, key);
                                    const min = ["netCashOutflows", "rwa", "totalExposure"].includes(key)
                                        ? "0.000001"
                                        : "0";
                                    return `
                                        <div class="gr-review-field">
                                            <label for="grReview-${escapeHTML(record.id)}-${key}">${escapeHTML(label)}</label>
                                            <input
                                                id="grReview-${escapeHTML(record.id)}-${key}"
                                                type="number"
                                                step="any"
                                                min="${min}"
                                                value="${value === "" ? "" : escapeHTML(value)}"
                                                data-review-key="${key}"
                                                ${editable ? "required" : "readonly"}
                                                ${derived ? 'aria-label="' + escapeHTML(label) + ' calculated"' : ""}
                                            >
                                        </div>
                                    `;
                                }).join("")}
                            </div>
                        </article>
                    `;
                }).join("")}
            </form>
        `;
    }

    function recalculateReviewRecord(record) {
        const metrics = record.metrics || (record.metrics = {});
        const value = key => Number(getRawMetricValue(record, key));
        const percentage = (numerator, denominator) =>
            Number((numerator / denominator * 100).toFixed(2));

        if (record.type === "RWA") {
            metrics.totalRWA =
                value("creditRWA") +
                value("marketRWA") +
                value("operationalRWA");
        } else if (record.type === "Liquidity") {
            metrics.LCR = percentage(value("HQLA"), value("netCashOutflows"));
        } else if (record.type === "Capital") {
            const tier1 = value("CET1") + value("AT1");
            const total = tier1 + value("tier2");
            const rwa = value("rwa");

            metrics.tier1Capital = tier1;
            metrics.totalCapital = total;
            metrics.cet1Ratio = percentage(value("CET1"), rwa);
            metrics.tier1Ratio = percentage(tier1, rwa);
            metrics.CAR = percentage(total, rwa);
        } else if (record.type === "Leverage") {
            const tier1 = value("CET1") + value("AT1");
            metrics.tier1Capital = tier1;
            metrics.leverageRatio = percentage(tier1, value("totalExposure"));
        }
    }

    function saveReview() {
        if (typeof window.requireCurrentPermission !== "function" ||
            !window.requireCurrentPermission("generate-report", "U")) return false;

        const form = app.querySelector("#grReviewForm");

        if (!form.reportValidity()) return false;

        const updates = [];
        let invalidDenominator = false;

        form.querySelectorAll(".gr-review-record").forEach(function (card) {
            const id = card.dataset.recordId;
            const source = allRecords.find(record => record.id === id);
            if (!source) return;

            const record = JSON.parse(JSON.stringify(
                reviewedRecords.get(id) || source
            ));

            record.status = card.querySelector("[data-review-status]").value;

            card.querySelectorAll("[data-review-key]").forEach(function (input) {
                if (!input.readOnly) {
                    record.metrics[input.dataset.reviewKey] = Number(input.value);
                }
            });

            recalculateReviewRecord(record);

            if (
                (record.type === "Liquidity" && Number(getRawMetricValue(record, "netCashOutflows")) <= 0) ||
                (record.type === "Capital" && Number(getRawMetricValue(record, "rwa")) <= 0) ||
                (record.type === "Leverage" && Number(getRawMetricValue(record, "totalExposure")) <= 0)
            ) {
                invalidDenominator = true;
                return;
            }

            updates.push([id, record]);
        });

        if (invalidDenominator) {
            showToast("Calculation denominator must be greater than zero.");
            return false;
        }

        if (!updates.length) return false;

        updates.forEach(([id, record]) => reviewedRecords.set(id, record));
        renderCalculationTable();
        return true;
    }

    function openReview() {
        const selected = getSelectedRecords();

        if (!selected.length) {
            showToast("Select at least one calculation record.");
            return;
        }

        openModal(
            "Review Selected Rows",
            buildReviewForm(selected),
            `
                <button class="gr-btn" type="button" data-modal-close>Cancel</button>
                <button class="gr-btn" type="button" id="grSaveReviewBtn">Save Changes</button>
                <button class="gr-btn gr-btn-primary" type="button" id="grSaveAndPreviewBtn">Save &amp; Preview</button>
            `
        );
    }

    function openPreview() {
        const selected = getSelectedRecords();

        if (!selected.length) {
            showToast("Select at least one calculation record.");
            return;
        }

        previewZoom = 1;
        openModal(
            "Consolidated Report Preview",
            `
                <div class="gr-preview-toolbar">
                    <div>
                        <button class="gr-btn" type="button" id="grZoomOut" aria-label="Zoom out">−</button>
                        <span id="grZoomLabel">100%</span>
                        <button class="gr-btn" type="button" id="grZoomIn" aria-label="Zoom in">+</button>
                    </div>
                    <button class="gr-btn" type="button" id="grFullscreenPreview">Full screen</button>
                </div>
                <div class="gr-preview-stage" id="grPreviewStage">
                    <article class="gr-report-paper" id="grPreviewPaper">
                        ${buildReportPreview(selected, true)}
                    </article>
                </div>
            `,
            `
                <button class="gr-btn" data-modal-close>Close</button>
                <button class="gr-btn gr-btn-primary" id="grGenerateFromPreview">
                    Generate Report
                </button>
            `
        );
    }

    function generateFinalReport() {
        if (typeof window.requireCurrentPermission !== "function" ||
            !window.requireCurrentPermission("generate-report", "C")) return;

        const selected = getSelectedRecords();

        if (!selected.length) {
            showToast("Select calculation records first.");
            return;
        }

        const now = new Date();
        const banks = [...new Set(selected.map(record => record.bank))];
        const periods = [...new Set(selected.map(record => record.period))];
        const types = [...new Set(selected.map(record => record.type))];
        const id = "REG-CONS-" + now.getTime();
        const name = "Consolidated Regulatory Report";

        const report = {
            id: id,
            reportId: id,
            name: name,
            reportName: name,
            records: selected,
            recordCount: selected.length,
            totalRecords: selected.length,
            banks: banks,
            periods: periods,
            types: types,
            reportTypes: types,
            generatedAt: now.toISOString(),
            status: "Generated",
            source: "Regulatory calculations"
        };

        const reports = getStoredReports();
        reports.unshift(report);

        if (!saveStoredReports(reports)) return;

        lastGeneratedReport = report;
        renderOverview();

        openModal(
            "Generated Report",
            `
                <div class="gr-generated-report-heading">
                    <strong>${escapeHTML(report.id)}</strong>
                    <span class="gr-status gr-status-generated">Generated</span>
                </div>
                <article class="gr-report-paper">
                    ${buildReportPreview(report.records, false)}
                </article>
            `,
            `
                <button class="gr-btn" type="button" id="grExportPdfBtn">Export PDF</button>
                <button class="gr-btn" type="button" id="grExportExcelBtn">Export Excel</button>
                <button class="gr-btn gr-btn-primary" type="button" data-modal-close>Close</button>
            `
        );

        showToast("Consolidated report generated successfully.");
    }

    function setPreviewZoom(value) {
        previewZoom = Math.max(0.7, Math.min(1.3, value));
        const paper = app.querySelector("#grPreviewPaper");
        const label = app.querySelector("#grZoomLabel");

        if (paper) paper.style.transform = `scale(${previewZoom})`;
        if (label) label.textContent = Math.round(previewZoom * 100) + "%";
    }

    function bindEvents() {
        app.addEventListener("click", function (event) {
            const target = event.target;

            if (target.closest("#grApplyFilters")) {
                applyFilters();
            }

            if (target.closest("#grResetFilters")) {
                app.querySelector("#grTypeFilter").value = "ALL";
                app.querySelector("#grBankFilter").value = "ALL";
                app.querySelector("#grPeriodFilter").value = "ALL";
                app.querySelector("#grStatusFilter").value = "ALL";
                app.querySelector("#grBusinessDateFilter").value = "";
                app.querySelector("#grSearchInput").value = "";
                applyFilters();
            }

            if (target.closest("#grRefreshRecords")) {
                loadRecords();
                showToast("Calculation records refreshed.");
            }

            if (target.closest("#grReviewBtn")) {
                openReview();
            }

            if (target.closest("#grPreviewBtn")) {
                openPreview();
            }

            if (target.closest("#grGenerateBtn")) {
                generateFinalReport();
            }

            if (target.closest("#grGenerateFromPreview")) {
                generateFinalReport();
            }

            if (target.closest("#grExportPdfBtn")) {
                if (!window.baselTrackReportExports ||
                    typeof window.baselTrackReportExports.print !== "function") {
                    console.error("BaselTrack report print helper is unavailable.");
                    showToast("PDF export is unavailable.");
                } else if (!window.baselTrackReportExports.print(lastGeneratedReport)) {
                    showToast("Allow pop-ups to export the report as PDF.");
                }
            }

            if (target.closest("#grExportExcelBtn")) {
                if (window.baselTrackReportExports &&
                    typeof window.baselTrackReportExports.excel === "function") {
                    window.baselTrackReportExports.excel(lastGeneratedReport);
                    showToast("Excel workbook exported.");
                } else {
                    console.error("BaselTrack report export helpers are unavailable.");
                    showToast("Excel export is unavailable.");
                }
            }

            if (target.closest("#grSaveReviewBtn")) {
                if (saveReview()) {
                    showToast("Reviewed values saved to this report draft.");
                    openReview();
                }
            }

            if (target.closest("#grSaveAndPreviewBtn")) {
                if (saveReview()) {
                    showToast("Reviewed values saved to this report draft.");
                    openPreview();
                }
            }

            if (target.closest("#grZoomIn")) {
                setPreviewZoom(previewZoom + 0.1);
            }

            if (target.closest("#grZoomOut")) {
                setPreviewZoom(previewZoom - 0.1);
            }

            if (target.closest("#grFullscreenPreview")) {
                const stage = app.querySelector("#grPreviewStage");
                if (stage && typeof stage.requestFullscreen === "function") {
                    stage.requestFullscreen();
                } else {
                    showToast("Full screen preview is not supported in this browser.");
                }
            }

            if (target.closest("[data-modal-close]")) {
                closeModal();
            }

            const viewButton = target.closest(".gr-view-calculation");

            if (viewButton) {
                showCalculationDetails(viewButton.dataset.id);
            }

        });

        app.addEventListener("change", function (event) {
            if (event.target.id === "grSelectAll") {
                if (event.target.checked) {
                    selectedIds = new Set(
                        filteredRecords.map(record => record.id)
                    );
                } else {
                    selectedIds.clear();
                }

                renderCalculationTable();
            }

            if (event.target.classList.contains("gr-row-checkbox")) {
                const id = event.target.dataset.id;

                if (event.target.checked) {
                    selectedIds.add(id);
                } else {
                    selectedIds.delete(id);
                }

                renderCalculationTable();
            }
        });

        app.querySelector("#grSearchInput").addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                applyFilters();
            }
        });

        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeModal();
            }
        });

        modal.addEventListener("input", function (event) {
            if (event.target.matches("#grReviewForm input")) {
                event.target.setCustomValidity("");
            }
        });
    }

    function initGenerateReportsModule() {
        app = document.getElementById("generateReportsApp");

        if (!app) {
            console.error("Generate Reports root element was not found.");
            return;
        }

        if (app.dataset.initialized === "true") return;
        app.dataset.initialized = "true";

        modal = app.querySelector("#grModal");
        toast = app.querySelector("#grToast");

        if (!modal || !toast) {
            console.error("Generate Reports modal or toast element is missing.");
            return;
        }

        const paginationContainer = app.querySelector("#grPaginationContainer");

        if (!paginationContainer || typeof window.createTablePagination !== "function") {
            console.error("The shared table pagination helper is unavailable.");
            return;
        }

        selectedIds = new Set();
        tablePagination = window.createTablePagination(
            paginationContainer,
            renderCalculationTable,
            "Generate Report pagination"
        );

        bindEvents();
        loadRecords();
    }

    window.initGenerateReportsModule = initGenerateReportsModule;

})();