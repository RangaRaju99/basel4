/* =========================================
   VALIDATION RESULTS MODULE
========================================= */

(function () {
    "use strict";

    // Use the shared DQ data object.
    // Do not replace it if another DQ module has already initialized it.
    window.baselTrackDQData = window.baselTrackDQData || {};

    const dqData = window.baselTrackDQData;

    // Initialize completed validation runs only if they do not exist.
    if (!Array.isArray(dqData.completedValidationRuns)) {
        dqData.completedValidationRuns = [
            {
                run: "VR-210",
                feed: "Exposure Feed",
                passed: 124870,
                failed: 130
            }
        ];
    }

    // Initialize revalidation requests only if they do not exist.
    if (!Array.isArray(dqData.revalidationRequests)) {
        dqData.revalidationRequests = [
            {
                run: "VR-220",
                feed: "LCR Feed",
                reason: "Missing Field",
                status: "Awaiting"
            }
        ];
    }

    /* =========================================
       MAIN INITIALIZATION
    ========================================= */

    window.initValidationResultsModule = function () {
        const app = document.getElementById("validationResultsApp");

        if (!app) return;

        renderCompletedRuns(app);
        renderRevalidationRequests(app);

        // Event delegation: handles buttons inside this module.
        if (app.dataset.initialized === "true") return;

        app.addEventListener("click", function (event) {
            const actionButton = event.target.closest("[data-action]");

            if (!actionButton || !app.contains(actionButton)) return;

            const action = actionButton.dataset.action;

            if (action === "view-results") {
                const index = Number(actionButton.dataset.index);
                openCompletedRunDetails(app, index);
            }

            if (action === "view-revalidation") {
                const index = Number(actionButton.dataset.index);
                openRevalidationDetails(app, index);
            }

            if (action === "close-modal") {
                closeDetailsModal(app);
            }
        });

        // Close the modal when the user clicks the dark background.
        const modal = app.querySelector("#vresDetailsModal");

        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeDetailsModal(app);
            }
        });

        // Close the modal with the Escape key.
        app.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeDetailsModal(app);
            }
        });

        app.dataset.initialized = "true";
    };

    /* =========================================
       RENDER COMPLETED VALIDATION RUNS
    ========================================= */

    function renderCompletedRuns(app) {
        const tableBody = app.querySelector("#vresCompletedTableBody");
        const countElement = app.querySelector("#vresCompletedCount");

        const runs = dqData.completedValidationRuns;

        countElement.textContent =
            runs.length + (runs.length === 1 ? " Run" : " Runs");

        if (runs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="vres-empty">
                        No completed validation runs available.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = runs.map(function (item, index) {
            return `
                <tr>
                    <td>
                        <span class="vres-run-id">${escapeHTML(item.run)}</span>
                    </td>

                    <td>${escapeHTML(item.feed)}</td>

                    <td>
                        <span class="vres-number vres-passed">
                            ${formatNumber(item.passed)}
                        </span>
                    </td>

                    <td>
                        <span class="vres-number vres-failed">
                            ${formatNumber(item.failed)}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="vres-view-btn"
                            data-action="view-results"
                            data-index="${index}">
                            View Results
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /* =========================================
       RENDER REVALIDATION REQUESTS
    ========================================= */

    function renderRevalidationRequests(app) {
        const tableBody = app.querySelector("#vresRevalidationTableBody");
        const countElement = app.querySelector("#vresRevalidationCount");

        const requests = dqData.revalidationRequests;

        countElement.textContent =
            requests.length + (requests.length === 1 ? " File" : " Files");

        if (requests.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="vres-empty">
                        No files currently awaiting revalidation.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = requests.map(function (item, index) {
            return `
                <tr>
                    <td>
                        <span class="vres-run-id">${escapeHTML(item.run)}</span>
                    </td>

                    <td>${escapeHTML(item.feed)}</td>

                    <td>${escapeHTML(item.reason)}</td>

                    <td>
                        <span class="vres-status">
                            ${escapeHTML(item.status)}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="vres-view-btn"
                            data-action="view-revalidation"
                            data-index="${index}">
                            View
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /* =========================================
       COMPLETED RUN DETAILS
    ========================================= */

    function openCompletedRunDetails(app, index) {
        const item = dqData.completedValidationRuns[index];

        if (!item) return;

        const totalRecords = Number(item.passed) + Number(item.failed);

        const details = [
            ["Run ID", item.run],
            ["Feed", item.feed],
            ["Total Records", formatNumber(totalRecords)],
            ["Passed Records", formatNumber(item.passed)],
            ["Failed Records", formatNumber(item.failed)],
            ["Validation Result", Number(item.failed) === 0 ? "Passed" : "Completed with Failures"]
        ];

        openDetailsModal(
            app,
            "Validation Run Details",
            "Completed validation run information",
            details
        );
    }

    /* =========================================
       REVALIDATION DETAILS
    ========================================= */

    function openRevalidationDetails(app, index) {
        const item = dqData.revalidationRequests[index];

        if (!item) return;

        const details = [
            ["Run ID", item.run],
            ["Feed", item.feed],
            ["Reason for Revalidation", item.reason],
            ["Current Status", item.status]
        ];

        openDetailsModal(
            app,
            "Revalidation Details",
            "File sent for correction and revalidation",
            details
        );
    }

    /* =========================================
       SHARED MODAL FUNCTIONS
    ========================================= */

    function openDetailsModal(app, title, subtitle, details) {
        const modal = app.querySelector("#vresDetailsModal");
        const titleElement = app.querySelector("#vresModalTitle");
        const subtitleElement = app.querySelector("#vresModalSubtitle");
        const bodyElement = app.querySelector("#vresModalBody");

        titleElement.textContent = title;
        subtitleElement.textContent = subtitle;

        bodyElement.innerHTML = `
            <div class="vres-detail-list">
                ${details.map(function (detail) {
                    return `
                        <div class="vres-detail-row">
                            <span class="vres-detail-label">
                                ${escapeHTML(detail[0])}
                            </span>

                            <span class="vres-detail-value">
                                ${escapeHTML(detail[1])}
                            </span>
                        </div>
                    `;
                }).join("")}
            </div>
        `;

        modal.classList.add("vres-modal-open");
    }

    function closeDetailsModal(app) {
        const modal = app.querySelector("#vresDetailsModal");

        if (modal) {
            modal.classList.remove("vres-modal-open");
        }
    }

    /* =========================================
       HELPERS
    ========================================= */

    function formatNumber(value) {
        return Number(value || 0).toLocaleString("en-IN");
    }

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