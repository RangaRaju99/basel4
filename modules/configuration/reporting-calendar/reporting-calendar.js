window.initReportingCalendarModule = function () {
    const root = document.getElementById("reportingCalendarApp");

    if (!root || root.dataset.initialized === "true") {
        return;
    }

    const role = typeof window.getCurrentRole === "function"
        ? window.getCurrentRole()
        : "";
    const canCreateRequests = typeof window.canCreate !== "function" ||
        window.canCreate(role, "reporting-calendar");
    const canUpdateRequests = typeof window.canUpdate !== "function" ||
        window.canUpdate(role, "reporting-calendar");

    if (typeof window.canRead === "function" &&
        !window.canRead(role, "reporting-calendar")) {
        root.innerHTML = "<p role=\"alert\">You do not have permission to view the Reporting Calendar.</p>";
        return;
    }

    root.dataset.initialized = "true";

    const scenarioToday = new Date();
    scenarioToday.setHours(0, 0, 0, 0);
    const requestStorageKey = "baseltrack-report-requests";
    const notificationStorageKey = "baseltrack-report-request-notifications";
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

    const baseTemplateKey = "baseltrack-report-templates";
    const fallbackTemplates = [
        {
            id: 1,
            code: "B4C_001",
            name: "Capital Adequacy Ratio Template",
            description: "Minimum capital adequacy reporting template used for Basel IV regulatory submissions.",
            version: "v1.4",
            template: "Capital Adequacy Ratio\n\nReporting Period: {{reporting_period}}\nRegulator: {{regulator}}\n\n1. CET1 Capital: {{cet1}}\n2. Tier 1 Capital: {{tier1}}\n3. Total Capital: {{total_capital}}\n4. RWA: {{rwa}}\n\nCapital Adequacy Ratio: {{car_percent}}%",
            status: "Active"
        },
        {
            id: 2,
            code: "B4C_002",
            name: "Liquidity Coverage Ratio Template",
            description: "Liquidity coverage template for short-term liquid asset adequacy reporting.",
            version: "v1.2",
            template: "Liquidity Coverage Ratio\n\nReporting Period: {{reporting_period}}\nHigh Quality Liquid Assets: {{hqla}}\nNet Cash Outflows: {{net_cash_outflows}}\n\nLCR: {{lcr_percent}}%",
            status: "Active"
        },
        {
            id: 4,
            code: "B4C_004",
            name: "Leverage Ratio Template",
            description: "Template for leverage ratio monitoring and submission to regulators.",
            version: "v2.0",
            template: "Leverage Ratio\n\nTier 1 Capital: {{tier1_capital}}\nExposure Measure: {{exposure_measure}}\nLeverage Ratio: {{leverage_ratio}}%",
            status: "Active"
        }
    ];
    const todayISO = scenarioToday.getFullYear() + "-" +
        String(scenarioToday.getMonth() + 1).padStart(2, "0") + "-" +
        String(scenarioToday.getDate()).padStart(2, "0");

    function readStorage(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch (error) {
            console.error("Unable to read reporting calendar data:", error);
            return fallback;
        }
    }

    function writeStorage(key, payload) {
        try {
            localStorage.setItem(key, JSON.stringify(payload));
            return true;
        } catch (error) {
            console.error("Unable to save calendar records:", error);
            return false;
        }
    }

    function loadReportRequests() {
        const stored = readStorage(requestStorageKey, []);
        return Array.isArray(stored) ? stored : [];
    }

    function loadActiveTemplates() {
        const stored = readStorage(baseTemplateKey, null);
        const source = Array.isArray(stored) ? stored : fallbackTemplates;
        return source.filter(function (template) {
            return template && template.status === "Active";
        });
    }

    function getVisibleRequests() {
        const isAdmin = role === "regulatoryAdmin";
        return loadReportRequests().filter(function (item) {
            return isAdmin || item.status === "Submitted";
        }).map(function (item) {
            return {
                ...item,
                reportId: item.reportId || "RREQ-" + String(item.id || "0").slice(-6),
                reportName: item.reportName || "Report Request",
                regulator: item.regulator || "RBI",
                reportingPeriod: item.reportingPeriod || "N/A",
                frequency: item.reportingFrequency || "Ad-hoc",
                owner: item.owner || "Regulatory Admin",
                reviewer: item.reviewer || "Regulatory Team",
                dueDate: item.dueDate || item.reportingPeriodEnd || "2026-11-30",
                status: item.status || "Draft",
                workflow: item.workflow || ["Current", "Pending", "Pending", "Pending", "Pending"],
                source: "request",
                templateSnapshot: item.templateSnapshot || {
                    id: item.templateId || "",
                    code: item.templateCode || "",
                    title: item.templateTitle || ""
                }
            };
        });
    }

    function getAllReports() {
        return reports.concat(getVisibleRequests());
    }

    let shownMonth = new Date(scenarioToday.getFullYear(), scenarioToday.getMonth(), 1);
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
        return getAllReports().filter(function (report) {
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
        const allReports = getAllReports();

        byId("upcomingCount").textContent = allReports.filter(function (report) {
            return report.status !== "Submitted" &&
                parseDate(report.dueDate) >= scenarioToday;
        }).length;
        byId("weekCount").textContent = allReports.filter(function (report) {
            const dueDate = parseDate(report.dueDate);
            return report.status !== "Submitted" &&
                dueDate >= scenarioToday &&
                dueDate < weekEnd;
        }).length;
        byId("submittedCount").textContent = allReports.filter(function (report) {
            return report.status === "Submitted";
        }).length;
        byId("overdueCount").textContent = allReports.filter(function (report) {
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
                <td><div class="action-buttons">
                    <button class="view-btn" type="button" data-action="view" data-id="${escapeHTML(report.reportId)}">View</button>
                    ${canUpdateRequests && report.source === "request" && report.status === "Draft"
                        ? `<button class="edit-btn" type="button" data-action="edit-request" data-id="${escapeHTML(report.reportId)}">Edit</button>`
                        : ""}
                </div></td>
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
            const isToday = isoDate === todayISO;

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
        const report = getAllReports().find(function (item) {
            return item.reportId === id;
        });

        if (!report) {
            return;
        }

        const extraMeta = byId("requestExtraMeta");
        if (extraMeta) {
            const rows = report.source === "request" ? [
                ["Template Code", report.templateSnapshot?.code || "-"],
                ["Template Title", report.templateSnapshot?.title || "-"],
                ["Template Version", report.templateSnapshot?.version || "-"],
                ["Template Description", report.templateSnapshot?.description || report.description || "-"],
                ["Priority", report.priority || "Medium"],
                ["Reporting Period Start", report.reportingPeriodStart || "-"],
                ["Reporting Period End", report.reportingPeriodEnd || "-"],
                ["Regulatory Reference", report.regulatoryReference || "-"],
                ["Instructions", report.instructions || "-"],
                ["Created By", report.createdBy || "-"],
                ["Created Date", report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "-"],
                ["Last Modified By", report.modifiedBy || "-"],
                ["Last Modified Date", report.modifiedAt ? new Date(report.modifiedAt).toLocaleDateString() : "-"],
                ["Submission Date", report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : "-"]
            ] : [];
            extraMeta.innerHTML = rows.map(function (entry) {
                return `<div><span>${escapeHTML(entry[0])}</span><strong>${escapeHTML(entry[1])}</strong></div>`;
            }).join("");
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
            const stepStatus = report.workflow[index] || "Pending";
            return `<div class="workflow-step ${stepStatus.toLowerCase()}">
                ${label}<br><small>${escapeHTML(stepStatus)}</small>
            </div>`;
        }).join("");
        byId("reportModal").classList.add("show");
    }

    function renderAlerts() {
        const alerts = getAllReports()
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
        Array.from(new Set(getAllReports().map(function (report) {
            return report.reportingPeriod;
        }))).forEach(function (period) {
            const option = document.createElement("option");
            option.textContent = period;
            option.value = period;
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
        const filterError = byId("filterError");
        filterError.hidden = true;
        if (from && to && from > to) {
            filterError.textContent = "From date cannot be later than To date.";
            filterError.hidden = false;
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
        byId("filterError").hidden = true;
        byId("filterError").textContent = "";
        closeOverlay("filterOverlay");
        renderCalendar();
        renderTable();
    }

    function showRequestError(message) {
        const error = byId("requestFormError");
        error.textContent = message;
        error.hidden = false;
    }

    function openRequestForm(request) {
        const modal = byId("requestModal");
        const templateSelect = byId("reportTemplateSelect");
        const templates = loadActiveTemplates();
        templateSelect.innerHTML = '<option value="">Select an active template</option>' +
            templates.map(function (template) {
                return `<option value="${escapeHTML(template.id)}">${escapeHTML(template.code)} - ${escapeHTML(template.name)}</option>`;
            }).join("");
        templateSelect.disabled = false;
        const error = byId("requestFormError");
        error.textContent = "";
        error.hidden = true;

        ["requestName", "requestDescription", "requestReportingPeriod", "requestPeriodStart",
            "requestPeriodEnd", "requestDueDate", "requestReference", "requestInstructions",
            "requestTemplateCode", "requestTemplateTitle"].forEach(function (id) {
                byId(id).value = "";
            });
        byId("requestFrequency").value = "Monthly";
        byId("requestPriority").value = "Medium";
        byId("requestStatus").value = "Draft";
        delete modal.dataset.requestId;

        if (request) {
            const snapshot = request.templateSnapshot || {
                id: request.templateId,
                code: request.templateCode,
                title: request.templateTitle
            };
            const currentTemplate = templates.find(function (item) {
                return String(item.id) === String(request.templateId || snapshot.id);
            });
            if (currentTemplate) {
                templateSelect.value = String(currentTemplate.id);
            } else if (snapshot.id) {
                const historicalOption = document.createElement("option");
                historicalOption.value = String(snapshot.id);
                historicalOption.textContent = (snapshot.code || "") + " - " + (snapshot.title || "Historical template");
                historicalOption.disabled = true;
                templateSelect.appendChild(historicalOption);
                templateSelect.value = historicalOption.value;
            }
            byId("requestTemplateCode").value = snapshot.code || request.templateCode || "";
            byId("requestTemplateTitle").value = snapshot.title || request.templateTitle || "";
            byId("requestName").value = request.reportName || "";
            byId("requestDescription").value = request.description || "";
            byId("requestReportingPeriod").value = request.reportingPeriod || "";
            byId("requestFrequency").value = request.reportingFrequency || "Monthly";
            byId("requestPeriodStart").value = request.reportingPeriodStart || "";
            byId("requestPeriodEnd").value = request.reportingPeriodEnd || "";
            byId("requestDueDate").value = request.dueDate || "";
            byId("requestPriority").value = request.priority || "Medium";
            byId("requestReference").value = request.regulatoryReference || "";
            byId("requestInstructions").value = request.instructions || "";
            byId("requestStatus").value = request.status || "Draft";
            byId("requestFormTitle").textContent = "Edit Report Request";
            byId("saveRequestBtn").textContent = "Save Changes";
            modal.dataset.requestId = String(request.id);
        } else {
            byId("requestFormTitle").textContent = "Create Report Request";
            byId("saveRequestBtn").textContent = "Save Request";
        }

        modal.classList.add("show");
        byId("requestName").focus();
    }

    function saveRequest(event) {
        event.preventDefault();
        const modal = byId("requestModal");
        const select = byId("reportTemplateSelect");
        const templateId = select.value;
        const reportName = byId("requestName").value.trim();
        const dueDate = byId("requestDueDate").value;
        const periodStart = byId("requestPeriodStart").value;
        const periodEnd = byId("requestPeriodEnd").value;
        if (!reportName || !templateId || !dueDate) {
            showRequestError("Report Name, an active Report Template and Due Date are required.");
            return;
        }
        if (periodStart && periodEnd && periodStart > periodEnd) {
            showRequestError("Reporting Period Start cannot be later than Reporting Period End.");
            return;
        }

        const templates = loadActiveTemplates();
        const selectedTemplate = templates.find(function (item) {
            return String(item.id) === String(templateId);
        });
        const previous = loadReportRequests().find(function (item) {
            return String(item.id) === String(modal.dataset.requestId || "");
        });
        const requestId = modal.dataset.requestId || String(Date.now());
        const status = byId("requestStatus").value;
        const now = new Date().toISOString();
        const keepSnapshot = previous &&
            String(previous.templateId) === String(templateId) &&
            previous.templateSnapshot;
        const templateSnapshot = keepSnapshot ? previous.templateSnapshot : {
            id: templateId,
            code: byId("requestTemplateCode").value.trim(),
            title: byId("requestTemplateTitle").value.trim(),
            description: selectedTemplate ? selectedTemplate.description || "" : "",
            version: selectedTemplate ? selectedTemplate.version || "" : "",
            template: selectedTemplate ? selectedTemplate.template || "" : ""
        };
        const request = {
            id: requestId,
            reportId: "RREQ-" + String(requestId).slice(-6),
            reportName: reportName,
            description: byId("requestDescription").value.trim(),
            templateId: templateId,
            templateCode: byId("requestTemplateCode").value.trim(),
            templateTitle: byId("requestTemplateTitle").value.trim(),
            templateSnapshot: templateSnapshot,
            regulator: previous?.regulator || "RBI",
            reportingPeriod: byId("requestReportingPeriod").value.trim() || "N/A",
            reportingFrequency: byId("requestFrequency").value,
            reportingPeriodStart: periodStart,
            reportingPeriodEnd: periodEnd,
            dueDate: dueDate,
            priority: byId("requestPriority").value,
            regulatoryReference: byId("requestReference").value.trim(),
            instructions: byId("requestInstructions").value.trim(),
            status: status,
            owner: previous?.owner || "Regulatory Admin",
            reviewer: previous?.reviewer || "Regulatory Team",
            workflow: status === "Submitted"
                ? ["Completed", "Completed", "Completed", "Completed", "Completed"]
                : (previous?.workflow || ["Current", "Pending", "Pending", "Pending", "Pending"]),
            createdBy: previous?.createdBy || "Regulatory Admin",
            createdAt: previous?.createdAt || now,
            modifiedBy: "Regulatory Admin",
            modifiedAt: now,
            submittedAt: status === "Submitted" ? (previous?.submittedAt || now) : null
        };
        const requests = loadReportRequests();
        const nextRequests = previous
            ? requests.map(function (item) {
                return String(item.id) === String(requestId) ? request : item;
            })
            : requests.concat([request]);

        if (!writeStorage(requestStorageKey, nextRequests)) {
            showRequestError("Unable to save this report request in this browser.");
            return;
        }

        if (status === "Submitted" && (!previous || previous.status !== "Submitted")) {
            const notifications = readStorage(notificationStorageKey, []);
            notifications.push({
                id: "notification-" + Date.now(),
                requestId: requestId,
                reportName: reportName,
                dueDate: dueDate,
                createdAt: now
            });
            if (!writeStorage(notificationStorageKey, notifications)) {
                window.showToast("Request submitted, but its notification could not be saved.");
            }
        }

        closeOverlay("requestModal");
        renderKpis();
        renderCalendar();
        renderTable();
        renderAlerts();
        if (typeof window.showToast === "function") {
            window.showToast(status === "Submitted" ? "Report request submitted." : "Draft report request saved.");
        }
    }

    function ensureRequestControls() {
        const actionBar = root.querySelector(".page-actions");
        if (canCreateRequests && actionBar && !byId("addReportRequestBtn")) {
            const addButton = document.createElement("button");
            addButton.id = "addReportRequestBtn";
            addButton.type = "button";
            addButton.className = "primary";
            addButton.textContent = "+ Add Report Request";
            addButton.addEventListener("click", function () {
                openRequestForm(null);
            });
            actionBar.appendChild(addButton);
        }

        if (byId("requestModal")) {
            return;
        }

        const modal = document.createElement("div");
        modal.id = "requestModal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
            <form class="modal request-form" id="requestForm" role="dialog" aria-modal="true" aria-labelledby="requestFormTitle" novalidate>
                <div class="report-head">
                    <div class="report-mark">R</div>
                    <div>
                        <span class="eyebrow">REPORT REQUEST</span>
                        <h2 id="requestFormTitle">Create Report Request</h2>
                        <p>Create or update a regulatory reporting obligation.</p>
                    </div>
                    <button id="closeRequestModal" type="button" aria-label="Close dialog">✕</button>
                </div>
                <div class="request-form-grid">
                    <label class="required-field">Report Name <span class="required-marker" aria-hidden="true">*</span><input id="requestName" type="text" maxlength="120" required></label>
                    <label class="required-field">Report Template <span class="required-marker" aria-hidden="true">*</span><select id="reportTemplateSelect" required></select></label>
                    <label>Template Code<input id="requestTemplateCode" type="text" readonly></label>
                    <label>Template Title<input id="requestTemplateTitle" type="text" readonly></label>
                    <label>Description<textarea id="requestDescription" rows="3"></textarea></label>
                    <label>Reporting Period<input id="requestReportingPeriod" type="text" placeholder="e.g. Q4-2026"></label>
                    <label>Reporting Frequency<select id="requestFrequency"><option>Daily</option><option>Weekly</option><option selected>Monthly</option><option>Quarterly</option><option>Half-Yearly</option><option>Annual</option><option>Ad-hoc</option></select></label>
                    <label>Reporting Period Start<input id="requestPeriodStart" type="date"></label>
                    <label>Reporting Period End<input id="requestPeriodEnd" type="date"></label>
                    <label class="required-field">Due Date <span class="required-marker" aria-hidden="true">*</span><input id="requestDueDate" type="date" required></label>
                    <label>Priority<select id="requestPriority"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></label>
                    <label>Regulatory Reference<input id="requestReference" type="text" maxlength="120"></label>
                    <label class="full">Instructions<textarea id="requestInstructions" rows="3"></textarea></label>
                    <label>Status<select id="requestStatus"><option value="Draft">Draft</option><option value="Submitted">Submitted</option></select></label>
                </div>
                <p class="form-error" id="requestFormError" role="alert" hidden></p>
                <div class="modal-actions">
                    <button class="secondary" id="cancelRequest" type="button">Cancel</button>
                    <button class="primary" id="saveRequestBtn" type="submit">Save Request</button>
                </div>
            </form>
        `;
        root.appendChild(modal);
        byId("requestForm").addEventListener("submit", saveRequest);
        byId("closeRequestModal").addEventListener("click", function () {
            closeOverlay("requestModal");
        });
        byId("cancelRequest").addEventListener("click", function () {
            closeOverlay("requestModal");
        });
        byId("reportTemplateSelect").addEventListener("change", function (event) {
            const selectedId = event.target.value;
            const selected = loadActiveTemplates().find(function (item) {
                return String(item.id) === String(selectedId);
            });
            byId("requestTemplateCode").value = selected ? selected.code : "";
            byId("requestTemplateTitle").value = selected ? selected.name : "";
        });
        byId("reportTableBody").addEventListener("click", function (event) {
            const button = event.target.closest("[data-action='edit-request']");
            if (!button) {
                return;
            }
            const request = loadReportRequests().find(function (item) {
                return "RREQ-" + String(item.id || "0").slice(-6) === button.dataset.id;
            });
            if (request) {
                openRequestForm(request);
            }
        });
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeOverlay("requestModal");
            }
        });
    }

    populatePeriods();
    ensureRequestControls();
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

    const notificationButton = document.getElementById("notificationToggle");
    if (notificationButton) {
        const wasHidden = notificationButton.hidden;
        let observer;
        notificationButton.hidden = false;

        const removeNotificationHook = function () {
            notificationButton.removeEventListener("click", openDeadlineAlerts, true);
            notificationButton.hidden = wasHidden;
            if (observer) {
                observer.disconnect();
            }
        };

        const openDeadlineAlerts = function (event) {
            if (!root.isConnected) {
                removeNotificationHook();
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            byId("notificationOverlay").classList.toggle("show");
        };
        notificationButton.addEventListener("click", openDeadlineAlerts, true);

        const moduleView = document.getElementById("moduleView");
        if (moduleView && typeof MutationObserver === "function") {
            observer = new MutationObserver(function () {
                if (!root.isConnected) {
                    removeNotificationHook();
                }
            });
            observer.observe(moduleView, { childList: true });
        }
    }
};
