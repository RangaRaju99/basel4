
(function () {
    "use strict";

    window.baselTrackReconciliationData =
        window.baselTrackReconciliationData || {};

    const sharedData = window.baselTrackReconciliationData;

    sharedData.investigations = sharedData.investigations || [];
    sharedData.evidenceDocuments = sharedData.evidenceDocuments || [];
    sharedData.exceptions = sharedData.exceptions || [];
    sharedData.approvalCases = sharedData.approvalCases || [];
    sharedData.auditLogs = sharedData.auditLogs || [];

    const stages = [
        "Risk Manager Review",
        "Compliance Review",
        "Finance Review",
        "Committee Review"
    ];

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
            module: "Approval & Closure",
            user: getAuditUser(),
            action: action,
            reference: reference,
            type: type || "INFO",
            status: type === "ERROR" ? "Failed" : "Completed",
            details: details || ""
        });
    }

    function showToast(message, isError) {
        const toast = document.getElementById("acToast");
        if (!toast) return;

        toast.textContent = message;
        toast.style.background = isError ? "#b91c1c" : "#166534";
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(function () {
            toast.classList.remove("show");
        }, 2800);
    }

    function getEvidenceForCase(caseId) {
        return sharedData.evidenceDocuments.filter(function (item) {
            return item.caseId === caseId;
        });
    }

    function getNextApprovalId() {
        const highest = sharedData.approvalCases.reduce(function (max, item) {
            const match = String(item.id || "").match(/^APR(\d+)$/);
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0);

        return "APR" + String(highest + 1).padStart(3, "0");
    }

    function getStatusClass(status) {
        return {
            PENDING: "pending",
            APPROVED: "approved",
            REJECTED: "rejected",
            ESCALATED: "escalated",
            REWORK: "rework",
            CLOSED: "closed"
        }[status] || "";
    }

    function getStatusLabel(status) {
        return {
            PENDING: "Pending",
            APPROVED: "Approved",
            REJECTED: "Rejected",
            ESCALATED: "Escalated",
            REWORK: "Returned For Rework",
            CLOSED: "Closed"
        }[status] || status;
    }

    function renderMetrics() {
        const cases = sharedData.approvalCases;

        document.getElementById("acPendingCount").textContent =
            cases.filter(item =>
                item.status === "PENDING" ||
                item.status === "ESCALATED"
            ).length;

        document.getElementById("acApprovedCount").textContent =
            cases.filter(item => item.status === "APPROVED").length;

        document.getElementById("acRejectedCount").textContent =
            cases.filter(item => item.status === "REJECTED").length;

        document.getElementById("acEscalatedCount").textContent =
            cases.filter(item => item.status === "ESCALATED").length;

        document.getElementById("acClosedCount").textContent =
            cases.filter(item => item.status === "CLOSED").length;

        document.getElementById("acTotalCount").textContent =
            cases.length;

        document.getElementById("acQueueTotal").textContent =
            cases.length + (cases.length === 1 ? " case" : " cases");
    }

    function renderTable() {
        const tbody = document.getElementById("acTableBody");

        if (sharedData.approvalCases.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="ac-empty">
                        No approval cases available.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sharedData.approvalCases.map(function (item) {
            return `
                <tr>
                    <td><strong>${escapeHTML(item.id)}</strong></td>
                    <td>${escapeHTML(item.exceptionId)}</td>
                    <td>${escapeHTML(item.investigationId)}</td>
                    <td>${escapeHTML(item.stage)}</td>
                    <td>
                        <span class="ac-status ${getStatusClass(item.status)}">
                            ${escapeHTML(getStatusLabel(item.status))}
                        </span>
                    </td>
                    <td>${escapeHTML(item.owner)}</td>
                    <td>${Number(item.evidenceCount || 0)}</td>
                    <td>${escapeHTML(item.decision || "Awaiting")}</td>
                </tr>
            `;
        }).join("");
    }

    function renderCaseOptions() {
        const select = document.getElementById("acCaseSelect");
        const previousValue = select.value;

        select.innerHTML = `
            <option value="">No case selected</option>
            ${sharedData.approvalCases.map(function (item) {
                return `
                    <option value="${escapeHTML(item.id)}">
                        ${escapeHTML(item.id)} - ${escapeHTML(item.exceptionId)}
                        (${escapeHTML(getStatusLabel(item.status))})
                    </option>
                `;
            }).join("")}
        `;

        if (sharedData.approvalCases.some(item => item.id === previousValue)) {
            select.value = previousValue;
        }

        renderSelectedCase();
    }

    function renderSelectedCase() {
        const caseId = document.getElementById("acCaseSelect").value;

        const info = document.getElementById("acCaseInfo");
        const stageSelect = document.getElementById("acStageSelect");
        const decisionSelect = document.getElementById("acDecisionSelect");
        const approverSelect = document.getElementById("acApproverSelect");
        const comments = document.getElementById("acComments");
        const closureCheck = document.getElementById("acClosureCheck");
        const closureHint = document.getElementById("acClosureHint");
        const submitButton = document.getElementById("acSubmitBtn");

        const item = sharedData.approvalCases.find(function (entry) {
            return entry.id === caseId;
        });

        if (!item) {
            info.textContent = "Select an approval case to view its details.";

            stageSelect.disabled = true;
            decisionSelect.disabled = true;
            approverSelect.disabled = true;
            comments.disabled = true;
            closureCheck.disabled = true;
            submitButton.disabled = true;

            closureCheck.checked = false;
            closureHint.textContent = "Not Confirmed";
            submitButton.textContent = "Submit Decision";
            return;
        }

        info.innerHTML = `
            <strong>Risk:</strong> ${escapeHTML(item.riskType)}<br>
            <strong>Metric:</strong> ${escapeHTML(item.metric)}<br>
            <strong>Variance:</strong> ${escapeHTML(item.variance)}%<br>
            <strong>Owner:</strong> ${escapeHTML(item.owner)}<br>
            <strong>Evidence:</strong> ${Number(item.evidenceCount || 0)} verified document(s)<br>
            <strong>Current Stage:</strong> ${escapeHTML(item.stage)}<br>
            <strong>Status:</strong> ${escapeHTML(getStatusLabel(item.status))}
        `;

        const terminal = ["REJECTED", "REWORK", "CLOSED"].includes(item.status);
        const isApproved = item.status === "APPROVED";

        stageSelect.value = item.stage;
        stageSelect.disabled = terminal || isApproved;

        decisionSelect.value = "";
        decisionSelect.disabled = terminal || isApproved;

        approverSelect.value = "";
        approverSelect.disabled = terminal;

        comments.value = "";
        comments.disabled = terminal;

        closureCheck.checked = Boolean(item.closureConfirmed);
        closureCheck.disabled = !isApproved || item.status === "CLOSED";

        closureHint.textContent = item.closureConfirmed
            ? "Controls/remediation verified"
            : "Not Confirmed";

        if (item.status === "CLOSED") {
            submitButton.textContent = "Case Closed";
            submitButton.disabled = true;
        } else if (isApproved) {
            submitButton.textContent = "Confirm Closure";
            submitButton.disabled = false;
        } else if (terminal) {
            submitButton.textContent = "No Further Action";
            submitButton.disabled = true;
        } else {
            submitButton.textContent = "Submit Decision";
            submitButton.disabled = false;
        }
    }

    function render() {
        renderMetrics();
        renderTable();
        renderCaseOptions();
    }

    function refreshApprovalCases() {
        let imported = 0;

        const readyInvestigations = sharedData.investigations.filter(
            function (investigation) {
                if (investigation.status !== "PENDING_VERIFY") return false;

                const documents = getEvidenceForCase(investigation.id);

                return documents.length > 0 &&
                    documents.every(function (document) {
                        return document.status === "VERIFIED";
                    });
            }
        );

        readyInvestigations.forEach(function (investigation) {
            const alreadyExists = sharedData.approvalCases.some(
                function (item) {
                    return item.investigationId === investigation.id &&
                        !["REWORK"].includes(item.status);
                }
            );

            if (alreadyExists) return;

            const exception = sharedData.exceptions.find(function (item) {
                return item.id === investigation.exceptionId;
            });

            const documents = getEvidenceForCase(investigation.id);

            const approvalCase = {
                id: getNextApprovalId(),
                investigationId: investigation.id,
                exceptionId: investigation.exceptionId,
                riskId: investigation.riskId,
                riskType: investigation.riskType,
                metric: investigation.metric,
                variance: investigation.variance,
                owner: investigation.owner,
                evidenceCount: documents.length,
                stage: stages[0],
                status: "PENDING",
                decision: "",
                approver: "",
                comments: "",
                closureConfirmed: false,
                history: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isDemo: false
            };

            sharedData.approvalCases.push(approvalCase);

            investigation.status = "APPROVAL_READY";
            investigation.updatedAt = new Date().toISOString();

            if (exception) {
                exception.status = "APPROVAL";
            }

            addAuditLog(
                "Approval Case Created",
                approvalCase.id + "/" + approvalCase.investigationId,
                "SUCCESS",
                "Created approval case after evidence verification."
            );

            imported++;
        });

        render();

        if (imported > 0) {
            showToast(imported + " approval case(s) imported.");
        } else {
            showToast(
                "No new approval-ready investigations found.",
                true
            );
        }
    }

    function loadDemoCase() {
        const existing = sharedData.approvalCases.find(function (item) {
            return item.isDemo === true;
        });

        if (existing) {
            showToast("Demo approval case already exists.", true);
            return;
        }

        const demoCase = {
            id: getNextApprovalId(),
            investigationId: "DEMO-INV001",
            exceptionId: "DEMO-EXC001",
            riskId: "DEMO-RSK001",
            riskType: "MARKET",
            metric: "Market RWA",
            variance: "21.43",
            owner: "Market Risk Team",
            evidenceCount: 2,
            stage: stages[0],
            status: "PENDING",
            decision: "",
            approver: "",
            comments: "",
            closureConfirmed: false,
            history: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDemo: true
        };

        sharedData.approvalCases.push(demoCase);

        addAuditLog(
            "Demo Approval Case Loaded",
            demoCase.id,
            "INFO",
            "Loaded a demonstration approval case."
        );

        render();
        document.getElementById("acCaseSelect").value = demoCase.id;
        renderSelectedCase();

        showToast("Demo approval case loaded.");
    }

    function submitDecision() {
        const caseId = document.getElementById("acCaseSelect").value;

        const item = sharedData.approvalCases.find(function (entry) {
            return entry.id === caseId;
        });

        if (!item) {
            showToast("Select an approval case first.", true);
            return;
        }

        // Final approval has already been granted.
        // Closure is a separate confirmation step.
        if (item.status === "APPROVED") {
            const confirmed = document.getElementById("acClosureCheck").checked;

            if (!confirmed) {
                showToast(
                    "Confirm that controls and remediation are verified.",
                    true
                );
                return;
            }

            item.closureConfirmed = true;
            item.status = "CLOSED";
            item.decision = "Closed";
            item.updatedAt = new Date().toISOString();

            const investigation = sharedData.investigations.find(
                entry => entry.id === item.investigationId
            );

            const exception = sharedData.exceptions.find(
                entry => entry.id === item.exceptionId
            );

            if (investigation) {
                investigation.status = "CLOSED";
                investigation.updatedAt = new Date().toISOString();
            }

            if (exception) {
                exception.status = "CLOSED";
            }

            item.history.push({
                stage: "Closure",
                decision: "Closed",
                approver: getAuditUser(),
                comments: "Controls/remediation verified.",
                timestamp: new Date().toISOString()
            });

            addAuditLog(
                "Exception Closed",
                item.id + "/" + item.exceptionId,
                "SUCCESS",
                "Final approval and closure confirmation completed."
            );

            render();
            showToast("Exception closed successfully.");
            return;
        }

        if (["REJECTED", "REWORK", "CLOSED"].includes(item.status)) {
            showToast("This case cannot receive another decision.", true);
            return;
        }

        const selectedStage = document.getElementById("acStageSelect").value;
        const decision = document.getElementById("acDecisionSelect").value;
        const approver = document.getElementById("acApproverSelect").value;
        const comments = document.getElementById("acComments").value.trim();

        if (selectedStage !== item.stage) {
            showToast("Select the current approval stage: " + item.stage, true);
            return;
        }

        if (!decision) {
            showToast("Select an approval decision.", true);
            return;
        }

        if (!approver) {
            showToast("Select an approver.", true);
            return;
        }

        if (!comments) {
            showToast("Enter decision comments.", true);
            return;
        }

        const currentStageIndex = stages.indexOf(item.stage);

        item.decision = decision;
        item.approver = approver;
        item.comments = comments;
        item.updatedAt = new Date().toISOString();

        item.history.push({
            stage: item.stage,
            decision: decision,
            approver: approver,
            comments: comments,
            timestamp: new Date().toISOString()
        });

        let auditType = "SUCCESS";
        let auditAction = "Approval Decision Recorded";
        let auditDetails = "";

        if (decision === "Approve") {
            if (currentStageIndex < stages.length - 1) {
                item.stage = stages[currentStageIndex + 1];
                item.status = "PENDING";
                item.decision = "Approved - Next Stage";
                auditDetails = "Approved at " +
                    selectedStage + ". Moved to " + item.stage + ".";
            } else {
                item.status = "APPROVED";
                item.decision = "Final Approval";
                item.closureConfirmed = false;
                auditDetails =
                    "Final Committee Review approval granted. Awaiting closure confirmation.";
            }
        }

        if (decision === "Reject") {
            item.status = "REJECTED";
            auditType = "WARNING";
            auditAction = "Approval Rejected";
            auditDetails = "Case rejected at " + selectedStage + ".";
        }

        if (decision === "Escalate") {
            item.status = "ESCALATED";
            auditType = "WARNING";
            auditAction = "Approval Escalated";
            auditDetails = "Case escalated from " + selectedStage + ".";
        }

        if (decision === "Return For Rework") {
            item.status = "REWORK";
            auditType = "WARNING";
            auditAction = "Case Returned For Rework";
            auditDetails = "Case returned to the investigation team.";

            const investigation = sharedData.investigations.find(
                entry => entry.id === item.investigationId
            );

            const exception = sharedData.exceptions.find(
                entry => entry.id === item.exceptionId
            );

            if (investigation) {
                investigation.status = "INVESTIGATING";
                investigation.updatedAt = new Date().toISOString();
            }

            if (exception) {
                exception.status = "ASSIGNED";
            }
        }

        addAuditLog(
            auditAction,
            item.id + "/" + item.exceptionId,
            auditType,
            auditDetails + " Approver: " + approver + ". Comments: " + comments
        );

        render();
        document.getElementById("acCaseSelect").value = item.id;
        renderSelectedCase();

        if (decision === "Approve" && item.status === "PENDING") {
            showToast("Approved. Moved to " + item.stage + ".");
        } else if (item.status === "APPROVED") {
            showToast("Final approval granted. Confirm closure next.");
        } else if (decision === "Reject") {
            showToast("Approval case rejected.");
        } else if (decision === "Escalate") {
            showToast("Approval case escalated.");
        } else if (decision === "Return For Rework") {
            showToast("Case returned to Investigation for rework.");
        }
    }

    function bindEvents() {
        document.getElementById("acRefreshBtn")
            .addEventListener("click", refreshApprovalCases);

        document.getElementById("acDemoBtn")
            .addEventListener("click", loadDemoCase);

        document.getElementById("acCaseSelect")
            .addEventListener("change", renderSelectedCase);

        document.getElementById("acSubmitBtn")
            .addEventListener("click", submitDecision);

        document.getElementById("acClosureCheck")
            .addEventListener("change", function () {
                document.getElementById("acClosureHint").textContent =
                    this.checked
                        ? "Controls/remediation verified"
                        : "Not Confirmed";
            });
    }

    window.initApprovalClosureModule = function () {
        const app = document.getElementById("approvalClosureApp");

        if (!app || app.dataset.initialized === "true") return;

        app.dataset.initialized = "true";

        bindEvents();
        render();
    };

})();
