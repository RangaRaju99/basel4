/* =========================================
   DATA INGESTION - LANDING ZONE (RAW)
========================================= */

window.initLandingZoneModule = function () {
  const root = document.getElementById("landingZoneApp");

  if (!root || root.dataset.initialized === "true") {
    return;
  }

  root.dataset.initialized = "true";

  // -------------------------------------
  // 1. INITIAL RAW LANDING DATA
  // -------------------------------------

  // Demo source data.
  // This page intentionally provides no edit/delete controls.
  if (!Array.isArray(window.baselTrackRawLandingData)) {
    window.baselTrackRawLandingData = [
      {
        accountId: "ACC-88392",
        customerName: "Suresh Kumar",
        loanAmount: 2500000,
        currency: "INR",
        sourceSystem: "Core Banking",
      },
      {
        accountId: "ACC-11204",
        customerName: "Priya Patel",
        loanAmount: 850000,
        currency: "INR",
        sourceSystem: "Core Banking",
      },
      {
        accountId: "ACC-55611",
        customerName: "Ramesh Singh",
        loanAmount: 12000000,
        currency: "INR",
        sourceSystem: "Core Banking",
      },
    ];
  }

  // -------------------------------------
  // 2. ELEMENT REFERENCES
  // -------------------------------------

  const tableBody = root.querySelector("#lzTableBody");
  const emptyState = root.querySelector("#lzEmptyState");

  const totalRecordsElement = root.querySelector("#lzTotalRecords");

  const sourceSystemsElement = root.querySelector("#lzSourceSystems");

  const recordCountElement = root.querySelector("#lzRecordCount");

  // -------------------------------------
  // 3. HELPER FUNCTIONS
  // -------------------------------------

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[character];
    });
  }

  function getRawRecords() {
    if (!Array.isArray(window.baselTrackRawLandingData)) {
      return [];
    }

    return window.baselTrackRawLandingData.filter(function (record) {
      return record && typeof record === "object";
    });
  }

  function formatLoanAmount(amount, currency) {
    const value = Number(amount);

    if (!Number.isFinite(value)) {
      return "-";
    }

    const formattedValue = value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    if (currency === "INR") {
      return "₹ " + formattedValue;
    }

    return escapeHTML(currency || "") + " " + formattedValue;
  }

  // -------------------------------------
  // 4. UPDATE SUMMARY
  // -------------------------------------

  function updateSummary(records) {
    const totalRecords = records.length;

    const uniqueSources = new Set(
      records
        .map(function (record) {
          return record.sourceSystem;
        })
        .filter(Boolean),
    );

    totalRecordsElement.textContent = totalRecords;

    sourceSystemsElement.textContent = uniqueSources.size;

    recordCountElement.textContent =
      totalRecords + (totalRecords === 1 ? " Record" : " Records");
  }

  // -------------------------------------
  // 5. RENDER RAW DATA TABLE
  // -------------------------------------

  function renderRawRecords() {
    const records = getRawRecords();

    tableBody.innerHTML = "";

    emptyState.hidden = records.length !== 0;

    records.forEach(function (record) {
      const row = document.createElement("tr");

      row.innerHTML = `
                <td>
                    <span class="lz-account-id">
                        ${escapeHTML(record.accountId)}
                    </span>
                </td>

                <td>
                    <span class="lz-customer-name">
                        ${escapeHTML(record.customerName)}
                    </span>
                </td>

                <td>
                    <span class="lz-loan-amount">
                        ${formatLoanAmount(record.loanAmount, record.currency)}
                    </span>
                </td>

                <td>
                    <span class="lz-currency">
                        ${escapeHTML(record.currency)}
                    </span>
                </td>

                <td>
                    <span class="lz-source-system">
                        ${escapeHTML(record.sourceSystem)}
                    </span>
                </td>
            `;

      tableBody.appendChild(row);
    });

    updateSummary(records);
  }

  // -------------------------------------
  // 6. INITIAL RENDER
  // -------------------------------------

  renderRawRecords();
};
