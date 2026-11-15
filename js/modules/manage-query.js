/* =========================================
   MANAGE QUERY MODULE
========================================= */

(function () {
    "use strict";

    const STORAGE_KEY = "baseltrack-queries";

    function readQueries() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return [];
            }

            const parsed = JSON.parse(saved);

            return Array.isArray(parsed)
                ? parsed
                : (Array.isArray(parsed.queries) ? parsed.queries : []);

        } catch (error) {
            console.error("Unable to read queries:", error);
            return [];
        }
    }

    function saveQueries(queries) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
    }

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

    function normalizeStatus(status) {
        const value = String(status || "Open").toLowerCase();

        if (value === "closed") return "Closed";
        if (value === "in progress") return "In Progress";

        return "Open";
    }

    function statusClass(status) {
        if (status === "Closed") return "mq-status-closed";
        if (status === "In Progress") return "mq-status-in-progress";

        return "mq-status-open";
    }

    function priorityClass(priority) {
        const value = String(priority || "Medium").toLowerCase();

        if (value === "high") return "mq-priority-high";
        if (value === "low") return "mq-priority-low";

        return "mq-priority-medium";
    }

    function showToast(message) {
        const toast = document.getElementById("mqToast");

        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        window.clearTimeout(showToast.timer);

        showToast.timer = window.setTimeout(function () {
            toast.classList.remove("show");
        }, 2600);
    }

    function getQueryValue(query, keys, fallback) {
        for (const key of keys) {
            if (
                query[key] !== undefined &&
                query[key] !== null &&
                query[key] !== ""
            ) {
                return query[key];
            }
        }

        return fallback || "";
    }

    function getQueryRows(queries, mode) {
        if (mode === "assigned") {
            return queries.filter(function (query) {
                return normalizeStatus(query.status) !== "Closed" &&
                    Boolean(query.assignedTo);
            });
        }

        if (mode === "closed") {
            return queries.filter(function (query) {
                return normalizeStatus(query.status) === "Closed";
            });
        }

        return queries;
    }

    function renderRows(container, queries, mode) {
        if (!container) return;

        const rows = getQueryRows(queries, mode);

        if (rows.length === 0) {
            const message = mode === "assigned"
                ? "No assigned queries available."
                : mode === "closed"
                    ? "No closed queries available."
                    : "No queries have been raised yet.";

            container.innerHTML = `
                <tr>
                    <td colspan="9" class="mq-empty">
                        <i class="fa-regular fa-folder-open"></i>
                        ${message}
                    </td>
                </tr>
            `;

            return;
        }

        container.innerHTML = rows.map(function (query) {
            const queryId = getQueryValue(
                query,
                ["queryId", "id"],
                "N/A"
            );

            const reportName = getQueryValue(
                query,
                ["reportName"],
                "N/A"
            );

            const raisedBy = getQueryValue(
                query,
                ["raisedBy"],
                "N/A"
            );

            const priority = getQueryValue(
                query,
                ["priority"],
                "Medium"
            );

            const assignedTo = getQueryValue(
                query,
                ["assignedTo"],
                "Not assigned"
            );

            const date = getQueryValue(
                query,
                ["date", "createdAt"],
                "N/A"
            );

            const description = getQueryValue(
                query,
                ["description", "queryDescription"],
                "No description provided"
            );

            const status = normalizeStatus(query.status);

            const actions = mode === "all"
                ? `
                    <div class="mq-actions">
                        <button
                            type="button"
                            class="mq-btn mq-btn-progress"
                            data-mq-action="progress"
                            data-query-id="${escapeHTML(queryId)}"
                            ${status !== "Open" ? "disabled" : ""}
                        >
                            Progress
                        </button>

                        <button
                            type="button"
                            class="mq-btn mq-btn-close"
                            data-mq-action="close"
                            data-query-id="${escapeHTML(queryId)}"
                            ${status === "Closed" ? "disabled" : ""}
                        >
                            Close
                        </button>
                    </div>
                `
                : `<span class="mq-status ${statusClass(status)}">${escapeHTML(status)}</span>`;

            return `
                <tr>
                    <td>
                        <span class="mq-query-id">${escapeHTML(queryId)}</span>
                    </td>

                    <td>${escapeHTML(reportName)}</td>
                    <td>${escapeHTML(raisedBy)}</td>

                    <td>
                        <span class="mq-priority ${priorityClass(priority)}">
                            ${escapeHTML(priority)}
                        </span>
                    </td>

                    <td>${escapeHTML(assignedTo)}</td>
                    <td>${escapeHTML(date)}</td>

                    <td>
                        <div class="mq-description">
                            ${escapeHTML(description)}
                        </div>
                    </td>

                    <td>
                        <span class="mq-status ${statusClass(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>${actions}</td>
                </tr>
            `;
        }).join("");
    }

    function renderModule() {
        const root = document.getElementById("manageQueryApp");

        if (!root) return;

        const queries = readQueries();

        const openQueries = queries.filter(function (query) {
            return normalizeStatus(query.status) !== "Closed";
        });

        const closedQueries = queries.filter(function (query) {
            return normalizeStatus(query.status) === "Closed";
        });

        const assignedQueries = openQueries.filter(function (query) {
            return Boolean(query.assignedTo);
        });

        document.getElementById("mqTotalCount").textContent = queries.length;
        document.getElementById("mqAssignedCount").textContent = assignedQueries.length;
        document.getElementById("mqClosedCount").textContent = closedQueries.length;

        applyFilters();
    }

    function applyFilters() {
        const queries = readQueries();

        const search = (
            document.getElementById("mqSearch")?.value || ""
        ).trim().toLowerCase();

        const statusFilter =
            document.getElementById("mqStatusFilter")?.value || "ALL";

        const priorityFilter =
            document.getElementById("mqPriorityFilter")?.value || "ALL";

        const filtered = queries.filter(function (query) {
            const searchable = [
                query.queryId,
                query.reportName,
                query.raisedBy,
                query.assignedTo,
                query.description
            ].join(" ").toLowerCase();

            const status = normalizeStatus(query.status);
            const priority = String(query.priority || "Medium");

            const matchesSearch =
                !search || searchable.includes(search);

            const matchesStatus =
                statusFilter === "ALL" || status === statusFilter;

            const matchesPriority =
                priorityFilter === "ALL" || priority === priorityFilter;

            return matchesSearch && matchesStatus && matchesPriority;
        });

        renderRows(
            document.getElementById("mqAllRows"),
            filtered,
            "all"
        );

        renderRows(
            document.getElementById("mqAssignedRows"),
            queries,
            "assigned"
        );

        renderRows(
            document.getElementById("mqClosedRows"),
            queries,
            "closed"
        );
    }

    function updateQueryStatus(queryId, newStatus) {
        const queries = readQueries();

        const query = queries.find(function (item) {
            return String(item.queryId || item.id) === String(queryId);
        });

        if (!query) {
            showToast("Query not found.");
            return;
        }

        const currentStatus = normalizeStatus(query.status);

        if (currentStatus === "Closed") {
            showToast("Closed queries cannot be modified.");
            return;
        }

        if (
            newStatus === "In Progress" &&
            currentStatus !== "Open"
        ) {
            return;
        }

        query.status = newStatus;
        query.updatedAt = new Date().toISOString();

        saveQueries(queries);
        renderModule();

        showToast(
            newStatus === "Closed"
                ? "Query closed successfully."
                : "Query moved to In Progress."
        );
    }

    function bindEvents() {
        const root = document.getElementById("manageQueryApp");

        if (!root || root.dataset.initialized === "true") return;

        root.dataset.initialized = "true";

        root.addEventListener("click", function (event) {
            const button = event.target.closest("[data-mq-action]");

            if (!button || button.disabled) return;

            const action = button.dataset.mqAction;
            const queryId = button.dataset.queryId;

            if (action === "progress") {
                updateQueryStatus(queryId, "In Progress");
            }

            if (action === "close") {
                const confirmed = window.confirm(
                    "Are you sure you want to close this query?"
                );

                if (confirmed) {
                    updateQueryStatus(queryId, "Closed");
                }
            }
        });

        document.getElementById("mqSearch")
            ?.addEventListener("input", applyFilters);

        document.getElementById("mqStatusFilter")
            ?.addEventListener("change", applyFilters);

        document.getElementById("mqPriorityFilter")
            ?.addEventListener("change", applyFilters);

        document.getElementById("mqRefresh")
            ?.addEventListener("click", function () {
                renderModule();
                showToast("Query list refreshed.");
            });

        window.addEventListener("storage", function (event) {
            if (event.key === STORAGE_KEY) {
                renderModule();
            }
        });
    }

    window.initManageQueryModule = function () {
        bindEvents();
        renderModule();
    };

})();