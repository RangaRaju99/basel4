
/* =========================================
   DATA INGESTION - SLA & ESCALATIONS
========================================= */

window.initSlaEscalationsModule = function () {

    const root = document.getElementById("slaEscalationsApp");

    if (!root || root.dataset.initialized === "true") {
        return;
    }

    root.dataset.initialized = "true";

    // -------------------------------------
    // 1. INITIAL ESCALATION DATA
    // -------------------------------------

    // Keep the data on window so it remains available
    // when the user navigates away and returns.
    if (!Array.isArray(window.baselTrackEscalationData)) {

        window.baselTrackEscalationData = [
            {
                id: "ESC-001",
                sourceSystem: "Risk Engine (Moody's)",
                issueType: "SLA Breach",
                cutoffTime: "23:15 PM",
                ownerName: "Sneha Rao",
                ownerDepartment: "Risk IT",
                email: "sneha.rao@globaltrust.com",
                message:
                    "Urgent: We have not received your daily data feed. Please resolve immediately to meet Basel IV regulatory deadlines.",
                alertSent: false
            },
            {
                id: "ESC-002",
                sourceSystem: "Reference Data",
                issueType: "Failed to Parse",
                cutoffTime: "23:00 PM",
                ownerName: "Vikram Singh",
                ownerDepartment: "Data Gov",
                email: "",
                message:
                    "Urgent: The Reference Data feed failed during parsing. Please investigate and resolve the issue immediately to meet Basel IV regulatory deadlines.",
                alertSent: false
            }
        ];
    }

    // -------------------------------------
    // 2. ELEMENT REFERENCES
    // -------------------------------------

    const tableBody = root.querySelector("#seTableBody");
    const emptyState = root.querySelector("#seEmptyState");

    const openIssuesElement = root.querySelector("#seOpenIssues");
    const slaBreachesElement = root.querySelector("#seSlaBreaches");
    const failedFeedsElement = root.querySelector("#seFailedFeeds");
    const alertsSentElement = root.querySelector("#seAlertsSent");
    const issueCountElement = root.querySelector("#seIssueCount");

    const modal = root.querySelector("#seEscalationModal");
    const closeModalButton = root.querySelector("#seCloseModal");
    const cancelButton = root.querySelector("#seCancelEscalation");
    const sendButton = root.querySelector("#seSendAlert");

    const selectedIssueElement = root.querySelector("#seSelectedIssue");
    const recipientInput = root.querySelector("#seRecipient");
    const recipientHelp = root.querySelector("#seRecipientHelp");
    const messageInput = root.querySelector("#seMessage");
    const modalError = root.querySelector("#seModalError");

    const toast = root.querySelector("#seToast");
    const toastMessage = root.querySelector("#seToastMessage");

    let selectedIssueId = null;
    let toastTimer = null;

    // -------------------------------------
    // 3. HELPER FUNCTIONS
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

    function getIssueData() {

        if (!Array.isArray(window.baselTrackEscalationData)) {
            return [];
        }

        return window.baselTrackEscalationData.filter(function (issue) {
            return issue && typeof issue === "object";
        });
    }

    function getIssueBadgeClass(issueType) {

        if (issueType === "SLA Breach") {
            return "se-issue-sla";
        }

        return "se-issue-failed";
    }

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // -------------------------------------
    // 4. UPDATE SUMMARY CARDS
    // -------------------------------------

    function updateSummaryCards(issues) {

        const totalIssues = issues.length;

        const slaCount = issues.filter(function (issue) {
            return issue.issueType === "SLA Breach";
        }).length;

        const failedCount = issues.filter(function (issue) {
            return issue.issueType !== "SLA Breach";
        }).length;

        const alertsSent = issues.filter(function (issue) {
            return issue.alertSent === true;
        }).length;

        openIssuesElement.textContent = totalIssues;
        slaBreachesElement.textContent = slaCount;
        failedFeedsElement.textContent = failedCount;
        alertsSentElement.textContent = alertsSent;

        issueCountElement.textContent =
            totalIssues + (totalIssues === 1 ? " Issue" : " Issues");
    }

    // -------------------------------------
    // 5. RENDER ALERT TABLE
    // -------------------------------------

    function renderIssueTable() {

        const issues = getIssueData();

        tableBody.innerHTML = "";

        emptyState.hidden = issues.length !== 0;

        issues.forEach(function (issue) {

            const row = document.createElement("tr");

            const alertSent = issue.alertSent === true;

            const actionHTML = alertSent
                ? `
                    <span class="se-escalated-label">
                        ✓ Alert Sent
                    </span>
                `
                : `
                    <button type="button"
                            class="se-escalate-btn"
                            data-escalate-id="${escapeHTML(issue.id)}">
                        Escalate
                    </button>
                `;

            row.innerHTML = `
                <td>
                    <span class="se-source-name">
                        ${escapeHTML(issue.sourceSystem)}
                    </span>
                </td>

                <td>
                    <span class="se-issue-badge ${getIssueBadgeClass(issue.issueType)}">
                        <span class="se-issue-dot"></span>
                        ${escapeHTML(issue.issueType)}
                    </span>
                </td>

                <td>
                    <span class="se-cutoff-time">
                        ${escapeHTML(issue.cutoffTime)}
                    </span>
                </td>

                <td>
                    <span class="se-owner-name">
                        ${escapeHTML(issue.ownerName)}
                    </span>
                    <span class="se-owner-department">
                        ${escapeHTML(issue.ownerDepartment)}
                    </span>
                </td>

                <td>${actionHTML}</td>
            `;

            tableBody.appendChild(row);
        });

        updateSummaryCards(issues);
    }

    // -------------------------------------
    // 6. OPEN ESCALATION MODAL
    // -------------------------------------

    function openEscalationModal(issueId) {

        const issue = getIssueData().find(function (item) {
            return item.id === issueId;
        });

        if (!issue || issue.alertSent === true) {
            return;
        }

        selectedIssueId = issueId;

        selectedIssueElement.innerHTML = `
            <strong>${escapeHTML(issue.sourceSystem)}</strong>
            <span>
                Issue: ${escapeHTML(issue.issueType)}
                &nbsp; | &nbsp;
                Cut-off: ${escapeHTML(issue.cutoffTime)}
            </span>
            <span>
                Data Owner: ${escapeHTML(issue.ownerName)}
                (${escapeHTML(issue.ownerDepartment)})
            </span>
        `;

        // Load the supplied email if available.
        // Reference Data has no supplied email address.
        recipientInput.value = issue.email || "";

        if (issue.email) {
            recipientHelp.textContent =
                "Pre-filled recipient. Verify the address before sending.";
        } else {
            recipientHelp.textContent =
                "No email address was provided. Enter the data owner's verified email address.";
        }

        messageInput.value = issue.message || "";

        modalError.hidden = true;

        modal.hidden = false;

        recipientInput.focus();
    }

    // -------------------------------------
    // 7. CLOSE MODAL
    // -------------------------------------

    function closeEscalationModal() {

        modal.hidden = true;
        modalError.hidden = true;

        selectedIssueId = null;
    }

    closeModalButton.addEventListener("click", closeEscalationModal);

    cancelButton.addEventListener("click", closeEscalationModal);

    modal.addEventListener("click", function (event) {

        if (event.target === modal) {
            closeEscalationModal();
        }
    });

    // Close modal with Escape key.
    function handleEscapeKey(event) {

        if (event.key === "Escape" && !modal.hidden) {
            closeEscalationModal();
        }
    }

    document.addEventListener("keydown", handleEscapeKey);

    // -------------------------------------
    // 8. ESCALATE BUTTON EVENT
    // -------------------------------------

    tableBody.addEventListener("click", function (event) {

        const button = event.target.closest("[data-escalate-id]");

        if (!button) {
            return;
        }

        const issueId = button.dataset.escalateId;

        openEscalationModal(issueId);
    });

    // -------------------------------------
    // 9. SHOW TOAST MESSAGE
    // -------------------------------------

    function showToast(message) {

        toastMessage.textContent = message;

        toast.hidden = false;

        if (toastTimer) {
            clearTimeout(toastTimer);
        }

        toastTimer = setTimeout(function () {
            toast.hidden = true;
        }, 3000);
    }

    // -------------------------------------
    // 10. SEND ALERT
    // -------------------------------------

    sendButton.addEventListener("click", function () {

        if (typeof window.requireCurrentPermission !== "function" ||
            !window.requireCurrentPermission("sla-escalations", "U")) return;

        const recipient = recipientInput.value.trim();
        const message = messageInput.value.trim();

        if (!isValidEmail(recipient) || !message) {

            modalError.textContent =
                "Please enter a valid recipient email and message.";

            modalError.hidden = false;

            return;
        }

        const issue = getIssueData().find(function (item) {
            return item.id === selectedIssueId;
        });

        if (!issue || issue.alertSent === true) {
            closeEscalationModal();
            renderIssueTable();
            return;
        }

        sendButton.disabled = true;
        sendButton.querySelector("span").textContent = "Sending...";

        // Frontend-only simulation.
        // A backend email service will be required for actual delivery.
        setTimeout(function () {

            issue.alertSent = true;
            issue.alertRecipient = recipient;
            issue.alertMessage = message;
            issue.alertSentAt = new Date().toISOString();

            // Update the in-memory record.
            window.baselTrackEscalationData =
                getIssueData();

            closeEscalationModal();

            renderIssueTable();

            sendButton.disabled = false;
            sendButton.querySelector("span").textContent = "Send Alert";

            showToast("Escalation alert recorded successfully (demo).");

        }, 400);
    });

    // -------------------------------------
    // 11. INITIAL RENDER
    // -------------------------------------

    renderIssueTable();

    // Remove the document-level listener when this module
    // is reinitialized after navigation.
    root.addEventListener("DOMNodeRemoved", function () {
        document.removeEventListener("keydown", handleEscapeKey);
    }, { once: true });

};
