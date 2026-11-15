(function () {
  "use strict";

  const STORAGE_KEY = "baseltrack-system-config-v1";
  const PERMISSION_KEY = "system-configuration";
  const MODULES = [
    "Dashboard",
    "User Access Management",
    "Configuration Management",
    "Query Management",
  ];
  const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &\/().,_-]*$/;
  const NAME_MIN = 3;
  const NAME_MAX = 60;
  const VALUE_MAX = 100;
  const DESCRIPTION_MAX = 300;
  const DEFAULT_CONFIGS = [
    {
      code: "CFG001",
      module: "Dashboard",
      name: "Refresh Interval",
      value: "15 Minutes",
      status: "Active",
      description: "Dashboard data refresh interval.",
    },
    {
      code: "CFG002",
      module: "Dashboard",
      name: "Default Landing Page",
      value: "Overview",
      status: "Active",
      description: "Default page displayed after login.",
    },
    {
      code: "CFG003",
      module: "Dashboard",
      name: "Notification Widget",
      value: "Enabled",
      status: "Active",
      description: "Controls the dashboard notification widget.",
    },
    {
      code: "CFG004",
      module: "Dashboard",
      name: "Recent Activity Limit",
      value: "25",
      status: "Inactive",
      description: "Maximum number of recent activities displayed.",
    },
    {
      code: "CFG005",
      module: "User Access Management",
      name: "Password Expiry",
      value: "90 Days",
      status: "Active",
      description: "Password validity period for user accounts.",
    },
    {
      code: "CFG006",
      module: "User Access Management",
      name: "Max Login Attempts",
      value: "5",
      status: "Active",
      description: "Maximum consecutive unsuccessful login attempts.",
    },
    {
      code: "CFG007",
      module: "User Access Management",
      name: "Session Timeout",
      value: "30 Minutes",
      status: "Active",
      description: "Session inactivity timeout duration.",
    },
    {
      code: "CFG008",
      module: "User Access Management",
      name: "MFA Required",
      value: "Enabled",
      status: "Inactive",
      description: "Controls whether multi-factor authentication is required.",
    },
    {
      code: "CFG009",
      module: "Configuration Management",
      name: "Audit Retention",
      value: "365 Days",
      status: "Active",
      description: "Audit log retention period.",
    },
    {
      code: "CFG010",
      module: "Configuration Management",
      name: "Configuration Approval",
      value: "Mandatory",
      status: "Active",
      description:
        "Requires approval before configuration changes take effect.",
    },
    {
      code: "CFG011",
      module: "Configuration Management",
      name: "Version Tracking",
      value: "Enabled",
      status: "Active",
      description: "Tracks configuration changes and versions.",
    },
  ];
  const COLUMNS = [
    ["code", "Configuration Code"],
    ["name", "Configuration For"],
    ["value", "Configuration Value"],
    ["status", "Status"],
  ];
  const state = {
    configs: [],
    module: MODULES[0],
    status: "all",
    search: "",
    visibleColumns: { code: true, name: true, value: true, status: true },
    sortBy: "code",
    sortAscending: true,
    editingCode: null,
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

  /* ---------- Permissions (same pattern as Manage Users) ---------- */

  function currentRoleKey() {
    return typeof window.getCurrentRole === "function"
      ? window.getCurrentRole()
      : localStorage.getItem("baseltrack-role") || "";
  }

  function canReadConfigs() {
    const role = currentRoleKey();
    return (
      role === "superadmin" &&
      (typeof window.canRead !== "function" ||
        window.canRead(role, PERMISSION_KEY))
    );
  }

  function canCreateConfigs() {
    const role = currentRoleKey();
    return (
      typeof window.canCreate !== "function" ||
      window.canCreate(role, PERMISSION_KEY)
    );
  }

  function canUpdateConfigs() {
    const role = currentRoleKey();
    return (
      typeof window.canUpdate !== "function" ||
      window.canUpdate(role, PERMISSION_KEY)
    );
  }

  /* ---------- Storage ---------- */

  function cloneDefaults() {
    return DEFAULT_CONFIGS.map(function (item) {
      return Object.assign({}, item);
    });
  }

  function loadConfigs() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved)) {
        return saved
          .filter(function (item) {
            return (
              item &&
              typeof item.code === "string" &&
              typeof item.name === "string" &&
              MODULES.indexOf(item.module) !== -1
            );
          })
          .map(function (item) {
            return {
              code: item.code,
              module: item.module,
              name: item.name,
              value: String(item.value == null ? "" : item.value),
              status: item.status === "Inactive" ? "Inactive" : "Active",
              description: String(item.description || ""),
            };
          });
      }
    } catch (error) {
      console.warn(
        "System Configuration: unable to read saved configurations",
        error,
      );
    }
    return cloneDefaults();
  }

  function saveConfigs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.configs));
      return true;
    } catch (error) {
      console.error(
        "System Configuration: unable to save configurations",
        error,
      );
      toast("Unable to save configuration changes.");
      return false;
    }
  }

  /* ---------- Validation ---------- */

  function clean(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function nextCode() {
    const max = state.configs.reduce(function (current, item) {
      const match = String(item.code).match(/(\d+)$/);
      return Math.max(current, match ? Number(match[1]) : 0);
    }, 0);
    return "CFG" + String(max + 1).padStart(3, "0");
  }

  function validate(data, ownCode) {
    if (!data.module || MODULES.indexOf(data.module) === -1) {
      return { field: "scFormModule", message: "Module is required." };
    }
    if (!data.name)
      return { field: "scName", message: "Configuration For is required." };
    if (data.name.length < NAME_MIN) {
      return {
        field: "scName",
        message:
          "Configuration For must be at least " + NAME_MIN + " characters.",
      };
    }
    if (data.name.length > NAME_MAX) {
      return {
        field: "scName",
        message:
          "Configuration For must not exceed " + NAME_MAX + " characters.",
      };
    }
    if (!NAME_PATTERN.test(data.name)) {
      return {
        field: "scName",
        message:
          "Configuration For may contain only letters, numbers, spaces and & / ( ) . , _ -",
      };
    }
    if (
      state.configs.some(function (item) {
        return (
          item.code !== ownCode &&
          item.module === data.module &&
          item.name.toLowerCase() === data.name.toLowerCase()
        );
      })
    ) {
      return {
        field: "scName",
        message:
          "A configuration with this name already exists in the selected module.",
      };
    }
    if (!data.value)
      return { field: "scValue", message: "Configuration Value is required." };
    if (data.value.length > VALUE_MAX) {
      return {
        field: "scValue",
        message:
          "Configuration Value must not exceed " + VALUE_MAX + " characters.",
      };
    }
    if (data.description.length > DESCRIPTION_MAX) {
      return {
        field: "scDescription",
        message:
          "Description must not exceed " + DESCRIPTION_MAX + " characters.",
      };
    }
    return null;
  }

  /* ---------- Markup ---------- */

  function moduleOptions(selected) {
    return MODULES.map(function (name) {
      return `<option value="${escapeHTML(name)}"${name === selected ? " selected" : ""}>${escapeHTML(name)}</option>`;
    }).join("");
  }

  function markup() {
    return `
            <section class="content-card">
                <div class="page-header">
                    <div><h1>System Configuration</h1><p>Manage module-specific configurations and application settings.</p></div>
                    <div class="header-actions">
                        <button type="button" id="scOpenFilterBtn" class="filter-btn">Filter</button>
                        ${canCreateConfigs() ? '<button type="button" id="scOpenAddBtn" class="add-btn">+ Add Configuration</button>' : ""}
                    </div>
                </div>
                <div class="module-selector">
                    <div><span class="field-label">Select Module</span><p>Choose a module to manage its configurations.</p></div>
                    <select id="scModuleSelect" aria-label="Select module">${moduleOptions(state.module)}</select>
                </div>
                <div class="summary-tabs" role="tablist" aria-label="Filter configurations by status">
                    <button type="button" class="summary-tab active" data-status="all">All (<span id="scAllCount">0</span>)</button>
                    <button type="button" class="summary-tab" data-status="Active">Active (<span id="scActiveCount">0</span>)</button>
                    <button type="button" class="summary-tab" data-status="Inactive">Inactive (<span id="scInactiveCount">0</span>)</button>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            ${COLUMNS.map(function (column, index) {
                              return `<th class="sortable" data-column="${index}" data-field="${column[0]}">${column[1]} <span>▲▼</span></th>`;
                            }).join("")}
                            <th class="actions-head">Actions</th>
                        </tr></thead>
                        <tbody id="scTableBody"></tbody>
                    </table>
                    <div id="scEmptyState" class="empty-state">No configurations match the selected module or filters.</div>
                </div>
                <div id="scPagination"></div>
            </section>

            <div id="scFilterOverlay" class="filter-overlay">
                <section class="filter-panel" role="dialog" aria-modal="true" aria-labelledby="scFilterTitle">
                    <div class="panel-head"><div><h2 id="scFilterTitle">Filter Configurations</h2><p>Search configurations and choose visible columns.</p></div><button type="button" id="scCloseFilterBtn" aria-label="Close filter">✕</button></div>
                    <label>Code, Name, Value or Description<input id="scSearchKeyword" placeholder="Search configurations"></label>
                    <div class="column-filter"><span class="filter-label">Column Visibility</span><div class="column-options">${COLUMNS.map(
                      function (column, index) {
                        return `<label><input type="checkbox" class="column-toggle" data-column="${index}" checked><span>${column[1]}</span></label>`;
                      },
                    ).join("")}</div></div>
                    <div class="filter-actions"><button type="button" id="scResetFilterBtn" class="secondary">Reset</button><button type="button" id="scApplyFilterBtn" class="primary">Apply</button></div>
                </section>
            </div>

            <div id="scFormModal" class="modal-overlay">
                <form id="scForm" class="modal edit-layout" novalidate>
                    <div class="modal-title"><h2 id="scFormTitle">Add Configuration</h2></div>
                    <div class="form-grid">
                        <label>Configuration Code<input id="scCode" disabled></label>
                        <label class="required-field">Module<span class="required-marker" aria-hidden="true">*</span><select id="scFormModule" aria-required="true">${moduleOptions(state.module)}</select></label>
                        <label class="required-field">Configuration For<span class="required-marker" aria-hidden="true">*</span><input id="scName" maxlength="${NAME_MAX}" autocomplete="off" placeholder="Enter configuration name" aria-required="true"></label>
                        <label class="required-field">Configuration Value<span class="required-marker" aria-hidden="true">*</span><input id="scValue" maxlength="${VALUE_MAX}" autocomplete="off" placeholder="Enter configuration value" aria-required="true"></label>
                        <label class="full">Description<textarea id="scDescription" rows="3" maxlength="${DESCRIPTION_MAX}" placeholder="Enter configuration description"></textarea></label>
                        <div class="full">
                            <span class="field-label">Status</span>
                            <div class="account-status"><span id="scFormStatusText">Active</span><button id="scFormStatusToggle" class="toggle on" type="button" role="switch" aria-checked="true" aria-label="Toggle configuration status"><i></i></button></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" id="scCancelFormBtn" class="secondary">Cancel</button><button type="submit" id="scSaveBtn" class="primary">Save Configuration</button></div>
                </form>
            </div>

            <div id="scViewModal" class="modal-overlay">
                <section class="modal profile-card" role="dialog" aria-modal="true" aria-labelledby="scViewTitle">
                    <div class="profile-title"><h2 id="scViewTitle">Configuration Profile</h2></div>
                    <div class="profile-hero">
                        <div id="scViewInitials" class="large-avatar" aria-hidden="true"></div>
                        <div>
                            <h3 id="scViewName"></h3>
                            <p><span>Configuration Code</span><strong id="scViewCode"></strong></p>
                            <p><span>Status</span><strong id="scViewStatus" class="status-pill"></strong></p>
                        </div>
                    </div>
                    <div class="profile-details">
                        <div><span>Module</span><strong id="scViewModule"></strong></div>
                        <div><span>Configuration Value</span><strong id="scViewValue"></strong></div>
                        <div class="full"><span>Description</span><strong id="scViewDescription"></strong></div>
                    </div>
                    <div class="view-footer"><button type="button" id="scCloseViewBtn" class="primary close-profile-btn">Close</button></div>
                </section>
            </div>`;
  }

  /* ---------- Rendering ---------- */

  function moduleRecords() {
    return state.configs.filter(function (item) {
      return item.module === state.module;
    });
  }

  function getFiltered() {
    const term = state.search.toLowerCase();
    return moduleRecords()
      .filter(function (item) {
        return (
          (state.status === "all" || item.status === state.status) &&
          (!term ||
            (
              item.code +
              " " +
              item.name +
              " " +
              item.value +
              " " +
              item.description
            )
              .toLowerCase()
              .includes(term))
        );
      })
      .sort(function (a, b) {
        const result = String(a[state.sortBy] || "").localeCompare(
          String(b[state.sortBy] || ""),
          undefined,
          { numeric: true, sensitivity: "base" },
        );
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

  function statusClass(status) {
    return status === "Active" ? "active" : "inactive";
  }

  function render() {
    const records = moduleRecords();
    const filtered = getFiltered();
    const rows = pagination.paginate(filtered);
    const active = records.filter(function (item) {
      return item.status === "Active";
    }).length;
    $("scAllCount").textContent = records.length;
    $("scActiveCount").textContent = active;
    $("scInactiveCount").textContent = records.length - active;
    $("scTableBody").innerHTML = rows
      .map(function (item) {
        return `<tr>
                <td data-column="0">${escapeHTML(item.code)}</td>
                <td data-column="1">${escapeHTML(item.name)}</td>
                <td data-column="2">${escapeHTML(item.value)}</td>
                <td data-column="3"><span class="status-pill ${statusClass(item.status)}">${escapeHTML(item.status)}</span></td>
                <td><div class="action-buttons">
                    <button type="button" class="view-btn" data-action="view" data-code="${escapeHTML(item.code)}">View</button>
                    ${canUpdateConfigs() ? `<button type="button" class="edit-btn" data-action="edit" data-code="${escapeHTML(item.code)}">Edit</button>` : ""}
                </div></td>
            </tr>`;
      })
      .join("");
    $("scEmptyState").style.display = filtered.length ? "none" : "block";
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
    app.querySelectorAll(".summary-tab").forEach(function (tab) {
      tab.classList.toggle("active", tab.dataset.status === state.status);
    });
  }

  function setModal(id, open) {
    $(id).classList.toggle("show", open);
  }

  function setToggle(status) {
    const active = status === "Active";
    const button = $("scFormStatusToggle");
    button.classList.toggle("on", active);
    button.setAttribute("aria-checked", String(active));
    $("scFormStatusText").textContent = status;
  }

  function findConfig(code) {
    return state.configs.find(function (item) {
      return item.code === code;
    });
  }

  /* ---------- View / Add / Edit ---------- */

  function viewConfig(code) {
    const item = findConfig(code);
    if (!item) {
      toast("Configuration not found.");
      return;
    }
    $("scViewInitials").textContent = initials(item.name);
    $("scViewName").textContent = item.name;
    $("scViewCode").textContent = item.code;
    $("scViewStatus").textContent = item.status;
    $("scViewStatus").className = "status-pill " + statusClass(item.status);
    $("scViewModule").textContent = item.module;
    $("scViewValue").textContent = item.value;
    $("scViewDescription").textContent = item.description || "—";
    setModal("scViewModal", true);
  }

  function openForm(mode, code) {
    const isEdit = mode === "edit";
    if (isEdit && !canUpdateConfigs()) {
      toast("You do not have permission to edit configurations.");
      return;
    }
    if (!isEdit && !canCreateConfigs()) {
      toast("You do not have permission to add configurations.");
      return;
    }
    const item = isEdit ? findConfig(code) : null;
    if (isEdit && !item) {
      toast("Configuration not found.");
      return;
    }
    state.editingCode = isEdit ? code : null;
    $("scForm").reset();
    $("scFormTitle").textContent = isEdit
      ? "Edit Configuration"
      : "Add Configuration";
    $("scSaveBtn").textContent = isEdit ? "Save Changes" : "Save Configuration";
    $("scCode").value = isEdit ? item.code : nextCode();
    $("scFormModule").value = isEdit ? item.module : state.module;
    $("scName").value = isEdit ? item.name : "";
    $("scValue").value = isEdit ? item.value : "";
    $("scDescription").value = isEdit ? item.description : "";
    setToggle(isEdit ? item.status : "Active");
    setModal("scFormModal", true);
    $("scName").focus();
  }

  function submitForm(event) {
    event.preventDefault();
    const editing = state.editingCode;
    if (editing ? !canUpdateConfigs() : !canCreateConfigs()) {
      toast(
        "You do not have permission to " +
          (editing ? "edit" : "add") +
          " configurations.",
      );
      return;
    }
    const data = {
      module: $("scFormModule").value,
      name: clean($("scName").value),
      value: clean($("scValue").value),
      description: clean($("scDescription").value),
      status: $("scFormStatusToggle").classList.contains("on")
        ? "Active"
        : "Inactive",
    };
    const problem = validate(data, editing);
    if (problem) {
      toast(problem.message);
      $(problem.field).focus();
      return;
    }
    if (editing) {
      const item = findConfig(editing);
      if (!item) {
        toast("Configuration not found.");
        return;
      }
      const previous = Object.assign({}, item);
      if (
        previous.module === data.module &&
        previous.name === data.name &&
        previous.value === data.value &&
        previous.description === data.description &&
        previous.status === data.status
      ) {
        setModal("scFormModal", false);
        return;
      }
      Object.assign(item, data);
      if (!saveConfigs()) {
        Object.assign(item, previous);
        return;
      }
      toast("Configuration updated successfully.");
    } else {
      const record = Object.assign({ code: $("scCode").value }, data);
      if (findConfig(record.code)) record.code = nextCode();
      state.configs.push(record);
      if (!saveConfigs()) {
        state.configs.pop();
        return;
      }
      toast("Configuration added successfully.");
    }
    state.module = data.module;
    $("scModuleSelect").value = data.module;
    state.status = "all";
    state.search = "";
    pagination.reset();
    setModal("scFormModal", false);
    render();
  }

  /* ---------- Events ---------- */

  function applyFilters() {
    state.search = $("scSearchKeyword").value.trim();
    pagination.reset();
    setModal("scFilterOverlay", false);
    render();
  }

  function resetFilters() {
    $("scSearchKeyword").value = "";
    app.querySelectorAll(".column-toggle").forEach(function (input) {
      input.checked = true;
    });
    state.visibleColumns = {
      code: true,
      name: true,
      value: true,
      status: true,
    };
    state.search = "";
    pagination.reset();
    setModal("scFilterOverlay", false);
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
    const action = button.dataset.action;
    if (action === "view") viewConfig(button.dataset.code);
    if (action === "edit") openForm("edit", button.dataset.code);
    if (button.id === "scOpenFilterBtn") {
      $("scSearchKeyword").value = state.search;
      app.querySelectorAll(".column-toggle").forEach(function (input) {
        input.checked =
          state.visibleColumns[COLUMNS[Number(input.dataset.column)][0]];
      });
      setModal("scFilterOverlay", true);
    }
    if (button.id === "scCloseFilterBtn") setModal("scFilterOverlay", false);
    if (button.id === "scApplyFilterBtn") applyFilters();
    if (button.id === "scResetFilterBtn") resetFilters();
    if (button.id === "scOpenAddBtn") openForm("add");
    if (button.id === "scCancelFormBtn") setModal("scFormModal", false);
    if (button.id === "scCloseViewBtn") setModal("scViewModal", false);
    if (button.id === "scFormStatusToggle") {
      setToggle(button.classList.contains("on") ? "Inactive" : "Active");
    }
    if (button.dataset.status) {
      state.status = button.dataset.status;
      pagination.reset();
      render();
    }
  }

  function handleChange(event) {
    if (event.target.id === "scModuleSelect") {
      state.module = event.target.value;
      state.status = "all";
      state.search = "";
      pagination.reset();
      render();
      return;
    }
    if (!event.target.classList.contains("column-toggle")) return;
    state.visibleColumns[COLUMNS[Number(event.target.dataset.column)][0]] =
      event.target.checked;
    render();
  }

  function handleKeydown(event) {
    if (event.target.id === "scSearchKeyword" && event.key === "Enter") {
      event.preventDefault();
      applyFilters();
    }
  }

  function handleSubmit(event) {
    if (event.target.id === "scForm") submitForm(event);
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
            <strong>Access Restricted</strong><p>Only an authorized administrator can access System Configuration.</p>
        </div></section>`;
  }

  function initSystemConfigurationModule() {
    app = document.getElementById("systemConfigurationApp");
    if (!app || app.dataset.initialized === "true") return;
    app.dataset.initialized = "true";
    if (!canReadConfigs()) {
      renderAccessDenied();
      return;
    }
    state.configs = loadConfigs();
    state.module = MODULES[0];
    state.status = "all";
    state.search = "";
    state.visibleColumns = {
      code: true,
      name: true,
      value: true,
      status: true,
    };
    state.sortBy = "code";
    state.sortAscending = true;
    state.editingCode = null;
    app.innerHTML = markup();
    pagination =
      typeof window.createTablePagination === "function"
        ? window.createTablePagination(
            $("scPagination"),
            render,
            "System Configuration pagination",
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
    app.addEventListener("submit", handleSubmit);
    if (!escapeBound) {
      document.addEventListener("keydown", handleEscape);
      escapeBound = true;
    }
    render();
  }

  window.getSystemConfigurationData = loadConfigs;
  window.initSystemConfigurationModule = initSystemConfigurationModule;
})();
