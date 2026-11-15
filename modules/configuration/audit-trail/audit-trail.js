(function () {
  "use strict";

  /* Audit logs are read-only. Other modules (or the backend) can write entries
       to this storage key using the same shape as DEFAULT_LOGS below. */
  const STORAGE_KEY = "baseltrack-audit-trail-v1";
  const PERMISSION_KEY = "audit-trail";
  const MODULES = [
    "User Management",
    "Role Management",
    "Query Management",
    "Data Ingestion",
    "Report Management",
    "System Configuration",
  ];
  const ACTIONS = ["Create", "Update", "Delete", "Close", "Upload"];
  const DEFAULT_LOGS = [
    {
      id: "LOG-001",
      module: "User Management",
      processedBy: "System Admin",
      action: "Create",
      description: "User created successfully",
      updatedTime: "12-Nov-2026 09:20 AM",
      timestamp: new Date(2026, 10, 12, 9, 20).getTime(),
      previousValue: "No existing user record",
      newValue: "New user account created successfully",
    },
    {
      id: "LOG-002",
      module: "System Configuration",
      processedBy: "System Admin",
      action: "Update",
      description: "Session timeout updated successfully",
      updatedTime: "12-Nov-2026 01:00 PM",
      timestamp: new Date(2026, 10, 12, 13, 0).getTime(),
      previousValue: "Session timeout: 15 minutes",
      newValue: "Session timeout: 30 minutes",
    },
    {
      id: "LOG-003",
      module: "Role Management",
      processedBy: "Compliance Manager",
      action: "Update",
      description: "Role permission updated successfully",
      updatedTime: "12-Nov-2026 10:00 AM",
      timestamp: new Date(2026, 10, 12, 10, 0).getTime(),
      previousValue: "Report Approval: No Access",
      newValue: "Report Approval: View and Approve",
    },
    {
      id: "LOG-004",
      module: "Query Management",
      processedBy: "Senior Manager",
      action: "Close",
      description: "Query closed successfully",
      updatedTime: "12-Nov-2026 11:15 AM",
      timestamp: new Date(2026, 10, 12, 11, 15).getTime(),
      previousValue: "Query Status: Open",
      newValue: "Query Status: Closed",
    },
    {
      id: "LOG-005",
      module: "Data Ingestion",
      processedBy: "Data Steward",
      action: "Upload",
      description: "File uploaded successfully",
      updatedTime: "12-Nov-2026 12:00 PM",
      timestamp: new Date(2026, 10, 12, 12, 0).getTime(),
      previousValue: "No file uploaded",
      newValue: "Regulatory data file uploaded successfully",
    },
  ];
  const COLUMNS = [
    ["module", "Module"],
    ["processedBy", "Processed By"],
    ["action", "Action"],
    ["description", "Description"],
    ["updatedTime", "Updated Time"],
  ];
  const DEFAULT_COLUMNS = {
    module: true,
    processedBy: true,
    action: true,
    description: true,
    updatedTime: true,
  };
  const state = {
    logs: [],
    filters: { search: "", module: "", action: "" },
    visibleColumns: Object.assign({}, DEFAULT_COLUMNS),
    sortBy: "updatedTime",
    sortAscending: false,
  };
  let app;
  let pagination;
  let escapeBound = false;

  function $(id) {
    return app.querySelector("#" + id);
  }

  function escapeHTML(value) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      function (char) {
        return entities[char];
      },
    );
  }

  function toast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }
    const element = document.getElementById("toast");
    if (!element) {
      console.log("BaselTrack:", message);
      return;
    }
    element.textContent = message;
    element.classList.add("show");
    window.setTimeout(function () {
      element.classList.remove("show");
    }, 2500);
  }

  /* ---------- Permissions (read-only, same pattern as Manage Users) ---------- */

  function currentRoleKey() {
    return typeof window.getCurrentRole === "function"
      ? window.getCurrentRole()
      : localStorage.getItem("baseltrack-role") || "";
  }

  function canReadLogs() {
    const role = currentRoleKey();
    return (
      role === "superadmin" &&
      (typeof window.canRead !== "function" ||
        window.canRead(role, PERMISSION_KEY))
    );
  }

  /* ---------- Data ---------- */

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return (
      String(date.getDate()).padStart(2, "0") +
      "-" +
      months[date.getMonth()] +
      "-" +
      date.getFullYear() +
      " " +
      String(hours % 12 || 12).padStart(2, "0") +
      ":" +
      minutes +
      " " +
      (hours >= 12 ? "PM" : "AM")
    );
  }

  function cloneDefaults() {
    return DEFAULT_LOGS.map(function (item) {
      return Object.assign({}, item);
    });
  }

  function loadLogs() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved)) {
        return saved
          .filter(function (item) {
            return item && item.id && item.module && item.action;
          })
          .map(function (item) {
            const timestamp =
              Number(item.timestamp) || Date.parse(item.updatedTime) || 0;
            return {
              id: String(item.id),
              module: String(item.module),
              processedBy: String(item.processedBy || "—"),
              action: String(item.action),
              description: String(item.description || ""),
              updatedTime: String(item.updatedTime || formatTime(timestamp)),
              timestamp: timestamp,
              previousValue: String(item.previousValue || "—"),
              newValue: String(item.newValue || "—"),
            };
          });
      }
    } catch (error) {
      console.warn("Audit Trail: unable to read saved logs", error);
    }
    return cloneDefaults();
  }

  function unique(list, key, fixed) {
    const values = fixed.slice();
    list.forEach(function (item) {
      if (values.indexOf(item[key]) === -1) values.push(item[key]);
    });
    return values.sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function options(values, allLabel) {
    return (
      `<option value="">${allLabel}</option>` +
      values
        .map(function (value) {
          return `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`;
        })
        .join("")
    );
  }

  /* ---------- Markup ---------- */

  function markup() {
    return `
            <section class="content-card">
                <div class="page-header">
                    <div><h1>Audit Trail</h1><p>Monitor and review activities performed across the BaselTrack application.</p></div>
                    <div class="header-actions">
                        <button type="button" id="atOpenFilterBtn" class="filter-btn">Filter</button>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            ${COLUMNS.map(function (column, index) {
                              return `<th class="sortable" data-column="${index}" data-field="${column[0]}">${column[1]} <span>▲▼</span></th>`;
                            }).join("")}
                            <th class="actions-head">Actions</th>
                        </tr></thead>
                        <tbody id="atTableBody"></tbody>
                    </table>
                    <div id="atEmptyState" class="empty-state">No audit logs match the current filters.</div>
                </div>
                <div id="atPagination"></div>
            </section>

            <div id="atFilterOverlay" class="filter-overlay">
                <section class="filter-panel" role="dialog" aria-modal="true" aria-labelledby="atFilterTitle">
                    <div class="panel-head"><div><h2 id="atFilterTitle">Filter Audit Logs</h2><p>Filter by module, action or keyword, and choose visible columns.</p></div><button type="button" id="atCloseFilterBtn" aria-label="Close filter">✕</button></div>
                    <label>Search<input id="atSearchKeyword" placeholder="Log ID, module, user, action or description"></label>
                    <label>Module<select id="atModuleFilter">${options(unique(state.logs, "module", MODULES), "All Modules")}</select></label>
                    <label>Action<select id="atActionFilter">${options(unique(state.logs, "action", ACTIONS), "All Actions")}</select></label>
                    <div class="column-filter"><span class="filter-label">Column Visibility</span><div class="column-options">${COLUMNS.map(
                      function (column, index) {
                        return `<label><input type="checkbox" class="column-toggle" data-column="${index}" checked><span>${column[1]}</span></label>`;
                      },
                    ).join("")}</div></div>
                    <div class="filter-actions"><button type="button" id="atResetFilterBtn" class="secondary">Reset</button><button type="button" id="atApplyFilterBtn" class="primary">Apply</button></div>
                </section>
            </div>

            <div id="atViewModal" class="modal-overlay">
                <section class="modal profile-card" role="dialog" aria-modal="true" aria-labelledby="atViewTitle">
                    <div class="profile-title"><h2 id="atViewTitle">Audit Details</h2></div>
                    <div class="profile-hero">
                        <div id="atViewInitials" class="large-avatar" aria-hidden="true"></div>
                        <div>
                            <h3 id="atViewModule"></h3>
                            <p><span>Processed By</span><strong id="atViewProcessedBy"></strong></p>
                            <p><span>Updated Time</span><strong id="atViewTime"></strong></p>
                        </div>
                    </div>
                    <div class="profile-details">
                        <div><span>Action</span><strong id="atViewAction" class="action-pill"></strong></div>
                        <div><span>Log ID</span><strong id="atViewId"></strong></div>
                        <div class="full"><span>Description</span><strong id="atViewDescription"></strong></div>
                        <div class="full"><span>Previous Value</span><div id="atViewPrevious" class="value-box"></div></div>
                        <div class="full"><span>New Value</span><div id="atViewNew" class="value-box new-value"></div></div>
                    </div>
                    <div class="view-footer"><button type="button" id="atCloseViewBtn" class="primary close-profile-btn">Close</button></div>
                </section>
            </div>`;
  }

  /* ---------- Rendering ---------- */

  function sortValue(log, field) {
    return field === "updatedTime"
      ? log.timestamp
      : String(log[field] || "").toLowerCase();
  }

  function getFiltered() {
    const term = state.filters.search.toLowerCase();
    return state.logs
      .filter(function (log) {
        return (
          (!state.filters.module || log.module === state.filters.module) &&
          (!state.filters.action || log.action === state.filters.action) &&
          (!term ||
            [log.id, log.module, log.processedBy, log.action, log.description]
              .join(" ")
              .toLowerCase()
              .includes(term))
        );
      })
      .sort(function (a, b) {
        const first = sortValue(a, state.sortBy);
        const second = sortValue(b, state.sortBy);
        const result =
          typeof first === "number"
            ? first - second
            : String(first).localeCompare(String(second), undefined, {
                numeric: true,
                sensitivity: "base",
              });
        return state.sortAscending ? result : -result;
      });
  }

  function initials(value) {
    return String(value || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0);
      })
      .join("")
      .toUpperCase();
  }

  function render() {
    const filtered = getFiltered();
    const rows = pagination.paginate(filtered);
    $("atTableBody").innerHTML = rows
      .map(function (log) {
        return `<tr>
                <td data-column="0">${escapeHTML(log.module)}</td>
                <td data-column="1">${escapeHTML(log.processedBy)}</td>
                <td data-column="2"><span class="action-pill">${escapeHTML(log.action)}</span></td>
                <td data-column="3" class="description-cell">${escapeHTML(log.description)}</td>
                <td data-column="4" class="time-cell">${escapeHTML(log.updatedTime)}</td>
                <td><div class="action-buttons">
                    <button type="button" class="view-btn" data-action="view" data-id="${escapeHTML(log.id)}">View</button>
                </div></td>
            </tr>`;
      })
      .join("");
    $("atEmptyState").style.display = filtered.length ? "none" : "block";
    COLUMNS.forEach(function (column, index) {
      const visible = state.visibleColumns[column[0]];
      app
        .querySelectorAll(
          `th[data-column="${index}"],td[data-column="${index}"]`,
        )
        .forEach(function (cell) {
          cell.style.display = visible ? "" : "none";
        });
    });
  }

  function setModal(id, open) {
    $(id).classList.toggle("show", open);
  }

  function viewLog(id) {
    const log = state.logs.find(function (item) {
      return item.id === id;
    });
    if (!log) {
      toast("Audit log not found.");
      return;
    }
    $("atViewInitials").textContent = initials(log.module);
    $("atViewModule").textContent = log.module;
    $("atViewProcessedBy").textContent = log.processedBy;
    $("atViewTime").textContent = log.updatedTime;
    $("atViewAction").textContent = log.action;
    $("atViewId").textContent = log.id;
    $("atViewDescription").textContent = log.description || "—";
    $("atViewPrevious").textContent = log.previousValue;
    $("atViewNew").textContent = log.newValue;
    setModal("atViewModal", true);
  }

  /* ---------- Events ---------- */

  function applyFilters() {
    state.filters = {
      search: $("atSearchKeyword").value.trim(),
      module: $("atModuleFilter").value,
      action: $("atActionFilter").value,
    };
    pagination.reset();
    setModal("atFilterOverlay", false);
    render();
  }

  function resetFilters() {
    $("atSearchKeyword").value = "";
    $("atModuleFilter").value = "";
    $("atActionFilter").value = "";
    app.querySelectorAll(".column-toggle").forEach(function (input) {
      input.checked = true;
    });
    state.visibleColumns = Object.assign({}, DEFAULT_COLUMNS);
    state.filters = { search: "", module: "", action: "" };
    state.sortBy = "updatedTime";
    state.sortAscending = false;
    pagination.reset();
    setModal("atFilterOverlay", false);
    render();
  }

  function handleClick(event) {
    const overlay = event.target.closest(".modal-overlay, .filter-overlay");
    if (overlay && event.target === overlay) {
      overlay.classList.remove("show");
      return;
    }
    const sortable = event.target.closest("th.sortable");
    if (sortable && app.contains(sortable)) {
      const field = sortable.dataset.field;
      state.sortAscending =
        state.sortBy === field ? !state.sortAscending : true;
      state.sortBy = field;
      render();
      return;
    }
    const button = event.target.closest("button");
    if (!button || !app.contains(button)) return;
    if (button.dataset.action === "view") viewLog(button.dataset.id);
    if (button.id === "atOpenFilterBtn") {
      $("atSearchKeyword").value = state.filters.search;
      $("atModuleFilter").value = state.filters.module;
      $("atActionFilter").value = state.filters.action;
      app.querySelectorAll(".column-toggle").forEach(function (input) {
        input.checked =
          state.visibleColumns[COLUMNS[Number(input.dataset.column)][0]];
      });
      setModal("atFilterOverlay", true);
    }
    if (button.id === "atCloseFilterBtn") setModal("atFilterOverlay", false);
    if (button.id === "atApplyFilterBtn") applyFilters();
    if (button.id === "atResetFilterBtn") resetFilters();
    if (button.id === "atCloseViewBtn") setModal("atViewModal", false);
  }

  function handleChange(event) {
    if (!event.target.classList.contains("column-toggle")) return;
    state.visibleColumns[COLUMNS[Number(event.target.dataset.column)][0]] =
      event.target.checked;
    render();
  }

  function handleKeydown(event) {
    if (event.target.id === "atSearchKeyword" && event.key === "Enter") {
      event.preventDefault();
      applyFilters();
    }
  }

  function handleEscape(event) {
    if (event.key !== "Escape" || !app || !app.isConnected) return;
    app
      .querySelectorAll(".modal-overlay.show, .filter-overlay.show")
      .forEach(function (overlay) {
        overlay.classList.remove("show");
      });
  }

  function renderAccessDenied() {
    app.innerHTML = `<section class="content-card"><div class="empty-state" style="display:block">
            <strong>Access Restricted</strong><p>Only an authorized administrator can access Audit Trail.</p>
        </div></section>`;
  }

  function initAuditTrailModule() {
    app = document.getElementById("auditTrailApp");
    if (!app || app.dataset.initialized === "true") return;
    app.dataset.initialized = "true";
    if (!canReadLogs()) {
      renderAccessDenied();
      return;
    }
    state.logs = loadLogs();
    state.filters = { search: "", module: "", action: "" };
    state.visibleColumns = Object.assign({}, DEFAULT_COLUMNS);
    state.sortBy = "updatedTime";
    state.sortAscending = false;
    app.innerHTML = markup();
    pagination =
      typeof window.createTablePagination === "function"
        ? window.createTablePagination(
            $("atPagination"),
            render,
            "Audit Trail pagination",
          )
        : {
            paginate: function (list) {
              return list;
            },
            reset: function () {},
          };
    app.addEventListener("click", handleClick);
    app.addEventListener("change", handleChange);
    app.addEventListener("keydown", handleKeydown);
    if (!escapeBound) {
      document.addEventListener("keydown", handleEscape);
      escapeBound = true;
    }
    render();
  }

  window.getAuditTrailData = loadLogs;
  window.initAuditTrailModule = initAuditTrailModule;
})();
