
(function () {
    "use strict";

    window.baselTrackReconciliationData =
        window.baselTrackReconciliationData || {};

    const sharedData = window.baselTrackReconciliationData;

    sharedData.varianceResults = sharedData.varianceResults || [];
    sharedData.exceptions = sharedData.exceptions || [];
    sharedData.investigations = sharedData.investigations || [];
    sharedData.evidenceDocuments = sharedData.evidenceDocuments || [];
    sharedData.auditLogs = sharedData.auditLogs || [];

    let activeCaseId = null;
    let toastTimer = null;

    function getAuditUser() {
        try {
            if (typeof window.getCurrentUser === "function") {
                const current = window.getCurrentUser();

                if (typeof current === "string") return current;
                if (current && current.name) return current.name;
                if (current && current.username) return current.username;
            }
        } catch (error) {
            console.warn("Could not read current user.", error);
        }

        return "Demo User";
    }

    function addAuditLog(action, reference, type, details) {
        sharedData.auditLogs.push({
            id: "AUD-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            timestamp: new Date().toLocaleString("en-IN"),
            module: "Investigation",
            user: getAuditUser(),
            action: action,
            reference: reference,
            type: type || "INFO",
            status: type === "ERROR" ? "Failed" : "Completed",
            details: details || ""
        });
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

    function getDocumentsForCase(caseId) {
        return sharedData.evidenceDocuments.filter(function (document) {
            return document.caseId === caseId;
        });
    }

    function getDocumentCount(investigation) {
        return getDocumentsForCase(investigation.id).length;
    }

    function showToast(message, isError) {
        const toast = document.getElementById("invToast");
        if (!toast) return;

        toast.textContent = message;
        toast.style.background = isError ? "#b91c1c" : "#166534";
        toast.classList.add("show");

        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove("show");
        }, 2800);
    }

    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add("active");
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove("active");
    }

    function getStatusClass(status) {
        const classes = {
            "INVESTIGATING": "investigating",
            "ROOT_CAUSE_IDENTIFIED": "root-cause",
            "PENDING_VERIFY": "pending-verify",
            "APPROVAL_READY": "approval-ready",
            "CLOSED": "closed"
        };

        return classes[status] || "";
    }

    function getStatusLabel(status) {
        const labels = {
            "INVESTIGATING": "Investigating",
            "ROOT_CAUSE_IDENTIFIED": "Root Cause Identified",
            "PENDING_VERIFY": "Pending Verification",
            "APPROVAL_READY": "Approval Ready",
            "CLOSED": "Closed"
        };

        return labels[status] || status || "Unknown";
    }

    function getRootCauseCount() {
        return sharedData.investigations.filter(function (item) {
            return Boolean(item.rootCause && item.rootCause.trim());
        }).length;
    }

    function renderMetrics() {
        const cases = sharedData.investigations;

        document.getElementById("invCasesCount").textContent = cases.length;

        document.getElementById("invInvestigatingCount").textContent =
            cases.filter(item => item.status === "INVESTIGATING").length;

        document.getElementById("invRootCauseCount").textContent =
            getRootCauseCount();

        document.getElementById("invDocumentsCount").textContent =
            sharedData.evidenceDocuments.length;

        document.getElementById("invPendingVerifyCount").textContent =
            cases.filter(item => item.status === "PENDING_VERIFY").length;

        document.getElementById("invApprovalCount").textContent =
            cases.filter(item => item.status === "APPROVAL_READY").length;

        document.getElementById("invCaseTotal").textContent =
            cases.length + (cases.length === 1 ? " case" : " cases");
    }

    function renderTable() {
        const tbody = document.getElementById("invTableBody");
        if (!tbody) return;

        if (sharedData.investigations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="inv-empty">
                        Import assigned exceptions to create investigation cases.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sharedData.investigations.map(function (item) {
            const documents = getDocumentCount(item);
            const rootCauseLabel = item.rootCause
                ? "Identified"
                : "Not Identified";

            const statusLabel = getStatusLabel(item.status);
            const statusClass = getStatusClass(item.status);

            return `
                <tr>
                    <td><strong>${escapeHTML(item.id)}</strong></td>
                    <td>${escapeHTML(item.exceptionId)}</td>
                    <td>
                        <strong>${escapeHTML(item.riskType)}</strong><br>
                        ${escapeHTML(item.metric)}
                    </td>
                    <td>${escapeHTML(item.owner)}</td>
                    <td>
                        <span class="inv-status ${statusClass}">
                            ${escapeHTML(statusLabel)}
                        </span>
                    </td>
                    <td>${rootCauseLabel}</td>
                    <td>${documents}</td>
                    <td>
                        <button class="inv-action-btn"
                            data-action="view"
                            data-id="${escapeHTML(item.id)}">
                            View
                        </button>

                        <button class="inv-action-btn"
                            data-action="root"
                            data-id="${escapeHTML(item.id)}"
                            ${item.status === "PENDING_VERIFY" ||
                              item.status === "APPROVAL_READY" ||
                              item.status === "CLOSED" ? "disabled" : ""}>
                            Root Cause
                        </button>

                        <button class="inv-action-btn"
                            data-action="verify"
                            data-id="${escapeHTML(item.id)}"
                            ${!item.rootCause ||
                              documents === 0 ||
                              item.status !== "ROOT_CAUSE_IDENTIFIED"
                                ? "disabled" : ""}>
                            Submit
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function render() {
        renderMetrics();
        renderTable();
    }

    function importAssignedExceptions() {
        if (typeof window.requireCurrentPermission !== "function" ||
            !window.requireCurrentPermission("investigation", "C") ||
            !window.requireCurrentPermission("investigation", "U")) return;

        const assignedExceptions = sharedData.exceptions.filter(function (item) {
            return item.status === "ASSIGNED";
        });

        if (assignedExceptions.length === 0) {
            showToast(
                "No assigned exceptions found. Assign an exception first.",
                true
            );
            return;
        }

        let importedCount = 0;

        assignedExceptions.forEach(function (exception) {
            const alreadyImported = sharedData.investigations.some(function (item) {
                return item.exceptionId === exception.id;
            });

            if (alreadyImported) return;

            const nextNumber = sharedData.investigations.length + 1;
            const caseId = "INV" + String(nextNumber).padStart(3, "0");

            sharedData.investigations.push({
                id: caseId,
                exceptionId: exception.id,
                riskId: exception.riskId,
                riskType: exception.riskType,
                metric: exception.metric,
                variance: exception.variance,
                severity: exception.severity,
                owner: exception.owner,
                status: "INVESTIGATING",
                rootCause: "",
                correctiveAction: "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            exception.status = "INVESTIGATION";
            importedCount++;
        });

        if (importedCount > 0) {
            addAuditLog(
                "Imported Assigned Exceptions",
                "Investigation Cases/BATCH",
                "SUCCESS",
                importedCount + " investigation case(s) created."
            );

            showToast(importedCount + " investigation case(s) imported.");
        } else {
            showToast("These assigned exceptions have already been imported.", true);
        }

        render();
    }

    function openRootCause(caseId) {
        const item = sharedData.investigations.find(function (entry) {
            return entry.id === caseId;
        });

        if (!item) return;

        activeCaseId = caseId;

        document.getElementById("invRootCauseText").value =
            item.rootCause || "";

        document.getElementById("invCorrectiveAction").value =
            item.correctiveAction || "";

        openModal("invRootCauseModal");
    }

    function saveRootCause() {
        if (typeof window.requireCurrentPermission !== "function" ||
            !window.requireCurrentPermission("investigation", "U")) return;

        const item = sharedData.investigations.find(function (entry) {
            return entry.id === activeCaseId;
        });

        if (!item) return;

        const rootCause = document.getElementById("invRootCauseText")
            .value.trim();

        const correctiveAction = document.getElementById("invCorrectiveAction")
            .value.trim();

        if (!rootCause) {
            showToast("Enter the root cause description.", true);
            return;
        }

        if (!correctiveAction) {
            showToast("Enter the corrective action.", true);
            return;
        }

        item.rootCause = rootCause;
        item.correctiveAction = correctiveAction;
        item.status = "ROOT_CAUSE_IDENTIFIED";
        item.updatedAt = new Date().toISOString();

        addAuditLog(
            "Root Cause Identified",
            item.id + "/" + item.exceptionId,
            "SUCCESS",
            "Root cause and corrective action recorded."
        );

        closeModal("invRootCauseModal");
        showToast("Investigation details saved.");
        render();
    }

    function submitForVerification(caseId) {
        if (typeof window.requireCurrentPermission !== "function" ||
            !window.requireCurrentPermission("investigation", "U")) return;

        const item = sharedData.investigations.find(function (entry) {
            return entry.id === caseId;
        });

        if (!item) return;

        const documentCount = getDocumentCount(item);

        if (!item.rootCause || !item.correctiveAction) {
            showToast("Complete the root cause and corrective action first.", true);
            return;
        }

        if (documentCount === 0) {
            showToast("Upload evidence documents before submitting.", true);
            return;
        }

        if (item.status !== "ROOT_CAUSE_IDENTIFIED") {
            showToast("This case is not ready for verification.", true);
            return;
        }

        item.status = "PENDING_VERIFY";
        item.updatedAt = new Date().toISOString();

        addAuditLog(
            "Submitted for Verification",
            item.id + "/" + item.exceptionId,
            "SUCCESS",
            documentCount + " evidence document(s) submitted for verification."
        );

        showToast("Case submitted for verification.");
        render();
    }

    function viewCase(caseId) {
        const item = sharedData.investigations.find(function (entry) {
            return entry.id === caseId;
        });

        if (!item) return;

        const documentCount = getDocumentCount(item);

        document.getElementById("invViewContent").innerHTML = `
            <div class="inv-detail-grid">
                <div class="inv-detail-item">
                    <span>Investigation Case</span>
                    <strong>${escapeHTML(item.id)}</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Exception ID</span>
                    <strong>${escapeHTML(item.exceptionId)}</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Risk ID</span>
                    <strong>${escapeHTML(item.riskId)}</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Risk Type</span>
                    <strong>${escapeHTML(item.riskType)}</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Metric</span>
                    <strong>${escapeHTML(item.metric)}</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Variance</span>
                    <strong>${escapeHTML(item.variance)}%</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Assigned Owner</span>
                    <strong>${escapeHTML(item.owner)}</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Status</span>
                    <strong>${escapeHTML(getStatusLabel(item.status))}</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Evidence Documents</span>
                    <strong>${documentCount}</strong>
                </div>

                <div class="inv-detail-item">
                    <span>Created On</span>
                    <strong>${escapeHTML(new Date(item.createdAt).toLocaleString("en-IN"))}</strong>
                </div>
            </div>

            <div class="inv-detail-item" style="margin-top:13px;">
                <span>Root Cause</span>
                <strong>${escapeHTML(item.rootCause || "Not identified yet")}</strong>
            </div>

            <div class="inv-detail-item" style="margin-top:13px;">
                <span>Corrective Action</span>
                <strong>${escapeHTML(item.correctiveAction || "Not recorded yet")}</strong>
            </div>
        `;

        openModal("invViewModal");
    }

    function bindEvents() {
        document.getElementById("invImportBtn")
            .addEventListener("click", importAssignedExceptions);

        document.getElementById("invRootSave")
            .addEventListener("click", saveRootCause);

        document.getElementById("invRootClose")
            .addEventListener("click", function () {
                closeModal("invRootCauseModal");
            });

        document.getElementById("invRootCancel")
            .addEventListener("click", function () {
                closeModal("invRootCauseModal");
            });

        document.getElementById("invViewClose")
            .addEventListener("click", function () {
                closeModal("invViewModal");
            });

        document.getElementById("invViewDone")
            .addEventListener("click", function () {
                closeModal("invViewModal");
            });

        document.getElementById("invTableBody")
            .addEventListener("click", function (event) {
                const button = event.target.closest("button[data-action]");
                if (!button || button.disabled) return;

                const action = button.dataset.action;
                const caseId = button.dataset.id;

                if (action === "view") viewCase(caseId);
                if (action === "root") openRootCause(caseId);
                if (action === "verify") submitForVerification(caseId);
            });

        document.querySelectorAll("#investigationApp .inv-modal")
            .forEach(function (modal) {
                modal.addEventListener("click", function (event) {
                    if (event.target === modal) {
                        modal.classList.remove("active");
                    }
                });
            });
    }

    window.initInvestigationModule = function () {
        const app = document.getElementById("investigationApp");
        if (!app || app.dataset.initialized === "true") return;

        app.dataset.initialized = "true";

        bindEvents();
        render();
    };

})();
