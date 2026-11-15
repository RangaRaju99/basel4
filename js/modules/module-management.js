
/* =========================================
   MODULE MANAGEMENT
========================================= */

window.initManageModulesModule = function () {

    const root = document.getElementById("manageModulesApp");

    if (!root) {
        console.error("Module Management container not found.");
        return;
    }

    /* -------------------------------------
       1. MODULE DATA
    ------------------------------------- */

    let modules = [
        {
            id: 1,
            code: "MOD-001",
            name: "User Management",
            status: "Active"
        },
        {
            id: 2,
            code: "MOD-002",
            name: "Role Management",
            status: "Active"
        },
        {
            id: 3,
            code: "MOD-003",
            name: "Module Management",
            status: "Active"
        },
        {
            id: 4,
            code: "MOD-004",
            name: "Reporting Templates",
            status: "Active"
        },
        {
            id: 5,
            code: "MOD-005",
            name: "Reporting Calendar",
            status: "Active"
        },
        {
            id: 6,
            code: "MOD-006",
            name: "Audit Trail",
            status: "Active"
        },
        {
            id: 7,
            code: "MOD-007",
            name: "Data Ingestion",
            status: "Active"
        },
        {
            id: 8,
            code: "MOD-008",
            name: "Quality Dashboard",
            status: "Active"
        },
        {
            id: 9,
            code: "MOD-009",
            name: "RWA Calculation",
            status: "Active"
        },
        {
            id: 10,
            code: "MOD-010",
            name: "Liquidity Calculation",
            status: "Inactive"
        },
        {
            id: 11,
            code: "MOD-011",
            name: "Capital Calculation",
            status: "Active"
        },
        {
            id: 12,
            code: "MOD-012",
            name: "Report Generation",
            status: "Inactive"
        }
    ];

    /* -------------------------------------
       2. ELEMENT REFERENCES
    ------------------------------------- */

    const tableBody = root.querySelector("#mmTableBody");
    const resultCount = root.querySelector("#mmResultCount");
    const emptyState = root.querySelector("#mmEmptyState");

    const filterToggle = root.querySelector("#mmFilterToggle");
    const filterPanel = root.querySelector("#mmFilterPanel");

    const searchInput = root.querySelector("#mmSearch");
    const statusFilter = root.querySelector("#mmStatusFilter");

    const resetButton = root.querySelector("#mmReset");
    const applyButton = root.querySelector("#mmApply");

    const viewModal = root.querySelector("#mmViewModal");
    const editModal = root.querySelector("#mmEditModal");

    const editId = root.querySelector("#mmEditId");
    const editStatus = root.querySelector("#mmEditStatus");
    const editStatusLabel = root.querySelector("#mmEditStatusLabel");

    const toast = root.querySelector("#mmToast");

    /* -------------------------------------
       3. FILTER AND SORT STATE
    ------------------------------------- */

    let selectedTab = "All";

    let appliedSearch = "";
    let appliedStatus = "All";

    let sortColumn = "";
    let sortDirection = "asc";

    let toastTimer;

    /* -------------------------------------
       4. RENDER TABLE
    ------------------------------------- */

    function renderTable() {

        let filteredModules = [...modules];

        // Search filter
        if (appliedSearch) {

            filteredModules = filteredModules.filter(module => {

                return (
                    module.code.toLowerCase().includes(appliedSearch) ||
                    module.name.toLowerCase().includes(appliedSearch)
                );

            });

        }

        // Status filter
        const effectiveStatus =
            appliedStatus !== "All" ? appliedStatus : selectedTab;

        if (effectiveStatus !== "All") {

            filteredModules = filteredModules.filter(module => {
                return module.status === effectiveStatus;
            });

        }

        // Sorting
        if (sortColumn) {

            filteredModules.sort((a, b) => {

                let valueA = a[sortColumn].toLowerCase();
                let valueB = b[sortColumn].toLowerCase();

                let comparison = valueA.localeCompare(valueB, undefined, {
                    numeric: true
                });

                return sortDirection === "asc"
                    ? comparison
                    : -comparison;

            });

        }

        // Update count
        resultCount.textContent = filteredModules.length;

        // Empty state
        emptyState.hidden = filteredModules.length !== 0;
        tableBody.innerHTML = "";

        if (filteredModules.length === 0) {
            updateSortIndicators();
            return;
        }

        // Generate rows
        filteredModules.forEach(module => {

            const row = document.createElement("tr");

            const statusClass =
                module.status === "Active"
                    ? "mm-status-active"
                    : "mm-status-inactive";

            row.innerHTML = `
                <td>${escapeHTML(module.code)}</td>

                <td>
                    <strong>${escapeHTML(module.name)}</strong>
                </td>

                <td>
                    <span class="mm-status-badge ${statusClass}">
                        ${escapeHTML(module.status)}
                    </span>
                </td>

                <td>
                    <div class="mm-row-actions">

                        <button
                            class="mm-action-btn mm-view-btn"
                            data-action="view"
                            data-id="${module.id}"
                        >
                            <i class="fa-regular fa-eye"></i>
                            View
                        </button>

                        <button
                            class="mm-action-btn mm-edit-btn"
                            data-action="edit"
                            data-id="${module.id}"
                        >
                            <i class="fa-regular fa-pen-to-square"></i>
                            Edit
                        </button>

                    </div>
                </td>
            `;

            tableBody.appendChild(row);

        });

        updateSortIndicators();

    }

    /* -------------------------------------
       5. HTML ESCAPE
    ------------------------------------- */

    function escapeHTML(value) {

        return String(value).replace(/[&<>"']/g, character => {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];

        });

    }

    /* -------------------------------------
       6. FILTER TABS
    ------------------------------------- */

    root.querySelectorAll(".mm-tab").forEach(button => {

        button.addEventListener("click", () => {

            selectedTab = button.dataset.status;

            root.querySelectorAll(".mm-tab").forEach(tab => {
                tab.classList.remove("active");
            });

            button.classList.add("active");

            // Keep the dropdown consistent with the selected tab.
            statusFilter.value = "All";

            appliedStatus = "All";

            renderTable();

        });

    });

    /* -------------------------------------
       7. OPEN / CLOSE FILTER PANEL
    ------------------------------------- */

    filterToggle.addEventListener("click", () => {

        filterPanel.hidden = !filterPanel.hidden;

    });

    /* -------------------------------------
       8. APPLY FILTER
    ------------------------------------- */

    applyButton.addEventListener("click", () => {

        appliedSearch = searchInput.value.trim().toLowerCase();

        appliedStatus = statusFilter.value;

        // Dropdown status takes priority over tabs.
        if (appliedStatus !== "All") {

            selectedTab = "All";

            root.querySelectorAll(".mm-tab").forEach(tab => {

                tab.classList.toggle(
                    "active",
                    tab.dataset.status === "All"
                );

            });

        }

        renderTable();

        filterPanel.hidden = true;

    });

    /* -------------------------------------
       9. RESET FILTER
    ------------------------------------- */

    resetButton.addEventListener("click", () => {

        searchInput.value = "";
        statusFilter.value = "All";

        appliedSearch = "";
        appliedStatus = "All";

        selectedTab = "All";

        root.querySelectorAll(".mm-tab").forEach(tab => {

            tab.classList.toggle(
                "active",
                tab.dataset.status === "All"
            );

        });

        renderTable();

    });

    /* -------------------------------------
       10. SORTING
    ------------------------------------- */

    root.querySelectorAll(".mm-sort").forEach(button => {

        button.addEventListener("click", () => {

            const column = button.dataset.sort;

            if (sortColumn === column) {

                sortDirection =
                    sortDirection === "asc" ? "desc" : "asc";

            } else {

                sortColumn = column;
                sortDirection = "asc";

            }

            renderTable();

        });

    });

    function updateSortIndicators() {

        root.querySelectorAll(".mm-sort").forEach(button => {

            const icon = button.querySelector(".mm-sort-icon");

            button.classList.remove("active");

            if (button.dataset.sort === sortColumn) {

                button.classList.add("active");

                icon.textContent =
                    sortDirection === "asc" ? "↑" : "↓";

            } else {

                icon.textContent = "↕";

            }

        });

    }

    /* -------------------------------------
       11. TABLE ACTIONS
    ------------------------------------- */

    tableBody.addEventListener("click", event => {

        const button = event.target.closest("[data-action]");

        if (!button) return;

        const id = Number(button.dataset.id);
        const action = button.dataset.action;

        const module = modules.find(item => item.id === id);

        if (!module) return;

        if (action === "view") {
            openViewModal(module);
        }

        if (action === "edit") {
            openEditModal(module);
        }

    });

    /* -------------------------------------
       12. VIEW MODULE
    ------------------------------------- */

    function openViewModal(module) {

        root.querySelector("#mmViewName").textContent = module.name;

        root.querySelector("#mmViewCode").textContent = module.code;

        const statusElement = root.querySelector("#mmViewStatus");

        statusElement.innerHTML = "";

        const badge = document.createElement("span");

        badge.className =
            "mm-status-badge " +
            (module.status === "Active"
                ? "mm-status-active"
                : "mm-status-inactive");

        badge.textContent = module.status;

        statusElement.appendChild(badge);

        viewModal.hidden = false;

    }

    /* -------------------------------------
       13. EDIT MODULE
    ------------------------------------- */

    function openEditModal(module) {

        editId.value = module.id;

        root.querySelector("#mmEditName").textContent = module.name;

        root.querySelector("#mmEditCode").textContent = module.code;

        editStatus.checked = module.status === "Active";

        updateEditStatusLabel();

        editModal.hidden = false;

    }

    /* -------------------------------------
       14. UPDATE STATUS LABEL
    ------------------------------------- */

    editStatus.addEventListener("change", () => {

        updateEditStatusLabel();

    });

    function updateEditStatusLabel() {

        editStatusLabel.textContent =
            editStatus.checked ? "Active" : "Inactive";

    }

    /* -------------------------------------
       15. SAVE CHANGES
    ------------------------------------- */

    root.querySelector("#mmSaveChanges").addEventListener("click", () => {

        const id = Number(editId.value);

        const module = modules.find(item => item.id === id);

        if (!module) return;

        const newStatus =
            editStatus.checked ? "Active" : "Inactive";

        if (module.status === newStatus) {

            closeModal("edit");
            return;

        }

        module.status = newStatus;

        closeModal("edit");

        renderTable();

        showToast("Module status updated successfully.");

    });

    /* -------------------------------------
       16. CLOSE MODALS
    ------------------------------------- */

    root.querySelectorAll("[data-close]").forEach(button => {

        button.addEventListener("click", () => {

            closeModal(button.dataset.close);

        });

    });

    // Close when clicking outside modal
    [viewModal, editModal].forEach(modal => {

        modal.addEventListener("click", event => {

            if (event.target === modal) {

                modal.hidden = true;

            }

        });

    });

    // Escape key
    function handleEscape(event) {

        if (!root.isConnected) {
            document.removeEventListener("keydown", handleEscape);
            return;
        }

        if (event.key === "Escape") {

            viewModal.hidden = true;
            editModal.hidden = true;

        }

    }

    document.addEventListener("keydown", handleEscape);

    function closeModal(type) {

        if (type === "view") {
            viewModal.hidden = true;
        }

        if (type === "edit") {
            editModal.hidden = true;
        }

    }

    /* -------------------------------------
       17. TOAST NOTIFICATION
    ------------------------------------- */

    function showToast(message) {

        clearTimeout(toastTimer);

        toast.textContent = message;

        toast.classList.add("show");

        toastTimer = setTimeout(() => {

            toast.classList.remove("show");

        }, 2800);

    }

    /* -------------------------------------
       18. INITIAL RENDER
    ------------------------------------- */

    renderTable();

    console.log("Module Management initialized successfully.");

};
