/* =========================================================
   BASELTRACK - LIQUIDITY CALCULATION MODULE
   Demo calculation using illustrative sample data.
   ========================================================= */

(function () {
  "use strict";

  // Reuse the shared calculation repository data.
  // Do not overwrite existing RWA calculation records.
  window.baselTrackCalculationData = window.baselTrackCalculationData || {};

  window.baselTrackCalculationData.results =
    window.baselTrackCalculationData.results || [];

  const SAMPLE_DATA = {
    hqla: 5000,
    cashOutflows: 5200,
    cashInflows: 1000,
    availableStableFunding: 4500,
    requiredStableFunding: 4150,
  };

  function initLiquidityCalculationModule() {
    const root = document.getElementById("liquidityCalculationApp");

    if (!root) {
      console.error("Liquidity Calculation: root element not found.");
      return;
    }

    const elements = {
      period: root.querySelector("#liqPeriod"),
      bank: root.querySelector("#liqBank"),
      businessDate: root.querySelector("#liqBusinessDate"),
      calculateBtn: root.querySelector("#liqCalculateBtn"),
      resetBtn: root.querySelector("#liqResetBtn"),
      exportBtn: root.querySelector("#liqExportBtn"),
      message: root.querySelector("#liqMessage"),
      results: root.querySelector("#liqResults"),
      componentTable: root.querySelector("#liqComponentTable"),
      hqlaValue: root.querySelector("#liqHqlaValue"),
      netOutflowValue: root.querySelector("#liqNetOutflowValue"),
      lcrValue: root.querySelector("#liqLcrValue"),
      nsfrValue: root.querySelector("#liqNsfrValue"),
      chart: root.querySelector("#liqChart"),
      summaryBank: root.querySelector("#liqSummaryBank"),
      summaryPeriod: root.querySelector("#liqSummaryPeriod"),
      summaryDate: root.querySelector("#liqSummaryDate"),
      formulaList: root.querySelector("#liqFormulaList"),
      summaryLcr: root.querySelector("#liqSummaryLcr"),
      summaryNsfr: root.querySelector("#liqSummaryNsfr"),
    };

    const requiredElements = [
      "period",
      "bank",
      "businessDate",
      "calculateBtn",
      "resetBtn",
      "exportBtn",
      "message",
      "results",
      "componentTable",
      "hqlaValue",
      "netOutflowValue",
      "lcrValue",
      "nsfrValue",
      "chart",
      "summaryBank",
      "summaryPeriod",
      "summaryDate",
      "formulaList",
      "summaryLcr",
      "summaryNsfr",
    ];

    const missingElement = requiredElements.find(function (key) {
      return !elements[key];
    });

    if (missingElement) {
      console.error(
        "Liquidity Calculation: missing HTML element:",
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
      elements.message.className = "liq-message " + type;
      elements.message.hidden = false;
    }

    function clearMessage() {
      elements.message.textContent = "";
      elements.message.className = "liq-message";
      elements.message.hidden = true;
    }

    function calculateMetrics() {
      const netCashOutflows =
        SAMPLE_DATA.cashOutflows - SAMPLE_DATA.cashInflows;

      const lcr = (SAMPLE_DATA.hqla / netCashOutflows) * 100;

      const nsfr =
        (SAMPLE_DATA.availableStableFunding /
          SAMPLE_DATA.requiredStableFunding) *
        100;

      return {
        hqla: SAMPLE_DATA.hqla,
        cashOutflows: SAMPLE_DATA.cashOutflows,
        cashInflows: SAMPLE_DATA.cashInflows,
        netCashOutflows: netCashOutflows,
        availableStableFunding: SAMPLE_DATA.availableStableFunding,
        requiredStableFunding: SAMPLE_DATA.requiredStableFunding,
        lcr: lcr,
        nsfr: nsfr,
      };
    }

    function buildComponentRows(metrics) {
      return [
        {
          component: "High Quality Liquid Assets (HQLA)",
          value: metrics.hqla,
          description: "Available liquid assets",
        },
        {
          component: "Total Cash Outflows (30 Days)",
          value: metrics.cashOutflows,
          description: "Expected cash outflows",
        },
        {
          component: "Total Cash Inflows (30 Days)",
          value: metrics.cashInflows,
          description: "Expected cash inflows",
        },
        {
          component: "Net Cash Outflows",
          value: metrics.netCashOutflows,
          description: "Outflows minus inflows",
        },
        {
          component: "Available Stable Funding",
          value: metrics.availableStableFunding,
          description: "Available stable funding",
        },
        {
          component: "Required Stable Funding",
          value: metrics.requiredStableFunding,
          description: "Required stable funding",
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
      elements.hqlaValue.textContent = formatNumber(metrics.hqla);

      elements.netOutflowValue.textContent = formatNumber(
        metrics.netCashOutflows,
      );

      elements.lcrValue.textContent = formatPercentage(metrics.lcr);

      elements.nsfrValue.textContent = formatPercentage(metrics.nsfr);
    }

    function renderChart(metrics) {
      const chartItems = [
        { label: "HQLA", value: metrics.hqla },
        {
          label: "Net Cash Outflows",
          value: metrics.netCashOutflows,
        },
        {
          label: "Available Stable Funding",
          value: metrics.availableStableFunding,
        },
        {
          label: "Required Stable Funding",
          value: metrics.requiredStableFunding,
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
                    <div class="liq-chart-row">
                        <span class="liq-chart-label">${item.label}</span>
                        <div class="liq-chart-track">
                            <div class="liq-chart-bar"
                                 style="width:${width}%"></div>
                        </div>
                        <strong class="liq-chart-value">
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
          label: "Net Cash Outflows",
          formula:
            formatNumber(metrics.cashOutflows) +
            " - " +
            formatNumber(metrics.cashInflows) +
            " = " +
            formatNumber(metrics.netCashOutflows),
        },
        {
          label: "Liquidity Coverage Ratio (LCR)",
          formula:
            formatNumber(metrics.hqla) +
            " / " +
            formatNumber(metrics.netCashOutflows) +
            " × 100 = " +
            formatPercentage(metrics.lcr),
        },
        {
          label: "Net Stable Funding Ratio (NSFR)",
          formula:
            formatNumber(metrics.availableStableFunding) +
            " / " +
            formatNumber(metrics.requiredStableFunding) +
            " × 100 = " +
            formatPercentage(metrics.nsfr),
        },
      ];

      elements.formulaList.innerHTML = formulas
        .map(function (item) {
          return `
                    <div class="liq-formula-item">
                        <span>${item.label}</span>
                        <strong>${item.formula}</strong>
                    </div>
                `;
        })
        .join("");

      elements.summaryLcr.textContent = formatPercentage(metrics.lcr);

      elements.summaryNsfr.textContent = formatPercentage(metrics.nsfr);
    }

    function saveCalculation(metrics, rows) {
      const executionDate = new Date();

      const record = {
        calculationId: "LIQ-" + Date.now(),
        bankName: elements.bank.value,
        type: "Liquidity",
        reportingPeriod: elements.period.value,
        businessDate: elements.businessDate.value,
        executionDate: executionDate.toLocaleString("en-IN"),
        status: "Completed",
        metrics: {
          hqla: metrics.hqla,
          netCashOutflows: metrics.netCashOutflows,
          lcr: Number(metrics.lcr.toFixed(2)),
          nsfr: Number(metrics.nsfr.toFixed(2)),
        },
        details: rows,
      };

      window.baselTrackCalculationData.results.push(record);

      return record;
    }

    function calculateLiquidity() {
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
        "Liquidity calculation completed successfully. Result saved to the Calculation Repository.",
        "success",
      );
    }

    function escapeCsv(value) {
      const text = value === null || value === undefined ? "" : String(value);

      return '"' + text.replace(/"/g, '""') + '"';
    }

    function downloadCsv() {
      if (!latestCalculation) {
        showMessage("Please calculate liquidity before exporting.", "error");
        return;
      }

      const record = latestCalculation;
      const metrics = record.metrics;

      const csvRows = [
        ["Liquidity Calculation Summary"],
        ["Calculation ID", record.calculationId],
        ["Bank Name", record.bankName],
        ["Reporting Period", record.reportingPeriod],
        ["Business Date", record.businessDate],
        ["Execution Date", record.executionDate],
        ["Status", record.status],
        [],
        ["Metric", "Value"],
        ["HQLA", metrics.hqla],
        ["Net Cash Outflows", metrics.netCashOutflows],
        ["LCR (%)", metrics.lcr],
        ["NSFR (%)", metrics.nsfr],
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
      elements.bank.value = "HDFC Bank";
      elements.businessDate.value = "2026-11-10";

      elements.results.hidden = true;
      elements.componentTable.innerHTML = "";
      elements.chart.innerHTML = "";
      elements.formulaList.innerHTML = "";

      elements.hqlaValue.textContent = "-";
      elements.netOutflowValue.textContent = "-";
      elements.lcrValue.textContent = "-";
      elements.nsfrValue.textContent = "-";

      elements.summaryBank.textContent = "-";
      elements.summaryPeriod.textContent = "-";
      elements.summaryDate.textContent = "-";
      elements.summaryLcr.textContent = "-";
      elements.summaryNsfr.textContent = "-";

      latestCalculation = null;
      clearMessage();
    }

    elements.calculateBtn.addEventListener("click", calculateLiquidity);

    elements.resetBtn.addEventListener("click", resetCalculation);

    elements.exportBtn.addEventListener("click", downloadCsv);

    resetCalculation();
  }

  window.initLiquidityCalculationModule = initLiquidityCalculationModule;
})();
