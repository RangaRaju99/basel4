
(function () {
    "use strict";

    // Shared in-memory store for all Basel IV calculation modules.
    // Later modules will add their results to this same array.
    window.baselTrackCalculationData =
        window.baselTrackCalculationData || {};

    if (!Array.isArray(window.baselTrackCalculationData.results)) {
        window.baselTrackCalculationData.results = [];
    }

    window.initRWACalculationModule = function () {
        const app = document.getElementById("rwaCalculationApp");

        if (!app) return;

        const periodInput = app.querySelector("#rwaPeriod");
        const bankInput = app.querySelector("#rwaBank");
        const dateInput = app.querySelector("#rwaBusinessDate");

        const calculateBtn = app.querySelector("#rwaCalculateBtn");
        const resetBtn = app.querySelector("#rwaResetBtn");
        const exportBtn = app.querySelector("#rwaExportBtn");

        const resultsSection = app.querySelector("#rwaResults");
        const messageBox = app.querySelector("#rwaMessage");

        let currentResult = null;

        // Illustrative sample exposure data supplied for the project.
        const exposureData = [
            {
                category: "Credit Risk",
                type: "Corporate Loans",
                amount: 1000,
                weight: 75
            },
            {
                category: "Market Risk",
                type: "Trading Book",
                amount: 300,
                weight: 50
            },
            {
                category: "Operational Risk",
                type: "Business Operations",
                amount: 250,
                weight: 50
            }
        ];

        function formatNumber(value) {
            return Number(value).toLocaleString("en-IN", {
                maximumFractionDigits: 2
            });
        }

        function showMessage(message, type) {
            messageBox.textContent = message;
            messageBox.className = "rwa-message " + type;
            messageBox.hidden = false;
        }

        function hideMessage() {
            messageBox.textContent = "";
            messageBox.hidden = true;
            messageBox.className = "rwa-message";
        }

        function calculateExposureRows() {
            return exposureData.map(function (item) {
                const rwa = item.amount * (item.weight / 100);

                return {
                    category: item.category,
                    exposureType: item.type,
                    exposureAmount: item.amount,
                    riskWeight: item.weight,
                    calculatedRWA: rwa
                };
            });
        }

        function renderExposureTable(rows) {
            const tbody = app.querySelector("#rwaExposureTable");

            tbody.innerHTML = rows.map(function (row) {
                return `
                    <tr>
                        <td>${row.category}</td>
                        <td>${row.exposureType}</td>
                        <td>${formatNumber(row.exposureAmount)}</td>
                        <td>${row.riskWeight}%</td>
                        <td>${formatNumber(row.calculatedRWA)}</td>
                    </tr>
                `;
            }).join("");
        }

        function renderSummaryCards(totals) {
            app.querySelector("#rwaCreditValue").textContent =
                formatNumber(totals.credit);

            app.querySelector("#rwaMarketValue").textContent =
                formatNumber(totals.market);

            app.querySelector("#rwaOperationalValue").textContent =
                formatNumber(totals.operational);

            app.querySelector("#rwaTotalValue").textContent =
                formatNumber(totals.total);
        }

        function renderChart(totals) {
            const chart = app.querySelector("#rwaChart");

            const chartItems = [
                { label: "Credit Risk", value: totals.credit },
                { label: "Market Risk", value: totals.market },
                { label: "Operational Risk", value: totals.operational }
            ];

            const maxValue = Math.max(
                ...chartItems.map(function (item) {
                    return item.value;
                }),
                1
            );

            chart.innerHTML = chartItems.map(function (item) {
                const width = (item.value / maxValue) * 100;

                return `
                    <div class="rwa-chart-row">
                        <span class="rwa-chart-label">${item.label}</span>
                        <div class="rwa-chart-track">
                            <div
                                class="rwa-chart-bar"
                                style="width: ${width}%"
                                role="img"
                                aria-label="${item.label}: ${formatNumber(item.value)}"
                            ></div>
                        </div>
                        <strong class="rwa-chart-value">
                            ${formatNumber(item.value)}
                        </strong>
                    </div>
                `;
            }).join("");
        }

        function renderCalculationSummary(parameters, rows, totals) {
            app.querySelector("#rwaSummaryBank").textContent =
                parameters.bankName;

            app.querySelector("#rwaSummaryPeriod").textContent =
                parameters.reportingPeriod;

            app.querySelector("#rwaSummaryDate").textContent =
                parameters.businessDate;

            const formulaList = app.querySelector("#rwaFormulaList");

            formulaList.innerHTML = rows.map(function (row) {
                return `
                    <div class="rwa-formula-item">
                        <span>${row.category} RWA</span>
                        <p>
                            ${formatNumber(row.exposureAmount)}
                            × ${row.riskWeight}%
                            = <strong>${formatNumber(row.calculatedRWA)}</strong>
                        </p>
                    </div>
                `;
            }).join("");

            app.querySelector("#rwaSummaryTotal").textContent =
                formatNumber(totals.total);
        }

        function createCalculationRecord(parameters, rows, totals) {
            const executionDate = new Date();

            return {
                calculationId: "RWA-" + Date.now(),
                bankName: parameters.bankName,
                type: "RWA",
                reportingPeriod: parameters.reportingPeriod,
                businessDate: parameters.businessDate,
                executionDate: executionDate.toLocaleString("en-IN"),
                status: "Completed",
                metrics: {
                    creditRiskRWA: totals.credit,
                    marketRiskRWA: totals.market,
                    operationalRiskRWA: totals.operational,
                    totalRWA: totals.total
                },
                details: rows.map(function (row) {
                    return { ...row };
                })
            };
        }

        function calculateRWA() {
            hideMessage();

            const parameters = {
                reportingPeriod: periodInput.value,
                bankName: bankInput.value,
                businessDate: dateInput.value
            };

            if (!parameters.bankName || !parameters.reportingPeriod ||
                !parameters.businessDate) {
                showMessage(
                    "Please select the reporting period, bank name and business date.",
                    "error"
                );
                return;
            }

            const rows = calculateExposureRows();

            const totals = {
                credit: rows
                    .filter(row => row.category === "Credit Risk")
                    .reduce((sum, row) => sum + row.calculatedRWA, 0),

                market: rows
                    .filter(row => row.category === "Market Risk")
                    .reduce((sum, row) => sum + row.calculatedRWA, 0),

                operational: rows
                    .filter(row => row.category === "Operational Risk")
                    .reduce((sum, row) => sum + row.calculatedRWA, 0)
            };

            totals.total =
                totals.credit + totals.market + totals.operational;

            renderExposureTable(rows);
            renderSummaryCards(totals);
            renderChart(totals);
            renderCalculationSummary(parameters, rows, totals);

            currentResult = createCalculationRecord(
                parameters,
                rows,
                totals
            );

            // Store the completed result for the future Calculation Repository.
            window.baselTrackCalculationData.results.push(currentResult);

            resultsSection.hidden = false;

            showMessage(
                "RWA calculation completed and stored successfully.",
                "success"
            );
        }

        function resetCalculation() {
            periodInput.value = "Oct 2026";
            bankInput.value = "HDFC Bank";
            dateInput.value = "2026-11-10";

            currentResult = null;
            resultsSection.hidden = true;

            app.querySelector("#rwaExposureTable").innerHTML = "";
            app.querySelector("#rwaChart").innerHTML = "";
            app.querySelector("#rwaFormulaList").innerHTML = "";

            hideMessage();
        }

        function escapeCSV(value) {
            const text = String(value ?? "");
            return '"' + text.replace(/"/g, '""') + '"';
        }

        function downloadCSV() {
            if (!currentResult) {
                showMessage(
                    "Please calculate RWA before exporting the results.",
                    "error"
                );
                return;
            }

            const rows = [
                ["RWA Calculation Report"],
                ["Calculation ID", currentResult.calculationId],
                ["Bank Name", currentResult.bankName],
                ["Reporting Period", currentResult.reportingPeriod],
                ["Business Date", currentResult.businessDate],
                ["Execution Date", currentResult.executionDate],
                ["Status", currentResult.status],
                [],
                [
                    "Risk Category",
                    "Exposure Type",
                    "Exposure Amount",
                    "Risk Weight",
                    "Calculated RWA"
                ]
            ];

            currentResult.details.forEach(function (item) {
                rows.push([
                    item.category,
                    item.exposureType,
                    item.exposureAmount,
                    item.riskWeight + "%",
                    item.calculatedRWA
                ]);
            });

            rows.push([]);
            rows.push(["Total RWA", currentResult.metrics.totalRWA]);

            const csvContent = rows.map(function (row) {
                return row.map(escapeCSV).join(",");
            }).join("\r\n");

            const blob = new Blob(
                ["\uFEFF" + csvContent],
                { type: "text/csv;charset=utf-8;" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = currentResult.calculationId + ".csv";

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            showMessage(
                "RWA calculation CSV exported successfully.",
                "success"
            );
        }

        calculateBtn.addEventListener("click", calculateRWA);
        resetBtn.addEventListener("click", resetCalculation);
        exportBtn.addEventListener("click", downloadCSV);

        // Each time the module is opened, start with a clean calculation screen.
        resetCalculation();
    };

})();
