/* =========================================================
   BASELTRACK - CAPITAL CALCULATION MODULE
   Demo calculation using illustrative sample data.
   ========================================================= */

(function () {
  "use strict";

  // Reuse the shared calculation repository.
  window.baselTrackCalculationData = window.baselTrackCalculationData || {};

  window.baselTrackCalculationData.results =
    window.baselTrackCalculationData.results || [];

  const SAMPLE_DATA = {
    cet1Capital: 800,
    additionalTier1Capital: 100,
    tier2Capital: 200,
    riskWeightedAssets: 7000,
  };

  function initCapitalCalculationModule() {
    const root = document.getElementById("capitalCalculationApp");

    if (!root) {
      console.error("Capital Calculation: root element not found.");
      return;
    }

    const elements = {
      period: root.querySelector("#capPeriod"),
      bank: root.querySelector("#capBank"),
      businessDate: root.querySelector("#capBusinessDate"),
      calculateBtn: root.querySelector("#capCalculateBtn"),
      resetBtn: root.querySelector("#capResetBtn"),
      exportBtn: root.querySelector("#capExportBtn"),
      message: root.querySelector("#capMessage"),
      results: root.querySelector("#capResults"),
      componentTable: root.querySelector("#capComponentTable"),
      cet1RatioValue: root.querySelector("#capCet1RatioValue"),
      tier1RatioValue: root.querySelector("#capTier1RatioValue"),
      carValue: root.querySelector("#capCarValue"),
      totalCapitalValue: root.querySelector("#capTotalCapitalValue"),
      chart: root.querySelector("#capChart"),
      summaryBank: root.querySelector("#capSummaryBank"),
      summaryPeriod: root.querySelector("#capSummaryPeriod"),
      summaryDate: root.querySelector("#capSummaryDate"),
      formulaList: root.querySelector("#capFormulaList"),
      summaryCet1: root.querySelector("#capSummaryCet1"),
      summaryTier1: root.querySelector("#capSummaryTier1"),
      summaryCar: root.querySelector("#capSummaryCar"),
    };

    const requiredElements = Object.keys(elements);

    const missingElement = requiredElements.find(function (key) {
      return !elements[key];
    });

    if (missingElement) {
      console.error(
        "Capital Calculation: missing HTML element:",
        missingElement,
      );
      return;
    }

    let latestCalculation = null;

    function formatNumber(value) {
      return Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      });
    }

    function formatPercentage(value) {
      return value.toFixed(2) + "%";
    }

    function showMessage(message, type) {
      elements.message.textContent = message;
      elements.message.className = "cap-message " + type;
      elements.message.hidden = false;
    }

    function clearMessage() {
      elements.message.textContent = "";
      elements.message.className = "cap-message";
      elements.message.hidden = true;
    }

    function calculateMetrics() {
      const cet1 = SAMPLE_DATA.cet1Capital;
      const additionalTier1 = SAMPLE_DATA.additionalTier1Capital;
      const tier2 = SAMPLE_DATA.tier2Capital;
      const rwa = SAMPLE_DATA.riskWeightedAssets;

      const tier1 = cet1 + additionalTier1;
      const totalCapital = tier1 + tier2;

      const cet1Ratio = (cet1 / rwa) * 100;
      const tier1Ratio = (tier1 / rwa) * 100;
      const car = (totalCapital / rwa) * 100;

      return {
        cet1Capital: cet1,
        additionalTier1Capital: additionalTier1,
        tier1Capital: tier1,
        tier2Capital: tier2,
        totalCapital: totalCapital,
        riskWeightedAssets: rwa,
        cet1Ratio: cet1Ratio,
        tier1Ratio: tier1Ratio,
        car: car,
      };
    }

    function buildComponentRows(metrics) {
      return [
        {
          component: "Common Equity Tier 1 (CET1) Capital",
          value: metrics.cet1Capital,
          description: "Core equity capital",
        },
        {
          component: "Additional Tier 1 Capital",
          value: metrics.additionalTier1Capital,
          description: "Additional Tier 1 instruments",
        },
        {
          component: "Tier 1 Capital",
          value: metrics.tier1Capital,
          description: "CET1 + Additional Tier 1",
        },
        {
          component: "Tier 2 Capital",
          value: metrics.tier2Capital,
          description: "Supplementary capital",
        },
        {
          component: "Total Capital",
          value: metrics.totalCapital,
          description: "Tier 1 + Tier 2",
        },
        {
          component: "Risk Weighted Assets (RWA)",
          value: metrics.riskWeightedAssets,
          description: "Total risk-weighted assets",
        },
      ];
    }

    function renderComponentTable(rows) {
      elements.componentTable.innerHTML = rows
        .map(function (row) {
          return `
                    <tr>
                        <td>${row.component}</td>
                        <td>${formatNumber(row.value)}</td>
                        <td>${row.description}</td>
                    </tr>
                `;
        })
        .join("");
    }

    function renderSummaryCards(metrics) {
      elements.cet1RatioValue.textContent = formatPercentage(metrics.cet1Ratio);

      elements.tier1RatioValue.textContent = formatPercentage(
        metrics.tier1Ratio,
      );

      elements.carValue.textContent = formatPercentage(metrics.car);

      elements.totalCapitalValue.textContent = formatNumber(
        metrics.totalCapital,
      );
    }

    function renderChart(metrics) {
      const chartItems = [
        {
          label: "CET1 Capital",
          value: metrics.cet1Capital,
        },
        {
          label: "Additional Tier 1 Capital",
          value: metrics.additionalTier1Capital,
        },
        {
          label: "Tier 2 Capital",
          value: metrics.tier2Capital,
        },
        {
          label: "Total Capital",
          value: metrics.totalCapital,
        },
      ];

      const maxValue = Math.max.apply(
        null,
        chartItems.map(function (item) {
          return item.value;
        }),
      );

      elements.chart.innerHTML = chartItems
        .map(function (item) {
          const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

          return `
                    <div class="cap-chart-row">
                        <span class="cap-chart-label">${item.label}</span>
                        <div class="cap-chart-track">
                            <div class="cap-chart-bar"
                                 style="width:${width}%"></div>
                        </div>
                        <strong class="cap-chart-value">
                            ${formatNumber(item.value)}
                        </strong>
                    </div>
                `;
        })
        .join("");
    }

    function renderCalculationSummary(metrics) {
      elements.summaryBank.textContent = elements.bank.value;
      elements.summaryPeriod.textContent = elements.period.value;
      elements.summaryDate.textContent = elements.businessDate.value;

      const formulas = [
        {
          label: "Tier 1 Capital",
          formula:
            formatNumber(metrics.cet1Capital) +
            " + " +
            formatNumber(metrics.additionalTier1Capital) +
            " = " +
            formatNumber(metrics.tier1Capital),
        },
        {
          label: "Total Capital",
          formula:
            formatNumber(metrics.tier1Capital) +
            " + " +
            formatNumber(metrics.tier2Capital) +
            " = " +
            formatNumber(metrics.totalCapital),
        },
        {
          label: "CET1 Capital Ratio",
          formula:
            formatNumber(metrics.cet1Capital) +
            " / " +
            formatNumber(metrics.riskWeightedAssets) +
            " × 100 = " +
            formatPercentage(metrics.cet1Ratio),
        },
        {
          label: "Tier 1 Capital Ratio",
          formula:
            formatNumber(metrics.tier1Capital) +
            " / " +
            formatNumber(metrics.riskWeightedAssets) +
            " × 100 = " +
            formatPercentage(metrics.tier1Ratio),
        },
        {
          label: "Capital Adequacy Ratio (CAR)",
          formula:
            formatNumber(metrics.totalCapital) +
            " / " +
            formatNumber(metrics.riskWeightedAssets) +
            " × 100 = " +
            formatPercentage(metrics.car),
        },
      ];

      elements.formulaList.innerHTML = formulas
        .map(function (item) {
          return `
                    <div class="cap-formula-item">
                        <span>${item.label}</span>
                        <strong>${item.formula}</strong>
                    </div>
                `;
        })
        .join("");

      elements.summaryCet1.textContent = formatPercentage(metrics.cet1Ratio);

      elements.summaryTier1.textContent = formatPercentage(metrics.tier1Ratio);

      elements.summaryCar.textContent = formatPercentage(metrics.car);
    }

    function saveCalculation(metrics, rows) {
      const executionDate = new Date();

      const record = {
        calculationId: "CAP-" + Date.now(),
        bankName: elements.bank.value,
        type: "Capital",
        reportingPeriod: elements.period.value,
        businessDate: elements.businessDate.value,
        executionDate: executionDate.toLocaleString("en-IN"),
        status: "Completed",
        metrics: {
          cet1Capital: metrics.cet1Capital,
          additionalTier1Capital: metrics.additionalTier1Capital,
          tier1Capital: metrics.tier1Capital,
          tier2Capital: metrics.tier2Capital,
          totalCapital: metrics.totalCapital,
          riskWeightedAssets: metrics.riskWeightedAssets,
          cet1Ratio: Number(metrics.cet1Ratio.toFixed(2)),
          tier1Ratio: Number(metrics.tier1Ratio.toFixed(2)),
          car: Number(metrics.car.toFixed(2)),
        },
        details: rows,
      };

      window.baselTrackCalculationData.results.push(record);

      return record;
    }

    function calculateCapital() {
      clearMessage();

      if (!elements.bank.value) {
        showMessage("Please select a bank before calculating.", "error");
        return;
      }

      if (!elements.period.value) {
        showMessage("Please select a reporting period.", "error");
        return;
      }

      if (!elements.businessDate.value) {
        showMessage("Please select a business date.", "error");
        return;
      }

      const metrics = calculateMetrics();
      const rows = buildComponentRows(metrics);

      renderComponentTable(rows);
      renderSummaryCards(metrics);
      renderChart(metrics);
      renderCalculationSummary(metrics);

      latestCalculation = saveCalculation(metrics, rows);

      elements.results.hidden = false;

      showMessage(
        "Capital calculation completed successfully. Result saved to the Calculation Repository.",
        "success",
      );
    }

    function escapeCsv(value) {
      const text = value === null || value === undefined ? "" : String(value);

      return '"' + text.replace(/"/g, '""') + '"';
    }

    function downloadCsv() {
      if (!latestCalculation) {
        showMessage("Please calculate capital before exporting.", "error");
        return;
      }

      const record = latestCalculation;
      const metrics = record.metrics;

      const csvRows = [
        ["Capital Calculation Summary"],
        ["Calculation ID", record.calculationId],
        ["Bank Name", record.bankName],
        ["Reporting Period", record.reportingPeriod],
        ["Business Date", record.businessDate],
        ["Execution Date", record.executionDate],
        ["Status", record.status],
        [],
        ["Metric", "Value"],
        ["CET1 Capital", metrics.cet1Capital],
        ["Additional Tier 1 Capital", metrics.additionalTier1Capital],
        ["Tier 1 Capital", metrics.tier1Capital],
        ["Tier 2 Capital", metrics.tier2Capital],
        ["Total Capital", metrics.totalCapital],
        ["Risk Weighted Assets", metrics.riskWeightedAssets],
        ["CET1 Ratio (%)", metrics.cet1Ratio],
        ["Tier 1 Ratio (%)", metrics.tier1Ratio],
        ["Capital Adequacy Ratio (%)", metrics.car],
        [],
        ["Component", "Value", "Description"],
      ];

      record.details.forEach(function (item) {
        csvRows.push([item.component, item.value, item.description]);
      });

      const csvContent = csvRows
        .map(function (row) {
          return row.map(escapeCsv).join(",");
        })
        .join("\r\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = record.calculationId + ".csv";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);

      showMessage("CSV exported successfully.", "success");
    }

    function resetCalculation() {
      elements.period.value = "Oct 2026";
      elements.bank.value = "";
      elements.businessDate.value = "2026-11-10";

      elements.results.hidden = true;
      elements.componentTable.innerHTML = "";
      elements.chart.innerHTML = "";
      elements.formulaList.innerHTML = "";

      elements.cet1RatioValue.textContent = "-";
      elements.tier1RatioValue.textContent = "-";
      elements.carValue.textContent = "-";
      elements.totalCapitalValue.textContent = "-";

      elements.summaryBank.textContent = "-";
      elements.summaryPeriod.textContent = "-";
      elements.summaryDate.textContent = "-";
      elements.summaryCet1.textContent = "-";
      elements.summaryTier1.textContent = "-";
      elements.summaryCar.textContent = "-";

      latestCalculation = null;
      clearMessage();
    }

    elements.calculateBtn.addEventListener("click", calculateCapital);

    elements.resetBtn.addEventListener("click", resetCalculation);

    elements.exportBtn.addEventListener("click", downloadCsv);

    resetCalculation();
  }

  window.initCapitalCalculationModule = initCapitalCalculationModule;
})();
