window.initManageReportTemplatesModule = function () {
    const root = document.getElementById("reportTemplatesApp");

    if (!root || root.dataset.initialized === "true") {
        return;
    }

    const role = typeof window.getCurrentRole === "function"
        ? window.getCurrentRole()
        : "";
    const canRead = typeof window.canRead !== "function" ||
        window.canRead(role, "report-templates");

    if (!canRead) {
        root.innerHTML = "<p role=\"alert\">You do not have permission to view Report Templates.</p>";
        return;
    }

    const canEdit = typeof window.canUpdate !== "function" ||
        window.canUpdate(role, "report-templates");
    const canCreate = typeof window.canCreate !== "function" ||
        window.canCreate(role, "report-templates");
    const storageKey = "baseltrack-report-templates";
    const defaultTemplates = [
        {
            id: 1,
            code: "B4C_001",
            name: "Capital Adequacy Ratio Template",
            description: "Minimum capital adequacy reporting template used for Basel IV regulatory submissions.",
            status: "Active",
            version: "v1.4",
            template: "Capital Adequacy Ratio\n\nReporting Period: {{reporting_period}}\nRegulator: {{regulator}}\n\n1. CET1 Capital: {{cet1}}\n2. Tier 1 Capital: {{tier1}}\n3. Total Capital: {{total_capital}}\n4. RWA: {{rwa}}\n\nCapital Adequacy Ratio: {{car_percent}}%"
        },
        {
            id: 2,
            code: "B4C_002",
            name: "Liquidity Coverage Ratio Template",
            description: "Liquidity coverage template for short-term liquid asset adequacy reporting.",
            status: "Active",
            version: "v1.2",
            template: "Liquidity Coverage Ratio\n\nReporting Period: {{reporting_period}}\nHigh Quality Liquid Assets: {{hqla}}\nNet Cash Outflows: {{net_cash_outflows}}\n\nLCR: {{lcr_percent}}%"
        },
        {
            id: 3,
            code: "B4C_003",
            name: "Operational Risk RWA Template",
            description: "Operational risk weighted asset estimation template for bank operations.",
            status: "Inactive",
            version: "v1.0",
            template: "Operational Risk RWA\n\nBusiness Indicator: {{business_indicator}}\nInternal Loss Multiplier: {{ilm}}\nOperational Risk RWA: {{op_risk_rwa}}"
        },
        {
            id: 4,
            code: "B4C_004",
            name: "Leverage Ratio Template",
            description: "Template for leverage ratio monitoring and submission to regulators.",
            status: "Active",
            version: "v2.0",
            template: "Leverage Ratio\n\nTier 1 Capital: {{tier1_capital}}\nExposure Measure: {{exposure_measure}}\nLeverage Ratio: {{leverage_ratio}}%"
        }
    ];

    function byId(id) {
        return root.querySelector("#" + id);
    }

    function isValidTemplateList(value) {
        return Array.isArray(value) && value.every(function (template) {
            return template &&
                Number.isInteger(template.id) &&
                typeof template.code === "string" &&
                typeof template.name === "string" &&
                typeof template.description === "string" &&
                (template.status === "Active" || template.status === "Inactive") &&
                typeof template.version === "string" &&
                typeof template.template === "string";
        });
    }

    function notifyUser(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            console.warn("Report Templates:", message);
        }
    }

    function loadTemplates() {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored === null) {
                return defaultTemplates.map(function (template) {
                    return { ...template };
                });
            }

            const parsed = JSON.parse(stored);
            if (!isValidTemplateList(parsed)) {
                throw new Error("Stored report template data has an invalid shape.");
            }
            return parsed;
        } catch (error) {
            console.error("Unable to load saved report templates:", error);
            notifyUser("Saved templates could not be loaded. The original catalog will be shown.");
            return defaultTemplates.map(function (template) {
                return { ...template };
            });
        }
    }

    function saveTemplates(nextTemplates) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(nextTemplates));
            return true;
        } catch (error) {
            console.error("Unable to save report templates:", error);
            notifyUser("Unable to save template changes in this browser.");
            return false;
        }
    }

    let templates = loadTemplates();
    let currentStatus = "all";
    let searchTerm = "";
    const sortState = {};
    let editingId = null;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>\"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character];
        });
    }

    function renderCounts() {
        byId("allCount").textContent = templates.length;
        byId("activeCount").textContent = templates.filter(function (template) {
            return template.status === "Active";
        }).length;
        byId("inactiveCount").textContent = templates.filter(function (template) {
            return template.status === "Inactive";
        }).length;
    }

    function filteredTemplates() {
        return templates.filter(function (template) {
            const haystack = (template.code + " " + template.name + " " + (template.description || "")).toLowerCase();
            return (currentStatus === "all" || template.status === currentStatus) &&
                (!searchTerm || haystack.includes(searchTerm));
        });
    }

    function renderTable() {
        const data = filteredTemplates();
        byId("reportBody").innerHTML = data.map(function (template) {
            return `<tr>
                <td>${escapeHTML(template.code)}</td>
                <td>${escapeHTML(template.name)}</td>
                <td>${escapeHTML(template.description || "")}</td>
                <td><span class="status ${template.status.toLowerCase()}">${escapeHTML(template.status)}</span></td>
                <td><div class="action-buttons">
                    <button class="view-btn" type="button" data-action="view" data-id="${template.id}">View</button>
                    ${canEdit ? `<button class="edit-btn" type="button" data-action="edit" data-id="${template.id}">Edit</button>` : ""}
                </div></td>
            </tr>`;
        }).join("");
        byId("emptyState").style.display = data.length ? "none" : "block";
    }

    function setStatus(status) {
        const active = status === "Active";
        const toggle = byId("editStatus");
        toggle.classList.toggle("on", active);
        toggle.setAttribute("aria-checked", String(active));
        byId("editStatusText").textContent = status;
    }

    function openView(id) {
        const template = templates.find(function (item) {
            return item.id === id;
        });
        if (!template) {
            return;
        }

        byId("viewName").textContent = template.name;
        byId("viewCode").textContent = template.code;
        byId("viewStatus").textContent = template.status;
        byId("viewVersion").textContent = template.version;
        byId("viewDescription").textContent = template.description || "-";
        byId("viewTemplate").textContent = template.template;
        byId("viewModal").classList.add("show");
    }

    function openEdit(id) {
        if (!canEdit) {
            return;
        }

        const template = templates.find(function (item) {
            return item.id === id;
        });
        if (!template) {
            return;
        }

        editingId = id;
        byId("editCode").value = template.code;
        byId("editName").value = template.name;
        byId("editDescription").value = template.description || "";
        byId("editTemplate").value = template.template;
        byId("editTemplateError").hidden = true;
        byId("editTemplateError").textContent = "";
        setStatus(template.status);
        updateCharacterCount();
        byId("editModal").classList.add("show");
    }

    function openCreate() {
        if (!canCreate) {
            return;
        }
        editingId = null;
        byId("createTemplateError").hidden = true;
        byId("createTemplateError").textContent = "";
        byId("newCode").value = "";
        byId("newName").value = "";
        byId("newDescription").value = "";
        byId("newStatus").value = "Active";
        byId("createModal").classList.add("show");
        byId("newCode").focus();
    }

    function saveNewTemplate() {
        const code = byId("newCode").value.trim();
        const name = byId("newName").value.trim();
        const description = byId("newDescription").value.trim();
        const status = byId("newStatus").value === "Active" ? "Active" : "Inactive";
        const error = byId("createTemplateError");
        error.hidden = true;

        if (!code || !name) {
            error.textContent = "Report Code and Report Title are required.";
            error.hidden = false;
            return;
        }

        if (templates.some(function (template) {
            return template.code.toLowerCase() === code.toLowerCase();
        })) {
            error.textContent = "A report template with this code already exists.";
            error.hidden = false;
            return;
        }

        const nextTemplates = templates.concat([{
            id: Date.now(),
            code: code,
            name: name,
            description: description || "General regulatory template.",
            status: status,
            version: "v1.0",
            template: "# " + name + "\n\nReporting Period: {{reporting_period}}\nRegulator: {{regulator}}\n\nDescription: " + (description || "General regulatory template.")
        }]);

        if (!saveTemplates(nextTemplates)) {
            return;
        }

        templates = nextTemplates;
        byId("createModal").classList.remove("show");
        renderCounts();
        renderTable();
    }

    function updateTemplate() {
        const templateIndex = templates.findIndex(function (item) {
            return item.id === editingId;
        });
        if (templateIndex < 0) {
            return;
        }

        const name = byId("editName").value.trim();
        const content = byId("editTemplate").value.trim();
        const description = byId("editDescription").value.trim();
        const error = byId("editTemplateError");
        error.hidden = true;
        if (!name || !content) {
            error.textContent = "Report Name and Report Template are required.";
            error.hidden = false;
            return;
        }

        const current = templates[templateIndex];
        const version = Number((current.version || "v1.0").replace("v", "")) + 0.1;
        const nextTemplates = templates.map(function (item, index) {
            if (index !== templateIndex) {
                return item;
            }
            return {
                ...item,
                name: name,
                description: description || item.description || "General regulatory template.",
                template: content,
                status: byId("editStatus").classList.contains("on") ? "Active" : "Inactive",
                version: "v" + version.toFixed(1)
            };
        });

        if (!saveTemplates(nextTemplates)) {
            return;
        }

        templates = nextTemplates;
        byId("editModal").classList.remove("show");
        renderCounts();
        renderTable();
    }

    function updateCharacterCount() {
        byId("charCount").textContent = byId("editTemplate").value.length + " characters";
    }

    function sortBy(key) {
        const ascending = sortState[key] !== true;
        sortState[key] = ascending;
        templates.sort(function (first, second) {
            return ascending
                ? String(first[key]).localeCompare(String(second[key]))
                : String(second[key]).localeCompare(String(first[key]));
        });
        renderTable();
    }

    function insertAtCursor(before, after) {
        const editor = byId("editTemplate");
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selected = editor.value.slice(start, end);
        editor.value = editor.value.slice(0, start) + before + selected + after + editor.value.slice(end);
        editor.focus();
        editor.selectionStart = start + before.length;
        editor.selectionEnd = start + before.length + selected.length;
        updateCharacterCount();
    }

    function closeModal(id) {
        const modal = byId(id);
        if (modal) { modal.classList.remove("show"); }
    }

    const addModal = document.createElement("div");
    addModal.className = "modal-overlay";
    addModal.id = "createModal";
    addModal.innerHTML = `
        <form class="modal edit-card" role="dialog" aria-modal="true" aria-labelledby="createTitle" novalidate>
            <div class="panel-head">
                <div>
                    <h2 id="createTitle">Create Report Template</h2>
                    <p>Define a regulatory template for a report and assign its lifecycle status.</p>
                </div>
                <button id="closeCreate" type="button">✕</button>
            </div>
            <div class="form-grid">
                <label class="required-field">Report Code <span class="required-marker" aria-hidden="true">*</span><input id="newCode" maxlength="40" placeholder="B4C_005" required></label>
                <label class="required-field">Report Title <span class="required-marker" aria-hidden="true">*</span><input id="newName" maxlength="120" placeholder="New regulatory report" required></label>
                <label class="full">Description<textarea id="newDescription" rows="3" maxlength="1000" placeholder="Describe the purpose and reporting use case."></textarea></label>
                <label>Status
                    <select id="newStatus">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </label>
            </div>
            <p class="form-error" id="createTemplateError" role="alert" hidden></p>
            <div class="modal-actions">
                <button class="secondary" id="cancelCreate" type="button">Cancel</button>
                <button class="primary" id="saveNewTemplate" type="submit">Save Template</button>
            </div>
        </form>
    `;
    root.appendChild(addModal);

    renderCounts();
    renderTable();

    root.querySelectorAll(".tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            root.querySelectorAll(".tab").forEach(function (item) {
                item.classList.toggle("active", item === tab);
            });
            currentStatus = tab.dataset.status;
            renderTable();
        });
    });

    root.querySelectorAll(".sortable").forEach(function (heading) {
        heading.addEventListener("click", function () {
            sortBy(heading.dataset.key);
        });
    });

    byId("templateSearch").addEventListener("input", function (event) {
        searchTerm = event.target.value.trim().toLowerCase();
        renderTable();
    });

    byId("reportBody").addEventListener("click", function (event) {
        const button = event.target.closest("[data-action]");
        if (!button) {
            return;
        }

        const id = Number(button.dataset.id);
        if (button.dataset.action === "view") {
            openView(id);
        } else if (button.dataset.action === "edit") {
            openEdit(id);
        }
    });

    byId("createTemplateBtn").hidden = !canCreate;
    byId("createTemplateBtn").addEventListener("click", openCreate);
    byId("editStatus").addEventListener("click", function () {
        setStatus(byId("editStatus").classList.contains("on") ? "Inactive" : "Active");
    });
    byId("editTemplate").addEventListener("input", updateCharacterCount);
    byId("updateTemplate").addEventListener("click", updateTemplate);
    byId("createModal").querySelector("form").addEventListener("submit", function (event) {
        event.preventDefault();
        saveNewTemplate();
    });
    byId("closeCreate").addEventListener("click", function () { closeModal("createModal"); });
    byId("cancelCreate").addEventListener("click", function () { closeModal("createModal"); });

    root.querySelectorAll(".editor-tools button").forEach(function (button) {
        button.addEventListener("click", function () {
            if (button.dataset.wrap) {
                const parts = button.dataset.wrap.split("|");
                insertAtCursor(parts[0], parts[1] || "");
            } else {
                insertAtCursor(button.dataset.prefix || "", "");
            }
        });
    });

    ["closeView", "closeViewBottom"].forEach(function (id) {
        const closeButton = byId(id);
        if (closeButton) {
            closeButton.addEventListener("click", function () {
                closeModal("viewModal");
            });
        }
    });
    ["closeEdit", "cancelEdit"].forEach(function (id) {
        const closeButton = byId(id);
        if (closeButton) {
            closeButton.addEventListener("click", function () {
                closeModal("editModal");
            });
        }
    });

    root.querySelectorAll(".modal-overlay").forEach(function (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                modal.classList.remove("show");
            }
        });
    });

    root.dataset.initialized = "true";
};
