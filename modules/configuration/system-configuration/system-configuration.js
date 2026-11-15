/* =========================================
   SYSTEM CONFIGURATION MODULE
   BaselTrack - Regulatory Reporting Platform
========================================= */

window.initSystemConfigurationModule = function () {
  const root = document.getElementById("systemConfigurationApp");

  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const MODULES = [
    "Dashboard",
    "User Access Management",
    "Configuration Management",
    "Query Management",
  ];

  let configurations = [
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

  let selectedModule = MODULES[0];
  let activeStatus = "All";
  let searchTerm = "";
  let editingCode = null;

  const escapeHTML = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[ch],
    );

  const nextCode = () => {
    const highest = configurations.reduce((max, item) => {
      const number = Number(item.code.replace("CFG", ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    return "CFG" + String(highest + 1).padStart(3, "0");
  };

  const $ = (selector) => root.querySelector(selector);
  const viewModal = $("#scViewModal");
  const formModal = $("#scFormModal");
  let viewedCode = null;
  let toastTimeout;

  function getModuleRecords() {
    return configurations.filter((item) => item.module === selectedModule);
  }

  function getVisibleRecords() {
    const term = searchTerm.trim().toLowerCase();
    return getModuleRecords().filter((item) => {
      const matchesStatus =
        activeStatus === "All" || item.status === activeStatus;
      const matchesSearch =
        !term ||
        [item.code, item.name, item.value, item.description].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term),
        );
      return matchesStatus && matchesSearch;
    });
  }

  function render() {
    const moduleRecords = getModuleRecords();
    const visibleRecords = getVisibleRecords();

    $("#scSelectedModuleTitle").textContent = selectedModule;
    $("#scTotalCount").textContent =
      `${moduleRecords.length} ${moduleRecords.length === 1 ? "Configuration" : "Configurations"}`;
    $("#scAllCount").textContent = moduleRecords.length;
    $("#scActiveCount").textContent = moduleRecords.filter(
      (item) => item.status === "Active",
    ).length;
    $("#scInactiveCount").textContent = moduleRecords.filter(
      (item) => item.status === "Inactive",
    ).length;

    root.querySelectorAll(".sc-tab").forEach((tab) => {
      const active = tab.dataset.status === activeStatus;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    $("#scTableBody").innerHTML = visibleRecords
      .map(
        (item) => `
            <tr>
                <td><span class="sc-code">${escapeHTML(item.code)}</span></td>
                <td><span class="sc-config-name">${escapeHTML(item.name)}</span></td>
                <td>${escapeHTML(item.value)}</td>
                <td><span class="sc-status sc-status-${item.status.toLowerCase()}">${escapeHTML(item.status)}</span></td>
                <td>
                    <div class="sc-row-actions">
                        <button type="button" class="sc-link-button" data-action="view" data-code="${escapeHTML(item.code)}">View</button>
                        <button type="button" class="sc-link-button" data-action="edit" data-code="${escapeHTML(item.code)}">Edit</button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");

    $("#scEmptyState").hidden = visibleRecords.length !== 0;
    $("#scTableFooter").textContent =
      `Showing ${visibleRecords.length} of ${moduleRecords.length} configurations`;
  }

  function showToast(message) {
    const toast = $("#scToast");
    toast.textContent = message;
    toast.classList.add("sc-toast-visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(
      () => toast.classList.remove("sc-toast-visible"),
      2800,
    );
  }

  function closeModals() {
    viewModal.hidden = true;
    formModal.hidden = true;
  }

  function showModal(modal) {
    closeModals();
    modal.hidden = false;
    const dialog = modal.querySelector(".sc-modal-card");
    if (dialog) dialog.scrollTop = 0;
  }

  function openView(code) {
    const item = configurations.find((record) => record.code === code);
    if (!item) return;
    viewedCode = code;

    const details = [
      ["Configuration Code", item.code],
      ["Module", item.module],
      ["Configuration For", item.name],
      ["Configuration Value", item.value],
      ["Status", item.status],
      ["Description", item.description || "—"],
    ];

    $("#scViewDetails").innerHTML = details
      .map(
        ([label, value]) => `
            <div class="sc-detail-item">
                <span class="sc-detail-label">${escapeHTML(label)}</span>
                <span class="sc-detail-value">${escapeHTML(value)}</span>
            </div>
        `,
      )
      .join("");

    const statusValue = $(
      "#scViewDetails .sc-detail-item:nth-child(5) .sc-detail-value",
    );
    statusValue.innerHTML = `<span class="sc-status sc-status-${item.status.toLowerCase()}">${escapeHTML(item.status)}</span>`;
    showModal(viewModal);
  }

  function openForm(mode, code) {
    const isEdit = mode === "edit";
    const item = isEdit
      ? configurations.find((record) => record.code === code)
      : null;
    if (isEdit && !item) return;

    editingCode = isEdit ? code : null;
    $("#scFormTitle").textContent = isEdit
      ? "Edit Configuration"
      : "Add Configuration";
    $("#scFormSubtitle").textContent = isEdit
      ? "Update the configuration details below."
      : "Enter the new configuration details below.";
    $("#scCode").value = isEdit ? item.code : nextCode();
    $("#scFormModule").value = isEdit ? item.module : selectedModule;
    $("#scName").value = isEdit ? item.name : "";
    $("#scValue").value = isEdit ? item.value : "";
    $("#scFormStatus").value = isEdit ? item.status : "Active";
    $("#scDescription").value = isEdit ? item.description : "";
    $("#scFormError").hidden = true;
    $("#scSaveButton").textContent = isEdit
      ? "Save Changes"
      : "Save Configuration";
    showModal(formModal);
    $("#scName").focus();
  }

  $("#scModuleSelect").addEventListener("change", (event) => {
    selectedModule = event.target.value;
    activeStatus = "All";
    searchTerm = "";
    $("#scSearch").value = "";
    $("#scFilterStatus").value = "All";
    render();
  });

  root.querySelectorAll(".sc-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeStatus = tab.dataset.status;
      $("#scFilterStatus").value = activeStatus;
      render();
    });
  });

  $("#scSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value;
    render();
  });

  $("#scFilterToggle").addEventListener("click", () => {
    $("#scFilterPanel").hidden = !$("#scFilterPanel").hidden;
  });

  $("#scFilterStatus").addEventListener("change", (event) => {
    activeStatus = event.target.value;
    render();
  });

  $("#scClearFilters").addEventListener("click", () => {
    activeStatus = "All";
    searchTerm = "";
    $("#scSearch").value = "";
    $("#scFilterStatus").value = "All";
    render();
  });

  $("#scAddButton").addEventListener("click", () => openForm("add"));

  $("#scTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, code } = button.dataset;
    if (action === "view") openView(code);
    if (action === "edit") openForm("edit", code);
  });

  $("#scViewEditButton").addEventListener("click", () => {
    const code = viewedCode;
    closeModals();
    openForm("edit", code);
  });

  root.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModals);
  });

  [viewModal, formModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModals();
    });
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModals();
  });

  $("#scConfigurationForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const code = $("#scCode").value.trim();
    const module = $("#scFormModule").value;
    const name = $("#scName").value.trim();
    const value = $("#scValue").value.trim();
    const status = $("#scFormStatus").value;
    const description = $("#scDescription").value.trim();
    const error = $("#scFormError");

    if (!code || !module || !name || !value || !status) {
      error.textContent = "Please complete all required fields.";
      error.hidden = false;
      return;
    }

    const duplicateName = configurations.some(
      (item) =>
        item.module === module &&
        item.name.toLowerCase() === name.toLowerCase() &&
        item.code !== editingCode,
    );

    if (duplicateName) {
      error.textContent =
        "A configuration with this name already exists in the selected module.";
      error.hidden = false;
      return;
    }

    if (editingCode) {
      const index = configurations.findIndex(
        (item) => item.code === editingCode,
      );
      if (index === -1) return;
      configurations[index] = {
        code: editingCode,
        module,
        name,
        value,
        status,
        description,
      };
      showToast("Configuration updated successfully.");
    } else {
      configurations.push({ code, module, name, value, status, description });
      showToast("Configuration added successfully.");
    }

    selectedModule = module;
    $("#scModuleSelect").value = module;
    activeStatus = "All";
    searchTerm = "";
    $("#scSearch").value = "";
    $("#scFilterStatus").value = "All";
    closeModals();
    render();
  });

  render();
};
