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

    const requestStorageKey = "baseltrack-report-requests";
    const notificationStorageKey = "baseltrack-report-request-notifications";
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

    function loadTemplateCatalog() {
        const catalog = typeof window.getReportTemplateCatalog === "function"
            ? window.getReportTemplateCatalog()
            : readStorage("baseltrack-report-templates", []);
        return Array.isArray(catalog) ? catalog : [];
    }

    function loadActiveTemplates() {
        return loadTemplateCatalog().filter(function (template) {
            return template && template.status === "Active";
        }).map(function (template) {
            return {
                ...template,
                frequency: template.frequency || "Ad-hoc"
            };
        });
    }

    function toISODate(date) {
        return date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0");
    }

    function getVisualSampleRequests() {
        const templates = loadActiveTemplates();
        if (!templates.length) {
            return [];
        }

        const today = getToday();
        const periodStart = toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
        const periodEnd = toISODate(new Date(today.getFullYear(), today.getMonth(), 0));
        return [
            { dueOffset: 10, status: "Draft", priority: "High" },
            { dueOffset: 3, status: "Draft", priority: "Medium" },
            { dueOffset: -3, status: "Draft", priority: "Critical" },
            { dueOffset: -1, status: "Submitted", priority: "Low" }
        ].map(function (sample, index) {
            const template = templates[index % templates.length];
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + sample.dueOffset);
            const sequence = String(index + 1).padStart(3, "0");
            return {
                id: "visual-sample-" + sequence,
                reportId: "DEMO-" + sequence,
                templateId: String(template.id),
                templateSnapshot: {
                    id: template.id,
                    code: template.code,
                    title: template.name,
                    description: template.description || "",
                    frequency: template.frequency || "Ad-hoc",
                    version: template.version || "",
                    template: template.template || ""
                },
                reportingPeriodStart: periodStart,
                reportingPeriodEnd: periodEnd,
                dueDate: toISODate(dueDate),
                priority: sample.priority,
                status: sample.status,
                source: "sample"
            };
        });
    }

    function getVisibleRequests() {
        const isAdmin = role === "regulatoryAdmin";
        const savedRequests = loadReportRequests().filter(function (item) {
            return item && typeof item === "object";
        });
        const sampleRequests = savedRequests.length ? [] : getVisualSampleRequests();
        const sampleNotice = root.querySelector("#samplePreviewNotice");
        if (sampleNotice) {
            sampleNotice.hidden = sampleRequests.length === 0;
        }

        return (sampleRequests.length ? sampleRequests : savedRequests).filter(function (item) {
            return item.source === "sample" || isAdmin || item.status === "Submitted";
        }).map(function (item) {
            const snapshot = item.templateSnapshot || {
                id: item.templateId || "",
                code: item.templateCode || "",
                title: item.templateTitle || "",
                frequency: item.reportingFrequency || "Ad-hoc"
            };
            return {
                ...item,
                reportId: item.reportId || "RREQ-" + String(item.id || "0").slice(-6),
                reportName: snapshot.title || item.templateTitle || item.reportName || "Report Request",
                templateId: item.templateId || snapshot.id || "",
                templateCode: snapshot.code || item.templateCode || "",
                frequency: snapshot.frequency || item.reportingFrequency || "Ad-hoc",
                reportingPeriod: formatReportingPeriod(item.reportingPeriodStart, item.reportingPeriodEnd),
                dueDate: item.dueDate || item.reportingPeriodEnd || "",
                priority: item.priority || "Medium",
                status: item.status || "Draft",
                source: item.source === "sample" ? "sample" : "request",
                templateSnapshot: snapshot
            };
        });
    }

    function getAllReports() {
        return getVisibleRequests().map(function (report) {
            const storedStatus = getStoredStatus(report);
            const normalizedReport = { ...report, storedStatus: storedStatus };
            const dueDate = parseDate(report.dueDate);
            const status = storedStatus === "Submitted"
                ? "Submitted"
                : (!Number.isNaN(dueDate.getTime()) && dueDate < getToday() ? "Overdue" : "Draft");
            return { ...normalizedReport, status: status };
        });
    }

    let shownMonth = new Date(getToday().getFullYear(), getToday().getMonth(), 1);
    let filters = {
        search: "",
        templateId: "",
        period: "",
        status: "",
        priority: "",
        from: "",
        to: ""
    };
    let sortState = { key: "dueDate", ascending: true };

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

    function isValidISODate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
            return false;
        }
        const date = parseDate(value);
        const [year, month, day] = value.split("-").map(Number);
        return !Number.isNaN(date.getTime()) &&
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;
    }

    function getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }

    function getTodayISO() {
        const today = getToday();
        return today.getFullYear() + "-" +
            String(today.getMonth() + 1).padStart(2, "0") + "-" +
            String(today.getDate()).padStart(2, "0");
    }

    function getStoredStatus(report) {
        return report.storedStatus === "Submitted" || report.status === "Submitted"
            ? "Submitted"
            : "Draft";
    }

    function diffDays(first, second) {
        return Math.round((second - first) / 86400000);
    }

    function dateText(value) {
        const date = parseDate(value);
        if (Number.isNaN(date.getTime())) {
            return "-";
        }
        return date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
            .replace(/ /g, "-");
    }

    function formatReportingPeriod(start, end) {
        return isValidISODate(start) && isValidISODate(end)
            ? dateText(start) + " to " + dateText(end)
            : "N/A";
    }

    function getDeadline(report) {
        if (report.status === "Submitted") {
            return { text: "Completed", className: "safe" };
        }

        const dueDate = parseDate(report.dueDate);
        if (Number.isNaN(dueDate.getTime())) {
            return { text: "Due date unavailable", className: "warning" };
        }

        const remainingDays = diffDays(getToday(), dueDate);
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
                (!filters.templateId || getTemplateFilterValue(report) === filters.templateId) &&
                (!filters.period || report.reportingPeriod === filters.period) &&
                (!filters.status || report.status === filters.status) &&
                (!filters.priority || report.priority === filters.priority) &&
                (!filters.from || report.dueDate >= filters.from) &&
                (!filters.to || report.dueDate <= filters.to);
        });
    }

    function getStatusClass(status) {
        return status.toLowerCase().replace(/ /g, "-");
    }

    function getPriorityClass(priority) {
        return ["Low", "Medium", "High", "Critical"].includes(priority)
            ? priority.toLowerCase()
            : "medium";
    }

    function renderKpis() {
        const today = getToday();
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7 - today.getDay());
        const allReports = getAllReports();
        const unsubmitted = allReports.filter(function (report) {
            return report.storedStatus === "Draft";
        });

        byId("upcomingCount").textContent = unsubmitted.filter(function (report) {
            return parseDate(report.dueDate) >= weekEnd;
        }).length;
        byId("weekCount").textContent = unsubmitted.filter(function (report) {
            const dueDate = parseDate(report.dueDate);
            return dueDate >= today &&
                dueDate < weekEnd;
        }).length;
        byId("submittedCount").textContent = allReports.filter(function (report) {
            return report.status === "Submitted";
        }).length;
        byId("overdueCount").textContent = allReports.filter(function (report) {
            return report.status === "Overdue";
        }).length;
    }

    function renderTable() {
        const data = getFilteredReports().sort(function (first, second) {
            const firstValue = String(sortState.key === "reportingPeriod"
                ? first.reportingPeriodStart || ""
                : first[sortState.key] || "");
            const secondValue = String(sortState.key === "reportingPeriod"
                ? second.reportingPeriodStart || ""
                : second[sortState.key] || "");
            const comparison = firstValue.localeCompare(secondValue, undefined, { numeric: true });
            return sortState.ascending ? comparison : -comparison;
        });
        byId("listSummary").textContent =
            data.length + " report request" + (data.length === 1 ? "" : "s") + " shown";
        byId("reportTableBody").innerHTML = data.length ? data.map(function (report) {
            return `<tr>
                <td>${escapeHTML(report.reportId)}</td>
                <td>${escapeHTML(report.reportName)}</td>
                <td>${escapeHTML(report.templateCode || "-")}</td>
                <td>${escapeHTML(report.reportingPeriod)}</td>
                <td>${escapeHTML(report.frequency)}</td>
                <td>${dateText(report.dueDate)}</td>
                <td><span class="priority ${getPriorityClass(report.priority)}">${escapeHTML(report.priority)}</span></td>
                <td><span class="status ${getStatusClass(report.status)}">${escapeHTML(report.status)}</span></td>
                <td><div class="action-buttons">
                    <button class="view-btn" type="button" data-action="view" data-id="${escapeHTML(report.reportId)}">View</button>
                    ${canUpdateRequests && report.source === "request" && report.storedStatus === "Draft"
                        ? `<button class="edit-btn" type="button" data-action="edit-request" data-request-id="${escapeHTML(report.id)}">Edit</button>`
                        : ""}
                </div></td>
            </tr>`;
        }).join("") : '<tr><td class="empty-row" colspan="9">No report requests match the current filters.</td></tr>';
        root.querySelectorAll("th[data-sort]").forEach(function (heading) {
            heading.setAttribute("aria-sort", heading.dataset.sort === sortState.key
                ? (sortState.ascending ? "ascending" : "descending")
                : "none");
        });
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
            const isToday = isoDate === getTodayISO();

            markup += `<div class="day ${isToday ? "today" : ""}" data-date="${isoDate}">
                <div class="day-head">
                    <span class="day-number">${day}</span>
                    ${dayReports.length ? `<span class="event-count">${dayReports.length} due</span>` : ""}
                </div>
                ${dayReports.slice(0, 2).map(function (report) {
                    const eventLabel = (report.templateCode ? report.templateCode + " · " : "") +
                        report.reportName + " · " + report.status;
                    return `<button type="button" class="event ${getStatusClass(report.status)}"
                        data-report="${escapeHTML(report.reportId)}" title="${escapeHTML(eventLabel)}"
                        aria-label="${escapeHTML(eventLabel)}">
                        ● ${escapeHTML(report.templateCode || report.reportId)} ${escapeHTML(report.reportName)}
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
                <span>${escapeHTML(report.templateCode || report.reportId)} · ${escapeHTML(report.frequency)}</span>
                <span class="status ${getStatusClass(report.status)}">${escapeHTML(report.status)}</span>
            </button>`;
        }).join("");
        byId("dayModal").classList.add("show");
    }

    function openReport(id) {
        const report = getAllReports().find(function (item) {
            return item.reportId === id;
        });

        if (!report || !["request", "sample"].includes(report.source)) {
            return;
        }

        byId("reportName").textContent = report.reportName;
        byId("reportId").textContent = report.reportId;
        const values = [
            ["Template Code", report.templateCode || "-"],
            ["Reporting Frequency", report.frequency || "-"],
            ["Reporting Period Start", report.reportingPeriodStart ? dateText(report.reportingPeriodStart) : "-"],
            ["Reporting Period End", report.reportingPeriodEnd ? dateText(report.reportingPeriodEnd) : "-"],
            ["Due Date", dateText(report.dueDate)],
            ["Priority", report.priority || "Medium"]
        ];
        byId("reportMeta").innerHTML = values.map(function (entry) {
            return `<div><span>${escapeHTML(entry[0])}</span><strong>${escapeHTML(entry[1])}</strong></div>`;
        }).join("") + `<div><span>Current Status</span><strong><span class="status ${getStatusClass(report.status)}">${escapeHTML(report.status)}</span></strong></div>` +
            (report.submittedAt
                ? `<div><span>Submitted</span><strong>${escapeHTML(new Date(report.submittedAt).toLocaleString())}</strong></div>`
                : "");

        const snapshot = report.templateSnapshot || {};
        const snapshotValues = [
            ["Original Template Code", snapshot.code || report.templateCode || "-"],
            ["Original Template Title", snapshot.title || report.reportName || "-"],
            ["Default Frequency", snapshot.frequency || report.frequency || "-"],
            ["Template Version", snapshot.version || "-"],
            ["Description", snapshot.description || "-"]
        ];
        byId("templateSnapshotMeta").innerHTML = snapshotValues.map(function (entry) {
            return `<div><span>${escapeHTML(entry[0])}</span><strong>${escapeHTML(entry[1])}</strong></div>`;
        }).join("");
        byId("templateSnapshotContent").textContent =
            snapshot.template || "No template content snapshot is available for this legacy request.";
        byId("submitReportBtn").hidden = !canUpdateRequests ||
            report.source !== "request" || report.storedStatus !== "Draft";
        byId("submitReportBtn").dataset.id = String(report.id);
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
                    daysRemaining: diffDays(getToday(), parseDate(report.dueDate))
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
        const selectedPeriod = periodFilter.value;
        const periods = Array.from(new Set(getAllReports().map(function (report) {
            return report.reportingPeriod;
        }).filter(function (period) {
            return period && period !== "N/A";
        })));
        periodFilter.innerHTML = '<option value="">All Periods</option>';
        periods.forEach(function (period) {
            const option = document.createElement("option");
            option.textContent = period;
            option.value = period;
            periodFilter.appendChild(option);
        });
        periodFilter.value = selectedPeriod;
    }

    function getTemplateFilterValue(report) {
        return String(report.templateId || report.templateSnapshot?.id || report.templateCode || "");
    }

    function populateTemplatesFilter() {
        const templateFilter = byId("templateFilter");
        const selectedTemplate = templateFilter.value;
        const options = new Map();
        getAllReports().forEach(function (report) {
            const id = getTemplateFilterValue(report);
            if (id && !options.has(id)) {
                options.set(id, (report.templateCode ? report.templateCode + " · " : "") + report.reportName);
            }
        });

        templateFilter.innerHTML = '<option value="">All Templates</option>';
        options.forEach(function (label, id) {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = label;
            templateFilter.appendChild(option);
        });
        templateFilter.value = selectedTemplate;
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
            templateId: byId("templateFilter").value,
            period: byId("periodFilter").value,
            status: byId("statusFilter").value,
            priority: byId("priorityFilter").value,
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
            "templateFilter",
            "periodFilter",
            "statusFilter",
            "priorityFilter",
            "fromDate",
            "toDate"
        ].forEach(function (id) {
            byId(id).value = "";
        });
        filters = {
            search: "",
            templateId: "",
            period: "",
            status: "",
            priority: "",
            from: "",
            to: ""
        };
        byId("filterError").hidden = true;
        byId("filterError").textContent = "";
        updateStatusFilterStyle();
        closeOverlay("filterOverlay");
        renderCalendar();
        renderTable();
    }

    function updateStatusFilterStyle() {
        const statusFilter = byId("statusFilter");
        ["draft", "submitted", "overdue"].forEach(function (status) {
            statusFilter.classList.toggle("status-" + status, statusFilter.value.toLowerCase() === status);
        });
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

        ["requestPeriodStart", "requestPeriodEnd", "requestDueDate",
            "requestTemplateCode", "requestTemplateTitle", "requestFrequency"].forEach(function (id) {
                byId(id).value = "";
            });
        byId("requestPriority").value = "Medium";
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
            byId("requestFrequency").value = snapshot.frequency || request.reportingFrequency || "Ad-hoc";
            byId("requestPeriodStart").value = request.reportingPeriodStart || "";
            byId("requestPeriodEnd").value = request.reportingPeriodEnd || "";
            byId("requestDueDate").value = request.dueDate || "";
            byId("requestPriority").value = request.priority || "Medium";
            byId("requestFormTitle").textContent = "Edit Report Request";
            modal.dataset.requestId = String(request.id);
        } else {
            byId("requestFormTitle").textContent = "Create Report Request";
        }

        modal.classList.add("show");
        templateSelect.focus();
    }

    function saveRequest(event) {
        event.preventDefault();
        const modal = byId("requestModal");
        const templateId = byId("reportTemplateSelect").value;
        const dueDate = byId("requestDueDate").value;
        const periodStart = byId("requestPeriodStart").value;
        const periodEnd = byId("requestPeriodEnd").value;
        const status = event.submitter && event.submitter.dataset.status === "Submitted"
            ? "Submitted"
            : "Draft";
        const reportName = byId("requestTemplateTitle").value.trim();
        if (!templateId || !reportName || !periodStart || !periodEnd || !dueDate) {
            showRequestError("Select a template and enter the reporting period start, end, and due date.");
            return;
        }
        if (![periodStart, periodEnd, dueDate].every(isValidISODate)) {
            showRequestError("Enter valid reporting period and due dates.");
            return;
        }
        if (periodStart > periodEnd) {
            showRequestError("Reporting Period Start cannot be later than Reporting Period End.");
            return;
        }
        if (dueDate < periodEnd) {
            showRequestError("Due Date cannot be before Reporting Period End.");
            return;
        }

        const templates = loadActiveTemplates();
        const selectedTemplate = templates.find(function (item) {
            return String(item.id) === String(templateId);
        });
        const requests = loadReportRequests();
        const previous = requests.find(function (item) {
            return item && typeof item === "object" &&
                String(item.id) === String(modal.dataset.requestId || "");
        });
        const previousTemplateId = previous &&
            String(previous.templateId || previous.templateSnapshot?.id || "");
        const keepsHistoricalTemplate = previous && previousTemplateId === String(templateId);
        if (!selectedTemplate && !keepsHistoricalTemplate) {
            showRequestError("Select an active report template.");
            return;
        }

        const now = new Date().toISOString();
        const templateSnapshot = keepsHistoricalTemplate
            ? {
                ...(previous.templateSnapshot || {}),
                id: previous.templateSnapshot?.id || templateId,
                code: previous.templateSnapshot?.code || previous.templateCode || byId("requestTemplateCode").value.trim(),
                title: previous.templateSnapshot?.title || previous.templateTitle || reportName,
                description: previous.templateSnapshot?.description || previous.description || "",
                frequency: previous.templateSnapshot?.frequency || previous.reportingFrequency ||
                    byId("requestFrequency").value || "Ad-hoc",
                version: previous.templateSnapshot?.version || "",
                template: previous.templateSnapshot?.template || ""
            }
            : {
                id: String(selectedTemplate.id),
                code: selectedTemplate.code,
                title: selectedTemplate.name,
                description: selectedTemplate.description || "",
                frequency: selectedTemplate.frequency || "Ad-hoc",
                version: selectedTemplate.version || "",
                template: selectedTemplate.template || ""
            };
        let requestId = modal.dataset.requestId || String(Date.now());
        let reportId = previous?.reportId || "RREQ-" + requestId.slice(-6);
        while (!modal.dataset.requestId && requests.some(function (item) {
            if (!item || typeof item !== "object") {
                return false;
            }
            const existingReportId = item.reportId || "RREQ-" + String(item.id || "0").slice(-6);
            return String(item.id) === requestId || existingReportId === reportId;
        })) {
            requestId = String(Number(requestId) + 1);
            reportId = "RREQ-" + requestId.slice(-6);
        }
        const request = {
            ...(previous || {}),
            id: requestId,
            reportId: reportId,
            templateId: String(templateSnapshot.id || templateId),
            templateSnapshot: templateSnapshot,
            reportingPeriodStart: periodStart,
            reportingPeriodEnd: periodEnd,
            dueDate: dueDate,
            priority: byId("requestPriority").value,
            status: status,
            createdAt: previous?.createdAt || now,
            modifiedAt: now,
            submittedAt: status === "Submitted"
                ? (previous?.status === "Submitted" && previous.submittedAt ? previous.submittedAt : now)
                : null
        };
        const nextRequests = previous
            ? requests.map(function (item) {
                return item && String(item.id) === String(requestId) ? request : item;
            })
            : requests.concat([request]);

        if (!writeStorage(requestStorageKey, nextRequests)) {
            showRequestError("Unable to save this report request in this browser.");
            return;
        }

        if (status === "Submitted" && (!previous || previous.status !== "Submitted")) {
            const notifications = readStorage(notificationStorageKey, []);
            if (Array.isArray(notifications)) {
                notifications.push({
                    id: "notification-" + Date.now(),
                    requestId: requestId,
                    reportName: templateSnapshot.title,
                    dueDate: dueDate,
                    createdAt: now
                });
                if (!writeStorage(notificationStorageKey, notifications)) {
                    window.showToast("Request submitted, but its notification could not be saved.");
                }
            } else {
                console.error("Unable to save report submission notification: stored data is not a list.");
                window.showToast("Request submitted, but its notification could not be saved.");
            }
        }

        closeOverlay("requestModal");
        refreshCalendarData();
        if (typeof window.showToast === "function") {
            window.showToast(status === "Submitted" ? "Report request submitted." : "Draft report request saved.");
        }
    }

    function submitReportRequest(id) {
        if (!canUpdateRequests) {
            return;
        }
        const requests = loadReportRequests();
        const existing = requests.find(function (item) {
            return item && String(item.id) === String(id);
        });
        if (!existing || getStoredStatus(existing) === "Submitted") {
            return;
        }

        const now = new Date().toISOString();
        const submitted = {
            ...existing,
            status: "Submitted",
            modifiedAt: now,
            submittedAt: now
        };
        const nextRequests = requests.map(function (item) {
            return item === existing ? submitted : item;
        });
        if (!writeStorage(requestStorageKey, nextRequests)) {
            window.showToast("Unable to submit this report request in this browser.");
            return;
        }

        const notifications = readStorage(notificationStorageKey, []);
        if (Array.isArray(notifications)) {
            notifications.push({
                id: "notification-" + Date.now(),
                requestId: existing.id,
                reportName: existing.templateSnapshot?.title || existing.templateTitle || existing.reportName || "Report Request",
                dueDate: existing.dueDate || "",
                createdAt: now
            });
            if (!writeStorage(notificationStorageKey, notifications)) {
                window.showToast("Report submitted, but its notification could not be saved.");
            }
        } else {
            console.error("Unable to save report submission notification: stored data is not a list.");
            window.showToast("Report submitted, but its notification could not be saved.");
        }

        closeOverlay("reportModal");
        refreshCalendarData();
        if (typeof window.showToast === "function") {
            window.showToast("Report submitted.");
        }
    }

    function refreshCalendarData() {
        populatePeriods();
        populateTemplatesFilter();
        renderKpis();
        renderCalendar();
        renderTable();
        renderAlerts();
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
                        <p>Request details are taken from the selected report template.</p>
                    </div>
                    <button id="closeRequestModal" type="button" aria-label="Close dialog">✕</button>
                </div>
                <div class="request-form-sections">
                    <section class="request-form-section">
                        <h3>Template</h3>
                        <div class="request-form-grid">
                            <label class="required-field">Report Template <span class="required-marker" aria-hidden="true">*</span><select id="reportTemplateSelect" required></select></label>
                            <label>Template Code<input id="requestTemplateCode" type="text" readonly></label>
                            <label>Report Title<input id="requestTemplateTitle" type="text" readonly></label>
                            <label>Reporting Frequency<input id="requestFrequency" type="text" readonly></label>
                        </div>
                    </section>
                    <section class="request-form-section">
                        <h3>Reporting Schedule</h3>
                        <div class="request-form-grid">
                            <label class="required-field">Reporting Period Start <span class="required-marker" aria-hidden="true">*</span><input id="requestPeriodStart" type="date" required></label>
                            <label class="required-field">Reporting Period End <span class="required-marker" aria-hidden="true">*</span><input id="requestPeriodEnd" type="date" required></label>
                            <label class="required-field">Due Date <span class="required-marker" aria-hidden="true">*</span><input id="requestDueDate" type="date" required></label>
                            <label>Priority<select id="requestPriority"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></label>
                        </div>
                    </section>
                </div>
                <p class="form-error" id="requestFormError" role="alert" hidden></p>
                <div class="modal-actions">
                    <button class="secondary" id="cancelRequest" type="button">Cancel</button>
                    <button class="secondary" type="submit" data-status="Draft">Save Draft</button>
                    <button class="primary" type="submit" data-status="Submitted">Submit Request</button>
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
            byId("requestFrequency").value = selected ? selected.frequency || "Ad-hoc" : "";
        });
        byId("reportTableBody").addEventListener("click", function (event) {
            const button = event.target.closest("[data-action='edit-request']");
            if (!button) {
                return;
            }
            const request = loadReportRequests().find(function (item) {
                return item && String(item.id) === button.dataset.requestId;
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
    populateTemplatesFilter();
    ensureRequestControls();
    byId("statusFilter").addEventListener("change", updateStatusFilterStyle);
    updateStatusFilterStyle();
    renderKpis();
    renderCalendar();
    renderTable();
    renderAlerts();

    root.querySelectorAll(".view-toggle button").forEach(function (button) {
        button.addEventListener("click", function () {
            setView(button.dataset.view);
        });
    });

    byId("reportTableBody").closest("table").querySelector("thead").addEventListener("click", function (event) {
        const heading = event.target.closest("th[data-sort]");
        if (!heading) {
            return;
        }
        sortState = {
            key: heading.dataset.sort,
            ascending: sortState.key === heading.dataset.sort ? !sortState.ascending : true
        };
        renderTable();
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
        const today = getToday();
        shownMonth = new Date(today.getFullYear(), today.getMonth(), 1);
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

    byId("submitReportBtn").addEventListener("click", function (event) {
        submitReportRequest(event.currentTarget.dataset.id);
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
