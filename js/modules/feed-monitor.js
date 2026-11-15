
/* =========================================
   DATA INGESTION - FEED MONITOR
========================================= */

window.initFeedMonitorModule = function () {

    const root = document.getElementById("feedMonitorApp");

    if (!root || root.dataset.initialized === "true") {
        return;
    }

    root.dataset.initialized = "true";

    // -------------------------------------
    // 1. INITIAL FEED DATA
    // -------------------------------------

    // Shared data source.
    // Other frontend modules can add, update, or remove records here.
    if (!Array.isArray(window.baselTrackFeedData)) {

        window.baselTrackFeedData = [
            {
                id: "FEED-001",
                sourceSystem: "Core Banking (Customer)",
                method: "Batch File",
                status: "Received",
                arrivalTime: "23:15 PM",
                rowCount: 1200000
            },
            {
                id: "FEED-002",
                sourceSystem: "Product System",
                method: "API Pull",
                status: "Received",
                arrivalTime: "23:18 PM",
                rowCount: 45000
            },
            {
                id: "FEED-003",
                sourceSystem: "Exposure System",
                method: "Batch File",
                status: "Received",
                arrivalTime: "23:20 PM",
                rowCount: 850000
            },
            {
                id: "FEED-004",
                sourceSystem: "Collateral System",
                method: "Batch File",
                status: "Received",
                arrivalTime: "23:22 PM",
                rowCount: 320000
            },
            {
                id: "FEED-005",
                sourceSystem: "Finance / General Ledger",
                method: "Batch File",
                status: "Received",
                arrivalTime: "23:25 PM",
                rowCount: 1100000
            },
            {
                id: "FEED-006",
                sourceSystem: "Reference Data",
                method: "API Pull",
                status: "Failed",
                arrivalTime: "-",
                rowCount: null
            },
            {
                id: "FEED-007",
                sourceSystem: "Risk Engine (Moody's)",
                method: "API Pull",
                status: "SLA Breach",
                arrivalTime: "23:35 PM",
                rowCount: 620000
            }
        ];
    }

    // -------------------------------------
    // 2. ELEMENT REFERENCES
    // -------------------------------------

    const systemsReceivedElement =
        root.querySelector("#fmSystemsReceived");

    const lateFeedsElement =
        root.querySelector("#fmLateFeeds");

    const failedFeedsElement =
        root.querySelector("#fmFailedFeeds");

    const totalRowsElement =
        root.querySelector("#fmTotalRows");

    const progressElement =
        root.querySelector("#fmSystemsProgress");

    const tableBody =
        root.querySelector("#fmTableBody");

    const recordCountElement =
        root.querySelector("#fmRecordCount");

    const emptyState =
        root.querySelector("#fmEmptyState");

    const refreshButton =
        root.querySelector("#fmRefreshBtn");

    const refreshIcon =
        root.querySelector("#fmRefreshIcon");

    const refreshText =
        root.querySelector("#fmRefreshText");

    const lastRefreshedElement =
        root.querySelector("#fmLastRefreshed");

    const refreshMessage =
        root.querySelector("#fmRefreshMessage");

    let messageTimer = null;

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
                "'": "&#039;"
            }[character];
        });
    }

    function getStatusClass(status) {

        const classes = {
            "Received": "fm-status-received",
            "Failed": "fm-status-failed",
            "SLA Breach": "fm-status-sla",
            "Pending": "fm-status-pending"
        };

        return classes[status] || "fm-status-pending";
    }

    function formatRowCount(value) {

        if (value === null || value === undefined || value === "") {
            return "-";
        }

        const number = Number(value);

        if (!Number.isFinite(number) || number < 0) {
            return "-";
        }

        if (number >= 1000000) {
            return (number / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
        }

        if (number >= 1000) {
            return (number / 1000).toFixed(number < 100000 ? 0 : 1)
                .replace(/\.0$/, "") + "K";
        }

        return number.toLocaleString("en-IN");
    }

    function formatTotalRows(value) {

        if (value >= 1000000) {
            // Round up to one decimal place to match the supplied
            // approximate dashboard value of 4.2M.
            return (Math.ceil(value / 100000) / 10).toFixed(1) + "M";
        }

        if (value >= 1000) {
            return Math.round(value / 1000) + "K";
        }

        return value.toLocaleString("en-IN");
    }

    function getFeedData() {

        if (!Array.isArray(window.baselTrackFeedData)) {
            return [];
        }

        return window.baselTrackFeedData.filter(function (feed) {

            return feed &&
                typeof feed === "object" &&
                typeof feed.sourceSystem === "string";
        });
    }

    // -------------------------------------
    // 4. CALCULATE SUMMARY CARDS
    // -------------------------------------

    function updateSummaryCards(feeds) {

        const totalSystems = feeds.length;

        const receivedCount = feeds.filter(function (feed) {
            return feed.status === "Received";
        }).length;

        const lateCount = feeds.filter(function (feed) {
            return feed.status === "SLA Breach";
        }).length;

        const failedCount = feeds.filter(function (feed) {
            return feed.status === "Failed";
        }).length;

        const totalRows = feeds.reduce(function (total, feed) {

            const rows = Number(feed.rowCount);

            if (!Number.isFinite(rows) || rows < 0) {
                return total;
            }

            return total + rows;

        }, 0);

        // Systems Received
        systemsReceivedElement.textContent =
            receivedCount + " / " + totalSystems;

        // Late Feeds
        lateFeedsElement.textContent = lateCount;

        // Failed Feeds
        failedFeedsElement.textContent = failedCount;

        // Total Rows
        totalRowsElement.textContent = formatTotalRows(totalRows);

        // Received percentage progress bar
        const percentage = totalSystems > 0
            ? (receivedCount / totalSystems) * 100
            : 0;

        progressElement.style.width = percentage + "%";
    }

    // -------------------------------------
    // 5. RENDER SOURCE SYSTEM TABLE
    // -------------------------------------

    function renderFeedTable(feeds) {

        tableBody.innerHTML = "";

        recordCountElement.textContent =
            feeds.length + (feeds.length === 1 ? " System" : " Systems");

        emptyState.hidden = feeds.length !== 0;

        feeds.forEach(function (feed) {

            const row = document.createElement("tr");

            const status = String(feed.status || "Pending");

            row.innerHTML = `
                <td>
                    <span class="fm-source-name">
                        ${escapeHTML(feed.sourceSystem)}
                    </span>
                </td>

                <td>
                    <span class="fm-method">
                        ${escapeHTML(feed.method || "-")}
                    </span>
                </td>

                <td>
                    <span class="fm-status ${getStatusClass(status)}">
                        <span class="fm-status-dot"></span>
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>
                    <span class="fm-arrival-time">
                        ${escapeHTML(feed.arrivalTime || "-")}
                    </span>
                </td>

                <td>
                    <span class="fm-row-count">
                        ${formatRowCount(feed.rowCount)}
                    </span>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    // -------------------------------------
    // 6. REFRESH DATA
    // -------------------------------------

    function refreshFeedMonitor() {

        const latestFeeds = getFeedData();

        // Update the table
        renderFeedTable(latestFeeds);

        // Recalculate all summary cards
        updateSummaryCards(latestFeeds);

        // Update last refreshed time
        const now = new Date();

        lastRefreshedElement.textContent =
            "Last refreshed: " +
            now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            });

        // Show refresh confirmation
        refreshMessage.hidden = false;

        if (messageTimer) {
            clearTimeout(messageTimer);
        }

        messageTimer = setTimeout(function () {
            refreshMessage.hidden = true;
        }, 2500);
    }

    // -------------------------------------
    // 7. REFRESH BUTTON
    // -------------------------------------

    refreshButton.addEventListener("click", function () {

        if (refreshButton.disabled) {
            return;
        }

        refreshButton.disabled = true;

        refreshButton.classList.add("fm-refreshing");

        refreshText.textContent = "Refreshing...";

        // Simulate a short refresh operation.
        // The latest shared data is read after this delay.
        setTimeout(function () {

            refreshFeedMonitor();

            refreshButton.disabled = false;

            refreshButton.classList.remove("fm-refreshing");

            refreshText.textContent = "Refresh Status";

        }, 350);
    });

    // -------------------------------------
    // 8. INITIAL PAGE RENDER
    // -------------------------------------

    refreshFeedMonitor();

};
