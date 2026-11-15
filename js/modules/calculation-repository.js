
(function () {
    "use strict";

    function getRepository() {
        window.baselTrackCalculationData =
            window.baselTrackCalculationData || {};

        window.baselTrackCalculationData.results =
            window.baselTrackCalculationData.results || [];

        return window.baselTrackCalculationData.results;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    function escapeCsv(value) {
        return '"' + String(value ?? "").replace(/"/g, '""') + '"';
    }

    function downloadCsv(filename, rows) {
        const csv = rows
            .map(row => row.map(escapeCsv).join(","))
            .join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function displayValue(value) {
        if (value === null || value === undefined || value === "") {
            return "-";
        }

        if (typeof value === "number") {
            return value.toLocaleString("en-IN", {
                maximumFractionDigits: 2
            });
        }

        if (typeof value === "object") {
            return JSON.stringify(value);
        }

        return String(value);
    }

    function getStatus(record) {
        return String(record.status || "Unknown");
    }

    function getType(record) {
        return String(record.type || "Unknown");
    }

    function getPeriod(record) {
        return String(record.reportingPeriod || record.period || "-");
    }

    function getBank(record) {
        return String(record.bank || "-");
    }

    function getCalculationId(record) {
        return String(record.calculationId || "N/A");
    }

    window.initCalculationRepositoryModule = function () {
        const root = document.getElementById("calculationRepositoryApp");

        if (!root || root.dataset.initialized === "true") return;

        root.dataset.initialized = "true";

        const bankFilter = root.querySelector("#repoBankFilter");
        const typeFilter = root.querySelector("#repoTypeFilter");
        const periodFilter = root.querySelector("#repoPeriodFilter");
        const statusFilter = root.querySelector("#repoStatusFilter");
        const searchInput = root.querySelector("#repoSearchInput");

        const tableBody = root.querySelector("#repoTableBody");
        const resultCount = root.querySelector("#repoResultCount");

        const detailsCard = root.querySelector("#repoDetailsCard");
        const detailsSubtitle = root.querySelector("#repoDetailsSubtitle");
        const detailsContent = root.querySelector("#repoDetailsContent");

        let selectedCalculationId = null;

        function getFilteredRecords() {
            const records = getRepository();

            const bank = bankFilter.value;
            const type = typeFilter.value;
            const period = periodFilter.value;
            const status = statusFilter.value;
            const search = searchInput.value.trim().toLowerCase();

            return records.filter(record => {
                const matchesBank =
                    bank === "All Banks" || getBank(record) === bank;

                const matchesType =
                    type === "All Types" || getType(record) === type;

                const matchesPeriod =
                    period === "All Periods" || getPeriod(record) === period;

                const matchesStatus =
                    status === "All Statuses" || getStatus(record) === status;

                const searchableText = [
                    getCalculationId(record),
                    getBank(record),
                    getType(record)
                ].join(" ").toLowerCase();

                const matchesSearch =
                    !search || searchableText.includes(search);

                return matchesBank &&
                    matchesType &&
                    matchesPeriod &&
                    matchesStatus &&
                    matchesSearch;
            });
        }

        function renderMetrics() {
            const records = getRepository();

            root.querySelector("#repoTotalCount").textContent =
                records.length;

            root.querySelector("#repoCompletedCount").textContent =
                records.filter(record =>
                    getStatus(record).toLowerCase() === "completed"
                ).length;

            root.querySelector("#repoPendingCount").textContent =
                records.filter(record =>
                    getStatus(record).toLowerCase() === "pending"
                ).length;

            root.querySelector("#repoFailedCount").textContent =
                records.filter(record =>
                    getStatus(record).toLowerCase() === "failed"
                ).length;
        }

        function getStatusClass(status) {
            const normalized = status.toLowerCase();

            if (normalized === "completed") {
                return "repo-status-completed";
            }

            if (normalized === "pending") {
                return "repo-status-pending";
            }

            if (normalized === "failed") {
                return "repo-status-failed";
            }

            return "";
        }

        function renderTable() {
            const records = getFilteredRecords().slice().reverse();

            resultCount.textContent =
                "Showing " + records.length + " calculation(s)";

            if (records.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="repo-empty">
                            No matching calculation results found.
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = records.map(record => {
                const id = getCalculationId(record);
                const status = getStatus(record);

                return `
                    <tr>
                        <td>${escapeHTML(id)}</td>
                        <td>${escapeHTML(getBank(record))}</td>
                        <td>${escapeHTML(getType(record))}</td>
                        <td>${escapeHTML(getPeriod(record))}</td>
                        <td>${escapeHTML(record.businessDate || "-")}</td>
                        <td>${escapeHTML(record.executionDate || "-")}</td>
                        <td>
                            <span class="repo-status ${getStatusClass(status)}">
                                ${escapeHTML(status)}
                            </span>
                        </td>
                        <td>
                            <div class="repo-row-actions">
                                <button type="button"
                                    class="repo-action-btn"
                                    data-action="view"
                                    data-id="${escapeHTML(id)}">
                                    View
                                </button>

                                <button type="button"
                                    class="repo-action-btn"
                                    data-action="download"
                                    data-id="${escapeHTML(id)}">
                                    Download
                                </button>

                                <button type="button"
                                    class="repo-action-btn repo-delete-btn"
                                    data-action="delete"
                                    data-id="${escapeHTML(id)}">
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        function renderDetails(record) {
            const metrics = record.metrics || {};
            const details = record.details || {};

            function buildRows(object) {
                const entries = Object.entries(object);

                if (entries.length === 0) {
                    return `<p>No details available.</p>`;
                }

                return entries.map(([key, value]) => `
                    <div class="repo-detail-row">
                        <span>${escapeHTML(
                            key.replace(/([A-Z])/g, " $1")
                                .replace(/^./, character => character.toUpperCase())
                        )}</span>
                        <strong>${escapeHTML(displayValue(value))}</strong>
                    </div>
                `).join("");
            }

            detailsSubtitle.textContent =
                getCalculationId(record) + " | " +
                getBank(record) + " | " +
                getType(record);

            const metadata = {
                "Calculation ID": getCalculationId(record),
                "Bank": getBank(record),
                "Type": getType(record),
                "Reporting Period": getPeriod(record),
                "Business Date": record.businessDate || "-",
                "Execution Date": record.executionDate || "-",
                "Status": getStatus(record)
            };

            detailsContent.innerHTML = `
                <div class="repo-detail-section">
                    <h4>Calculation Information</h4>
                    ${buildRows(metadata)}
                </div>

                <div class="repo-detail-section">
                    <h4>Calculation Metrics</h4>
                    ${buildRows(metrics)}
                </div>

                <div class="repo-detail-section">
                    <h4>Calculation Components</h4>
                    ${buildRows(details)}
                </div>
            `;

            selectedCalculationId = getCalculationId(record);
            detailsCard.hidden = false;

            detailsCard.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

        function findRecord(id) {
            return getRepository().find(record =>
                getCalculationId(record) === id
            );
        }

        function getRecordCsvRows(record) {
            const rows = [
                ["Calculation ID", getCalculationId(record)],
                ["Bank Name", getBank(record)],
                ["Calculation Type", getType(record)],
                ["Reporting Period", getPeriod(record)],
                ["Business Date", record.businessDate || "-"],
                ["Execution Date", record.executionDate || "-"],
                ["Status", getStatus(record)],
                [],
                ["Section", "Component", "Value"]
            ];

            Object.entries(record.metrics || {}).forEach(([key, value]) => {
                rows.push(["Metrics", key, displayValue(value)]);
            });

            Object.entries(record.details || {}).forEach(([key, value]) => {
                rows.push(["Details", key, displayValue(value)]);
            });

            return rows;
        }

        function downloadRecord(record) {
            const filename =
                getCalculationId(record).replace(/[^a-zA-Z0-9_-]/g, "_") +
                ".csv";

            downloadCsv(filename, getRecordCsvRows(record));
        }

        function deleteRecord(id) {
            const confirmed = window.confirm(
                "Are you sure you want to delete calculation " + id + "?"
            );

            if (!confirmed) return;

            const records = getRepository();
            const index = records.findIndex(record =>
                getCalculationId(record) === id
            );

            if (index === -1) return;

            records.splice(index, 1);

            if (selectedCalculationId === id) {
                selectedCalculationId = null;
                detailsCard.hidden = true;
                detailsContent.innerHTML = "";
            }

            renderAll();
        }

        function exportFilteredResults() {
            const records = getFilteredRecords();

            if (records.length === 0) {
                alert("There are no calculation results to export.");
                return;
            }

            const rows = [
                [
                    "Calculation ID",
                    "Bank Name",
                    "Type",
                    "Reporting Period",
                    "Business Date",
                    "Execution Date",
                    "Status",
                    "Metrics",
                    "Details"
                ]
            ];

            records.forEach(record => {
                rows.push([
                    getCalculationId(record),
                    getBank(record),
                    getType(record),
                    getPeriod(record),
                    record.businessDate || "",
                    record.executionDate || "",
                    getStatus(record),
                    JSON.stringify(record.metrics || {}),
                    JSON.stringify(record.details || {})
                ]);
            });

            downloadCsv("BaselTrack_Calculation_Results.csv", rows);
        }

        function renderAll() {
            renderMetrics();
            renderTable();
        }

        function applyFilters() {
            renderTable();
        }

        [
            bankFilter,
            typeFilter,
            periodFilter,
            statusFilter
        ].forEach(control => {
            control.addEventListener("change", applyFilters);
        });

        root.querySelector("#repoSearchBtn").addEventListener("click", applyFilters);

        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                applyFilters();
            }
        });

        root.querySelector("#repoClearBtn").addEventListener("click", () => {
            bankFilter.value = "All Banks";
            typeFilter.value = "All Types";
            periodFilter.value = "All Periods";
            statusFilter.value = "All Statuses";
            searchInput.value = "";

            renderTable();
        });

        root.querySelector("#repoExportBtn").addEventListener(
            "click",
            exportFilteredResults
        );

        root.querySelector("#repoCloseDetailsBtn").addEventListener("click", () => {
            detailsCard.hidden = true;
            selectedCalculationId = null;
        });

        tableBody.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;
            const record = findRecord(id);

            if (!record) {
                renderAll();
                return;
            }

            if (action === "view") {
                renderDetails(record);
            } else if (action === "download") {
                downloadRecord(record);
            } else if (action === "delete") {
                deleteRecord(id);
            }
        });

        renderAll();
    };
})();
