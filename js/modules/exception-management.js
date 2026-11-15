/* =========================================
   BASELTRACK - EXCEPTION MANAGEMENT MODULE
========================================= */

(function () {
    "use strict";

    // Reuse shared data created by Variance Analysis.
    window.baselTrackReconciliationData =
        window.baselTrackReconciliationData || {};

    const sharedData = window.baselTrackReconciliationData;

    sharedData.varianceResults = sharedData.varianceResults || [];
    sharedData.exceptions = sharedData.exceptions || [];
    sharedData.auditLogs = sharedData.auditLogs || [];

    let selectedExceptionId = null;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function formatVariance(value) {
        return Number(value).toFixed(2) + "%";
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

    function addAuditLog(action, reference, details, type) {
        sharedData.auditLogs.unshift({
            id: "AUD-" + Date.now(),
            timestamp: new Date().toLocaleString("en-IN"),
            module: "Exception Management",
            user: getAuditUser(),
            action: action,
            reference: reference,
            type: type || "SUCCESS",
            status: "Completed",
            details: details
        });
    }

    function showToast(message) {
        const toast = document.getElementById("emToast");

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

    function getNextExceptionId() {
        const numbers = sharedData.exceptions.map(function (item) {
            const match = String(item.id).match(/^EXC(\d+)$/);
            return match ? Number(match[1]) : 0;
        });

        const nextNumber = Math.max(0, ...numbers) + 1;

        return "EXC" + String(nextNumber).padStart(3, "0");
    }

    function importBreaches() {
        const varianceResults = sharedData.varianceResults || [];

        if (varianceResults.length === 0) {
            alert("Please run Variance Analysis before importing breaches.");
            return;
        }

        const breaches = varianceResults.filter(function (item) {
            return item.breach === "YES";
        });

        if (breaches.length === 0) {
            showToast("No threshold breaches found to import.");
            return;
        }

        let importedCount = 0;

        breaches.forEach(function (item) {

            // Avoid duplicate exceptions for the same risk and metric.
            const alreadyExists = sharedData.exceptions.some(function (exception) {
                return (
                    exception.riskId === item.risk &&
                    exception.metric === item.metric
                );
            });

            if (alreadyExists) {
                return;
            }

            const exception = {
                id: getNextExceptionId(),
                riskId: item.risk,
                riskType: item.riskType,
                metric: item.metric,
                current: item.current,
                previous: item.previous,
                variance: item.variance,
                severity: "CRITICAL",
                status: "OPEN",
                owner: "Unassigned",
                createdAt: new Date().toISOString(),
                source: "Variance Analysis"
            };

            sharedData.exceptions.push(exception);
            importedCount++;
        });

        if (importedCount > 0) {
            addAuditLog(
                "Imported Breaches",
                "Exception Register/BATCH",
                importedCount + " new exception(s) imported from Variance Analysis.",
                "SUCCESS"
            );

            renderAll();

            showToast(importedCount + " breach(es) imported successfully.");
        } else {
            showToast("All identified breaches are already imported.");
        }
    }

    function getStatusClass(status) {
        return String(status).toLowerCase();
    }

    function renderMetrics() {
        const exceptions = sharedData.exceptions;

        const counts = {
            OPEN: 0,
            ASSIGNED: 0,
            INVESTIGATION: 0,
            APPROVAL: 0,
            CLOSED: 0,
            CRITICAL: 0
        };

        exceptions.forEach(function (item) {
            if (counts[item.status] !== undefined) {
                counts[item.status]++;
            }

            if (item.severity === "CRITICAL") {
                counts.CRITICAL++;
            }
        });

        document.getElementById("emOpenCount").textContent = counts.OPEN;
        document.getElementById("emAssignedCount").textContent = counts.ASSIGNED;
        document.getElementById("emInvestigationCount").textContent =
            counts.INVESTIGATION;
        document.getElementById("emApprovalCount").textContent = counts.APPROVAL;
        document.getElementById("emClosedCount").textContent = counts.CLOSED;
        document.getElementById("emCriticalCount").textContent = counts.CRITICAL;
    }

    function renderTable() {
        const tableBody = document.getElementById("emTableBody");
        const recordCount = document.getElementById("emRecordCount");
        const exceptions = sharedData.exceptions;

        recordCount.textContent =
            exceptions.length +
            (exceptions.length === 1 ? " exception" : " exceptions");

        if (exceptions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="em-empty">
                        <span class="em-empty-icon">▤</span>
                        No exceptions available. Import breaches to get started.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = exceptions.map(function (item) {
            const statusClass = getStatusClass(item.status);

            return `
                <tr>
                    <td>
                        <span class="em-id">
                            ${escapeHTML(item.id)}
                        </span>
                    </td>

                    <td>${escapeHTML(item.riskId)}</td>

                    <td>
                        <strong>${escapeHTML(item.metric)}</strong>
                        <span class="em-subtext">
                            ${escapeHTML(item.riskType)}
                        </span>
                    </td>

                    <td>${formatVariance(item.variance)}</td>

                    <td>
                        <span class="em-severity critical">
                            ${escapeHTML(item.severity)}
                        </span>
                    </td>

                    <td>
                        <span class="em-status ${statusClass}">
                            ${escapeHTML(item.status)}
                        </span>
                    </td>

                    <td>
                        <span class="em-owner">
                            ${escapeHTML(item.owner)}
                        </span>
                    </td>

                    <td>
                        <div class="em-actions">

                            <button
                                type="button"
                                class="em-icon-btn"
                                data-action="view"
                                data-id="${escapeHTML(item.id)}"
                                title="View exception"
                                aria-label="View exception"
                            >
                                ◉
                            </button>

                            <button
                                type="button"
                                class="em-icon-btn"
                                data-action="assign"
                                data-id="${escapeHTML(item.id)}"
                                title="Assign owner"
                                aria-label="Assign owner"
                                ${item.status === "CLOSED" ? "disabled" : ""}
                            >
                                ➜
                            </button>

                            <button
                                type="button"
                                class="em-icon-btn danger"
                                data-action="delete"
                                data-id="${escapeHTML(item.id)}"
                                title="Delete exception"
                                aria-label="Delete exception"
                            >
                                ×
                            </button>

                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderAll() {
        renderMetrics();
        renderTable();
    }

    function findException(id) {
        return sharedData.exceptions.find(function (item) {
            return item.id === id;
        });
    }

    function openAssignModal(id) {
        const exception = findException(id);

        if (!exception) {
            return;
        }

        selectedExceptionId = id;

        document.getElementById("emAssignInfo").innerHTML = `
            <strong>${escapeHTML(exception.id)}</strong><br>
            ${escapeHTML(exception.metric)}<br>
            Variance: ${formatVariance(exception.variance)}
        `;

        document.getElementById("emOwnerSelect").value =
            exception.owner === "Unassigned" ? "" : exception.owner;

        document.getElementById("emAssignModal").hidden = false;
    }

    function closeAssignModal() {
        document.getElementById("emAssignModal").hidden = true;
        selectedExceptionId = null;
    }

    function confirmAssignment() {
        const owner = document.getElementById("emOwnerSelect").value;

        if (!owner) {
            alert("Please select an owner.");
            return;
        }

        const exception = findException(selectedExceptionId);

        if (!exception) {
            closeAssignModal();
            return;
        }

        const previousOwner = exception.owner;

        exception.owner = owner;
        exception.status = "ASSIGNED";
        exception.assignedAt = new Date().toISOString();

        addAuditLog(
            "Assigned Exception",
            exception.id,
            "Exception assigned to " + owner +
            ". Previous owner: " + previousOwner + ".",
            "SUCCESS"
        );

        closeAssignModal();
        renderAll();

        showToast(exception.id + " assigned to " + owner + ".");
    }

    function openViewModal(id) {
        const exception = findException(id);

        if (!exception) {
            return;
        }

        document.getElementById("emViewContent").innerHTML = `
            <strong>Exception ID:</strong> ${escapeHTML(exception.id)}<br>
            <strong>Risk ID:</strong> ${escapeHTML(exception.riskId)}<br>
            <strong>Risk Type:</strong> ${escapeHTML(exception.riskType)}<br>
            <strong>Metric:</strong> ${escapeHTML(exception.metric)}<br>
            <strong>Current Value:</strong> ${escapeHTML(exception.current)}<br>
            <strong>Previous Value:</strong> ${escapeHTML(exception.previous)}<br>
            <strong>Variance:</strong> ${formatVariance(exception.variance)}<br>
            <strong>Severity:</strong> ${escapeHTML(exception.severity)}<br>
            <strong>Status:</strong> ${escapeHTML(exception.status)}<br>
            <strong>Owner:</strong> ${escapeHTML(exception.owner)}<br>
            <strong>Source:</strong> ${escapeHTML(exception.source)}
        `;

        document.getElementById("emViewModal").hidden = false;
    }

    function closeViewModal() {
        document.getElementById("emViewModal").hidden = true;
    }

    function deleteException(id) {
        const exception = findException(id);

        if (!exception) {
            return;
        }

        const confirmed = confirm(
            "Are you sure you want to delete " + id + "?"
        );

        if (!confirmed) {
            return;
        }

        sharedData.exceptions = sharedData.exceptions.filter(function (item) {
            return item.id !== id;
        });

        addAuditLog(
            "Deleted Exception",
            id,
            "Exception " + id + " was deleted from the register.",
            "WARNING"
        );

        renderAll();
        showToast(id + " deleted successfully.");
    }

    function handleTableAction(event) {
        const button = event.target.closest("[data-action]");

        if (!button) {
            return;
        }

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === "view") {
            openViewModal(id);
        } else if (action === "assign") {
            openAssignModal(id);
        } else if (action === "delete") {
            deleteException(id);
        }
    }

    // Called by navigation.js when this module opens.
    window.initExceptionManagementModule = function () {
        const app = document.getElementById("exceptionManagementApp");

        if (!app || app.dataset.initialized === "true") {
            return;
        }

        app.dataset.initialized = "true";

        document
            .getElementById("emImportBreaches")
            .addEventListener("click", importBreaches);

        document
            .getElementById("emTableBody")
            .addEventListener("click", handleTableAction);

        document
            .getElementById("emAssignConfirm")
            .addEventListener("click", confirmAssignment);

        document
            .getElementById("emAssignClose")
            .addEventListener("click", closeAssignModal);

        document
            .getElementById("emAssignCancel")
            .addEventListener("click", closeAssignModal);

        document
            .getElementById("emViewClose")
            .addEventListener("click", closeViewModal);

        document
            .getElementById("emViewDone")
            .addEventListener("click", closeViewModal);

        document
            .getElementById("emAssignModal")
            .addEventListener("click", function (event) {
                if (event.target.id === "emAssignModal") {
                    closeAssignModal();
                }
            });

        document
            .getElementById("emViewModal")
            .addEventListener("click", function (event) {
                if (event.target.id === "emViewModal") {
                    closeViewModal();
                }
            });

        renderAll();
    };

})();