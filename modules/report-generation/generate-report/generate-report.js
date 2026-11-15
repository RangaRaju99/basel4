/* BaselTrack - Generate Reports */
(function () {
    "use strict";

    const STORAGE_KEY = "baseltrack-generated-reports";
    const PAGE_SIZE = 6;
    const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"];
    const TYPES = ["RWA", "Liquidity", "Capital", "Leverage"];
    let app;
    let modal;
    let toast;
    let allRecords = [];
    let filteredRecords = [];
    let selectedIds = new Set();
    let currentPage = 1;
    let latestReport = null;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
        });
    }

    function formatNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : (value ?? "-");
    }

    function formatDate(value) {
        if (!value) return "-";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }

    function normalizeType(record) {
        const type = String(record.type || record.calculationType || record.module || "").toLowerCase();
        if (type.includes("rwa")) return "RWA";
        if (type.includes("liquidity") || type.includes("lcr")) return "Liquidity";
        if (type.includes("capital") || type.includes("car")) return "Capital";
        if (type.includes("leverage")) return "Leverage";
        return record.type || "Other";
    }

    function normalizeRecord(record, index) {
        const source = [record.metrics, record.details, record.results, record.calculationDetails, record.summary];
        const metrics = {};
        source.forEach(function (item) {
            if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(metrics, item);
        });
        ["totalRWA", "creditRWA", "marketRWA", "operationalRWA", "HQLA", "netCashOutflows", "LCR", "NSFR", "CET1", "AT1", "tier2", "totalCapital", "CAR", "tier1Capital", "totalExposure", "leverageRatio"].forEach(function (key) {
            if (record[key] !== undefined) metrics[key] = record[key];
        });
        const rawStatus = String(record.status || "Completed").toLowerCase();
        return Object.assign({}, record, {
            id: String(record.id || record.calculationId || record.resultId || "CAL-" + (index + 1)),
            type: normalizeType(record),
            bank: record.bank || record.bankName || "Unknown Bank",
            period: record.period || record.reportingPeriod || "-",
            businessDate: record.businessDate || record.date || "",
            status: rawStatus.includes("fail") ? "Failed" : rawStatus.includes("pending") ? "Pending" : "Completed",
            metrics: metrics
        });
    }

    function readCalculationRecords() {
        const shared = window.baselTrackCalculationData || {};
        if (Array.isArray(shared.results) && shared.results.length) return shared.results;
        try {
            const stored = JSON.parse(localStorage.getItem("baseltrack-calculation-results") || "[]");
            return Array.isArray(stored) ? stored : [];
        } catch (error) {
            console.warn("Generate Reports: unable to read stored calculations", error);
            return [];
        }
    }

    function loadStoredReports() {
        try {
            const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            return Array.isArray(reports) ? reports : [];
        } catch (error) {
            console.warn("Generate Reports: unable to read saved reports", error);
            return [];
        }
    }

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("show");
        window.clearTimeout(toast._timer);
        toast._timer = window.setTimeout(function () { toast.classList.remove("show"); }, 2800);
    }

    function metricValue(record, key) {
        const aliases = {
            totalRWA: ["totalRWA", "totalRwa", "total"], creditRWA: ["creditRWA", "credit", "creditRiskRWA"],
            marketRWA: ["marketRWA", "market", "marketRiskRWA"], operationalRWA: ["operationalRWA", "operational", "operationalRiskRWA"],
            HQLA: ["HQLA", "hqla"], netCashOutflows: ["netCashOutflows", "netOutflows", "netCashOutflow"],
            LCR: ["LCR", "lcr", "lcrRatio"], NSFR: ["NSFR", "nsfr", "nsfrRatio"], CET1: ["CET1", "cet1"],
            AT1: ["AT1", "at1"], tier2: ["tier2", "Tier2", "tierTwo"], totalCapital: ["totalCapital", "total"],
            CAR: ["CAR", "car", "carRatio"], tier1Capital: ["tier1Capital", "tier1", "Tier1"],
            totalExposure: ["totalExposure", "exposure"], leverageRatio: ["leverageRatio", "ratio", "leverage"]
        };
        for (const keyName of aliases[key] || [key]) {
            if (record.metrics && record.metrics[keyName] !== undefined) return formatNumber(record.metrics[keyName]);
            if (record[keyName] !== undefined) return formatNumber(record[keyName]);
        }
        return "-";
    }

    function primaryResult(record) {
        if (record.type === "RWA") return "Total RWA: " + metricValue(record, "totalRWA");
        if (record.type === "Liquidity") return "LCR: " + metricValue(record, "LCR") + "%";
        if (record.type === "Capital") return "CAR: " + metricValue(record, "CAR") + "%";
        if (record.type === "Leverage") return "Ratio: " + metricValue(record, "leverageRatio") + "%";
        return "-";
    }

    function applyFilters() {
        const type = app.querySelector("#grTypeFilter").value;
        const bank = app.querySelector("#grBankFilter").value;
        const period = app.querySelector("#grPeriodFilter").value;
        const status = app.querySelector("#grStatusFilter").value;
        const date = app.querySelector("#grBusinessDateFilter").value;
        const search = app.querySelector("#grSearchInput").value.trim().toLowerCase();
        filteredRecords = allRecords.filter(function (record) {
            if (type !== "ALL" && record.type !== type) return false;
            if (bank !== "ALL" && record.bank !== bank) return false;
            if (period !== "ALL" && record.period !== period) return false;
            if (status !== "ALL" && record.status !== status) return false;
            if (date) {
                const recordDate = new Date(record.businessDate);
                const selectedDate = new Date(date + "T00:00:00");
                if (Number.isNaN(recordDate.getTime()) || recordDate.toDateString() !== selectedDate.toDateString()) return false;
            }
            const searchable = [record.id, record.type, record.bank, record.period, record.status, record.businessDate].join(" ").toLowerCase();
            return !search || searchable.includes(search);
        });
        selectedIds = new Set(filteredRecords.map(record => record.id));
        currentPage = 1;
        renderRows();
    }

    function renderRows() {
        const total = filteredRecords.length;
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        currentPage = Math.min(currentPage, pages);
        const start = (currentPage - 1) * PAGE_SIZE;
        const visible = filteredRecords.slice(start, start + PAGE_SIZE);
        app.querySelector("#grMatchingCount").textContent = total + " matching rows";
        app.querySelector("#grSelectedCount").textContent = selectedIds.size;
        app.querySelector("#grFilteredTotal").textContent = total;
        app.querySelector("#grSelectAll").checked = total > 0 && selectedIds.size === total;
        app.querySelector("#grSelectAll").indeterminate = selectedIds.size > 0 && selectedIds.size < total;
        app.querySelector("#grCalculationTableBody").innerHTML = visible.length ? visible.map(function (record) {
            const checked = selectedIds.has(record.id) ? "checked" : "";
            return `<tr><td><input type="checkbox" class="gr-row-checkbox" data-id="${escapeHTML(record.id)}" ${checked} aria-label="Select ${escapeHTML(record.id)}"></td><td><strong>${escapeHTML(record.id)}</strong></td><td><span class="gr-type">${escapeHTML(record.type)}</span></td><td>${escapeHTML(record.bank)}</td><td>${escapeHTML(record.period)}</td><td>${escapeHTML(formatDate(record.businessDate))}</td><td>${escapeHTML(primaryResult(record))}</td><td><span class="gr-status gr-status-${record.status.toLowerCase()}">${escapeHTML(record.status)}</span></td><td><button type="button" class="gr-btn gr-view-calculation" data-id="${escapeHTML(record.id)}">View</button></td></tr>`;
        }).join("") : '<tr><td colspan="9"><div class="gr-empty"><strong>No calculation records found</strong>Run a calculation, then refresh this list.</div></td></tr>';
        app.querySelector("#grPaginationInfo").textContent = total ? `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, total)} of ${total}` : "Showing 0 records";
        let pagination = `<button type="button" class="gr-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>`;
        for (let page = 1; page <= pages; page++) pagination += `<button type="button" class="gr-page-btn ${page === currentPage ? "active" : ""}" data-page="${page}" aria-label="Page ${page}">${page}</button>`;
        pagination += `<button type="button" class="gr-page-btn" data-page="${currentPage + 1}" ${currentPage === pages ? "disabled" : ""} aria-label="Next page">›</button>`;
        app.querySelector("#grPaginationButtons").innerHTML = pagination;
        ["#grReviewBtn", "#grPreviewBtn", "#grGenerateBtn"].forEach(selector => { app.querySelector(selector).disabled = selectedIds.size === 0; });
    }

    function refreshRecords() {
        allRecords = readCalculationRecords().map(normalizeRecord);
        const periods = [...new Set(allRecords.map(record => record.period).filter(Boolean))].sort();
        const banks = [...new Set([...BANKS, ...allRecords.map(record => record.bank).filter(Boolean)])].sort();
        const periodSelect = app.querySelector("#grPeriodFilter");
        const bankSelect = app.querySelector("#grBankFilter");
        const oldPeriod = periodSelect.value;
        const oldBank = bankSelect.value;
        periodSelect.innerHTML = '<option value="ALL">All Periods</option>' + periods.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("");
        bankSelect.innerHTML = '<option value="ALL">All Banks</option>' + banks.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("");
        if (periods.includes(oldPeriod)) periodSelect.value = oldPeriod;
        if (banks.includes(oldBank)) bankSelect.value = oldBank;
        applyFilters();
    }

    function selectedRecords() { return filteredRecords.filter(record => selectedIds.has(record.id)); }

    function reportColumns(type) {
        return ({
            RWA: [["creditRWA", "Credit RWA"], ["marketRWA", "Market RWA"], ["operationalRWA", "Operational RWA"], ["totalRWA", "Total RWA"]],
            Liquidity: [["HQLA", "HQLA"], ["netCashOutflows", "Net Cash Outflows"], ["LCR", "LCR %"], ["NSFR", "NSFR %"]],
            Capital: [["CET1", "CET1"], ["AT1", "AT1"], ["tier2", "Tier 2"], ["totalCapital", "Total Capital"], ["CAR", "CAR %"]],
            Leverage: [["tier1Capital", "Tier 1 Capital"], ["totalExposure", "Total Exposure"], ["leverageRatio", "Leverage Ratio %"]]
        })[type] || [];
    }

    function buildPreview(records, draft) {
        const banks = [...new Set(records.map(record => record.bank))];
        const periods = [...new Set(records.map(record => record.period))];
        const types = [...new Set(records.map(record => record.type))];
        const groups = TYPES.map(function (type) {
            const entries = records.filter(record => record.type === type);
            if (!entries.length) return "";
            const columns = reportColumns(type);
            return `<section class="gr-report-section"><h3>${escapeHTML(type)} Calculations (${entries.length})</h3><div class="gr-table-wrap"><table class="gr-report-table"><thead><tr><th>Calculation ID</th><th>Bank</th><th>Period</th>${columns.map(column => `<th>${escapeHTML(column[1])}</th>`).join("")}<th>Status</th></tr></thead><tbody>${entries.map(record => `<tr><td>${escapeHTML(record.id)}</td><td>${escapeHTML(record.bank)}</td><td>${escapeHTML(record.period)}</td>${columns.map(column => `<td>${escapeHTML(metricValue(record, column[0]))}</td>`).join("")}<td>${escapeHTML(record.status)}</td></tr>`).join("")}</tbody></table></div></section>`;
        }).join("");
        return `<div class="gr-report-cover"><div class="gr-report-brand">BASEL IV REGULATORY REPORTING</div><h2>Consolidated Regulatory Report</h2><p>${draft ? "Draft Preview" : "Generated Report"}</p><div class="gr-report-meta"><div><span>Bank(s)</span><strong>${escapeHTML(banks.join(", "))}</strong></div><div><span>Reporting Period(s)</span><strong>${escapeHTML(periods.join(", "))}</strong></div><div><span>Generated At</span><strong>${escapeHTML(new Date().toLocaleString("en-IN"))}</strong></div><div><span>Record Count</span><strong>${records.length}</strong></div><div><span>Report Types</span><strong>${escapeHTML(types.join(", "))}</strong></div><div><span>Source</span><strong>Basel IV calculations</strong></div></div></div><section class="gr-report-section"><h3>Report Summary</h3><div class="gr-report-summary">${TYPES.map(type => `<div class="gr-summary-card"><strong>${records.filter(record => record.type === type).length}</strong><span>${type}</span></div>`).join("")}</div></section>${groups}`;
    }

    function openModal(title, content, footer) {
        modal.querySelector(".gr-modal-title").textContent = title;
        modal.querySelector(".gr-modal-body").innerHTML = content;
        modal.querySelector(".gr-modal-footer").innerHTML = footer;
        modal.classList.add("show");
    }

    function closeModal() { modal.classList.remove("show"); }

    function showDetails(id) {
        const record = allRecords.find(item => item.id === id);
        if (!record) return;
        const metrics = Object.entries(record.metrics || {});
        const rows = metrics.length ? metrics.map(([key, value]) => `<tr><td>${escapeHTML(key)}</td><td>${escapeHTML(typeof value === "object" ? JSON.stringify(value) : formatNumber(value))}</td></tr>`).join("") : '<tr><td colspan="2">No detailed metrics available.</td></tr>';
        openModal("Calculation Details", `<div class="gr-report-meta"><div><span>Calculation ID</span><strong>${escapeHTML(record.id)}</strong></div><div><span>Type</span><strong>${escapeHTML(record.type)}</strong></div><div><span>Bank</span><strong>${escapeHTML(record.bank)}</strong></div><div><span>Period</span><strong>${escapeHTML(record.period)}</strong></div><div><span>Business Date</span><strong>${escapeHTML(formatDate(record.businessDate))}</strong></div><div><span>Status</span><strong>${escapeHTML(record.status)}</strong></div></div><section class="gr-report-section"><h3>Calculation Metrics</h3><table class="gr-report-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></section>`, '<button type="button" class="gr-btn gr-btn-primary" data-modal-close>Close</button>');
    }

    function exportCSV(report) {
        if (!report || !Array.isArray(report.records)) return;
        const rows = report.records.map(function (record) {
            const row = { "Calculation ID": record.id, Type: record.type, Bank: record.bank, Period: record.period, "Business Date": formatDate(record.businessDate), Status: record.status };
            reportColumns(record.type).forEach(column => { row[column[1]] = metricValue(record, column[0]); });
            return row;
        });
        const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
        const cell = value => '"' + String(value ?? "").replace(/"/g, '""') + '"';
        const content = "\uFEFF" + [headers.map(cell).join(","), ...rows.map(row => headers.map(header => cell(row[header])).join(","))].join("\r\n");
        const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = report.id + ".csv";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    function generateReport() {
        const records = selectedRecords();
        if (!records.length) { showToast("Select at least one calculation record."); return; }
        const now = new Date();
        const report = {
            id: "REG-CONS-" + now.getTime(), name: "Consolidated Regulatory Report",
            records: records.map(record => Object.assign({}, record)), recordCount: records.length,
            banks: [...new Set(records.map(record => record.bank))], periods: [...new Set(records.map(record => record.period))],
            types: [...new Set(records.map(record => record.type))], generatedAt: now.toISOString(), status: "Generated", source: "Regulatory calculations"
        };
        try {
            const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            localStorage.setItem(STORAGE_KEY, JSON.stringify([report].concat(Array.isArray(reports) ? reports : [])));
        } catch (error) {
            console.error("Generate Reports: unable to save report", error);
            showToast("Unable to save report in browser storage.");
            return;
        }
        latestReport = report;
        openModal("Generated Report", `<div class="gr-report-cover"><strong>${escapeHTML(report.id)}</strong><span class="gr-status gr-status-generated">Generated</span></div>${buildPreview(records, false)}`, '<button type="button" class="gr-btn" data-action="print-report">Print / PDF</button><button type="button" class="gr-btn" data-action="export-report">Export CSV</button><button type="button" class="gr-btn gr-btn-primary" data-modal-close>Close</button>');
        showToast("Consolidated report generated and saved.");
    }

    function bindEvents() {
        app.addEventListener("click", function (event) {
            const target = event.target;
            if (target.closest("#grApplyFilters")) applyFilters();
            if (target.closest("#grResetFilters")) {
                app.querySelector("#grTypeFilter").value = "ALL";
                app.querySelector("#grBankFilter").value = "ALL";
                app.querySelector("#grPeriodFilter").value = "ALL";
                app.querySelector("#grStatusFilter").value = "ALL";
                app.querySelector("#grBusinessDateFilter").value = "";
                app.querySelector("#grSearchInput").value = "";
                applyFilters();
            }
            if (target.closest("#grRefreshRecords")) { refreshRecords(); showToast("Calculation records refreshed."); }
            if (target.closest("#grReviewBtn")) {
                const records = selectedRecords();
                if (records.length) openModal("Review Selected Calculations", `<p>${records.length} calculation record(s) are selected for the report.</p>${buildPreview(records, true)}`, '<button type="button" class="gr-btn" data-modal-close>Close</button>');
                else showToast("Select at least one calculation record.");
            }
            if (target.closest("#grPreviewBtn")) {
                const records = selectedRecords();
                if (records.length) openModal("Consolidated Report Preview", buildPreview(records, true), '<button type="button" class="gr-btn" data-modal-close>Close</button><button type="button" class="gr-btn gr-btn-primary" data-action="generate">Generate Report</button>');
                else showToast("Select at least one calculation record.");
            }
            if (target.closest("#grGenerateBtn") || target.closest('[data-action="generate"]')) generateReport();
            if (target.closest('[data-action="print-report"]')) window.print();
            if (target.closest('[data-action="export-report"]')) exportCSV(latestReport);
            if (target.closest("[data-modal-close]")) closeModal();
            const view = target.closest(".gr-view-calculation");
            if (view) showDetails(view.dataset.id);
            const pageButton = target.closest(".gr-page-btn");
            if (pageButton && !pageButton.disabled) { currentPage = Number(pageButton.dataset.page); renderRows(); }
        });
        app.addEventListener("change", function (event) {
            if (event.target.id === "grSelectAll") {
                selectedIds = event.target.checked ? new Set(filteredRecords.map(record => record.id)) : new Set();
                renderRows();
            }
            if (event.target.classList.contains("gr-row-checkbox")) {
                if (event.target.checked) selectedIds.add(event.target.dataset.id);
                else selectedIds.delete(event.target.dataset.id);
                renderRows();
            }
        });
        app.querySelector("#grSearchInput").addEventListener("keydown", function (event) { if (event.key === "Enter") applyFilters(); });
        modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(); });
    }

    window.initGenerateReportsModule = function () {
        app = document.getElementById("generateReportsApp");
        if (!app || app.dataset.initialized === "true") return;
        app.dataset.initialized = "true";
        modal = app.querySelector("#grModal");
        toast = app.querySelector("#grToast");
        if (!modal || !toast) { console.error("Generate Reports: required modal/toast elements are missing."); return; }
        selectedIds = new Set();
        currentPage = 1;
        bindEvents();
        refreshRecords();
    };
})();
