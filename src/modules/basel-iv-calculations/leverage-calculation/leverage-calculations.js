
(function () {
    "use strict";

    const BANK_DATA = {
        "HDFC Bank": {
            cet1Capital: 800,
            additionalTier1Capital: 100,
            onBalanceSheetExposure: 15000,
            offBalanceSheetExposure: 3000,
            derivativeExposure: 1000,
            securitiesFinancingExposure: 1000
        },
        "ICICI Bank": {
            cet1Capital: 1100,
            additionalTier1Capital: 180,
            onBalanceSheetExposure: 19000,
            offBalanceSheetExposure: 4200,
            derivativeExposure: 1300,
            securitiesFinancingExposure: 900
        },
        "SBI": {
            cet1Capital: 1650,
            additionalTier1Capital: 250,
            onBalanceSheetExposure: 28000,
            offBalanceSheetExposure: 6000,
            derivativeExposure: 1800,
            securitiesFinancingExposure: 1200
        }
    };

    function formatNumber(value) {
        return Number(value).toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });
    }

    function escapeCsv(value) {
        return '"' + String(value ?? "").replace(/"/g, '""') + '"';
    }

    function downloadCsv(filename, rows) {
        const csv = rows.map(row => row.map(escapeCsv).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    window.initLeverageCalculationModule = function () {
        const root = document.getElementById("leverageCalculationApp");
        if (!root || root.dataset.initialized === "true") return;

        root.dataset.initialized = "true";

        const periodInput = root.querySelector("#levPeriod");
        const bankInput = root.querySelector("#levBank");
        const dateInput = root.querySelector("#levBusinessDate");

        const calculateBtn = root.querySelector("#levCalculateBtn");
        const resetBtn = root.querySelector("#levResetBtn");
        const exportBtn = root.querySelector("#levExportBtn");
        const message = root.querySelector("#levMessage");

        const resultsSection = root.querySelector("#levResults");

        let currentResult = null;

        function showMessage(text, type) {
            message.textContent = text;
            message.className = "lev-message " + type;
            message.hidden = false;
        }

        function clearMessage() {
            message.textContent = "";
            message.className = "lev-message";
            message.hidden = true;
        }

        function renderInputSummary(bank) {
            const tbody = root.querySelector("#levComponentsBody");
            const data = BANK_DATA[bank];

            if (!data) {
                tbody.innerHTML = '<tr><td colspan="3">Select a bank to view its calculation inputs.</td></tr>';
                return;
            }

            const tier1Capital =
                data.cet1Capital + data.additionalTier1Capital;
            const totalExposure =
                data.onBalanceSheetExposure +
                data.offBalanceSheetExposure +
                data.derivativeExposure +
                data.securitiesFinancingExposure;
            const rows = [
                ["CET1 Capital", data.cet1Capital, "Common Equity Tier 1 capital"],
                ["Additional Tier 1 Capital", data.additionalTier1Capital, "Additional Tier 1 capital"],
                ["Tier 1 Capital", tier1Capital, "CET1 + Additional Tier 1"],
                ["On-Balance Sheet Exposure", data.onBalanceSheetExposure, "On-balance sheet assets"],
                ["Off-Balance Sheet Exposure", data.offBalanceSheetExposure, "Off-balance sheet items"],
                ["Derivative Exposure", data.derivativeExposure, "Derivative exposure measure"],
                ["Securities Financing Transaction Exposure", data.securitiesFinancingExposure, "SFT exposure measure"],
                ["Total Exposure Measure", totalExposure, "Sum of exposure components"]
            ];

            tbody.innerHTML = rows.map(function (row, index) {
                return `
                    <tr${index === rows.length - 1 ? ' class="lev-total-row"' : ""}>
                        <td>${row[0]}</td>
                        <td>${formatNumber(row[1])}</td>
                        <td>${row[2]}</td>
                    </tr>
                `;
            }).join("");
        }

        function calculate() {
            const bank = bankInput.value;
            const period = periodInput.value;
            const businessDate = dateInput.value;
            clearMessage();

            if (!bank) {
                showMessage("Please select a bank before calculating.", "error");
                bankInput.focus();
                return;
            }

            if (!period || !businessDate) {
                showMessage("Please select the reporting period and business date.", "error");
                return;
            }

            const data = BANK_DATA[bank];
            if (!data) {
                showMessage("No leverage calculation data is configured for this bank.", "error");
                return;
            }

            const tier1Capital =
                data.cet1Capital + data.additionalTier1Capital;

            const totalExposure =
                data.onBalanceSheetExposure +
                data.offBalanceSheetExposure +
                data.derivativeExposure +
                data.securitiesFinancingExposure;

            if (!Number.isFinite(totalExposure) || totalExposure <= 0) {
                showMessage("Total exposure must be greater than zero.", "error");
                return;
            }

            const leverageRatio =
                (tier1Capital / totalExposure) * 100;

            const executionDate = new Date();

            const result = {
                calculationId: "LEV-" + Date.now(),
                type: "Leverage",
                bank,
                bankName: bank,
                reportingPeriod: period,
                businessDate,
                executionDate: executionDate.toLocaleString("en-IN"),
                calculatedAt: executionDate.toLocaleString("en-IN"),
                status: "Completed",
                cet1: data.cet1Capital,
                at1: data.additionalTier1Capital,
                tier1Capital: tier1Capital,
                onBalanceExposure: data.onBalanceSheetExposure,
                offBalanceExposure: data.offBalanceSheetExposure,
                derivativeExposure: data.derivativeExposure,
                sftExposure: data.securitiesFinancingExposure,
                totalExposure: totalExposure,
                leverageRatio: Number(leverageRatio.toFixed(2)),
                metrics: {
                    cet1Capital: data.cet1Capital,
                    tier1Capital,
                    totalExposure,
                    leverageRatio: Number(leverageRatio.toFixed(2))
                },
                details: {
                    ...data,
                    tier1Capital,
                    totalExposure,
                    leverageRatio: Number(leverageRatio.toFixed(2))
                }
            };

            const role = typeof window.getCurrentRole === "function"
                ? window.getCurrentRole()
                : "";
            const canSave = typeof window.canCreate === "function" &&
                window.canCreate(role, "leverage-calculation");
            if (canSave) {
                const store = window.baselTrackCalculationStore;
                if (!store || !store.add || !store.add(result)) {
                    showMessage(
                        "Calculation could not be saved to the Calculation Repository. Check browser storage and try again.",
                        "error"
                    );
                    return;
                }
            }

            currentResult = result;
            renderResult(result);
            exportBtn.disabled = false;
            showMessage(
                canSave
                    ? "Leverage Ratio calculated and saved successfully."
                    : "Leverage Ratio calculated as a preview. Your role cannot create calculation records.",
                "success"
            );
        }

        function renderResult(result) {
            const metrics = result.metrics;
            const details = result.details;

            root.querySelector("#levCET1Metric").textContent =
                formatNumber(metrics.cet1Capital);

            root.querySelector("#levTier1Metric").textContent =
                formatNumber(metrics.tier1Capital);

            root.querySelector("#levExposureMetric").textContent =
                formatNumber(metrics.totalExposure);

            root.querySelector("#levRatioMetric").textContent =
                metrics.leverageRatio.toFixed(2) + "%";

            root.querySelector("#levSummary").innerHTML = `
                <div class="lev-summary-row">
                    <span>Bank</span>
                    <strong>${result.bank}</strong>
                </div>
                <div class="lev-summary-row">
                    <span>Reporting Period</span>
                    <strong>${result.reportingPeriod}</strong>
                </div>
                <div class="lev-summary-row">
                    <span>Business Date</span>
                    <strong>${result.businessDate}</strong>
                </div>
                <div class="lev-summary-row">
                    <span>Tier 1 Capital</span>
                    <strong>${formatNumber(details.cet1Capital)} + ${formatNumber(details.additionalTier1Capital)} = ${formatNumber(details.tier1Capital)}</strong>
                </div>
                <div class="lev-summary-row">
                    <span>Total Exposure Measure</span>
                    <strong>${formatNumber(details.onBalanceSheetExposure)} + ${formatNumber(details.offBalanceSheetExposure)} + ${formatNumber(details.derivativeExposure)} + ${formatNumber(details.securitiesFinancingExposure)} = ${formatNumber(details.totalExposure)}</strong>
                </div>
                <div class="lev-summary-row">
                    <span>Leverage Ratio Formula</span>
                    <strong>Tier 1 Capital ÷ Total Exposure × 100</strong>
                </div>
                <div class="lev-summary-row lev-summary-total">
                    <span>Leverage Ratio</span>
                    <strong>${formatNumber(details.tier1Capital)} ÷ ${formatNumber(details.totalExposure)} × 100 = ${details.leverageRatio.toFixed(2)}%</strong>
                </div>
            `;

            resultsSection.hidden = false;
        }

        function reset() {
            periodInput.value = "Oct 2026";
            bankInput.value = "";
            dateInput.value = "2026-11-10";

            currentResult = null;
            resultsSection.hidden = true;
            exportBtn.disabled = true;

            root.querySelector("#levCET1Metric").textContent = "-";
            root.querySelector("#levTier1Metric").textContent = "-";
            root.querySelector("#levExposureMetric").textContent = "-";
            root.querySelector("#levRatioMetric").textContent = "-";

            root.querySelector("#levSummary").innerHTML = "";
            renderInputSummary(bankInput.value);
            clearMessage();
        }

        function exportResult() {
            if (!currentResult) return;

            const d = currentResult.details;

            const rows = [
                ["Calculation ID", currentResult.calculationId],
                ["Bank Name", currentResult.bank],
                ["Calculation Type", currentResult.type],
                ["Reporting Period", currentResult.reportingPeriod],
                ["Business Date", currentResult.businessDate],
                ["Execution Date", currentResult.executionDate],
                ["Status", currentResult.status],
                [],
                ["Component", "Value"],
                ["CET1 Capital", d.cet1Capital],
                ["Additional Tier 1 Capital", d.additionalTier1Capital],
                ["Tier 1 Capital", d.tier1Capital],
                ["On-Balance Sheet Exposure", d.onBalanceSheetExposure],
                ["Off-Balance Sheet Exposure", d.offBalanceSheetExposure],
                ["Derivative Exposure", d.derivativeExposure],
                ["Securities Financing Transaction Exposure", d.securitiesFinancingExposure],
                ["Total Exposure Measure", d.totalExposure],
                ["Leverage Ratio (%)", d.leverageRatio]
            ];

            downloadCsv(currentResult.calculationId + ".csv", rows);
            showMessage("CSV exported successfully.", "success");
        }

        calculateBtn.addEventListener("click", calculate);
        resetBtn.addEventListener("click", reset);
        exportBtn.addEventListener("click", exportResult);
        bankInput.addEventListener("change", function () {
            renderInputSummary(bankInput.value);
            clearMessage();
        });

        reset();
    };
})();
