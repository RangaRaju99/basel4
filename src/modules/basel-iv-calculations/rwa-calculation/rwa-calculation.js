
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

        const exposureDataByBank = {
            "HDFC Bank": [
                { category: "Credit Risk", type: "Corporate Loans", amount: 1000, weight: 75 },
                { category: "Market Risk", type: "Trading Book", amount: 300, weight: 50 },
                { category: "Operational Risk", type: "Business Operations", amount: 250, weight: 50 }
            ],
            "ICICI Bank": [
                { category: "Credit Risk", type: "Corporate Loans", amount: 1500, weight: 70 },
                { category: "Market Risk", type: "Trading Book", amount: 500, weight: 45 },
                { category: "Operational Risk", type: "Business Operations", amount: 400, weight: 55 }
            ],
            "SBI": [
                { category: "Credit Risk", type: "Corporate Loans", amount: 2000, weight: 65 },
                { category: "Market Risk", type: "Trading Book", amount: 600, weight: 40 },
                { category: "Operational Risk", type: "Business Operations", amount: 500, weight: 50 }
            ]
        };

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

        function calculateExposureRows(bank) {
            const exposureData = exposureDataByBank[bank];
            if (!exposureData) return [];

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
                bank: parameters.bankName,
                bankName: parameters.bankName,
                type: "RWA",
                reportingPeriod: parameters.reportingPeriod,
                businessDate: parameters.businessDate,
                executionDate: executionDate.toLocaleString("en-IN"),
                status: "Completed",
                creditRWA: totals.credit,
                marketRWA: totals.market,
                operationalRWA: totals.operational,
                totalRWA: totals.total,
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

            const rows = calculateExposureRows(parameters.bankName);
            if (!rows.length) {
                showMessage("No RWA calculation data is configured for this bank.", "error");
                return;
            }

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
            renderCalculationSummary(parameters, rows, totals);

            currentResult = createCalculationRecord(
                parameters,
                rows,
                totals
            );

            const role = typeof window.getCurrentRole === "function"
                ? window.getCurrentRole()
                : "";
            const canSave = typeof window.canCreate === "function" &&
                window.canCreate(role, "rwa-calculation");

            if (canSave) {
                const store = window.baselTrackCalculationStore;
                if (!store || !store.add || !store.add(currentResult)) {
                    currentResult = null;
                    showMessage(
                        "Calculation could not be saved to the Calculation Repository. Check browser storage and try again.",
                        "error"
                    );
                    return;
                }
            }

            resultsSection.hidden = false;

            showMessage(
                canSave
                    ? "RWA calculation completed and stored successfully."
                    : "RWA calculation completed as a preview. Your role cannot create calculation records.",
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
