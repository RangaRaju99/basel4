/* =========================================
   INGESTION AUDIT LOG
========================================= */

(function () {
  "use strict";

  // Initial sample audit records
  const initialAuditRecords = [
    {
      logId: "LOG-8901",
      sourceSystem: "Core Banking",
      fileName: "cbs_daily_loan_20231115.csv",
      arrivalTimestamp: "15-Nov-2023 23:15:02",
      rowCount: 1250000,
      status: "Success",
    },
    {
      logId: "LOG-8902",
      sourceSystem: "Risk Engine",
      fileName: "/api/v1/rwa-daily",
      arrivalTimestamp: "15-Nov-2023 23:35:10",
      rowCount: 620000,
      status: "Late Arrival",
    },
    {
      logId: "LOG-8903",
      sourceSystem: "Reference Data",
      fileName: "ref_fx_rates.json",
      arrivalTimestamp: "-",
      rowCount: 0,
      status: "Failed",
    },
  ];

  // Shared in-memory audit data
  if (!Array.isArray(window.baselTrackIngestionAuditData)) {
    window.baselTrackIngestionAuditData = initialAuditRecords.map((record) => ({
      ...record,
    }));
  }

  function getAuditRecords() {
    return window.baselTrackIngestionAuditData;
  }

  function formatRowCount(value) {
    return Number(value).toLocaleString("en-IN");
  }

  function getStatusClass(status) {
    switch (status) {
      case "Success":
        return "ial-status-success";

      case "Late Arrival":
        return "ial-status-late";

      case "Failed":
        return "ial-status-failed";

      default:
        return "";
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case "Success":
        return "fa-circle-check";

      case "Late Arrival":
        return "fa-clock";

      case "Failed":
        return "fa-circle-xmark";

      default:
        return "fa-circle";
    }
  }

  // Escape values before inserting them into table HTML
  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function updateSummary(root, records) {
    const total = records.length;

    const success = records.filter(
      (record) => record.status === "Success",
    ).length;

    const late = records.filter(
      (record) => record.status === "Late Arrival",
    ).length;

    const failed = records.filter(
      (record) => record.status === "Failed",
    ).length;

    root.querySelector("#ialTotalLogs").textContent = total;
    root.querySelector("#ialSuccessLogs").textContent = success;
    root.querySelector("#ialLateLogs").textContent = late;
    root.querySelector("#ialFailedLogs").textContent = failed;

    root.querySelector("#ialRecordCount").textContent =
      `${total} ${total === 1 ? "Record" : "Records"}`;
  }

  function renderAuditTable(root, records) {
    const tableBody = root.querySelector("#ialTableBody");

    if (!records.length) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="ial-empty-state">
                        No ingestion audit records available.
                    </td>
                </tr>
            `;
      return;
    }

    tableBody.innerHTML = records
      .map((record) => {
        const statusClass = getStatusClass(record.status);
        const statusIcon = getStatusIcon(record.status);

        return `
                <tr>
                    <td class="ial-log-id">
                        ${escapeHTML(record.logId)}
                    </td>

                    <td class="ial-source-name">
                        ${escapeHTML(record.sourceSystem)}
                    </td>

                    <td class="ial-file-name">
                        ${escapeHTML(record.fileName)}
                    </td>

                    <td class="ial-timestamp">
                        ${escapeHTML(record.arrivalTimestamp)}
                    </td>

                    <td class="ial-row-count">
                        ${formatRowCount(record.rowCount)}
                    </td>

                    <td>
                        <span class="ial-status ${statusClass}">
                            <i class="fa-solid ${statusIcon}"></i>
                            ${escapeHTML(record.status)}
                        </span>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  function renderIngestionAuditLog(root) {
    const records = getAuditRecords();

    updateSummary(root, records);
    renderAuditTable(root, records);
  }

  // Public module initializer
  window.initIngestionAuditLogModule = function () {
    const root = document.getElementById("ingestionAuditLogApp");

    if (!root || root.dataset.initialized === "true") {
      return;
    }

    root.dataset.initialized = "true";

    renderIngestionAuditLog(root);
  };
})();
