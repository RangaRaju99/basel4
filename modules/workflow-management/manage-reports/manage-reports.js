(function () {
    "use strict";

    const reportRecords = {

        "REP-001": {
            name: "Capital Adequacy Report",
            version: "V1.0",
            status: "Published"
        },

        "REP-002": {
            name: "Liquidity Coverage Report",
            version: "V2.0",
            status: "Finance Review"
        },

        "REP-003": {
            name: "Leverage Ratio Report",
            version: "V1.2",
            status: "Draft"
        }
    };

    let app;

    function $(id) {
        return app.querySelector("#" + id);
    }

    function searchReports() {

        const term = $("reportSearch").value.trim().toLowerCase();

        const status = $("statusFilter").value.toLowerCase();

        let found = 0;

        app.querySelectorAll(".reportRow").forEach(function (row) {

            const id = row.cells[0].textContent.toLowerCase();

            const name = row.cells[1].textContent.toLowerCase();

            const rowStatus = row.cells[4].textContent.toLowerCase();

            const matchesText =
                !term || id.includes(term) || name.includes(term);

            const matchesStatus =
                status === "all reports" || rowStatus.includes(status);

            row.style.display =
                matchesText && matchesStatus ? "" : "none";

            if (matchesText && matchesStatus) {
                found++;
            }
        });

        $("noResults").style.display = found ? "none" : "block";
    }

    function viewReport(id) {

        const report = reportRecords[id];

        if (!report) {
            return;
        }

        $("popupReportId").textContent = id;
        $("popupReportName").textContent = report.name;
        $("popupVersion").textContent = report.version;
        $("popupStatus").textContent = report.status;

        $("reportDetailsPopup").classList.add("show");
    }

    function closeReportDetails() {
        $("reportDetailsPopup").classList.remove("show");
    }

    function downloadReport() {
        alert("Report Download Started");
    }

    function handleClick(event) {

        if (event.target.id === "reportDetailsPopup") {
            closeReportDetails();
            return;
        }

        const viewBtn = event.target.closest(".view-report");

        if (viewBtn && app.contains(viewBtn)) {
            viewReport(viewBtn.dataset.id);
            return;
        }

        const button = event.target.closest("button");

        if (!button || !app.contains(button)) {
            return;
        }

        if (button.id === "searchReportsBtn") searchReports();
        if (button.id === "closeReportDetails") closeReportDetails();
        if (button.id === "downloadReport") downloadReport();
    }

    function handleInput(event) {
        if (event.target.id === "reportSearch") searchReports();
    }

    function handleChange(event) {
        if (event.target.id === "statusFilter") searchReports();
    }

    function initManageReportsModule() {
        app = document.getElementById("manageReportsApp");
        if (!app || app.dataset.initialized === "true") return;
        app.dataset.initialized = "true";
        app.addEventListener("click", handleClick);
        app.addEventListener("input", handleInput);
        app.addEventListener("change", handleChange);
    }

    window.initManageReportsModule = initManageReportsModule;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            if (document.getElementById("manageReportsApp")) initManageReportsModule();
        });
    } else if (document.getElementById("manageReportsApp")) {
        initManageReportsModule();
    }
})();
