
/* =========================================
   AUDIT TRAIL MODULE
========================================= */

window.initAuditTrailModule = function () {

    const root = document.getElementById("auditTrailApp");

    if (!root || root.dataset.initialized === "true") {
        return;
    }

    root.dataset.initialized = "true";

    // -------------------------------------
    // 1. SAMPLE AUDIT LOG DATA
    // -------------------------------------

    const auditLogs = [
        {
            id: "LOG-001",
            module: "User Management",
            processedBy: "System Admin",
            action: "Create",
            description: "User created successfully",
            updatedTime: "12-Nov-2026 09:20 AM",
            timestamp: new Date(2026, 10, 12, 9, 20).getTime(),
            previousValue: "No existing user record",
            newValue: "New user account created successfully"
        },
        {
            id: "LOG-002",
            module: "System Configuration",
            processedBy: "System Admin",
            action: "Update",
            description: "Session timeout updated successfully",
            updatedTime: "12-Nov-2026 01:00 PM",
            timestamp: new Date(2026, 10, 12, 13, 0).getTime(),
            previousValue: "Session timeout: 15 minutes",
            newValue: "Session timeout: 30 minutes"
        },
        {
            id: "LOG-003",
            module: "Role Management",
            processedBy: "Compliance Manager",
            action: "Update",
            description: "Role permission updated successfully",
            updatedTime: "12-Nov-2026 10:00 AM",
            timestamp: new Date(2026, 10, 12, 10, 0).getTime(),
            previousValue: "Report Approval: No Access",
            newValue: "Report Approval: View and Approve"
        },
        {
            id: "LOG-004",
            module: "Query Management",
            processedBy: "Senior Manager",
            action: "Close",
            description: "Query closed successfully",
            updatedTime: "12-Nov-2026 11:15 AM",
            timestamp: new Date(2026, 10, 12, 11, 15).getTime(),
            previousValue: "Query Status: Open",
            newValue: "Query Status: Closed"
        },
        {
            id: "LOG-005",
            module: "Data Ingestion",
            processedBy: "Data Steward",
            action: "Upload",
            description: "File uploaded successfully",
            updatedTime: "12-Nov-2026 12:00 PM",
            timestamp: new Date(2026, 10, 12, 12, 0).getTime(),
            previousValue: "No file uploaded",
            newValue: "Regulatory data file uploaded successfully"
        }
    ];

    // -------------------------------------
    // 2. STATE
    // -------------------------------------

    let appliedFilters = {
        search: "",
        module: "All",
        action: "All"
    };

    let sortColumn = "";
    let sortDirection = "asc";

    // -------------------------------------
    // 3. ELEMENT REFERENCES
    // -------------------------------------

    const tableBody = root.querySelector("#atTableBody");
    const totalLogs = root.querySelector("#atTotalLogs");
    const recordCount = root.querySelector("#atRecordCount");

    const filterPanel = root.querySelector("#atFilterPanel");
    const searchInput = root.querySelector("#atSearch");
    const moduleFilter = root.querySelector("#atModuleFilter");
    const actionFilter = root.querySelector("#atActionFilter");

    const emptyState = root.querySelector("#atEmptyState");
    const detailsModal = root.querySelector("#atDetailsModal");

    // -------------------------------------
    // 4. HELPER FUNCTIONS
    // -------------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character];
        });
    }

    function getFilteredLogs() {

        const search = appliedFilters.search.toLowerCase().trim();

        return auditLogs.filter(function (log) {

            const matchesSearch =
                !search ||
                log.id.toLowerCase().includes(search) ||
                log.module.toLowerCase().includes(search) ||
                log.processedBy.toLowerCase().includes(search) ||
                log.action.toLowerCase().includes(search) ||
                log.description.toLowerCase().includes(search);

            const matchesModule =
                appliedFilters.module === "All" ||
                log.module === appliedFilters.module;

            const matchesAction =
                appliedFilters.action === "All" ||
                log.action === appliedFilters.action;

            return matchesSearch && matchesModule && matchesAction;
        });
    }

    // -------------------------------------
    // 5. FILTER PANEL
    // -------------------------------------

    root.querySelector("#atFilterToggle").addEventListener("click", function () {
        filterPanel.hidden = !filterPanel.hidden;
    });

    root.querySelector("#atApply").addEventListener("click", function () {

        appliedFilters = {
            search: searchInput.value,
            module: moduleFilter.value,
            action: actionFilter.value
        };

        renderTable();
    });

    root.querySelector("#atReset").addEventListener("click", function () {

        searchInput.value = "";
        moduleFilter.value = "All";
        actionFilter.value = "All";

        appliedFilters = {
            search: "",
            module: "All",
            action: "All"
        };

        sortColumn = "";
        sortDirection = "asc";

        updateSortIndicators();
        renderTable();
    });

    // -------------------------------------
    // 6. SORTING
    // -------------------------------------

    function sortLogs(data) {

        if (!sortColumn) {
            return data;
        }

        return [...data].sort(function (a, b) {

            let first;
            let second;

            if (sortColumn === "updatedTime") {
                first = a.timestamp;
                second = b.timestamp;
            } else {
                first = String(a[sortColumn]).toLowerCase();
                second = String(b[sortColumn]).toLowerCase();
            }

            if (first < second) {
                return sortDirection === "asc" ? -1 : 1;
            }

            if (first > second) {
                return sortDirection === "asc" ? 1 : -1;
            }

            return 0;
        });
    }

    function updateSortIndicators() {

        root.querySelectorAll(".at-sort-btn").forEach(function (button) {

            const icon = button.querySelector(".at-sort-icon");
            const isActive = button.dataset.sort === sortColumn;

            button.classList.toggle("active", isActive);

            if (!isActive) {
                icon.textContent = "↕";
            } else {
                icon.textContent = sortDirection === "asc" ? "↑" : "↓";
            }
        });
    }

    root.querySelectorAll(".at-sort-btn").forEach(function (button) {

        button.addEventListener("click", function () {

            const selectedColumn = button.dataset.sort;

            if (sortColumn === selectedColumn) {
                sortDirection = sortDirection === "asc" ? "desc" : "asc";
            } else {
                sortColumn = selectedColumn;
                sortDirection = "asc";
            }

            updateSortIndicators();
            renderTable();
        });
    });

    // -------------------------------------
    // 7. RENDER TABLE
    // -------------------------------------

    function renderTable() {

        const filteredLogs = sortLogs(getFilteredLogs());

        // Total Logs represents the records currently displayed.
        totalLogs.textContent = filteredLogs.length;

        recordCount.textContent =
            filteredLogs.length +
            (filteredLogs.length === 1 ? " record" : " records");

        tableBody.innerHTML = "";

        emptyState.hidden = filteredLogs.length !== 0;

        filteredLogs.forEach(function (log) {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <span class="at-module-name">
                        ${escapeHTML(log.module)}
                    </span>
                </td>

                <td>
                    <span class="at-processed-by">
                        ${escapeHTML(log.processedBy)}
                    </span>
                </td>

                <td>
                    <span class="at-action-label">
                        ${escapeHTML(log.action)}
                    </span>
                </td>

                <td>
                    <div class="at-description">
                        ${escapeHTML(log.description)}
                    </div>
                </td>

                <td>
                    <span class="at-updated-time">
                        ${escapeHTML(log.updatedTime)}
                    </span>
                </td>

                <td>
                    <button type="button"
                            class="at-view-btn"
                            data-log-id="${escapeHTML(log.id)}">
                        View
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });

        tableBody.querySelectorAll(".at-view-btn").forEach(function (button) {

            button.addEventListener("click", function () {
                openAuditDetails(button.dataset.logId);
            });
        });
    }

    // -------------------------------------
    // 8. VIEW AUDIT DETAILS
    // -------------------------------------

    function openAuditDetails(logId) {

        const log = auditLogs.find(function (item) {
            return item.id === logId;
        });

        if (!log) {
            return;
        }

        root.querySelector("#atDetailModule").textContent = log.module;
        root.querySelector("#atDetailAction").textContent = log.action;
        root.querySelector("#atDetailDescription").textContent = log.description;
        root.querySelector("#atDetailProcessedBy").textContent = log.processedBy;
        root.querySelector("#atDetailUpdatedTime").textContent = log.updatedTime;

        root.querySelector("#atPreviousValue").textContent = log.previousValue;
        root.querySelector("#atNewValue").textContent = log.newValue;

        detailsModal.hidden = false;
    }

    // -------------------------------------
    // 9. CLOSE MODAL
    // -------------------------------------

    function closeAuditDetails() {
        detailsModal.hidden = true;
    }

    root.querySelector("#atCloseModal").addEventListener("click", closeAuditDetails);
    root.querySelector("#atCloseIcon").addEventListener("click", closeAuditDetails);

    detailsModal.addEventListener("click", function (event) {
        if (event.target === detailsModal) {
            closeAuditDetails();
        }
    });

    // -------------------------------------
    // 10. INITIAL RENDER
    // -------------------------------------

    updateSortIndicators();
    renderTable();
};
