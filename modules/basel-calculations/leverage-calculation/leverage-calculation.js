(function () {
  "use strict";

  const SAMPLE_DATA = {
    cet1Capital: 800,
    additionalTier1Capital: 100,
    onBalanceSheetExposure: 15000,
    offBalanceSheetExposure: 3000,
    derivativeExposure: 1000,
    securitiesFinancingExposure: 1000,
  };

  function formatNumber(value) {
    return Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  }

  function escapeCsv(value) {
    return '"' + String(value ?? "").replace(/"/g, '""') + '"';
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
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

  function getSharedRepository() {
    window.baselTrackCalculationData = window.baselTrackCalculationData || {};

    window.baselTrackCalculationData.results =
      window.baselTrackCalculationData.results || [];

    return window.baselTrackCalculationData.results;
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

    const resultsSection = root.querySelector("#levResults");

    let currentResult = null;

    function calculate() {
      const bank = bankInput.value;
      const period = periodInput.value;
      const businessDate = dateInput.value;

      if (!bank) {
        alert("Please select a bank before calculating.");
        bankInput.focus();
        return;
      }

      if (!period || !businessDate) {
        alert("Please select the reporting period and business date.");
        return;
      }

      const data = SAMPLE_DATA;

      const tier1Capital = data.cet1Capital + data.additionalTier1Capital;

      const totalExposure =
        data.onBalanceSheetExposure +
        data.offBalanceSheetExposure +
        data.derivativeExposure +
        data.securitiesFinancingExposure;

      const leverageRatio = (tier1Capital / totalExposure) * 100;

      const result = {
        calculationId: "LEV-" + Date.now(),
        type: "Leverage",
        bank,
        reportingPeriod: period,
        businessDate,
        executionDate: new Date().toLocaleString("en-IN"),
        status: "Completed",
        metrics: {
          cet1Capital: data.cet1Capital,
          tier1Capital,
          totalExposure,
          leverageRatio: Number(leverageRatio.toFixed(2)),
        },
        details: {
          ...data,
          tier1Capital,
          totalExposure,
          leverageRatio: Number(leverageRatio.toFixed(2)),
        },
      };

      currentResult = result;

      getSharedRepository().push(result);

      renderResult(result);
      exportBtn.disabled = false;
    }

    function renderResult(result) {
      const metrics = result.metrics;
      const details = result.details;

      root.querySelector("#levCET1Metric").textContent = formatNumber(
        metrics.cet1Capital,
      );

      root.querySelector("#levTier1Metric").textContent = formatNumber(
        metrics.tier1Capital,
      );

      root.querySelector("#levExposureMetric").textContent = formatNumber(
        metrics.totalExposure,
      );

      root.querySelector("#levRatioMetric").textContent =
        metrics.leverageRatio.toFixed(2) + "%";

      const chartItems = [
        { label: "Tier 1 Capital", value: metrics.tier1Capital },
        { label: "Total Exposure", value: metrics.totalExposure },
      ];

      const maxValue = Math.max(...chartItems.map((item) => item.value));

      root.querySelector("#levChart").innerHTML = chartItems
        .map(
          (item) => `
                    <div class="lev-chart-row">
                        <span>${item.label}</span>
                        <div class="lev-chart-track">
                            <div class="lev-chart-bar"
                                style="width:${(item.value / maxValue) * 100}%">
                            </div>
                        </div>
                        <span class="lev-chart-value">${formatNumber(item.value)}</span>
                    </div>
                `,
        )
        .join("");

      const detailRows = [
        ["CET1 Capital", details.cet1Capital],
        ["Additional Tier 1 Capital", details.additionalTier1Capital],
        ["Tier 1 Capital", details.tier1Capital],
        ["On-Balance Sheet Exposure", details.onBalanceSheetExposure],
        ["Off-Balance Sheet Exposure", details.offBalanceSheetExposure],
        ["Derivative Exposure", details.derivativeExposure],
        [
          "Securities Financing Transaction Exposure",
          details.securitiesFinancingExposure,
        ],
        ["Total Exposure Measure", details.totalExposure],
      ];

      root.querySelector("#levCalculationDetails").innerHTML = detailRows
        .map(
          ([label, value]) => `
                    <div class="lev-detail-row">
                        <span>${label}</span>
                        <strong>${formatNumber(value)}</strong>
                    </div>
                `,
        )
        .join("");

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

      root.querySelector("#levChart").innerHTML = "";
      root.querySelector("#levCalculationDetails").innerHTML = "";
      root.querySelector("#levSummary").innerHTML = "";
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
        [
          "Securities Financing Transaction Exposure",
          d.securitiesFinancingExposure,
        ],
        ["Total Exposure Measure", d.totalExposure],
        ["Leverage Ratio (%)", d.leverageRatio],
      ];

      downloadCsv(currentResult.calculationId + ".csv", rows);
    }

    calculateBtn.addEventListener("click", calculate);
    resetBtn.addEventListener("click", reset);
    exportBtn.addEventListener("click", exportResult);
  };
})();
