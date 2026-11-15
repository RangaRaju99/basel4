
(function () {
    "use strict";

    window.baselTrackReconciliationData =
        window.baselTrackReconciliationData || {};

    const sharedData = window.baselTrackReconciliationData;

    sharedData.investigations = sharedData.investigations || [];
    sharedData.exceptions = sharedData.exceptions || [];
    sharedData.evidenceDocuments = sharedData.evidenceDocuments || [];
    sharedData.auditLogs = sharedData.auditLogs || [];

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

    function addAuditLog(action, reference, type, details) {
        sharedData.auditLogs.push({
            id: "AUD-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            timestamp: new Date().toLocaleString("en-IN"),
            module: "Evidence Repository",
            user: getAuditUser(),
            action: action,
            reference: reference,
            type: type || "INFO",
            status: type === "ERROR" ? "Failed" : "Completed",
            details: details || ""
        });
    }

    function showToast(message, isError) {
        const toast = document.getElementById("evToast");
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

    function getInvestigation(caseId) {
        return sharedData.investigations.find(function (item) {
            return item.id === caseId;
        });
    }

    function getNextDocumentId() {
        const highest = sharedData.evidenceDocuments.reduce(function (max, item) {
            const match = String(item.id || "").match(/^DOC(\d+)$/);
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0);

        return "DOC" + String(highest + 1).padStart(3, "0");
    }

    function getStatusClass(status) {
        return {
            PENDING: "pending",
            VERIFIED: "verified",
            REJECTED: "rejected"
        }[status] || "";
    }

    function renderCaseOptions() {
        const select = document.getElementById("evCaseSelect");
        if (!select) return;

        const previousValue = select.value;

        select.innerHTML = `
            <option value="">Select Investigation Case</option>
            ${sharedData.investigations.map(function (item) {
                return `
                    <option value="${escapeHTML(item.id)}">
                        ${escapeHTML(item.id)} - ${escapeHTML(item.metric)}
                        (${escapeHTML(item.exceptionId)})
                    </option>
                `;
            }).join("")}
        `;

        if (sharedData.investigations.some(item => item.id === previousValue)) {
            select.value = previousValue;
        }
    }

    function renderMetrics() {
        const documents = sharedData.evidenceDocuments;

        document.getElementById("evTotalCount").textContent =
            documents.length;

        document.getElementById("evVerifiedCount").textContent =
            documents.filter(item => item.status === "VERIFIED").length;

        document.getElementById("evPendingCount").textContent =
            documents.filter(item => item.status === "PENDING").length;

        document.getElementById("evRejectedCount").textContent =
            documents.filter(item => item.status === "REJECTED").length;

        document.getElementById("evCasesCount").textContent =
            sharedData.investigations.length;

        const exceptionIds = new Set(
            documents.map(item => item.exceptionId)
        );

        document.getElementById("evExceptionsCount").textContent =
            exceptionIds.size;
    }

    function renderTable() {
        const tbody = document.getElementById("evTableBody");
        if (!tbody) return;

        const search = document.getElementById("evSearch")
            .value.trim().toLowerCase();

        const statusFilter = document.getElementById("evStatusFilter").value;

        const filtered = sharedData.evidenceDocuments.filter(function (item) {
            const searchable = [
                item.id,
                item.caseId,
                item.exceptionId,
                item.fileName,
                item.documentType,
                item.description,
                item.uploadedBy
            ].join(" ").toLowerCase();

            const matchesSearch = !search || searchable.includes(search);
            const matchesStatus =
                statusFilter === "ALL" || item.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="ev-empty">
                        ${sharedData.evidenceDocuments.length === 0
                            ? "No documents have been added yet."
                            : "No documents match the selected filters."}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(function (item) {
            const statusClass = getStatusClass(item.status);

            return `
                <tr>
                    <td><strong>${escapeHTML(item.id)}</strong></td>
                    <td>${escapeHTML(item.caseId)}</td>
                    <td>${escapeHTML(item.exceptionId)}</td>
                    <td>${escapeHTML(item.fileName)}</td>
                    <td>${escapeHTML(item.documentType)}</td>
                    <td>${escapeHTML(item.description || "-")}</td>
                    <td>${escapeHTML(item.uploadedBy)}</td>
                    <td>
                        <span class="ev-status ${statusClass}">
                            ${escapeHTML(item.status)}
                        </span>
                    </td>
                    <td>
                        <button class="ev-action-btn"
                            data-action="view"
                            data-id="${escapeHTML(item.id)}">
                            View
                        </button>

                        ${item.status === "PENDING" ? `
                            <button class="ev-action-btn"
                                data-action="verify"
                                data-id="${escapeHTML(item.id)}">
                                Verify
                            </button>

                            <button class="ev-action-btn reject"
                                data-action="reject"
                                data-id="${escapeHTML(item.id)}">
                                Reject
                            </button>
                        ` : ""}

                        <button class="ev-action-btn delete"
                            data-action="delete"
                            data-id="${escapeHTML(item.id)}">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function render() {
        renderMetrics();
        renderTable();
        renderCaseOptions();
    }

    function addDocument() {
        const caseId = document.getElementById("evCaseSelect").value;
        const fileInput = document.getElementById("evFileInput");
        const documentType = document.getElementById("evDocumentType").value;
        const description = document.getElementById("evDescription")
            .value.trim();

        const file = fileInput.files && fileInput.files[0];

        if (!caseId) {
            showToast("Select an investigation case.", true);
            return;
        }

        const investigation = getInvestigation(caseId);

        if (!investigation) {
            showToast("The selected investigation case was not found.", true);
            return;
        }

        if (!file) {
            showToast("Choose a document first.", true);
            return;
        }

        if (!documentType) {
            showToast("Select a document type.", true);
            return;
        }

        const allowedExtensions = [
            "pdf", "doc", "docx", "xls", "xlsx",
            "csv", "png", "jpg", "jpeg"
        ];

        const extension = file.name.split(".").pop().toLowerCase();

        if (!allowedExtensions.includes(extension)) {
            showToast("This file type is not supported.", true);
            return;
        }

        const exception = sharedData.exceptions.find(function (item) {
            return item.id === investigation.exceptionId;
        });

        const documentRecord = {
            id: getNextDocumentId(),
            caseId: investigation.id,
            exceptionId: investigation.exceptionId,
            fileName: file.name,
            fileSize: file.size,
            documentType: documentType,
            description: description,
            uploadedBy: getAuditUser(),
            uploadedAt: new Date().toISOString(),
            status: "PENDING",
            rejectionReason: "",
            verifiedBy: "",
            verifiedAt: null
        };

        sharedData.evidenceDocuments.push(documentRecord);

        addAuditLog(
            "Evidence Document Added",
            documentRecord.id + "/" + documentRecord.caseId,
            "SUCCESS",
            "Document metadata added for " + documentRecord.fileName
        );

        document.getElementById("evFileInput").value = "";
        document.getElementById("evDocumentType").value = "";
        document.getElementById("evDescription").value = "";
        document.getElementById("evCaseSelect").value = "";

        closeModal("evAddModal");
        render();

        showToast("Evidence document added successfully.");
    }

    function verifyDocument(documentId) {
        const item = sharedData.evidenceDocuments.find(function (entry) {
            return entry.id === documentId;
        });

        if (!item || item.status !== "PENDING") return;

        const confirmed = window.confirm(
            "Are you sure you want to verify this evidence document?"
        );

        if (!confirmed) return;

        item.status = "VERIFIED";
        item.verifiedBy = getAuditUser();
        item.verifiedAt = new Date().toISOString();
        item.rejectionReason = "";

        addAuditLog(
            "Evidence Verified",
            item.id + "/" + item.caseId,
            "SUCCESS",
            "Evidence document verified: " + item.fileName
        );

        render();
        showToast("Evidence document verified.");
    }

    function rejectDocument(documentId) {
        const item = sharedData.evidenceDocuments.find(function (entry) {
            return entry.id === documentId;
        });

        if (!item || item.status !== "PENDING") return;

        const reason = window.prompt(
            "Enter the reason for rejecting this evidence document:"
        );

        if (reason === null) return;

        if (!reason.trim()) {
            showToast("A rejection reason is required.", true);
            return;
        }

        item.status = "REJECTED";
        item.rejectionReason = reason.trim();

        addAuditLog(
            "Evidence Rejected",
            item.id + "/" + item.caseId,
            "WARNING",
            "Rejected " + item.fileName + ". Reason: " + reason.trim()
        );

        render();
        showToast("Evidence document rejected.");
    }

    function deleteDocument(documentId) {
        const index = sharedData.evidenceDocuments.findIndex(function (entry) {
            return entry.id === documentId;
        });

        if (index === -1) return;

        const item = sharedData.evidenceDocuments[index];

        const confirmed = window.confirm(
            "Delete evidence document " + item.id + "?"
        );

        if (!confirmed) return;

        sharedData.evidenceDocuments.splice(index, 1);

        addAuditLog(
            "Evidence Document Deleted",
            item.id + "/" + item.caseId,
            "WARNING",
            "Deleted document metadata for " + item.fileName
        );

        render();
        showToast("Evidence document deleted.");
    }

    function viewDocument(documentId) {
        const item = sharedData.evidenceDocuments.find(function (entry) {
            return entry.id === documentId;
        });

        if (!item) return;

        document.getElementById("evDetailsContent").innerHTML = `
            <div class="ev-form-group">
                <label>Document ID</label>
                <div>${escapeHTML(item.id)}</div>
            </div>

            <div class="ev-form-group">
                <label>File Name</label>
                <div>${escapeHTML(item.fileName)}</div>
            </div>

            <div class="ev-form-group">
                <label>Investigation Case</label>
                <div>${escapeHTML(item.caseId)}</div>
            </div>

            <div class="ev-form-group">
                <label>Related Exception</label>
                <div>${escapeHTML(item.exceptionId)}</div>
            </div>

            <div class="ev-form-group">
                <label>Document Type</label>
                <div>${escapeHTML(item.documentType)}</div>
            </div>

            <div class="ev-form-group">
                <label>Description</label>
                <div>${escapeHTML(item.description || "-")}</div>
            </div>

            <div class="ev-form-group">
                <label>Uploaded By</label>
                <div>${escapeHTML(item.uploadedBy)}</div>
            </div>

            <div class="ev-form-group">
                <label>Uploaded On</label>
                <div>${escapeHTML(new Date(item.uploadedAt).toLocaleString("en-IN"))}</div>
            </div>

            <div class="ev-form-group">
                <label>File Size</label>
                <div>${(Number(item.fileSize || 0) / 1024).toFixed(2)} KB</div>
            </div>

            <div class="ev-form-group">
                <label>Status</label>
                <div>${escapeHTML(item.status)}</div>
            </div>

            ${item.verifiedBy ? `
                <div class="ev-form-group">
                    <label>Verified By</label>
                    <div>${escapeHTML(item.verifiedBy)}</div>
                </div>
            ` : ""}

            ${item.rejectionReason ? `
                <div class="ev-form-group">
                    <label>Rejection Reason</label>
                    <div>${escapeHTML(item.rejectionReason)}</div>
                </div>
            ` : ""}
        `;

        openModal("evDetailsModal");
    }

    function bindEvents() {
        document.getElementById("evAddDocumentBtn")
            .addEventListener("click", function () {
                renderCaseOptions();

                if (sharedData.investigations.length === 0) {
                    showToast("Create an investigation case first.", true);
                    return;
                }

                openModal("evAddModal");
            });

        document.getElementById("evSaveDocument")
            .addEventListener("click", addDocument);

        document.getElementById("evAddClose")
            .addEventListener("click", function () {
                closeModal("evAddModal");
            });

        document.getElementById("evAddCancel")
            .addEventListener("click", function () {
                closeModal("evAddModal");
            });

        document.getElementById("evDetailsClose")
            .addEventListener("click", function () {
                closeModal("evDetailsModal");
            });

        document.getElementById("evDetailsDone")
            .addEventListener("click", function () {
                closeModal("evDetailsModal");
            });

        document.getElementById("evSearch")
            .addEventListener("input", renderTable);

        document.getElementById("evStatusFilter")
            .addEventListener("change", renderTable);

        document.getElementById("evTableBody")
            .addEventListener("click", function (event) {
                const button = event.target.closest("button[data-action]");
                if (!button) return;

                const action = button.dataset.action;
                const documentId = button.dataset.id;

                if (action === "view") viewDocument(documentId);
                if (action === "verify") verifyDocument(documentId);
                if (action === "reject") rejectDocument(documentId);
                if (action === "delete") deleteDocument(documentId);
            });

        document.querySelectorAll("#evidenceRepositoryApp .ev-modal")
            .forEach(function (modal) {
                modal.addEventListener("click", function (event) {
                    if (event.target === modal) {
                        modal.classList.remove("active");
                    }
                });
            });
    }

    window.initEvidenceRepositoryModule = function () {
        const app = document.getElementById("evidenceRepositoryApp");

        if (!app || app.dataset.initialized === "true") return;

        app.dataset.initialized = "true";

        bindEvents();
        render();
    };

})();
