window.initReportingCalendarModule = function () {
    const root = document.getElementById("reportingCalendarApp");

    if (!root || root.dataset.initialized === "true") {
        return;
    }

    const role = typeof window.getCurrentRole === "function"
        ? window.getCurrentRole()
        : "";

    if (typeof window.canRead !== "function" ||
        !window.canRead(role, "reporting-calendar")) {
        root.innerHTML = "<p role=\"alert\">You do not have permission to view the Reporting Calendar.</p>";
        return;
    }

    root.dataset.initialized = "true";

    const scenarioToday = new Date("2026-11-12T00:00:00");
    const reports = [
        {
            reportId: "REP-001",
            reportName: "Capital Adequacy Ratio",
            regulator: "RBI",
            reportingPeriod: "Oct-2026",
            frequency: "Monthly",
            owner: "Finance",
            reviewer: "Risk Review",
            dueDate: "2026-11-15",
            status: "In Review",
            workflow: ["Completed", "Completed", "Current", "Pending", "Pending"]
        },
        {
            reportId: "REP-002",
            reportName: "Liquidity Coverage Ratio",
            regulator: "RBI",
            reportingPeriod: "Oct-2026",
            frequency: "Monthly",
            owner: "Treasury",
            reviewer: "Liquidity Review",
            dueDate: "2026-11-18",
            status: "Approved",
            workflow: ["Completed", "Completed", "Completed", "Current", "Pending"]
        },
        {
            reportId: "REP-003",
            reportName: "Operational Risk RWA",
            regulator: "EBA",
            reportingPeriod: "Q3-2026",
            frequency: "Quarterly",
            owner: "Risk",
            reviewer: "Enterprise Risk",
            dueDate: "2026-11-20",
            status: "Draft",
            workflow: ["Current", "Pending", "Pending", "Pending", "Pending"]
        },
        {
            reportId: "REP-004",
            reportName: "Leverage Ratio Report",
            regulator: "PRA",
            reportingPeriod: "Q3-2026",
            frequency: "Quarterly",
            owner: "Finance",
            reviewer: "Capital Review",
            dueDate: "2026-11-10",
            status: "Overdue",
            workflow: ["Completed", "Completed", "Current", "Pending", "Pending"]
        },
        {
            reportId: "REP-005",
            reportName: "COREP Submission",
            regulator: "EBA",
            reportingPeriod: "Q3-2026",
            frequency: "Quarterly",
            owner: "Compliance",
            reviewer: "Regulatory Control",
            dueDate: "2026-11-25",
            status: "Submitted",
            workflow: ["Completed", "Completed", "Completed", "Completed", "Completed"]
        },
        {
            reportId: "REP-006",
            reportName: "Net Stable Funding Ratio",
            regulator: "RBI",
            reportingPeriod: "Nov-2026",
            frequency: "Monthly",
            owner: "Treasury",
            reviewer: "Liquidity Review",
            dueDate: "2026-12-03",
            status: "Draft",
            workflow: ["Current", "Pending", "Pending", "Pending", "Pending"]
        },
        {
            reportId: "REP-007",
            reportName: "Credit Risk RWA",
            regulator: "ECB",
            reportingPeriod: "Q3-2026",
            frequency: "Quarterly",
            owner: "Risk",
            reviewer: "Credit Risk Review",
            dueDate: "2026-11-15",
            status: "Approved",
            workflow: ["Completed", "Completed", "Completed", "Current", "Pending"]
        },
        {
            reportId: "REP-008",
            reportName: "FINREP Submission",
            regulator: "EBA",
            reportingPeriod: "Q3-2026",
            frequency: "Quarterly",
            owner: "Finance",
            reviewer: "Finance Control",
            dueDate: "2026-11-15",
            status: "Draft",
            workflow: ["Current", "Pending", "Pending", "Pending", "Pending"]
        }
    ];

    let shownMonth = new Date(2026, 10, 1);
    let filters = {
        search: "",
        regulator: "",
        owner: "",
        period: "",
        status: "",
        from: "",
        to: ""
    };

    function byId(id) {
        return root.querySelector("#" + id);
    }

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

    function parseDate(value) {
        return new Date(value + "T00:00:00");
    }

    function diffDays(first, second) {
        return Math.round((second - first) / 86400000);
    }

    function dateText(value) {
        return parseDate(value)
            .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
            .replace(/ /g, "-");
    }

    function getDeadline(report) {
        if (report.status === "Submitted") {
            return { text: "Completed", className: "safe" };
        }

        const remainingDays = diffDays(scenarioToday, parseDate(report.dueDate));
        if (remainingDays < 0) {
            const daysOverdue = Math.abs(remainingDays);
            return {
                text: daysOverdue + " day" + (daysOverdue === 1 ? "" : "s") + " overdue",
                className: "critical"
            };
        }

        if (remainingDays === 0) {
            return { text: "Due today", className: "critical" };
        }

        if (remainingDays === 1) {
            return { text: "Due tomorrow", className: "warning" };
        }

        return {
            text: "Due in " + remainingDays + " days",
            className: remainingDays <= 3 ? "warning" : "safe"
        };
    }

    function getFilteredReports() {
        return reports.filter(function (report) {
            const query = filters.search;
            const matchesSearch = !query ||
                (report.reportId + " " + report.reportName).toLowerCase().includes(query);

            return matchesSearch &&
                (!filters.regulator || report.regulator === filters.regulator) &&
                (!filters.owner || report.owner === filters.owner) &&
                (!filters.period || report.reportingPeriod === filters.period) &&
                (!filters.status || report.status === filters.status) &&
                (!filters.from || report.dueDate >= filters.from) &&
                (!filters.to || report.dueDate <= filters.to);
        });
    }

    function getStatusClass(status) {
        return status.toLowerCase().replace(/ /g, "-");
    }

    function renderKpis() {
        const weekEnd = new Date(scenarioToday);
        weekEnd.setDate(weekEnd.getDate() + 7);

        byId("upcomingCount").textContent = reports.filter(function (report) {
            return report.status !== "Submitted" &&
                parseDate(report.dueDate) >= scenarioToday;
        }).length;
        byId("weekCount").textContent = reports.filter(function (report) {
            const dueDate = parseDate(report.dueDate);
            return report.status !== "Submitted" &&
                dueDate >= scenarioToday &&
                dueDate < weekEnd;
        }).length;
        byId("submittedCount").textContent = reports.filter(function (report) {
            return report.status === "Submitted";
        }).length;
        byId("overdueCount").textContent = reports.filter(function (report) {
            return report.status === "Overdue" ||
                (report.status !== "Submitted" && parseDate(report.dueDate) < scenarioToday);
        }).length;
    }

    function renderTable() {
        const data = getFilteredReports();
        byId("listSummary").textContent =
            data.length + " obligation" + (data.length === 1 ? "" : "s") + " shown";
        byId("reportTableBody").innerHTML = data.map(function (report) {
            const deadline = getDeadline(report);
            return `<tr>
                <td>${escapeHTML(report.reportId)}</td>
                <td>${escapeHTML(report.reportName)}</td>
                <td>${escapeHTML(report.regulator)}</td>
                <td>${escapeHTML(report.reportingPeriod)}</td>
                <td>${dateText(report.dueDate)}</td>
                <td><span class="deadline ${deadline.className}">${deadline.text}</span></td>
                <td>${escapeHTML(report.owner)}</td>
                <td><span class="status ${getStatusClass(report.status)}">${escapeHTML(report.status)}</span></td>
                <td><button class="view-btn" type="button" data-id="${escapeHTML(report.reportId)}">View</button></td>
            </tr>`;
        }).join("");
    }

    function renderCalendar() {
        const year = shownMonth.getFullYear();
        const month = shownMonth.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const data = getFilteredReports();

        byId("monthTitle").textContent = shownMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });

        let markup = "";
        for (let index = 0; index < firstWeekday; index++) {
            markup += '<div class="day outside"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const isoDate = year + "-" +
                String(month + 1).padStart(2, "0") + "-" +
                String(day).padStart(2, "0");
            const dayReports = data.filter(function (report) {
                return report.dueDate === isoDate;
            });
            const isToday = isoDate === "2026-11-12";

            markup += `<div class="day ${isToday ? "today" : ""}" data-date="${isoDate}">
                <div class="day-head">
                    <span class="day-number">${day}</span>
                    ${dayReports.length ? `<span class="event-count">${dayReports.length} due</span>` : ""}
                </div>
                ${dayReports.slice(0, 2).map(function (report) {
                    return `<button type="button" class="event ${getStatusClass(report.status)}"
                        data-report="${escapeHTML(report.reportId)}">
                        ● ${escapeHTML(report.reportId)} ${escapeHTML(report.reportName)}
                    </button>`;
                }).join("")}
                ${dayReports.length > 2
                    ? `<button type="button" class="more-events" data-date="${isoDate}">+${dayReports.length - 2} more</button>`
                    : ""}
            </div>`;
        }

        byId("calendarGrid").innerHTML = markup;
    }

    function openDay(date) {
        const dayReports = getFilteredReports().filter(function (report) {
            return report.dueDate === date;
        });

        byId("dayModalTitle").textContent = dateText(date);
        byId("dayModalSummary").textContent =
            dayReports.length + " report" + (dayReports.length === 1 ? "" : "s") + " due";
        byId("dayEvents").innerHTML = dayReports.map(function (report) {
            return `<button type="button" class="day-event" data-id="${escapeHTML(report.reportId)}">
                <strong>${escapeHTML(report.reportName)}</strong>
                <span>${escapeHTML(report.reportId)} · ${escapeHTML(report.owner)} · ${escapeHTML(report.status)}</span>
            </button>`;
        }).join("");
        byId("dayModal").classList.add("show");
    }

    function openReport(id) {
        const report = reports.find(function (item) {
            return item.reportId === id;
        });

        if (!report) {
            return;
        }

        byId("reportName").textContent = report.reportName;
        byId("reportId").textContent = report.reportId;
        byId("reportRegulator").textContent = report.regulator;
        byId("reportPeriod").textContent = report.reportingPeriod;
        byId("reportFrequency").textContent = report.frequency;
        byId("reportOwner").textContent = report.owner;
        byId("reportReviewer").textContent = report.reviewer;
        byId("reportDue").textContent = dateText(report.dueDate);
        byId("reportStatus").textContent = report.status;
        byId("reportDeadline").textContent = getDeadline(report).text;

        const steps = ["Data Preparation", "Validation", "Review", "Approval", "Submission"];
        byId("workflowSteps").innerHTML = steps.map(function (label, index) {
            const stepStatus = report.workflow[index];
            return `<div class="workflow-step ${stepStatus.toLowerCase()}">
                ${label}<br><small>${escapeHTML(stepStatus)}</small>
            </div>`;
        }).join("");
        byId("reportModal").classList.add("show");
    }

    function renderAlerts() {
        const alerts = reports
            .filter(function (report) {
                return report.status !== "Submitted";
            })
            .map(function (report) {
                return {
                    report: report,
                    daysRemaining: diffDays(scenarioToday, parseDate(report.dueDate))
                };
            })
            .filter(function (item) {
                return item.daysRemaining <= 3;
            })
            .sort(function (first, second) {
                return first.daysRemaining - second.daysRemaining;
            });

        byId("notificationList").innerHTML = alerts.length
            ? alerts.map(function (item) {
                const deadline = getDeadline(item.report);
                return `<div class="notification-item ${item.daysRemaining < 0 ? "critical" : ""}">
                    <strong>${escapeHTML(item.report.reportId)}</strong>
                    ${escapeHTML(item.report.reportName)} · ${escapeHTML(deadline.text)}
                </div>`;
            }).join("")
            : '<div class="notification-item">No immediate deadline alerts.</div>';
    }

    function populatePeriods() {
        const periodFilter = byId("periodFilter");
        Array.from(new Set(reports.map(function (report) {
            return report.reportingPeriod;
        }))).forEach(function (period) {
            const option = document.createElement("option");
            option.textContent = period;
            periodFilter.appendChild(option);
        });
    }

    function setView(view) {
        root.querySelectorAll(".view-toggle button").forEach(function (button) {
            button.classList.toggle("active", button.dataset.view === view);
        });
        byId("monthView").classList.toggle("hidden", view !== "month");
        byId("listView").classList.toggle("hidden", view !== "list");
        if (view === "list") {
            renderTable();
        } else {
            renderCalendar();
        }
    }

    function closeOverlay(id) {
        byId(id).classList.remove("show");
    }

    function applyFilters() {
        const from = byId("fromDate").value;
        const to = byId("toDate").value;
        if (from && to && from > to) {
            window.alert("From date cannot be later than To date.");
            return;
        }

        filters = {
            search: byId("searchFilter").value.trim().toLowerCase(),
            regulator: byId("regulatorFilter").value,
            owner: byId("ownerFilter").value,
            period: byId("periodFilter").value,
            status: byId("statusFilter").value,
            from: from,
            to: to
        };
        closeOverlay("filterOverlay");
        renderCalendar();
        renderTable();
    }

    function resetFilters() {
        [
            "searchFilter",
            "regulatorFilter",
            "ownerFilter",
            "periodFilter",
            "statusFilter",
            "fromDate",
            "toDate"
        ].forEach(function (id) {
            byId(id).value = "";
        });
        filters = {
            search: "",
            regulator: "",
            owner: "",
            period: "",
            status: "",
            from: "",
            to: ""
        };
        closeOverlay("filterOverlay");
        renderCalendar();
        renderTable();
    }

    populatePeriods();
    renderKpis();
    renderCalendar();
    renderTable();
    renderAlerts();

    root.querySelectorAll(".view-toggle button").forEach(function (button) {
        button.addEventListener("click", function () {
            setView(button.dataset.view);
        });
    });

    byId("prevMonth").addEventListener("click", function () {
        shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1);
        renderCalendar();
    });
    byId("nextMonth").addEventListener("click", function () {
        shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1);
        renderCalendar();
    });
    byId("todayBtn").addEventListener("click", function () {
        shownMonth = new Date(scenarioToday.getFullYear(), scenarioToday.getMonth(), 1);
        renderCalendar();
    });

    byId("openFilterBtn").addEventListener("click", function () {
        byId("filterOverlay").classList.add("show");
    });
    byId("closeFilterBtn").addEventListener("click", function () {
        closeOverlay("filterOverlay");
    });
    byId("applyFilters").addEventListener("click", applyFilters);
    byId("resetFilters").addEventListener("click", resetFilters);
    byId("filterOverlay").addEventListener("click", function (event) {
        if (event.target === byId("filterOverlay")) {
            closeOverlay("filterOverlay");
        }
    });

    byId("calendarGrid").addEventListener("click", function (event) {
        const reportButton = event.target.closest("[data-report]");
        if (reportButton) {
            event.stopPropagation();
            openReport(reportButton.dataset.report);
            return;
        }

        const moreButton = event.target.closest(".more-events");
        if (moreButton) {
            event.stopPropagation();
            openDay(moreButton.dataset.date);
            return;
        }

        const day = event.target.closest(".day[data-date]");
        if (day && getFilteredReports().some(function (report) {
            return report.dueDate === day.dataset.date;
        })) {
            openDay(day.dataset.date);
        }
    });

    byId("reportTableBody").addEventListener("click", function (event) {
        const button = event.target.closest(".view-btn");
        if (button) {
            openReport(button.dataset.id);
        }
    });

    byId("dayEvents").addEventListener("click", function (event) {
        const button = event.target.closest(".day-event");
        if (button) {
            closeOverlay("dayModal");
            openReport(button.dataset.id);
        }
    });

    ["closeDayModal", "closeDayBottom"].forEach(function (id) {
        byId(id).addEventListener("click", function () {
            closeOverlay("dayModal");
        });
    });
    ["closeReportModal", "closeReportBottom"].forEach(function (id) {
        byId(id).addEventListener("click", function () {
            closeOverlay("reportModal");
        });
    });

    root.querySelectorAll(".modal-overlay").forEach(function (overlay) {
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                overlay.classList.remove("show");
            }
        });
    });

    byId("closeNotification").addEventListener("click", function () {
        closeOverlay("notificationOverlay");
    });
    byId("notificationOverlay").addEventListener("click", function (event) {
        if (event.target === byId("notificationOverlay")) {
            closeOverlay("notificationOverlay");
        }
    });

    byId("openDeadlineAlerts").addEventListener("click", function () {
        byId("notificationOverlay").classList.add("show");
    });
};
