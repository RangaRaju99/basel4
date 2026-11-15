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
    const PAGE_SIZE = 6;

    const BANKS = [
        "HDFC Bank",
        "ICICI Bank",
        "State Bank of India",
        "Axis Bank"
    ];

    const TYPES = ["RWA", "Liquidity", "Capital", "Leverage"];

    let allRecords = [];
    let filteredRecords = [];
    let selectedIds = new Set();
    let currentPage = 1;
    let lastGeneratedReport = null;

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
            "totalRWA",
            "creditRWA",
            "marketRWA",
            "operationalRWA",
            "HQLA",
            "netCashOutflows",
            "LCR",
            "NSFR",
            "CET1",
            "AT1",
            "tier2",
            "totalCapital",
            "CAR",
            "tier1Capital",
            "totalExposure",
            "leverageRatio"
        ].forEach(function (key) {
            if (record[key] !== undefined) {
                metrics[key] = record[key];
            }
        });

        return metrics;
    }

    function getPrimaryResult(record) {
        const metrics = record.metrics || {};

        if (record.type === "RWA") {
            return "Total RWA: " + formatNumber(
                metrics.totalRWA ??
                metrics.totalRwa ??
                metrics.total ??
                "-"
            );
        }

        if (record.type === "Liquidity") {
            return "LCR: " + formatNumber(
                metrics.LCR ??
                metrics.lcr ??
                metrics.lcrRatio ??
                "-"
            ) + "%";
        }

        if (record.type === "Capital") {
            return "CAR: " + formatNumber(
                metrics.CAR ??
                metrics.car ??
                metrics.carRatio ??
                "-"
            ) + "%";
        }

        if (record.type === "Leverage") {
            return "Ratio: " + formatNumber(
                metrics.leverageRatio ??
                metrics.ratio ??
                metrics.leverage ??
                "-"
            ) + "%";
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
        modal.classList.remove("show");
    }

    function loadRecords() {
        allRecords = getRawCalculationRecords().map(normalizeRecord);
        applyFilters();
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
                    record.businessDate
                ].join(" ").toLowerCase();

                if (!searchable.includes(search)) return false;
            }

            return true;
        });

        // All filtered rows are selected by default.
        selectedIds = new Set(filteredRecords.map(record => record.id));

        currentPage = 1;
        renderCalculationTable();
    }

    function renderCalculationTable() {
        const body = app.querySelector("#grCalculationTableBody");
        const total = filteredRecords.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const pageRecords = filteredRecords.slice(
            startIndex,
            startIndex + PAGE_SIZE
        );

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

                        <td><strong>${escapeHTML(record.id)}</strong></td>

                        <td>
                            <span class="gr-type">
                                ${escapeHTML(record.type)}
                            </span>
                        </td>

                        <td>${escapeHTML(record.bank)}</td>
                        <td>${escapeHTML(record.period)}</td>
                        <td>${escapeHTML(formatDate(record.businessDate))}</td>
                        <td>${escapeHTML(getPrimaryResult(record))}</td>

                        <td>
                            <span class="gr-status gr-status-${record.status.toLowerCase()}">
                                ${escapeHTML(record.status)}
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

        app.querySelector("#grPaginationInfo").textContent =
            total === 0
                ? "Showing 0 records"
                : `Showing ${startIndex + 1}-${Math.min(
                    startIndex + PAGE_SIZE,
                    total
                )} of ${total}`;

        const pagination = app.querySelector("#grPaginationButtons");

        let buttons = `
            <button class="gr-page-btn" data-page="${currentPage - 1}"
                ${currentPage === 1 ? "disabled" : ""}>‹</button>
        `;

        for (let page = 1; page <= totalPages; page++) {
            buttons += `
                <button
                    class="gr-page-btn ${page === currentPage ? "active" : ""}"
                    data-page="${page}"
                >${page}</button>
            `;
        }

        buttons += `
            <button class="gr-page-btn" data-page="${currentPage + 1}"
                ${currentPage === totalPages ? "disabled" : ""}>›</button>
        `;

        pagination.innerHTML = buttons;

        app.querySelector("#grReviewBtn").disabled = selectedIds.size === 0;
        app.querySelector("#grPreviewBtn").disabled = selectedIds.size === 0;
        app.querySelector("#grGenerateBtn").disabled = selectedIds.size === 0;
    }

    function getSelectedRecords() {
        return filteredRecords.filter(record => selectedIds.has(record.id));
    }

    function getRecordDetails(record) {
        return Object.entries(record.metrics || {});
    }

    function showCalculationDetails(id) {
        const record = allRecords.find(item => item.id === id);

        if (!record) return;

        const details = getRecordDetails(record);

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
            `,
            `<button class="gr-btn gr-btn-primary" data-modal-close>Close</button>`
        );
    }

    function getUniqueValues(records, key) {
        return [...new Set(records.map(record => record[key]).filter(Boolean))]
            .sort();
    }

    function fillDynamicFilters() {
        const periodSelect = app.querySelector("#grPeriodFilter");
        const currentValue = periodSelect.value;

        const periods = getUniqueValues(allRecords, "period");

        periodSelect.innerHTML = `
            <option value="ALL">All Periods</option>
            ${periods.map(period =>
                `<option value="${escapeHTML(period)}">${escapeHTML(period)}</option>`
            ).join("")}
        `;

        if (periods.includes(currentValue)) {
            periodSelect.value = currentValue;
        }

        const bankSelect = app.querySelector("#grBankFilter");
        const selectedBank = bankSelect.value;

        const banks = [...new Set([
            ...BANKS,
            ...getUniqueValues(allRecords, "bank")
        ])];

        bankSelect.innerHTML = `
            <option value="ALL">All Banks</option>
            ${banks.map(bank =>
                `<option value="${escapeHTML(bank)}">${escapeHTML(bank)}</option>`
            ).join("")}
        `;

        if (banks.includes(selectedBank)) {
            bankSelect.value = selectedBank;
        }
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

            <p style="margin-top:25px;color:#78877e;font-size:10px;">
                Generated by Basel IV Regulatory Reporting Platform.
                This is a browser-based demonstration report.
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
                { key: "netCashOutflows", label: "Net Cash Outflow" },
                { key: "LCR", label: "LCR %" },
                { key: "NSFR", label: "NSFR %" }
            ],
            Capital: [
                { key: "CET1", label: "CET1" },
                { key: "AT1", label: "AT1" },
                { key: "tier2", label: "Tier 2" },
                { key: "totalCapital", label: "Total Capital" },
                { key: "CAR", label: "CAR %" }
            ],
            Leverage: [
                { key: "tier1Capital", label: "Tier 1 Capital" },
                { key: "totalExposure", label: "Total Exposure" },
                { key: "leverageRatio", label: "Ratio %" }
            ]
        };

        return columns[type] || [];
    }

    function getMetricValue(record, key) {
        const metrics = record.metrics || {};

        const aliases = {
            creditRWA: ["creditRWA", "credit", "creditRiskRWA"],
            marketRWA: ["marketRWA", "market", "marketRiskRWA"],
            operationalRWA: ["operationalRWA", "operational", "operationalRiskRWA"],
            totalRWA: ["totalRWA", "totalRwa", "total"],
            HQLA: ["HQLA", "hqla"],
            netCashOutflows: ["netCashOutflows", "netOutflows", "netCashOutflow"],
            LCR: ["LCR", "lcr", "lcrRatio"],
            NSFR: ["NSFR", "nsfr", "nsfrRatio"],
            CET1: ["CET1", "cet1"],
            AT1: ["AT1", "at1"],
            tier2: ["tier2", "Tier2", "tierTwo"],
            totalCapital: ["totalCapital", "total"],
            CAR: ["CAR", "car", "carRatio"],
            tier1Capital: ["tier1Capital", "tier1", "Tier1"],
            totalExposure: ["totalExposure", "exposure"],
            leverageRatio: ["leverageRatio", "ratio", "leverage"]
        };

        const keys = aliases[key] || [key];

        for (const alias of keys) {
            if (metrics[alias] !== undefined) {
                return formatNumber(metrics[alias]);
            }

            if (record[alias] !== undefined) {
                return formatNumber(record[alias]);
            }
        }

        return "-";
    }

    function openPreview() {
        const selected = getSelectedRecords();

        if (!selected.length) {
            showToast("Select at least one calculation record.");
            return;
        }

        openModal(
            "Consolidated Report Preview",
            buildReportPreview(selected, true),
            `
                <button class="gr-btn" data-modal-close>Close</button>
                <button class="gr-btn gr-btn-primary" id="grGenerateFromPreview">
                    Generate Report
                </button>
            `
        );
    }

    function generateFinalReport() {
        const selected = getSelectedRecords();

        if (!selected.length) {
            showToast("Select calculation records first.");
            return;
        }

        const now = new Date();

        const report = {
            id: "REG-CONS-" + now.getTime(),
            name: "Consolidated Regulatory Report",
            records: selected.map(record => ({ ...record })),
            recordCount: selected.length,
            banks: [...new Set(selected.map(record => record.bank))],
            periods: [...new Set(selected.map(record => record.period))],
            types: [...new Set(selected.map(record => record.type))],
            generatedAt: now.toISOString(),
            status: "Generated",
            source: "Regulatory calculations"
        };

        const reports = getStoredReports();
        reports.unshift(report);

        if (!saveStoredReports(reports)) return;

        lastGeneratedReport = report;

        openModal(
            "Generated Report",
            `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px;">
                    <strong>${escapeHTML(report.id)}</strong>
                    <span class="gr-status gr-status-generated">Generated</span>
                </div>

                ${buildReportPreview(report.records, false)}
            `,
            `
                <button class="gr-btn" id="grExportPdfBtn">Export PDF</button>
                <button class="gr-btn" id="grExportExcelBtn">Export Excel</button>
                <button class="gr-btn gr-btn-primary" data-modal-close>Close</button>
            `
        );

        showToast("Consolidated report generated successfully.");
    }

    function exportReportCSV(report) {
        if (!report || !Array.isArray(report.records)) return;

        const rows = [];

        report.records.forEach(function (record) {
            const row = {
                "Calculation ID": record.id,
                "Type": record.type,
                "Bank": record.bank,
                "Period": record.period,
                "Business Date": formatDate(record.businessDate),
                "Status": record.status
            };

            getReportColumns(record.type).forEach(function (column) {
                row[column.label] = getMetricValue(record, column.key);
            });

            rows.push(row);
        });

        const headers = [...new Set(
            rows.flatMap(row => Object.keys(row))
        )];

        function csvValue(value) {
            return '"' + String(value ?? "").replace(/"/g, '""') + '"';
        }

        const csv = [
            headers.map(csvValue).join(","),
            ...rows.map(row =>
                headers.map(header => csvValue(row[header])).join(",")
            )
        ].join("\r\n");

        downloadFile(
            report.id + ".csv",
            "\uFEFF" + csv,
            "text/csv;charset=utf-8;"
        );
    }

    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
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
                fillDynamicFilters();
                showToast("Calculation records refreshed.");
            }

            if (target.closest("#grReviewBtn")) {
                openPreview();
            }

            if (target.closest("#grPreviewBtn")) {
                openPreview();
            }

            if (target.closest("#grGenerateBtn")) {
                generateFinalReport();
            }

            if (target.closest("#grGenerateFromPreview")) {
                closeModal();
                generateFinalReport();
            }

            if (target.closest("#grExportPdfBtn")) {
                window.print();
            }

            if (target.closest("#grExportExcelBtn")) {
                exportReportCSV(lastGeneratedReport);
            }

            if (target.matches("[data-modal-close]")) {
                closeModal();
            }

            const viewButton = target.closest(".gr-view-calculation");

            if (viewButton) {
                showCalculationDetails(viewButton.dataset.id);
            }

            const pageButton = target.closest(".gr-page-btn");

            if (pageButton && !pageButton.disabled) {
                currentPage = Number(pageButton.dataset.page);
                renderCalculationTable();
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
    }

    function initGenerateReportsModule() {
        app = document.getElementById("generateReportsApp");

        if (!app) {
            console.error("Generate Reports root element was not found.");
            return;
        }

        modal = app.querySelector("#grModal");
        toast = app.querySelector("#grToast");

        if (!modal || !toast) {
            console.error("Generate Reports modal or toast element is missing.");
            return;
        }

        selectedIds = new Set();
        currentPage = 1;

        bindEvents();
        loadRecords();
        fillDynamicFilters();
        renderCalculationTable();
    }

    window.initGenerateReportsModule = initGenerateReportsModule;

})();