(function () {
    "use strict";

    const STORAGE_KEY = "baseltrack-role-directory-v1";
    const ROLE_IDS = {
        superadmin: "ROL001",
        doa: "ROL002",
        dqa: "ROL003",
        rra: "ROL004",
        risk: "ROL005",
        finance: "ROL006",
        compliance: "ROL007",
        manager: "ROL008",
        regulatoryAdmin: "ROL009",
        rr: "ROL010",
        auditor: "ROL011"
    };
    const SORTABLE = ["roleId", "roleName", "description", "users", "status"];
    const COLUMNS = [
        ["roleId", "Role ID"],
        ["roleName", "Role Name"],
        ["description", "Description"],
        ["users", "Users"],
        ["status", "Status"]
    ];
    const state = {
        roles: [],
        status: "all",
        search: "",
        visibleColumns: { roleId: true, roleName: true, description: true, users: true, status: true },
        sortBy: "roleId",
        sortAscending: true,
        editingKey: null
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

    function currentRoleKey() {
        return typeof window.getCurrentRole === "function"
            ? window.getCurrentRole()
            : localStorage.getItem("baseltrack-role") || "";
    }

    function canReadRoles() {
        const role = currentRoleKey();
        return role === "superadmin" &&
            (typeof window.canRead !== "function" || window.canRead(role, "manage-role"));
    }

    function canUpdateRoles() {
        const role = currentRoleKey();
        return role === "superadmin" &&
            (typeof window.canUpdate !== "function" || window.canUpdate(role, "manage-role"));
    }

    function loadMetadata() {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            if (!value) return {};
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            console.error("Unable to load role metadata:", error);
            return {};
        }
    }

    function assignedUserCount(key) {
        const users = typeof window.getManageUsersData === "function"
            ? window.getManageUsersData()
            : [];
        return users.filter(function (user) { return user.role === key; }).length;
    }

    function initializeRoles() {
        const metadata = loadMetadata();
        const config = window.ROLE_CONFIG || {};
        state.roles = Object.keys(ROLE_IDS).map(function (key) {
            const saved = metadata[key] || {};
            const roleConfig = config[key] || {};
            const role = {
                key: key,
                id: ROLE_IDS[key],
                name: saved.name || roleConfig.name || key,
                description: saved.description || roleConfig.description || "Application role.",
                status: saved.status === "Inactive" ? "Inactive" : "Active",
                users: assignedUserCount(key)
            };
            if (roleConfig.name) roleConfig.name = role.name;
            if (roleConfig.description) roleConfig.description = role.description;
            return role;
        });
    }

    function markup() {
        return `
            <section class="content-card">
                    <div class="page-header role-page-header"><div>
                        <h1>Role Management</h1>
                        <p>Manage BaselTrack roles, descriptions, assigned users and account availability.</p>
                    </div><div class="role-header-actions">
                        <button type="button" id="openRoleFilterBtn" class="filter-btn">Filter</button>
                    </div></div>
                    <div class="role-toolbar">
                        <div class="summary-tabs" role="tablist" aria-label="Filter roles by status">
                            <button type="button" class="summary-tab active" data-status="all">All (<span id="allCount">0</span>)</button>
                            <button type="button" class="summary-tab" data-status="Active">Active (<span id="activeCount">0</span>)</button>
                            <button type="button" class="summary-tab" data-status="Inactive">Inactive (<span id="inactiveCount">0</span>)</button>
                        </div>
                    </div>
                    <div class="table-wrap">
                        <table><thead><tr>
                            ${COLUMNS.map(function (column) {
                                return `<th class="sortable" data-column="${column[0]}" data-field="${column[0]}">${column[1]} <span>▲▼</span></th>`;
                            }).join("")}
                            <th class="actions-head">Actions</th>
                        </tr></thead><tbody id="roleTableBody"></tbody></table>
                        <div id="emptyState" class="empty-state">No roles match the current filters.</div>
                    </div>
                    <div id="rolePagination"></div>
            </section>
            <div id="roleFilterOverlay" class="filter-overlay">
                <section class="filter-panel" role="dialog" aria-modal="true" aria-labelledby="roleFilterTitle">
                    <div class="panel-head">
                        <div><h2 id="roleFilterTitle">Filter Roles</h2><p>Search role details and choose visible columns.</p></div>
                        <button type="button" id="closeRoleFilterBtn" aria-label="Close filter">✕</button>
                    </div>
                    <label>Role ID, Name or Description<input id="roleSearch" aria-label="Role ID, Name or Description" placeholder="Search role ID, name or description"></label>
                    <div class="column-filter">
                        <span class="filter-label">Column Visibility</span>
                        <div class="column-options">${COLUMNS.map(function (column) {
                            return `<label><input type="checkbox" class="column-toggle" data-column="${column[0]}" checked><span>${column[1]}</span></label>`;
                        }).join("")}</div>
                    </div>
                    <div class="filter-actions"><button type="button" id="resetRoleFilterBtn" class="secondary">Reset</button><button type="button" id="applyRoleFilterBtn" class="primary">Apply</button></div>
                </section>
            </div>
            <div id="viewModal" class="modal-overlay">
                <section class="modal role-profile" role="dialog" aria-modal="true" aria-labelledby="viewTitle">
                    <div class="profile-title"><h2 id="viewTitle">Role Profile</h2></div>
                    <div class="role-identity">
                        <div id="viewInitials" class="large-avatar" aria-hidden="true"></div>
                        <div class="role-identity-details">
                            <h3 id="viewRoleName"></h3>
                            <p><span>Role ID</span><strong id="viewRoleId"></strong></p>
                            <p class="role-status"><span>Role Status</span><strong id="viewStatus" class="status-pill"></strong></p>
                        </div>
                    </div>
                    <div class="profile-details">
                        <div><span>Description</span><p id="viewDescription"></p></div>
                        <div><span>Users Assigned</span><strong id="viewUsers"></strong></div>
                    </div>
                    <div class="view-footer"><button type="button" id="closeViewBtn" class="primary close-profile-btn">Close</button></div>
                </section>
            </div>
            <div id="editModal" class="modal-overlay">
                <form id="editRoleForm" class="modal edit-layout" novalidate>
                    <div class="modal-title"><h2>Edit Role</h2></div>
                    <div class="form-grid">
                        <label>Role ID<input id="editRoleId" disabled></label>
                        <label>Role Name<input id="editRoleName" disabled></label>
                        <label class="full required-field">Description<span class="required-marker" aria-hidden="true">*</span><textarea id="editDescription" rows="3" maxlength="300" aria-required="true"></textarea></label>
                        <label>Users Assigned<input id="editUsers" type="number" min="0" disabled></label>
                        <div class="role-status-field full">
                            <span class="field-label">Role Status</span>
                            <div class="account-status">
                                <span id="editStatusText"></span>
                                <button id="editStatusToggle" class="toggle" type="button" role="switch" aria-checked="false" aria-label="Toggle role status"><i></i></button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" id="cancelEditBtn" class="secondary">Cancel</button><button type="submit" class="primary">Save Changes</button></div>
                </form>
            </div>`;
    }

    function filteredRoles() {
        const term = state.search.toLowerCase();
        return state.roles.filter(function (role) {
            return (state.status === "all" || role.status === state.status) &&
                (!term || (role.id + " " + role.name + " " + role.description).toLowerCase().includes(term));
        }).sort(function (a, b) {
            const keys = { roleId: "id", roleName: "name" };
            const key = keys[state.sortBy] || state.sortBy;
            const first = a[key];
            const second = b[key];
            const result = typeof first === "number" ? first - second :
                String(first || "").localeCompare(String(second || ""), undefined, { numeric: true, sensitivity: "base" });
            return state.sortAscending ? result : -result;
        });
    }

    function initials(value) {
        return String(value || "").split(/[_\s-]+/).filter(Boolean).slice(0, 2).map(function (part) {
            return part.charAt(0);
        }).join("").toUpperCase();
    }

    function render() {
        const filtered = filteredRoles();
        const roles = pagination.paginate(filtered);
        const active = state.roles.filter(function (role) { return role.status === "Active"; }).length;
        $("allCount").textContent = state.roles.length;
        $("activeCount").textContent = active;
        $("inactiveCount").textContent = state.roles.length - active;
        $("roleTableBody").innerHTML = roles.map(function (role) {
            return `<tr>
                <td data-column="roleId">${escapeHTML(role.id)}</td>
                <td data-column="roleName"><span class="role-name">${escapeHTML(role.name)}</span></td>
                <td data-column="description"><span class="role-description" title="${escapeHTML(role.description)}">${escapeHTML(role.description)}</span></td>
                <td data-column="users"><span class="user-count">${role.users}</span></td>
                <td data-column="status"><span class="status-pill ${role.status.toLowerCase()}">${escapeHTML(role.status)}</span></td>
                <td><div class="action-buttons">
                    <button type="button" class="view-btn" data-action="view" data-role="${escapeHTML(role.key)}">View</button>
                    ${canUpdateRoles() ? `<button type="button" class="edit-btn" data-action="edit" data-role="${escapeHTML(role.key)}">Edit</button>` : ""}
                </div></td>
            </tr>`;
        }).join("");
        $("emptyState").style.display = filtered.length ? "none" : "block";
        COLUMNS.forEach(function (column) {
            const visible = state.visibleColumns[column[0]];
            app.querySelectorAll(`[data-column="${column[0]}"]`).forEach(function (cell) {
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

    function getRole(key) {
        return state.roles.find(function (role) { return role.key === key; });
    }

    function viewRole(key) {
        const role = getRole(key);
        if (!role) {
            toast("Role not found.");
            return;
        }
        $("viewInitials").textContent = initials(role.key);
        $("viewRoleName").textContent = role.name;
        $("viewRoleId").textContent = role.id;
        $("viewDescription").textContent = role.description;
        $("viewUsers").textContent = role.users + (role.users === 1 ? " user" : " users");
        $("viewStatus").textContent = role.status;
        $("viewStatus").className = "status-pill " + role.status.toLowerCase();
        setModal("viewModal", true);
    }

    function setToggle(status) {
        const active = status === "Active";
        const button = $("editStatusToggle");
        button.classList.toggle("on", active);
        button.setAttribute("aria-checked", String(active));
        $("editStatusText").textContent = status;
    }

    function editRole(key) {
        if (!canUpdateRoles()) {
            toast("You do not have permission to edit roles.");
            return;
        }
        const role = getRole(key);
        if (!role) {
            toast("Role not found.");
            return;
        }
        state.editingKey = key;
        $("editRoleId").value = role.id;
        $("editRoleName").value = role.name;
        $("editDescription").value = role.description;
        $("editUsers").value = role.users;
        setToggle(role.status);
        setModal("editModal", true);
    }

    function saveRole(event) {
        event.preventDefault();
        if (!canUpdateRoles()) {
            toast("You do not have permission to edit roles.");
            return;
        }
        const role = getRole(state.editingKey);
        if (!role) return;
        const description = $("editDescription").value.trim();
        if (!description) {
            toast("Description is required.");
            $("editDescription").focus();
            return;
        }
        const previous = { description: role.description, status: role.status };
        role.description = description;
        role.status = $("editStatusToggle").classList.contains("on") ? "Active" : "Inactive";
        const config = window.ROLE_CONFIG && window.ROLE_CONFIG[role.key];
        if (config) {
            config.description = role.description;
        }
        const metadata = {};
        state.roles.forEach(function (item) {
            metadata[item.key] = { name: item.name, description: item.description, status: item.status };
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
        } catch (error) {
            role.description = previous.description;
            role.status = previous.status;
            if (config) {
                config.description = previous.description;
            }
            console.error("Unable to save role metadata:", error);
            toast("Unable to save role changes.");
            return;
        }
        setModal("editModal", false);
        toast("Role updated successfully.");
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
            if (!SORTABLE.includes(field)) return;
            state.sortAscending = state.sortBy === field ? !state.sortAscending : true;
            state.sortBy = field;
            render();
            return;
        }
        const button = event.target.closest("button");
        if (!button || !app.contains(button)) return;
        if (button.dataset.action === "view") viewRole(button.dataset.role);
        if (button.dataset.action === "edit") editRole(button.dataset.role);
        if (button.id === "openRoleFilterBtn") {
            $("roleSearch").value = state.search;
            app.querySelectorAll(".column-toggle").forEach(function (input) {
                input.checked = state.visibleColumns[input.dataset.column];
            });
            setModal("roleFilterOverlay", true);
        }
        if (button.id === "closeRoleFilterBtn") setModal("roleFilterOverlay", false);
        if (button.id === "applyRoleFilterBtn") {
            state.search = $("roleSearch").value.trim();
            app.querySelectorAll(".column-toggle").forEach(function (input) {
                state.visibleColumns[input.dataset.column] = input.checked;
            });
            pagination.reset();
            setModal("roleFilterOverlay", false);
            render();
        }
        if (button.id === "resetRoleFilterBtn") {
            $("roleSearch").value = "";
            app.querySelectorAll(".column-toggle").forEach(function (input) {
                input.checked = true;
            });
            state.search = "";
            state.visibleColumns = { roleId: true, roleName: true, description: true, users: true, status: true };
            pagination.reset();
            setModal("roleFilterOverlay", false);
            render();
        }
        if (button.dataset.status) {
            state.status = button.dataset.status;
            pagination.reset();
            render();
        }
        if (button.id === "closeViewBtn" || button.id === "cancelEditBtn") {
            setModal(button.id === "closeViewBtn" ? "viewModal" : "editModal", false);
        }
        if (button.id === "editStatusToggle") {
            const status = button.classList.contains("on") ? "Inactive" : "Active";
            setToggle(status);
        }
    }

    function handleSubmit(event) {
        if (event.target.id === "editRoleForm") saveRole(event);
    }

    function renderAccessDenied() {
        app.innerHTML = `<section class="content-card"><div class="empty-state" style="display:block">
            <strong>Access Restricted</strong><p>Only the Super Admin can access Manage Roles.</p>
        </div></section>`;
    }

    function initManageRolesModule() {
        app = document.getElementById("manageRolesApp");
        if (!app || app.dataset.initialized === "true") return;
        app.dataset.initialized = "true";
        if (!canReadRoles()) {
            renderAccessDenied();
            return;
        }
        initializeRoles();
        state.status = "all";
        state.search = "";
        state.visibleColumns = { roleId: true, roleName: true, description: true, users: true, status: true };
        state.sortBy = "roleId";
        state.sortAscending = true;
        app.innerHTML = markup();
        pagination = window.createTablePagination($("rolePagination"), render, "Manage Roles pagination");
        app.addEventListener("click", handleClick);
        app.addEventListener("submit", handleSubmit);
        render();
    }

    window.initManageRolesModule = initManageRolesModule;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            if (document.getElementById("manageRolesApp")) initManageRolesModule();
        });
    } else if (document.getElementById("manageRolesApp")) {
        initManageRolesModule();
    }
})();
