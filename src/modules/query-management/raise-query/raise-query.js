/* =========================================
   RAISE QUERY MODULE
   BaselTrack - Query Management
========================================= */

(function () {
    "use strict";

    const STORAGE_KEY = "baseltrack-queries";

    const ASSIGNED_TEAMS = [
        "Regulatory Report Head",
        "Finance Team",
        "Risk Team",
        "Compliance Team",
        "Internal Audit Team",
        "Senior Management"
    ];

    function readQueries() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return [];
            }

            const parsed = JSON.parse(saved);

            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("Unable to read saved queries:", error);
            return [];
        }
    }

    function saveQueries(queries) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
            return true;
        } catch (error) {
            console.error("Unable to save queries:", error);
            return false;
        }
    }

    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function getNextQueryId() {
        const year = new Date().getFullYear();
        const queries = readQueries();

        let highestNumber = 0;

        queries.forEach(function (query) {
            const match = String(query.queryId || "").match(
                new RegExp("^QRY-" + year + "-(\\d+)$")
            );

            if (match) {
                highestNumber = Math.max(
                    highestNumber,
                    Number(match[1])
                );
            }
        });

        return `QRY-${year}-${String(highestNumber + 1).padStart(3, "0")}`;
    }

    function getCurrentUserName() {
        const storageKeys = [
            "baseltrack-user",
            "baseltrack-current-user",
            "currentUser",
            "loggedInUser",
            "user"
        ];

        for (let i = 0; i < storageKeys.length; i++) {
            try {
                const raw = localStorage.getItem(storageKeys[i]);

                if (!raw) {
                    continue;
                }

                const user = JSON.parse(raw);

                if (typeof user === "string" && user.trim()) {
                    return user.trim();
                }

                if (user && typeof user === "object") {
                    const name =
                        user.fullName ||
                        user.name ||
                        user.username ||
                        user.displayName ||
                        user.email;

                    if (name) {
                        return String(name);
                    }
                }
            } catch (error) {
                // Continue checking other possible user keys.
            }
        }

        const profileName = document.querySelector(
            ".profile-label strong"
        );

        if (profileName && profileName.textContent.trim()) {
            return profileName.textContent.trim();
        }

        return "Demo User";
    }

    function getReportOptions() {
        const reports = [
            "Capital Adequacy Report",
            "Risk Weighted Assets (RWA) Report",
            "Liquidity Coverage Report",
            "Net Stable Funding Ratio (NSFR) Report",
            "Leverage Ratio Report",
            "Basel IV Compliance Report",
            "Other"
        ];

        return reports;
    }

    function populateReportOptions(select) {
        const reports = getReportOptions();

        select.innerHTML =
            '<option value="">Select a report</option>';

        reports.forEach(function (report) {
            const option = document.createElement("option");
            option.value = report;
            option.textContent = report;
            select.appendChild(option);
        });
    }

    function populateAssignedTeams(select) {
        select.innerHTML =
            '<option value="">Select a team</option>';

        ASSIGNED_TEAMS.forEach(function (team) {
            const option = document.createElement("option");
            option.value = team;
            option.textContent = team;
            select.appendChild(option);
        });
    }

    function showToast(message, type) {
        const toast = document.getElementById("rqToast");

        if (!toast) {
            return;
        }

        toast.textContent = message;
        toast.className = "rq-toast show";

        if (type === "error") {
            toast.classList.add("error");
        }

        window.setTimeout(function () {
            toast.classList.remove("show");
        }, 3000);
    }

    function updateAutomaticFields() {
        const queryId = document.getElementById("rqQueryId");
        const raisedBy = document.getElementById("rqRaisedBy");
        const queryDate = document.getElementById("rqDate");

        if (queryId) {
            queryId.value = getNextQueryId();
        }

        if (raisedBy) {
            raisedBy.value = getCurrentUserName();
        }

        if (queryDate) {
            queryDate.value = getTodayDate();
        }
    }

    function handleCreateQuery(event) {
        event.preventDefault();
        if (typeof window.requireCurrentPermission !== "function" ||
            !window.requireCurrentPermission("raise-query", "C")) return;

        const form = document.getElementById("rqForm");

        if (!form) {
            return;
        }

        const reportName = document.getElementById("rqReportName").value;
        const priorityInput = form.querySelector(
            'input[name="rqPriority"]:checked'
        );
        const assignedTo = document.getElementById("rqAssignedTo").value;
        const description = document.getElementById("rqDescription").value.trim();

        if (!reportName || !priorityInput || !assignedTo || !description) {
            showToast("Please complete all required fields.", "error");
            return;
        }

        const queries = readQueries();

        const newQuery = {
            queryId: getNextQueryId(),
            reportName: reportName,
            raisedBy: getCurrentUserName(),
            priority: priorityInput.value,
            assignedTo: assignedTo,
            date: getTodayDate(),
            description: description,
            status: "Open",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        queries.push(newQuery);

        if (!saveQueries(queries)) {
            showToast("Unable to save the query. Please try again.", "error");
            return;
        }

        showToast(
            "Query " + newQuery.queryId + " created successfully."
        );

        form.reset();
        updateAutomaticFields();
    }

    function initRaiseQueryModule() {
        const app = document.getElementById("raiseQueryApp");

        if (!app) {
            return;
        }

        const reportSelect = document.getElementById("rqReportName");
        const assignedSelect = document.getElementById("rqAssignedTo");
        const form = document.getElementById("rqForm");
        const resetButton = document.getElementById("rqResetButton");

        populateReportOptions(reportSelect);
        populateAssignedTeams(assignedSelect);
        updateAutomaticFields();

        if (form) {
            form.addEventListener("submit", handleCreateQuery);
        }

        if (resetButton) {
            resetButton.addEventListener("click", function () {
                form.reset();
                updateAutomaticFields();
            });
        }
    }

    window.initRaiseQueryModule = initRaiseQueryModule;

})();