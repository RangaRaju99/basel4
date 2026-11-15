(function () {
    "use strict";

    function getSharedData() {
        window.baselTrackReconciliationData =
            window.baselTrackReconciliationData || {};

        const data = window.baselTrackReconciliationData;

        data.auditLogs = Array.isArray(data.auditLogs)
            ? data.auditLogs
            : [];

        /*
         * Add one sample event only when no audit events exist.
         * Existing events from other modules are never overwritten.
         */
        if (data.auditLogs.length === 0) {
            data.auditLogs.push({
                id: "AUD001",
                timestamp: "11/14/2026, 11:45:08 PM",
                module: "Variance Analysis",
                user: "Sathish Dhuda",
                action: "Generated breaches",
                reference: "Risk Metric/BATCH",
                type: "SUCCESS",
                status: "Completed",
                details: ""
            });
        }

        return data;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[char];
        });
    }

    function normalizeLog(log, index) {
        return {
            id: log.id || `AUD-${index + 1}`,
            timestamp: log.timestamp || log.createdAt || "-",
            module: log.module || "Reconciliation",
            user: log.user || "System",
            action: log.action || "Activity recorded",
            reference: log.reference || "-",
            type: String(log.type || "INFO").toUpperCase(),
            status: log.status || "-",
            details: log.details || ""
        };
    }

    function getTypeClass(type) {
        const classes = {
            SUCCESS: "ral-type-success",
            INFO: "ral-type-info",
            WARNING: "ral-type-warning",
            ERROR: "ral-type-error",
            SECURITY: "ral-type-security"
        };

        return classes[type] || "ral-type-info";
    }

    function isReconciliationModule(moduleName) {
        const reconciliationModules = [
            "Reconciliation",
            "Variance Analysis",
            "Exception Management",
            "Investigation",
            "Evidence Repository",
            "Approval & Closure"
        ];

        return reconciliationModules.includes(moduleName);
    }

    function downloadFile(fileName, content, mimeType) {
        const blob = new Blob([content], {
            type: mimeType
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    function convertToCSV(logs) {
        const headers = [
            "Audit ID",
            "Timestamp",
            "Module",
            "User",
            "Action",
            "Reference",
            "Type",
            "Status",
            "Details"
        ];

        const rows = logs.map(function (log) {
            return [
                log.id,
                log.timestamp,
                log.module,
                log.user,
                log.action,
                log.reference,
                log.type,
                log.status,
                log.details
            ];
        });

        function escapeCSV(value) {
            const text = String(value ?? "");
            return '"' + text.replace(/"/g, '""') + '"';
        }

        return [
            headers.map(escapeCSV).join(","),
            ...rows.map(function (row) {
                return row.map(escapeCSV).join(",");
            })
        ].join("\r\n");
    }

    window.initReconciliationAuditLogsModule = function () {
        const root = document.getElementById(
            "reconciliationAuditLogsApp"
        );

        if (!root || root.dataset.initialized === "true") {
            return;
        }

        root.dataset.initialized = "true";

        const data = getSharedData();

        const searchInput = root.querySelector("#ralSearch");
        const moduleFilter = root.querySelector("#ralModuleFilter");
        const typeFilter = root.querySelector("#ralTypeFilter");
        const tableBody = root.querySelector("#ralTableBody");

        const totalCount = root.querySelector("#ralTotalCount");
        const visibleCount = root.querySelector("#ralVisibleCount");
        const successCount = root.querySelector("#ralSuccessCount");
        const warningCount = root.querySelector("#ralWarningCount");
        const errorCount = root.querySelector("#ralErrorCount");
        const securityCount = root.querySelector("#ralSecurityCount");

        const footerVisible = root.querySelector("#ralFooterVisible");
        const footerTotal = root.querySelector("#ralFooterTotal");

        const exportCsvBtn = root.querySelector("#ralExportCsvBtn");
        const exportJsonBtn = root.querySelector("#ralExportJsonBtn");
        const printBtn = root.querySelector("#ralPrintBtn");

        let visibleLogs = [];

        function getAllLogs() {
            return data.auditLogs.map(normalizeLog);
        }

        function getFilteredLogs() {
            const allLogs = getAllLogs();

            const searchTerm = searchInput.value
                .trim()
                .toLowerCase();

            const selectedModule = moduleFilter.value;
            const selectedType = typeFilter.value;

            return allLogs.filter(function (log) {
                const matchesSearch =
                    !searchTerm ||
                    [
                        log.id,
                        log.timestamp,
                        log.module,
                        log.user,
                        log.action,
                        log.reference,
                        log.type,
                        log.status,
                        log.details
                    ].some(function (value) {
                        return String(value)
                            .toLowerCase()
                            .includes(searchTerm);
                    });

                let matchesModule = true;

                if (selectedModule === "RECONCILIATION") {
                    matchesModule = isReconciliationModule(log.module);
                } else if (selectedModule !== "ALL") {
                    matchesModule = log.module === selectedModule;
                }

                const matchesType =
                    selectedType === "ALL" ||
                    log.type === selectedType;

                return matchesSearch && matchesModule && matchesType;
            });
        }

        function renderTable(logs) {
            if (logs.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="ral-empty">
                            No audit events found for the selected filters.
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = logs.map(function (log) {
                return `
                    <tr>
                        <td>
                            <span class="ral-id">
                                ${escapeHTML(log.id)}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(log.timestamp)}
                        </td>

                        <td>
                            <div class="ral-main-text">
                                ${escapeHTML(log.module)}
                            </div>
                        </td>

                        <td>
                            ${escapeHTML(log.user)}
                        </td>

                        <td>
                            <div class="ral-main-text">
                                ${escapeHTML(log.action)}
                            </div>
                        </td>

                        <td>
                            ${escapeHTML(log.reference)}
                        </td>

                        <td>
                            <span class="ral-badge ${getTypeClass(log.type)}">
                                ${escapeHTML(log.type)}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(log.status)}
                        </td>

                        <td>
                            <span class="ral-sub-text">
                                ${escapeHTML(log.details || "-")}
                            </span>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        function renderMetrics(logs) {
            const allLogs = getAllLogs();

            totalCount.textContent = allLogs.length;
            visibleCount.textContent = logs.length;

            successCount.textContent = logs.filter(
                log => log.type === "SUCCESS"
            ).length;

            warningCount.textContent = logs.filter(
                log => log.type === "WARNING"
            ).length;

            errorCount.textContent = logs.filter(
                log => log.type === "ERROR"
            ).length;

            securityCount.textContent = logs.filter(
                log => log.type === "SECURITY"
            ).length;

            footerVisible.textContent = logs.length;
            footerTotal.textContent = allLogs.length;
        }

        function render() {
            visibleLogs = getFilteredLogs();

            renderTable(visibleLogs);
            renderMetrics(visibleLogs);
        }

        // Search and filters
        searchInput.addEventListener("input", render);
        moduleFilter.addEventListener("change", render);
        typeFilter.addEventListener("change", render);

        // Export filtered records to CSV
        exportCsvBtn.addEventListener("click", function () {
            if (visibleLogs.length === 0) {
                alert("There are no audit events to export.");
                return;
            }

            const csv = convertToCSV(visibleLogs);

            downloadFile(
                "BaselTrack_Reconciliation_Audit_Logs.csv",
                csv,
                "text/csv;charset=utf-8;"
            );
        });

        // Export filtered records to JSON
        exportJsonBtn.addEventListener("click", function () {
            if (visibleLogs.length === 0) {
                alert("There are no audit events to export.");
                return;
            }

            const json = JSON.stringify(visibleLogs, null, 4);

            downloadFile(
                "BaselTrack_Reconciliation_Audit_Logs.json",
                json,
                "application/json"
            );
        });

        // Print the audit log page
        printBtn.addEventListener("click", function () {
            window.print();
        });

        render();
    };

})();