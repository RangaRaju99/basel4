/* =========================================
   REVALIDATION CENTER MODULE
========================================= */

(function () {
    "use strict";

    // Reuse the shared DQ data object.
    window.baselTrackDQData = window.baselTrackDQData || {};

    const dqData = window.baselTrackDQData;

    // Awaiting revalidation queue.
    if (!Array.isArray(dqData.revalidationRequests)) {
        dqData.revalidationRequests = [];
    }

    // Add the sample request only when the queue is empty
    // and no other module has already initialized it.
    if (
        dqData.revalidationRequests.length === 0 &&
        !dqData.revalidationQueueInitialized
    ) {
        dqData.revalidationRequests.push({
            run: "VR-220",
            feed: "LCR Feed",
            reason: "Missing Field",
            correctedBy: "Risk Team",
            previousFailure: "Missing Liquidity Bucket",
            status: "Awaiting"
        });
    }

    dqData.revalidationQueueInitialized = true;

    // Add missing fields to requests created by earlier modules.
    dqData.revalidationRequests.forEach(function (request) {
        if (!request.correctedBy) {
            request.correctedBy = "Risk Team";
        }

        if (!request.previousFailure) {
            request.previousFailure = "Missing Liquidity Bucket";
        }

        if (!request.status) {
            request.status = "Awaiting";
        }
    });

    // Previous revalidation attempts.
    if (!Array.isArray(dqData.revalidationHistory)) {
        dqData.revalidationHistory = [
            {
                feed: "Credit Risk Feed",
                attempt: 1,
                result: "Failed"
            },
            {
                feed: "Credit Risk Feed",
                attempt: 2,
                result: "Passed"
            }
        ];
    }

    // Shared summary defaults.
    dqData.summary = dqData.summary || {};

    if (typeof dqData.summary.revalidationQueue !== "number") {
        dqData.summary.revalidationQueue =
            dqData.revalidationRequests.length;
    }

    if (typeof dqData.summary.readyForNextStep !== "number") {
        dqData.summary.readyForNextStep = 21;
    }

    let selectedRequestIndex = null;

    /* =========================================
       INITIALIZE MODULE
    ========================================= */

    window.initRevalidationCenterModule = function () {
        const app = document.getElementById("revalidationCenterApp");

        if (!app) return;

        renderRevalidationCenter(app);

        if (app.dataset.initialized === "true") return;

        app.addEventListener("click", function (event) {
            const button = event.target.closest("[data-action]");

            if (!button || !app.contains(button)) return;

            const action = button.dataset.action;

            if (action === "start-revalidation") {
                const index = Number(button.dataset.index);
                openConfirmationModal(app, index);
            }

            if (action === "confirm-revalidation") {
                processRevalidation(app);
            }

            if (action === "close-modal") {
                closeConfirmationModal(app);
            }
        });

        const modal = app.querySelector("#rcConfirmModal");

        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeConfirmationModal(app);
            }
        });

        app.dataset.initialized = "true";
    };

    /* =========================================
       RENDER COMPLETE SCREEN
    ========================================= */

    function renderRevalidationCenter(app) {
        renderSummary(app);
        renderAwaitingQueue(app);
        renderHistory(app);
    }

    /* =========================================
       SUMMARY CARDS
    ========================================= */

    function renderSummary(app) {
        const requests = dqData.revalidationRequests;
        const history = dqData.revalidationHistory;

        const totalAttempts = history.length;

        const passedAttempts = history.filter(function (item) {
            return item.result === "Passed";
        }).length;

        app.querySelector("#rcAwaitingCount").textContent =
            requests.length;

        app.querySelector("#rcAttemptsCount").textContent =
            totalAttempts;

        app.querySelector("#rcPassedCount").textContent =
            passedAttempts;
    }

    /* =========================================
       AWAITING REVALIDATION TABLE
    ========================================= */

    function renderAwaitingQueue(app) {
        const tableBody = app.querySelector("#rcAwaitingTableBody");
        const countElement = app.querySelector("#rcQueueCount");

        const requests = dqData.revalidationRequests;

        countElement.textContent =
            requests.length + (requests.length === 1 ? " File" : " Files");

        if (requests.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="rc-empty">
                        No files are currently awaiting revalidation.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = requests.map(function (request, index) {
            return `
                <tr>
                    <td>
                        <span class="rc-file-name">
                            ${escapeHTML(request.feed)}
                        </span>
                    </td>

                    <td>
                        <span class="rc-owner">
                            ${escapeHTML(request.correctedBy)}
                        </span>
                    </td>

                    <td>${escapeHTML(request.previousFailure)}</td>

                    <td>
                        <button
                            type="button"
                            class="rc-revalidate-btn"
                            data-action="start-revalidation"
                            data-index="${index}">
                            Revalidate
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /* =========================================
       REVALIDATION HISTORY TABLE
    ========================================= */

    function renderHistory(app) {
        const tableBody = app.querySelector("#rcHistoryTableBody");
        const countElement = app.querySelector("#rcHistoryCount");

        const history = dqData.revalidationHistory;

        countElement.textContent =
            history.length +
            (history.length === 1 ? " Attempt" : " Attempts");

        if (history.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="rc-empty">
                        No revalidation history available.
                    </td>
                </tr>
            `;
            return;
        }

        // Latest attempts appear first.
        const sortedHistory = history
            .map(function (item, index) {
                return {
                    item: item,
                    originalIndex: index
                };
            })
            .reverse();

        tableBody.innerHTML = sortedHistory.map(function (entry) {
            const item = entry.item;

            const resultClass =
                item.result === "Passed"
                    ? "rc-result-passed"
                    : item.result === "Failed"
                        ? "rc-result-failed"
                        : "rc-result-pending";

            return `
                <tr>
                    <td>
                        <span class="rc-file-name">
                            ${escapeHTML(item.feed)}
                        </span>
                    </td>

                    <td>${escapeHTML(item.attempt)}</td>

                    <td>
                        <span class="rc-result ${resultClass}">
                            ${escapeHTML(item.result)}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /* =========================================
       OPEN CONFIRMATION MODAL
    ========================================= */

    function openConfirmationModal(app, index) {
        const request = dqData.revalidationRequests[index];

        if (!request) return;

        selectedRequestIndex = index;

        const details = [
            ["Run ID", request.run || "Not assigned"],
            ["File / Feed", request.feed],
            ["Corrected By", request.correctedBy],
            ["Previous Failure", request.previousFailure],
            ["Current Status", request.status]
        ];

        app.querySelector("#rcConfirmDetails").innerHTML =
            details.map(function (item) {
                return `
                    <div class="rc-detail-row">
                        <span class="rc-detail-label">
                            ${escapeHTML(item[0])}
                        </span>

                        <span class="rc-detail-value">
                            ${escapeHTML(item[1])}
                        </span>
                    </div>
                `;
            }).join("");

        app.querySelector("#rcConfirmModal")
            .classList.add("rc-modal-open");
    }

    /* =========================================
       PROCESS REVALIDATION
    ========================================= */

    function processRevalidation(app) {
        if (selectedRequestIndex === null) return;

        const request =
            dqData.revalidationRequests[selectedRequestIndex];

        if (!request) {
            closeConfirmationModal(app);
            return;
        }

        const confirmButton =
            app.querySelector("#rcConfirmButton");

        confirmButton.disabled = true;
        confirmButton.textContent = "Processing...";

        /*
         * DEMO BEHAVIOUR:
         * This simulates a successful revalidation.
         * No actual file or validation engine is executed.
         */

        const previousAttempts = dqData.revalidationHistory.filter(
            function (item) {
                return item.feed === request.feed;
            }
        );

        const nextAttempt = previousAttempts.reduce(
            function (maximum, item) {
                return Math.max(maximum, Number(item.attempt) || 0);
            },
            0
        ) + 1;

        // Record the new attempt.
        dqData.revalidationHistory.push({
            feed: request.feed,
            attempt: nextAttempt,
            result: "Passed"
        });

        // Remove the corrected file from the awaiting queue.
        dqData.revalidationRequests.splice(selectedRequestIndex, 1);

        // Update shared Operations Center metrics.
        dqData.summary.revalidationQueue = Math.max(
            0,
            dqData.summary.revalidationQueue - 1
        );

        dqData.summary.readyForNextStep += 1;

        // Update the matching issue in Issue Workbench, if available.
        updateRelatedIssue(request);

        // Close modal and refresh screen.
        closeConfirmationModal(app);
        renderRevalidationCenter(app);

        showToast(
            app,
            request.feed + " successfully revalidated. Attempt " +
            nextAttempt + " recorded as Passed."
        );

        confirmButton.disabled = false;
        confirmButton.textContent = "Start Revalidation";
    }

    /* =========================================
       UPDATE RELATED ISSUE
    ========================================= */

    function updateRelatedIssue(request) {
        if (!Array.isArray(dqData.issues)) return;

        const relatedIssue = dqData.issues.find(function (issue) {
            return issue.file === request.feed;
        });

        if (!relatedIssue) return;

        relatedIssue.status = "Revalidated - Passed";

        if (!Array.isArray(relatedIssue.history)) {
            relatedIssue.history = [];
        }

        relatedIssue.history.push({
            event: "Revalidation Passed",
            description:
                "The corrected file completed the revalidation process successfully.",
            actor: "DQ Team",
            time: "Revalidation attempt completed"
        });
    }

    /* =========================================
       CLOSE MODAL
    ========================================= */

    function closeConfirmationModal(app) {
        const modal = app.querySelector("#rcConfirmModal");

        if (modal) {
            modal.classList.remove("rc-modal-open");
        }

        selectedRequestIndex = null;

        const confirmButton =
            app.querySelector("#rcConfirmButton");

        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = "Start Revalidation";
        }
    }

    /* =========================================
       TOAST
    ========================================= */

    function showToast(app, message) {
        const toast = app.querySelector("#rcToast");

        toast.textContent = message;
        toast.classList.add("rc-toast-visible");

        window.setTimeout(function () {
            toast.classList.remove("rc-toast-visible");
        }, 3500);
    }

    /* =========================================
       HTML ESCAPE HELPER
    ========================================= */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

})();