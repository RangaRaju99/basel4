(function () {
  "use strict";

  const STORAGE_KEY = "baseltrack-module-directory-v1";
  const PERMISSION_KEY = "module";
  const CODE_PATTERN = /^MOD-\d{3}$/;
  const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &\/().,_-]*$/;
  const NAME_MIN = 3;
  const NAME_MAX = 60;
  const DEFAULT_MODULES = [
    { code: "MOD-001", name: "User Management", status: "Active" },
    { code: "MOD-002", name: "Role Management", status: "Active" },
    { code: "MOD-003", name: "Module Management", status: "Active" },
    { code: "MOD-004", name: "Reporting Templates", status: "Active" },
    { code: "MOD-005", name: "Reporting Calendar", status: "Active" },
    { code: "MOD-006", name: "Audit Trail", status: "Active" },
    { code: "MOD-007", name: "Data Ingestion", status: "Active" },
    { code: "MOD-008", name: "Quality Dashboard", status: "Active" },
    { code: "MOD-009", name: "RWA Calculation", status: "Active" },
    { code: "MOD-010", name: "Liquidity Calculation", status: "Inactive" },
    { code: "MOD-011", name: "Capital Calculation", status: "Active" },
    { code: "MOD-012", name: "Report Generation", status: "Inactive" },
  ];
  const COLUMNS = [
    ["code", "Module Code"],
    ["name", "Module Name"],
    ["status", "Status"],
  ];
  const state = {
    modules: [],
    status: "all",
    search: "",
    visibleColumns: { code: true, name: true, status: true },
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

  function canReadModules() {
    const role = currentRoleKey();
    return (
      role === "superadmin" &&
      (typeof window.canRead !== "function" ||
        window.canRead(role, PERMISSION_KEY))
    );
  }

  function canCreateModules() {
    const role = currentRoleKey();
    return (
      typeof window.canCreate !== "function" ||
      window.canCreate(role, PERMISSION_KEY)
    );
  }

  function canUpdateModules() {
    const role = currentRoleKey();
    return (
      typeof window.canUpdate !== "function" ||
      window.canUpdate(role, PERMISSION_KEY)
    );
  }

  /* ---------- Storage ---------- */

  function normalizeStatus(status) {
    return status === "Inactive" ? "Inactive" : "Active";
  }

  function cloneDefaults() {
    return DEFAULT_MODULES.map(function (item) {
      return Object.assign({}, item);
    });
  }

  function loadModules() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved)) {
        return saved
          .filter(function (item) {
            return (
              item &&
              typeof item.code === "string" &&
              typeof item.name === "string"
            );
          })
          .map(function (item) {
            return {
              code: item.code,
              name: item.name,
              status: normalizeStatus(item.status),
            };
          });
      }
    } catch (error) {
      console.warn("Manage Modules: unable to read saved modules", error);
    }
    return cloneDefaults();
  }

  function saveModules() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          state.modules.map(function (item) {
            return { code: item.code, name: item.name, status: item.status };
          }),
        ),
      );
      return true;
    } catch (error) {
      console.error("Manage Modules: unable to save modules", error);
      toast("Unable to save module changes.");
      return false;
    }
  }

  /* ---------- Validation ---------- */

  function cleanName(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function nextCode() {
    const max = state.modules.reduce(function (current, item) {
      const match = String(item.code).match(/(\d+)$/);
      return Math.max(current, match ? Number(match[1]) : 0);
    }, 0);
    return "MOD-" + String(max + 1).padStart(3, "0");
  }

  function validateCode(value) {
    if (!value) return "Module Code is required.";
    if (!CODE_PATTERN.test(value))
      return "Module Code must be in the format MOD-001.";
    if (
      state.modules.some(function (item) {
        return item.code.toLowerCase() === value.toLowerCase();
      })
    ) {
      return "Module Code already exists.";
    }
    return "";
  }

  function validateName(value, ownCode) {
    if (!value) return "Module Name is required.";
    if (value.length < NAME_MIN)
      return "Module Name must be at least " + NAME_MIN + " characters.";
    if (value.length > NAME_MAX)
      return "Module Name must not exceed " + NAME_MAX + " characters.";
    if (!NAME_PATTERN.test(value)) {
      return "Module Name may contain only letters, numbers, spaces and & / ( ) . , _ -";
    }
    if (
      state.modules.some(function (item) {
        return (
          item.code !== ownCode &&
          item.name.toLowerCase() === value.toLowerCase()
        );
      })
    ) {
      return "Module Name already exists.";
    }
    return "";
  }

  /* ---------- Markup ---------- */

  function markup() {
    return `
            <section class="content-card">
                <div class="page-header">
                    <div><h1>Manage Modules</h1><p>View and manage the availability of BaselTrack modules.</p></div>
                    <div class="header-actions">
                        <button type="button" id="mmOpenFilterBtn" class="filter-btn">Filter</button>
                        ${canCreateModules() ? '<button type="button" id="mmOpenAddBtn" class="add-btn">+ Add Module</button>' : ""}
                    </div>
                </div>
                <div class="summary-tabs" role="tablist" aria-label="Filter modules by status">
                    <button type="button" class="summary-tab active" data-status="all">All (<span id="mmAllCount">0</span>)</button>
                    <button type="button" class="summary-tab" data-status="Active">Active (<span id="mmActiveCount">0</span>)</button>
                    <button type="button" class="summary-tab" data-status="Inactive">Inactive (<span id="mmInactiveCount">0</span>)</button>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            ${COLUMNS.map(function (column, index) {
                              return `<th class="sortable" data-column="${index}" data-field="${column[0]}">${column[1]} <span>▲▼</span></th>`;
                            }).join("")}
                            <th class="actions-head">Actions</th>
                        </tr></thead>
                        <tbody id="mmTableBody"></tbody>
                    </table>
                    <div id="mmEmptyState" class="empty-state">No modules match the current filters.</div>
                </div>
                <div id="mmPagination"></div>
            </section>

            <div id="mmFilterOverlay" class="filter-overlay">
                <section class="filter-panel" role="dialog" aria-modal="true" aria-labelledby="mmFilterTitle">
                    <div class="panel-head"><div><h2 id="mmFilterTitle">Filter Modules</h2><p>Filter by module code or name, and choose visible columns.</p></div><button type="button" id="mmCloseFilterBtn" aria-label="Close filter">✕</button></div>
                    <label>Module Code or Name<input id="mmSearchKeyword" placeholder="Module code or name"></label>
                    <div class="column-filter"><span class="filter-label">Column Visibility</span><div class="column-options">${COLUMNS.map(
                      function (column, index) {
                        return `<label><input type="checkbox" class="column-toggle" data-column="${index}" checked><span>${column[1]}</span></label>`;
                      },
                    ).join("")}</div></div>
                    <div class="filter-actions"><button type="button" id="mmResetFilterBtn" class="secondary">Reset</button><button type="button" id="mmApplyFilterBtn" class="primary">Apply</button></div>
                </section>
            </div>

            <div id="mmAddModal" class="modal-overlay">
                <form id="mmAddForm" class="modal edit-layout" novalidate>
                    <div class="modal-title"><h2>Add Module</h2></div>
                    <div class="form-grid">
                        <label class="required-field">Module Code<span class="required-marker" aria-hidden="true">*</span><input id="mmAddCode" name="code" maxlength="7" autocomplete="off" aria-required="true"></label>
                        <label class="required-field">Module Name<span class="required-marker" aria-hidden="true">*</span><input id="mmAddName" name="name" maxlength="${NAME_MAX}" autocomplete="off" placeholder="Enter module name" aria-required="true"></label>
                        <div class="full">
                            <span class="field-label">Module Status</span>
                            <div class="account-status"><span id="mmAddStatusText">Active</span><button id="mmAddStatusToggle" class="toggle on" type="button" role="switch" aria-checked="true" aria-label="Toggle module status"><i></i></button></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" id="mmCancelAddBtn" class="secondary">Cancel</button><button type="submit" class="primary">Add Module</button></div>
                </form>
            </div>

            <div id="mmViewModal" class="modal-overlay">
                <section class="modal profile-card" role="dialog" aria-modal="true" aria-labelledby="mmViewTitle">
                    <div class="profile-title"><h2 id="mmViewTitle">Module Profile</h2></div>
                    <div class="profile-hero">
                        <div id="mmViewInitials" class="large-avatar" aria-hidden="true"></div>
                        <div>
                            <h3 id="mmViewName"></h3>
                            <p><span>Module Code</span><strong id="mmViewCode"></strong></p>
                            <p><span>Module Status</span><strong id="mmViewStatus" class="status-pill"></strong></p>
                        </div>
                    </div>
                    <div class="view-footer"><button type="button" id="mmCloseViewBtn" class="primary close-profile-btn">Close</button></div>
                </section>
            </div>

            <div id="mmEditModal" class="modal-overlay">
                <form id="mmEditForm" class="modal edit-layout" novalidate>
                    <div class="modal-title"><h2>Edit Module</h2></div>
                    <div class="form-grid">
                        <label>Module Code<input id="mmEditCode" disabled></label>
                        <label class="required-field">Module Name<span class="required-marker" aria-hidden="true">*</span><input id="mmEditName" maxlength="${NAME_MAX}" autocomplete="off" aria-required="true"></label>
                        <div class="full">
                            <span class="field-label">Module Status</span>
                            <div class="account-status"><div><p>Enable or disable the availability of this module.</p></div><div class="toggle-row"><span id="mmEditStatusText"></span><button id="mmEditStatusToggle" class="toggle" type="button" role="switch" aria-checked="false" aria-label="Toggle module status"><i></i></button></div></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" id="mmCancelEditBtn" class="secondary">Cancel</button><button type="submit" class="primary">Save Changes</button></div>
                </form>
            </div>`;
  }

  /* ---------- Rendering ---------- */

  function getFilteredModules() {
    const term = state.search.toLowerCase();
    return state.modules
      .filter(function (item) {
        return (
          (state.status === "all" || item.status === state.status) &&
          (!term || (item.code + " " + item.name).toLowerCase().includes(term))
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
    const filtered = getFilteredModules();
    const rows = pagination.paginate(filtered);
    const active = state.modules.filter(function (item) {
      return item.status === "Active";
    }).length;
    $("mmAllCount").textContent = state.modules.length;
    $("mmActiveCount").textContent = active;
    $("mmInactiveCount").textContent = state.modules.length - active;
    $("mmTableBody").innerHTML = rows
      .map(function (item) {
        return `<tr>
                <td data-column="0">${escapeHTML(item.code)}</td>
                <td data-column="1">${escapeHTML(item.name)}</td>
                <td data-column="2"><span class="status-pill ${statusClass(item.status)}">${escapeHTML(item.status)}</span></td>
                <td><div class="action-buttons">
                    <button type="button" class="view-btn" data-action="view" data-code="${escapeHTML(item.code)}">View</button>
                    ${canUpdateModules() ? `<button type="button" class="edit-btn" data-action="edit" data-code="${escapeHTML(item.code)}">Edit</button>` : ""}
                </div></td>
            </tr>`;
      })
      .join("");
    $("mmEmptyState").style.display = filtered.length ? "none" : "block";
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

  function setToggle(prefix, status) {
    const active = status === "Active";
    const button = $(prefix + "StatusToggle");
    button.classList.toggle("on", active);
    button.setAttribute("aria-checked", String(active));
    $(prefix + "StatusText").textContent = status;
  }

  function toggleStatus(prefix) {
    setToggle(
      prefix,
      $(prefix + "StatusToggle").classList.contains("on")
        ? "Inactive"
        : "Active",
    );
  }

  function findModule(code) {
    return state.modules.find(function (item) {
      return item.code === code;
    });
  }

  /* ---------- View / Add / Edit ---------- */

  function viewModule(code) {
    const item = findModule(code);
    if (!item) {
      toast("Module not found.");
      return;
    }
    $("mmViewInitials").textContent = initials(item.name);
    $("mmViewName").textContent = item.name;
    $("mmViewCode").textContent = item.code;
    $("mmViewStatus").textContent = item.status;
    $("mmViewStatus").className = "status-pill " + statusClass(item.status);
    setModal("mmViewModal", true);
  }

  function openAddModule() {
    if (!canCreateModules()) {
      toast("You do not have permission to add modules.");
      return;
    }
    $("mmAddForm").reset();
    $("mmAddCode").placeholder = "e.g. " + nextCode();
    setToggle("mmAdd", "Active");
    setModal("mmAddModal", true);
    $("mmAddCode").focus();
  }

  function editModule(code) {
    if (!canUpdateModules()) {
      toast("You do not have permission to edit modules.");
      return;
    }
    const item = findModule(code);
    if (!item) {
      toast("Module not found.");
      return;
    }
    state.editingCode = code;
    $("mmEditCode").value = item.code;
    $("mmEditName").value = item.name;
    setToggle("mmEdit", item.status);
    setModal("mmEditModal", true);
  }

  function submitAdd(event) {
    event.preventDefault();
    if (!canCreateModules()) {
      toast("You do not have permission to add modules.");
      return;
    }
    const code = $("mmAddCode").value.trim().toUpperCase();
    const name = cleanName($("mmAddName").value);
    let message = validateCode(code);
    if (message) {
      toast(message);
      $("mmAddCode").focus();
      return;
    }
    message = validateName(name, null);
    if (message) {
      toast(message);
      $("mmAddName").focus();
      return;
    }
    state.modules.push({
      code: code,
      name: name,
      status: $("mmAddStatusToggle").classList.contains("on")
        ? "Active"
        : "Inactive",
    });
    if (!saveModules()) {
      state.modules.pop();
      return;
    }
    setModal("mmAddModal", false);
    state.status = "all";
    state.search = "";
    pagination.reset();
    toast("Module added successfully.");
    render();
  }

  function submitEdit(event) {
    event.preventDefault();
    if (!canUpdateModules()) {
      toast("You do not have permission to edit modules.");
      return;
    }
    const item = findModule(state.editingCode);
    if (!item) {
      toast("Module not found.");
      return;
    }
    const name = cleanName($("mmEditName").value);
    const message = validateName(name, item.code);
    if (message) {
      toast(message);
      $("mmEditName").focus();
      return;
    }
    const status = $("mmEditStatusToggle").classList.contains("on")
      ? "Active"
      : "Inactive";
    if (name === item.name && status === item.status) {
      setModal("mmEditModal", false);
      return;
    }
    const previous = { name: item.name, status: item.status };
    item.name = name;
    item.status = status;
    if (!saveModules()) {
      item.name = previous.name;
      item.status = previous.status;
      return;
    }
    setModal("mmEditModal", false);
    toast("Module updated successfully.");
    render();
  }

  /* ---------- Events ---------- */

  function applyFilters() {
    state.search = $("mmSearchKeyword").value.trim();
    pagination.reset();
    setModal("mmFilterOverlay", false);
    render();
  }

  function resetFilters() {
    $("mmSearchKeyword").value = "";
    app.querySelectorAll(".column-toggle").forEach(function (input) {
      input.checked = true;
    });
    state.visibleColumns = { code: true, name: true, status: true };
    state.search = "";
    pagination.reset();
    setModal("mmFilterOverlay", false);
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
    if (action === "view") viewModule(button.dataset.code);
    if (action === "edit") editModule(button.dataset.code);
    if (button.id === "mmOpenFilterBtn") {
      $("mmSearchKeyword").value = state.search;
      app.querySelectorAll(".column-toggle").forEach(function (input) {
        input.checked =
          state.visibleColumns[COLUMNS[Number(input.dataset.column)][0]];
      });
      setModal("mmFilterOverlay", true);
    }
    if (button.id === "mmCloseFilterBtn") setModal("mmFilterOverlay", false);
    if (button.id === "mmApplyFilterBtn") applyFilters();
    if (button.id === "mmResetFilterBtn") resetFilters();
    if (button.id === "mmOpenAddBtn") openAddModule();
    if (button.id === "mmCancelAddBtn") setModal("mmAddModal", false);
    if (button.id === "mmCancelEditBtn") setModal("mmEditModal", false);
    if (button.id === "mmCloseViewBtn") setModal("mmViewModal", false);
    if (button.id === "mmAddStatusToggle") toggleStatus("mmAdd");
    if (button.id === "mmEditStatusToggle") toggleStatus("mmEdit");
    if (button.dataset.status) {
      state.status = button.dataset.status;
      pagination.reset();
      render();
    }
  }

  function handleChange(event) {
    if (!event.target.classList.contains("column-toggle")) return;
    state.visibleColumns[COLUMNS[Number(event.target.dataset.column)][0]] =
      event.target.checked;
    render();
  }

  function handleInput(event) {
    if (event.target.id === "mmAddCode") {
      event.target.value = event.target.value.toUpperCase();
    }
  }

  function handleKeydown(event) {
    if (event.target.id === "mmSearchKeyword" && event.key === "Enter") {
      event.preventDefault();
      applyFilters();
    }
  }

  function handleSubmit(event) {
    if (event.target.id === "mmAddForm") submitAdd(event);
    if (event.target.id === "mmEditForm") submitEdit(event);
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
            <strong>Access Restricted</strong><p>Only an authorized administrator can access Manage Modules.</p>
        </div></section>`;
  }

  function initManageModulesModule() {
    app = document.getElementById("manageModulesApp");
    if (!app || app.dataset.initialized === "true") return;
    app.dataset.initialized = "true";
    if (!canReadModules()) {
      renderAccessDenied();
      return;
    }
    state.modules = loadModules();
    state.status = "all";
    state.search = "";
    state.visibleColumns = { code: true, name: true, status: true };
    state.sortBy = "code";
    state.sortAscending = true;
    state.editingCode = null;
    app.innerHTML = markup();
    pagination =
      typeof window.createTablePagination === "function"
        ? window.createTablePagination(
            $("mmPagination"),
            render,
            "Manage Modules pagination",
          )
        : {
            paginate: function (list) {
              return list;
            },
            reset: function () {},
          };
    app.addEventListener("click", handleClick);
    app.addEventListener("change", handleChange);
    app.addEventListener("input", handleInput);
    app.addEventListener("keydown", handleKeydown);
    app.addEventListener("submit", handleSubmit);
    if (!escapeBound) {
      document.addEventListener("keydown", handleEscape);
      escapeBound = true;
    }
    render();
  }

  window.getManageModulesData = loadModules;
  window.initManageModulesModule = initManageModulesModule;
})();
