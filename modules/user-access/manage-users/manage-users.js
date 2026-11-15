(function () {
    "use strict";

    const STORAGE_KEY = "baseltrack-user-directory-v1";
    const DEFAULT_USERS = [
        { id: "USR001", username: "admin", fullName: "System Administrator", role: "superadmin", status: "Active" },
        { id: "USR002", username: "arun.d", fullName: "Arun Kumar", role: "doa", status: "Active" },
        { id: "USR003", username: "priya.s", fullName: "Priya Sharma", role: "dqa", status: "Active" },
        { id: "USR004", username: "karthik.r", fullName: "Karthik Raj", role: "rra", status: "Active" },
        { id: "USR005", username: "meena.k", fullName: "Meena Krishnan", role: "risk", status: "Inactive" },
        { id: "USR006", username: "sanjay.m", fullName: "Sanjay Menon", role: "finance", status: "Active" },
        { id: "USR007", username: "divya.p", fullName: "Divya Patel", role: "compliance", status: "Active" },
        { id: "USR008", username: "rajesh.v", fullName: "Rajesh Varma", role: "auditor", status: "Active" }
    ];
    const COLUMNS = [
        ["username", "Username"],
        ["fullName", "Full Name"],
        ["role", "Role"],
        ["status", "Status"]
    ];
    const state = {
        users: [],
        status: "all",
        filters: { search: "", role: "" },
        visibleColumns: { username: true, fullName: true, role: true, status: true },
        sortBy: "username",
        sortAscending: true,
        editingId: null
    };
    let app;
    let pagination;

    function $(id) {
        return app.querySelector("#" + id);
    }

    function escapeHTML(value) {
        const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
            return entities[char];
        });
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
        window.setTimeout(function () { element.classList.remove("show"); }, 2500);
    }

    function roleEntries() {
        const config = window.ROLE_CONFIG || {};
        return Object.keys(config).map(function (key) {
            return { key: key, name: config[key].name || key };
        }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    function roleName(key) {
        const found = roleEntries().find(function (entry) { return entry.key === key; });
        return found ? found.name : (key || "—");
    }

    function loadUsers() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (Array.isArray(saved)) {
                return saved.map(function (user) {
                    return {
                        id: user.id,
                        username: user.username,
                        fullName: user.fullName || user.employeeName || "",
                        role: user.role,
                        status: user.status
                    };
                });
            }
        } catch (error) {
            console.warn("Manage Users: unable to read saved users", error);
        }
        return DEFAULT_USERS.map(function (user) { return Object.assign({}, user); });
    }

    function saveUsers() {
        try {
            const users = state.users.map(function (user) {
                return {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    role: user.role,
                    status: user.status
                };
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
            return true;
        } catch (error) {
            console.error("Manage Users: unable to save users", error);
            toast("Unable to save user changes.");
            return false;
        }
    }

    function currentRoleKey() {
        return typeof window.getCurrentRole === "function"
            ? window.getCurrentRole()
            : localStorage.getItem("baseltrack-role") || "";
    }

    function canReadUsers() {
        const role = currentRoleKey();
        return role === "superadmin" &&
            (typeof window.canRead !== "function" || window.canRead(role, "manage-user"));
    }

    function canCreateUsers() {
        const role = currentRoleKey();
        return typeof window.canCreate !== "function" || window.canCreate(role, "manage-user");
    }

    function canUpdateUsers() {
        const role = currentRoleKey();
        return typeof window.canUpdate !== "function" || window.canUpdate(role, "manage-user");
    }

    function markup() {
        return `
            <section class="content-card">
                <div class="page-header">
                    <div><h1>Manage Users</h1><p>Manage application users, assigned roles and account status.</p></div>
                    <div class="header-actions">
                        <button type="button" id="openFilterBtn" class="filter-btn">Filter</button>
                        ${canCreateUsers() ? '<button type="button" id="openAddUserBtn" class="add-btn">+ Add User</button>' : ""}
                    </div>
                </div>
                <div class="summary-tabs" role="tablist" aria-label="Filter users by status">
                    <button type="button" class="summary-tab active" data-status="all">All (<span id="allCount">0</span>)</button>
                    <button type="button" class="summary-tab" data-status="Active">Active (<span id="activeCount">0</span>)</button>
                    <button type="button" class="summary-tab" data-status="Inactive">Inactive (<span id="inactiveCount">0</span>)</button>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            ${COLUMNS.map(function (column, index) {
                                return `<th class="sortable" data-column="${index}" data-field="${column[0]}">${column[1]} <span>▲▼</span></th>`;
                            }).join("")}
                            <th class="actions-head">Actions</th>
                        </tr></thead>
                        <tbody id="userTableBody"></tbody>
                    </table>
                    <div id="emptyState" class="empty-state">No users match the current filters.</div>
                </div>
                <div id="userPagination"></div>
            </section>

            <div id="filterOverlay" class="filter-overlay">
                <section class="filter-panel" role="dialog" aria-modal="true" aria-labelledby="filterTitle">
                    <div class="panel-head"><div><h2 id="filterTitle">Filter Users</h2><p>Filter by username, full name or role, and choose visible columns.</p></div><button type="button" id="closeFilterBtn" aria-label="Close filter">✕</button></div>
                    <label>Username or Full Name<input id="searchKeyword" placeholder="Username or full name"></label>
                    <label>Role<select id="roleFilter"><option value="">All Roles</option>${roleEntries().map(function (role) {
                        return `<option value="${escapeHTML(role.key)}">${escapeHTML(role.name)}</option>`;
                    }).join("")}</select></label>
                    <div class="column-filter"><span class="filter-label">Column Visibility</span><div class="column-options">${COLUMNS.map(function (column, index) {
                        return `<label><input type="checkbox" class="column-toggle" data-column="${index}" checked><span>${column[1]}</span></label>`;
                    }).join("")}</div></div>
                    <div class="filter-actions"><button type="button" id="resetFilterBtn" class="secondary">Reset</button><button type="button" id="applyFilterBtn" class="primary">Apply</button></div>
                </section>
            </div>

            <div id="addUserModal" class="modal-overlay">
                <form id="addUserForm" class="modal edit-layout" novalidate>
                    <div class="modal-title"><h2>Add User</h2></div>
                    <div class="form-grid">
                        <label class="required-field">Username<span class="required-marker" aria-hidden="true">*</span><input id="addUsername" name="username" maxlength="40" autocomplete="off" placeholder="e.g. ravi.kumar" aria-required="true"></label>
                        <label class="required-field">Full Name<span class="required-marker" aria-hidden="true">*</span><input id="addFullName" name="fullName" maxlength="80" placeholder="Enter full name" aria-required="true"></label>
                        <label class="required-field">Role<span class="required-marker" aria-hidden="true">*</span><select id="addRole" name="role" aria-required="true"><option value="">Select role</option>${roleEntries().map(function (role) {
                            return `<option value="${escapeHTML(role.key)}">${escapeHTML(role.name)}</option>`;
                        }).join("")}</select></label>
                        <div class="account-status-field">
                            <span class="field-label">Account Status</span>
                            <div class="account-status"><span id="addStatusText">Active</span><button id="addStatusToggle" class="toggle on" type="button" role="switch" aria-checked="true" aria-label="Toggle account status"><i></i></button></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" id="cancelAddUser" class="secondary">Cancel</button><button type="submit" class="primary">Add User</button></div>
                </form>
            </div>

            <div id="viewModal" class="modal-overlay">
                <section class="modal profile-card" role="dialog" aria-modal="true" aria-labelledby="viewTitle">
                    <div class="profile-title"><h2 id="viewTitle">User Profile</h2></div>
                    <div class="profile-hero">
                        <div id="viewInitials" class="large-avatar" aria-hidden="true"></div>
                        <div class="user-identity-details">
                            <h3 id="viewFullName"></h3>
                            <p><span>Username</span><strong id="viewUsername"></strong></p>
                            <div class="profile-badges"><span id="viewRole" class="user-role-badge"></span><span id="viewStatus" class="status-pill"></span></div>
                        </div>
                    </div>
                    <div class="profile-details user-profile-details">
                        <div><span>User ID</span><strong id="viewUserId"></strong></div>
                    </div>
                    <div class="view-footer"><button type="button" id="closeViewBtn" class="primary close-profile-btn">Close</button></div>
                </section>
            </div>

            <div id="editModal" class="modal-overlay">
                <form id="editUserForm" class="modal edit-layout" novalidate>
                    <div class="modal-title"><h2>Edit User</h2></div>
                    <div class="form-grid">
                        <label>Username<input id="editUsername" disabled></label>
                        <label class="required-field">Full Name<span class="required-marker" aria-hidden="true">*</span><input id="editFullName" maxlength="80" aria-required="true"></label>
                        <label>Role<select id="editRole" disabled></select></label>
                        <label class="full">Account Status<div class="account-status"><div><p>Enable or disable this user's application access.</p></div><div class="toggle-row"><span id="editStatusText"></span><button id="editStatusToggle" class="toggle" type="button" role="switch" aria-checked="false"><i></i></button></div></div></label>
                    </div>
                    <div class="modal-footer"><button type="button" id="cancelEditBtn" class="secondary">Cancel</button><button type="submit" class="primary">Save Changes</button></div>
                </form>
            </div>`;
    }

    function getFilteredUsers() {
        const term = state.filters.search.toLowerCase();
        return state.users.filter(function (user) {
            return (state.status === "all" || user.status === state.status) &&
                (!state.filters.role || user.role === state.filters.role) &&
                (!term || (user.username + " " + user.fullName + " " + roleName(user.role)).toLowerCase().includes(term));
        }).sort(function (a, b) {
            const first = state.sortBy === "role" ? roleName(a.role) : a[state.sortBy];
            const second = state.sortBy === "role" ? roleName(b.role) : b[state.sortBy];
            const result = String(first || "").localeCompare(String(second || ""), undefined, { numeric: true, sensitivity: "base" });
            return state.sortAscending ? result : -result;
        });
    }

    function initials(value) {
        return String(value || "").trim().split(/\s+/).slice(0, 2).map(function (part) {
            return part.charAt(0);
        }).join("").toUpperCase();
    }

    function statusClass(status) {
        return status === "Active" ? "active" : "inactive";
    }

    function render() {
        const filteredUsers = getFilteredUsers();
        const users = pagination.paginate(filteredUsers);
        const active = state.users.filter(function (user) { return user.status === "Active"; }).length;
        $("allCount").textContent = state.users.length;
        $("activeCount").textContent = active;
        $("inactiveCount").textContent = state.users.length - active;
        $("userTableBody").innerHTML = users.map(function (user) {
            return `<tr>
                <td data-column="0">${escapeHTML(user.username)}</td>
                <td data-column="1">${escapeHTML(user.fullName)}</td>
                <td data-column="2">${escapeHTML(roleName(user.role))}</td>
                <td data-column="3"><span class="status-pill ${statusClass(user.status)}">${escapeHTML(user.status)}</span></td>
                <td><div class="action-buttons">
                    <button type="button" class="view-btn" data-action="view" data-id="${escapeHTML(user.id)}">View</button>
                    ${canUpdateUsers() ? `<button type="button" class="edit-btn" data-action="edit" data-id="${escapeHTML(user.id)}">Edit</button>` : ""}
                </div></td>
            </tr>`;
        }).join("");
        $("emptyState").style.display = filteredUsers.length ? "none" : "block";
        COLUMNS.forEach(function (column, index) {
            const visible = state.visibleColumns[column[0]];
            app.querySelectorAll(`th[data-column="${index}"],td[data-column="${index}"]`).forEach(function (cell) {
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
        const status = $(prefix + "StatusToggle").classList.contains("on") ? "Inactive" : "Active";
        setToggle(prefix, status);
    }

    function viewUser(id) {
        const user = state.users.find(function (item) { return item.id === id; });
        if (!user) return;
        $("viewInitials").textContent = initials(user.fullName);
        $("viewFullName").textContent = user.fullName;
        $("viewUsername").textContent = user.username;
        $("viewUserId").textContent = user.id;
        $("viewRole").textContent = "Role: " + roleName(user.role);
        $("viewStatus").textContent = user.status;
        $("viewStatus").className = "status-pill " + statusClass(user.status);
        setModal("viewModal", true);
    }

    function editUser(id) {
        if (!canUpdateUsers()) {
            toast("You do not have permission to edit users.");
            return;
        }
        const user = state.users.find(function (item) { return item.id === id; });
        if (!user) return;
        state.editingId = id;
        $("editUsername").value = user.username;
        $("editFullName").value = user.fullName;
        $("editRole").innerHTML = `<option>${escapeHTML(roleName(user.role))}</option>`;
        setToggle("edit", user.status);
        setModal("editModal", true);
    }

    function newId() {
        const max = state.users.reduce(function (current, user) {
            const match = String(user.id).match(/(\d+)$/);
            return Math.max(current, match ? Number(match[1]) : 0);
        }, 0);
        return "USR" + String(max + 1).padStart(3, "0");
    }

    function openAddUser() {
        if (!canCreateUsers()) {
            toast("You do not have permission to add users.");
            return;
        }
        $("addUserForm").reset();
        setToggle("add", "Active");
        setModal("addUserModal", true);
    }

    function applyFilters() {
        state.filters = {
            search: $("searchKeyword").value.trim().toLowerCase(),
            role: $("roleFilter").value
        };
        pagination.reset();
        setModal("filterOverlay", false);
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
            state.sortAscending = state.sortBy === field ? !state.sortAscending : true;
            state.sortBy = field;
            render();
            return;
        }
        const button = event.target.closest("button");
        if (!button || !app.contains(button)) return;
        const action = button.dataset.action;
        if (action === "view") viewUser(button.dataset.id);
        if (action === "edit") editUser(button.dataset.id);
        if (button.id === "openFilterBtn") {
            $("searchKeyword").value = state.filters.search;
            $("roleFilter").value = state.filters.role;
            app.querySelectorAll(".column-toggle").forEach(function (input) {
                input.checked = state.visibleColumns[COLUMNS[Number(input.dataset.column)][0]];
            });
            setModal("filterOverlay", true);
        }
        if (button.id === "closeFilterBtn") setModal("filterOverlay", false);
        if (button.id === "applyFilterBtn") applyFilters();
        if (button.id === "resetFilterBtn") {
            $("searchKeyword").value = "";
            $("roleFilter").value = "";
            app.querySelectorAll(".column-toggle").forEach(function (input) { input.checked = true; });
            state.visibleColumns = { username: true, fullName: true, role: true, status: true };
            state.filters = { search: "", role: "" };
            pagination.reset();
            setModal("filterOverlay", false);
            render();
        }
        if (button.id === "openAddUserBtn") openAddUser();
        if (button.id === "cancelAddUser") setModal("addUserModal", false);
        if (button.id === "cancelEditBtn") setModal("editModal", false);
        if (button.id === "closeViewBtn") setModal("viewModal", false);
        if (button.id === "addStatusToggle") toggleStatus("add");
        if (button.id === "editStatusToggle") toggleStatus("edit");
        if (button.dataset.status) {
            state.status = button.dataset.status;
            pagination.reset();
            render();
        }
    }

    function handleChange(event) {
        if (!event.target.classList.contains("column-toggle")) return;
        const column = COLUMNS[Number(event.target.dataset.column)][0];
        state.visibleColumns[column] = event.target.checked;
        render();
    }

    function handleKeydown(event) {
        if (event.target.id === "searchKeyword" && event.key === "Enter") {
            event.preventDefault();
            applyFilters();
        }
    }

    function handleSubmit(event) {
        if (event.target.id === "addUserForm") {
            event.preventDefault();
            if (!canCreateUsers()) {
                toast("You do not have permission to add users.");
                return;
            }
            const username = $("addUsername").value.trim();
            const fullName = $("addFullName").value.trim();
            const role = $("addRole").value;
            if (!username) {
                toast("Username is required.");
                $("addUsername").focus();
                return;
            }
            if (!fullName) {
                toast("Full Name is required.");
                $("addFullName").focus();
                return;
            }
            if (!role) {
                toast("Role is required.");
                $("addRole").focus();
                return;
            }
            if (state.users.some(function (user) { return user.username.toLowerCase() === username.toLowerCase(); })) {
                toast("Username already exists.");
                return;
            }
            state.users.push({
                id: newId(),
                username: username,
                fullName: fullName,
                role: role,
                status: $("addStatusToggle").classList.contains("on") ? "Active" : "Inactive"
            });
            if (!saveUsers()) {
                state.users.pop();
                return;
            }
            setModal("addUserModal", false);
            state.status = "all";
            state.filters = { search: "", role: "" };
            pagination.reset();
            toast("User added successfully.");
            render();
        }
        if (event.target.id === "editUserForm") {
            event.preventDefault();
            if (!canUpdateUsers()) {
                toast("You do not have permission to edit users.");
                return;
            }
            const user = state.users.find(function (item) { return item.id === state.editingId; });
            const fullName = $("editFullName").value.trim();
            if (!user) return;
            if (!fullName) {
                toast("Full Name is required.");
                $("editFullName").focus();
                return;
            }
            const previous = { fullName: user.fullName, status: user.status };
            user.fullName = fullName;
            user.status = $("editStatusToggle").classList.contains("on") ? "Active" : "Inactive";
            if (!saveUsers()) {
                user.fullName = previous.fullName;
                user.status = previous.status;
                return;
            }
            setModal("editModal", false);
            toast("User updated successfully.");
            render();
        }
    }

    function renderAccessDenied() {
        app.innerHTML = `<section class="content-card"><div class="empty-state" style="display:block">
            <strong>Access Restricted</strong><p>Only an authorized administrator can access Manage Users.</p>
        </div></section>`;
    }

    function initManageUsersModule() {
        app = document.getElementById("manageUsersApp");
        if (!app || app.dataset.initialized === "true") return;
        app.dataset.initialized = "true";
        if (!canReadUsers()) {
            renderAccessDenied();
            return;
        }
        state.users = loadUsers();
        state.status = "all";
        state.filters = { search: "", role: "" };
        state.visibleColumns = { username: true, fullName: true, role: true, status: true };
        state.sortBy = "username";
        state.sortAscending = true;
        app.innerHTML = markup();
        pagination = window.createTablePagination($("userPagination"), render, "Manage Users pagination");
        app.addEventListener("click", handleClick);
        app.addEventListener("change", handleChange);
        app.addEventListener("keydown", handleKeydown);
        app.addEventListener("submit", handleSubmit);
        render();
    }

    window.getManageUsersData = loadUsers;
    window.initManageUsersModule = initManageUsersModule;
})();
