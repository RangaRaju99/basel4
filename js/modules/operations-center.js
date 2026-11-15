
/* =====================================================
   BASELTRACK - DATA QUALITY & VALIDATION
   MODULE 1: OPERATIONS CENTER
===================================================== */

(function () {

    /* =================================================
       1. SHARED DATA INITIALIZATION
    ================================================= */

    window.baselTrackDQData = window.baselTrackDQData || {};

    const dqData = window.baselTrackDQData;


    /* Dashboard Summary */

    if (!dqData.summary) {

        dqData.summary = {

            validationInProgress: 12,

            awaitingReview: 8,

            openIssues: 14,

            revalidationQueue: 6,

            readyForNextStep: 21,

            dqScore: 96

        };

    }


    /* Live Validation Runs */

    if (!dqData.liveRuns) {

        dqData.liveRuns = [

            {
                run: "VR-221",
                feed: "Credit Risk Exposure",
                stage: "Business Rule Validation",
                owner: "DQ Team",
                status: "In Progress"
            },

            {
                run: "VR-220",
                feed: "LCR Feed",
                stage: "Revalidation",
                owner: "Risk Team",
                status: "Waiting"
            }

        ];

    }


    /* Finalized Validation Runs */

    if (!dqData.finalizedRuns) {

        dqData.finalizedRuns = [

            {
                run: "VR-215",
                feed: "NSFR Feed",
                result: "Passed",
                ready: "Yes"
            }

        ];

    }



    /* =================================================
       2. INITIALIZE OPERATIONS CENTER
    ================================================= */

    window.initOperationsCenterModule = function () {

        const root = document.getElementById("operationsCenterApp");

        if (!root) {

            console.error(
                "Operations Center: Template not found."
            );

            return;

        }


        renderSummary();

        renderWorkloadChart();

        renderLiveRuns();

        renderFinalizedRuns();



        /* =================================================
           3. SUMMARY CARDS
        ================================================= */

        function renderSummary() {

            const summary = dqData.summary;


            setText(
                "ocInProgress",
                summary.validationInProgress
            );

            setText(
                "ocAwaitingReview",
                summary.awaitingReview
            );

            setText(
                "ocOpenIssues",
                summary.openIssues
            );

            setText(
                "ocRevalidation",
                summary.revalidationQueue
            );

            setText(
                "ocReady",
                summary.readyForNextStep
            );

            setText(
                "ocDqScore",
                summary.dqScore + "%"
            );


            /* DQ Score Circular Indicator */

            const scoreRing = root.querySelector(
                "#ocScoreRing"
            );

            if (scoreRing) {

                const score = Math.max(
                    0,
                    Math.min(
                        100,
                        Number(summary.dqScore) || 0
                    )
                );

                const angle = score * 3.6;

                scoreRing.style.background = `
                    conic-gradient(
                        #16a34a 0deg ${angle}deg,
                        #e5e7eb ${angle}deg 360deg
                    )
                `;


                const scoreText = scoreRing.querySelector("span");

                if (scoreText) {

                    scoreText.textContent = score + "%";

                }

            }

        }



        /* =================================================
           4. VALIDATION WORKLOAD CHART
        ================================================= */

        function renderWorkloadChart() {

            const summary = dqData.summary;


            const chartValues = [

                summary.validationInProgress,

                summary.awaitingReview,

                summary.openIssues,

                summary.revalidationQueue,

                summary.readyForNextStep

            ];


            const maxValue = Math.max(
                ...chartValues,
                1
            );


            const chartRows = root.querySelectorAll(
                ".oc-chart-row"
            );


            chartRows.forEach((row, index) => {

                const value = Number(
                    chartValues[index]
                ) || 0;


                const bar = row.querySelector(
                    ".oc-chart-bar"
                );

                const count = row.querySelector(
                    ".oc-chart-count"
                );


                if (bar) {

                    const percentage =
                        (value / maxValue) * 100;

                    bar.style.width =
                        percentage + "%";

                    bar.dataset.value = value;

                }


                if (count) {

                    count.textContent = value;

                }

            });

        }



        /* =================================================
           5. LIVE PROCESS STATUS TABLE
        ================================================= */

        function renderLiveRuns() {

            const tbody = root.querySelector(
                "#ocLiveTableBody"
            );

            if (!tbody) return;


            tbody.replaceChildren();


            dqData.liveRuns.forEach(item => {

                const row = document.createElement("tr");


                /* Validation Run */

                row.appendChild(
                    createCell(
                        item.run,
                        "oc-run-id"
                    )
                );


                /* Feed */

                row.appendChild(
                    createCell(item.feed)
                );


                /* Current Stage */

                row.appendChild(
                    createCell(item.stage)
                );


                /* Owner */

                row.appendChild(
                    createCell(item.owner)
                );


                /* Status */

                const statusCell =
                    document.createElement("td");


                const statusBadge =
                    document.createElement("span");


                let statusClass = "waiting";


                if (item.status === "In Progress") {

                    statusClass = "in-progress";

                }


                statusBadge.className =
                    "oc-status " + statusClass;


                statusBadge.textContent =
                    item.status;


                statusCell.appendChild(
                    statusBadge
                );


                row.appendChild(statusCell);


                tbody.appendChild(row);

            });

        }



        /* =================================================
           6. FINALIZED VALIDATION RUNS TABLE
        ================================================= */

        function renderFinalizedRuns() {

            const tbody = root.querySelector(
                "#ocFinalizedTableBody"
            );

            if (!tbody) return;


            tbody.replaceChildren();


            dqData.finalizedRuns.forEach(item => {

                const row = document.createElement("tr");


                /* Run ID */

                row.appendChild(
                    createCell(
                        item.run,
                        "oc-run-id"
                    )
                );


                /* Feed */

                row.appendChild(
                    createCell(item.feed)
                );


                /* Result */

                const resultCell =
                    document.createElement("td");


                const resultBadge =
                    document.createElement("span");


                resultBadge.className =
                    item.result === "Passed"
                        ? "oc-status passed"
                        : "oc-status waiting";


                resultBadge.textContent =
                    item.result;


                resultCell.appendChild(
                    resultBadge
                );


                row.appendChild(resultCell);


                /* Ready For Next Step */

                const readyCell =
                    createCell(item.ready);


                if (item.ready === "Yes") {

                    readyCell.className =
                        "oc-ready-yes";

                }


                row.appendChild(readyCell);


                tbody.appendChild(row);

            });

        }



        /* =================================================
           7. COMMON DOM HELPERS
        ================================================= */

        function setText(id, value) {

            const element = root.querySelector(
                "#" + id
            );


            if (element) {

                element.textContent = value;

            }

        }


        function createCell(value, className = "") {

            const cell =
                document.createElement("td");


            cell.textContent =
                value ?? "";


            if (className) {

                cell.className = className;

            }


            return cell;

        }

    };


})();
