/* =========================================================
   BASELTRACK - NAVIGATION & MODULE MANAGEMENT
   Works with direct file opening (file://). No fetch(), no iframe.
   Module HTML comes from <template> elements in workspace.html.
   Role permissions come from permissions.js.
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       MODULE REGISTRY
       pageId -> template id + init function name
       ===================================================== */

    const MODULES = {
        "manage-role": {
            template: "manageRolesTemplate",
            init: "initManageRolesModule"
        },
        "manage-user": {
            template: "manageUsersTemplate",
            init: "initManageUsersModule"
        },
        "module": {
            template: "moduleManagementTemplate",
            init: "initManageModulesModule"
        },
        "report-templates": {
            template: "reportTemplatesTemplate",
            init: "initManageReportTemplatesModule"
        },
        "reporting-calendar": {
            template: "reportingCalendarTemplate",
            init: "initReportingCalendarModule"
        },
        "audit-trail": {
            template: "auditTrailTemplate",
            init: "initAuditTrailModule"
        },
        "data-ingestion": {
            template: "feedMonitorTemplate",
            init: "initFeedMonitorModule"
        },
        "sla-escalations": {
            template: "slaEscalationsTemplate",
            init: "initSlaEscalationsModule"
        },
        "landing-zone": {
            template: "landingZoneTemplate",
            init: "initLandingZoneModule"
        },
        "ingestion-audit-log": {
            template: "ingestionAuditLogTemplate",
            init: "initIngestionAuditLogModule"
        },
        "operations-center": {
            template: "operationsCenterTemplate",
            init: "initOperationsCenterModule"
        },
        "file-intake-center": {
            template: "fileIntakeTemplate",
            init: "initFileIntakeModule"
        },
        "validation-results": {
            template: "validationResultsTemplate",
            init: "initValidationResultsModule"
        },
        "issue-workbench": {
            template: "issueWorkbenchTemplate",
            init: "initIssueWorkbenchModule"
        },
        "revalidation-center": {
            template: "revalidationCenterTemplate",
            init: "initRevalidationCenterModule"
        },
        "reporting-readiness": {
            template: "reportingReadinessTemplate",
            init: "initReportingReadinessModule"
        },
        "rwa-calculation": {
            template: "rwaCalculationTemplate",
            init: "initRWACalculationModule"
        },
        "liquidity-calculation": {
            template: "liquidityCalculationTemplate",
            init: "initLiquidityCalculationModule"
        },
        "capital-calculation": {
            template: "capitalCalculationTemplate",
            init: "initCapitalCalculationModule"
        },
        "leverage-calculation": {
            template: "leverageCalculationTemplate",
            init: "initLeverageCalculationModule"
        },
        "calculation-repository": {
            template: "calculationRepositoryTemplate",
            init: "initCalculationRepositoryModule"
        },
        "variance-analysis": {
            template: "varianceAnalysisTemplate",
            init: "initVarianceAnalysisModule"
        },
        "exception-management": {
            template: "exceptionManagementTemplate",
            init: "initExceptionManagementModule"
        },
        "investigation": {
            template: "investigationTemplate",
            init: "initInvestigationModule"
        },
        "evidence-repository": {
            template: "evidenceRepositoryTemplate",
            init: "initEvidenceRepositoryModule"
        },
        "approval-closure": {
            template: "approvalClosureTemplate",
            init: "initApprovalClosureModule"
        },
        "reconciliation-audit-logs": {
            template: "reconciliationAuditLogsTemplate",
            init: "initReconciliationAuditLogsModule"
        },
        "generate-report": {
            template: "generateReportsTemplate",
            init: "initGenerateReportsModule"
        },
        "manage-reports": {
            template: "manageReportsTemplate",
            init: "initManageReportsModule"
        },
        "reporting-dashboard": {
            template: "manageReportsTemplate",
            init: "initReportingDashboardModule"
        },
        "view-reports": {
            template: "manageReportsTemplate",
            init: "initViewReportsModule"
        },
        "raise-query": {
            template: "raiseQueryTemplate",
            init: "initRaiseQueryModule"
        },
        "manage-query": {
            template: "manageQueryTemplate",
            init: "initManageQueryModule"
        },
    };

    const PAGE_NAMES = {
        "manage-user": "Manage Users",
        "module": "Module Management",
        "report-templates": "Report Templates",
        "reporting-calendar": "Reporting Calendar",
        "system-configuration": "System Configuration",
        "audit-trail": "Audit Trail",

        "data-ingestion": "Feed Monitor",
        "sla-escalations": "SLA & Escalations",
        "landing-zone": "Landing Zone",
        "ingestion-audit-log": "Ingestion Audit Log",

        "operations-center": "Operations Center",
        "file-intake-center": "File Intake Center",
        "validation-results": "Validation Results",
        "issue-workbench": "Issue Workbench",
        "revalidation-center": "Revalidation Center",
        "reporting-readiness": "Reporting Readiness",

        "rwa-calculation": "Risk Weighted Assets Calculation",
        "liquidity-calculation": "Liquidity Calculation",
        "capital-calculation": "Capital Calculation",
        "leverage-calculation": "Leverage Calculation",
        "calculation-repository": "Calculation Repository",

        "variance-analysis": "Variance Analysis",
        "exception-management": "Exception Management",
        "investigation": "Investigation",
        "evidence-repository": "Evidence Repository",
        "approval-closure": "Approval and Closure",
        "reconciliation-audit-logs": "Reconciliation Audit Logs",

        "generate-report": "Generate Reports",

        "reporting-dashboard": "Reporting Dashboard",
        "manage-reports": "Manage Reports",
        "view-reports": "View Reports",
        "raise-query": "Raise Query",
        "manage-query": "Manage Queries"
    };

    /* =====================================================
       CURRENT ROLE
       ===================================================== */

    function getNavigationRole() {
        if (typeof window.getCurrentRole === "function") {
            return window.getCurrentRole();
        }

        try {
            const user = JSON.parse(
                localStorage.getItem("baseltrack-user") || "{}"
            );

            return user.role ||
                localStorage.getItem("baseltrack-role") ||
                "";

        } catch (error) {
            return localStorage.getItem("baseltrack-role") || "";
        }
    }

    /* =====================================================
       PAGE ACCESS
       ===================================================== */

    function canAccessPage(role, page) {
        if (!role || !page) {
            return false;
        }

        if (typeof window.canRead === "function") {
            return window.canRead(role, page);
        }

        console.warn(
            "BaselTrack: canRead() was not found in permissions.js."
        );

        return false;
    }

    function isNavigationItemVisible(element) {
        if (!element) {
            return false;
        }

        return !element.hidden &&
            getComputedStyle(element).display !== "none";
    }

    /* =====================================================
       ROLE-BASED SIDEBAR NAVIGATION
       ===================================================== */

    function applyRoleNavigation(role) {
        role = role || getNavigationRole();
        const sidebarNav = document.getElementById("sidebarNav");

        if (!role) {
            console.warn("BaselTrack: No current role found.");
            if (sidebarNav) {
                sidebarNav.querySelectorAll("[data-page]").forEach(function (link) {
                    link.hidden = true;
                });
                sidebarNav.querySelectorAll(
                    ".nav-group, .sidebar-group, .nav-section"
                ).forEach(function (group) {
                    group.hidden = true;
                });
            }
            document.querySelectorAll("[data-profile-action], #notificationToggle")
                .forEach(function (action) {
                    action.hidden = true;
                });
            return;
        }

        if (!sidebarNav) {
            return;
        }

        sidebarNav.querySelectorAll("[data-page]").forEach(function (link) {
            const page = link.dataset.page;

            if (!page) {
                return;
            }

            const hasAccess = canAccessPage(role, page);

            link.hidden = !hasAccess;

            if (!hasAccess) {
                link.classList.remove("active");
            }
        });

        sidebarNav.querySelectorAll(
            ".nav-group, .sidebar-group, .nav-section"
        ).forEach(function (group) {
            const hasVisibleLink = Array.from(
                group.querySelectorAll("[data-page]")
            ).some(isNavigationItemVisible);

            group.hidden = !hasVisibleLink;
        });

        document.querySelectorAll("[data-quick-page]").forEach(function (button) {
            button.hidden = !canAccessPage(role, button.dataset.quickPage);
        });

        const profilePermission = window.PROFILE_PERMISSIONS &&
            window.PROFILE_PERMISSIONS[role];
        const profileAllowed = !!profilePermission && (
            profilePermission.profile === true ||
            profilePermission.password === true ||
            profilePermission.notifications === true
        );

        document.querySelectorAll("[data-profile-action]").forEach(function (action) {
            action.hidden = !profileAllowed;
        });

        const notificationToggle =
            document.getElementById("notificationToggle");

        if (notificationToggle) {
            notificationToggle.hidden = !profileAllowed;
        }
    }

    /* =====================================================
       MODULE RENDERING
       ===================================================== */

    function renderWorkspaceModule(pageId) {
        const dashboardView = document.getElementById("dashboardView");
        const moduleView = document.getElementById("moduleView");

        if (!dashboardView || !moduleView) {
            console.error(
                "BaselTrack: dashboardView or moduleView was not found."
            );
            return;
        }

        if (!canAccessPage(getNavigationRole(), pageId)) {
            dashboardView.hidden = true;
            moduleView.hidden = false;
            moduleView.innerHTML = `
                <div class="mr-panel" style="padding:30px;">
                    <div class="mr-empty">
                        <i class="fa-solid fa-lock"></i>
                        <strong>Access Restricted</strong>
                        <span>
                            You do not have permission to access this module.
                        </span>
                    </div>
                </div>
            `;
            return;
        }

        if (pageId === "dashboard") {
            moduleView.hidden = true;
            moduleView.innerHTML = "";
            dashboardView.hidden = false;
            return;
        }

        dashboardView.hidden = true;
        moduleView.hidden = false;

        const moduleConfig = MODULES[pageId];

        if (moduleConfig) {
            const template = document.getElementById(
                moduleConfig.template
            );

            if (!template) {
                moduleView.innerHTML = `
                    <div class="mr-panel" style="padding:30px;">
                        <h3>Template Not Found</h3>
                        <p>
                            Please check that the
                            ${moduleConfig.template}
                            element exists in workspace.html.
                        </p>
                    </div>
                `;

                console.error(
                    "BaselTrack: " +
                    moduleConfig.template +
                    " was not found."
                );

                return;
            }

            moduleView.innerHTML = "";
            moduleView.appendChild(
                template.content.cloneNode(true)
            );

            if (pageId === "manage-reports" ||
                pageId === "reporting-dashboard" ||
                pageId === "view-reports") {
                const title = moduleView.querySelector("#mrpPageTitle");
                const description = moduleView.querySelector("#mrpPageDescription");
                if (title) title.textContent = PAGE_NAMES[pageId];
                if (description && pageId === "reporting-dashboard") {
                    description.textContent =
                        "Monitor generated regulatory reports and their current status.";
                } else if (description && pageId === "view-reports") {
                    description.textContent =
                        "View, search, track and export generated regulatory reports.";
                }
            }

            if (typeof window[moduleConfig.init] === "function") {
                window[moduleConfig.init]();
            } else {
                console.error(
                    "BaselTrack: " +
                    moduleConfig.init +
                    "() was not found."
                );
            }

            return;
        }

        const pageName = PAGE_NAMES[pageId] || "Application Module";

        moduleView.innerHTML = `
            <div class="mr-panel" style="padding:30px;">
                <div class="mr-panel-heading">
                    <div>
                        <h3>${pageName}</h3>
                        <p role="alert">No source implementation is registered for this permissioned route.</p>
                    </div>
                </div>

                <div class="mr-empty">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <strong>Module implementation unavailable</strong>
                    <span>No UI or data workflow has been inferred for this route.</span>
                </div>
            </div>
        `;
        console.warn("BaselTrack: no module implementation is registered for " + pageId + ".");
    }

    function protectModuleInitializers() {
        Object.keys(MODULES).forEach(function (pageId) {
            const initName = MODULES[pageId].init;
            const initializer = window[initName];
            if (typeof initializer !== "function" ||
                initializer.permissionGuarded === true) {
                return;
            }

            const guardedInitializer = function () {
                if (!canAccessPage(getNavigationRole(), pageId)) {
                    const dashboardView = document.getElementById("dashboardView");
                    const moduleView = document.getElementById("moduleView");
                    if (dashboardView) dashboardView.hidden = true;
                    if (moduleView) {
                        moduleView.hidden = false;
                        moduleView.innerHTML = `
                            <div class="mr-panel" style="padding:30px;">
                                <div class="mr-empty">
                                    <i class="fa-solid fa-lock"></i>
                                    <strong>Access Restricted</strong>
                                    <span>You do not have permission to access this module.</span>
                                </div>
                            </div>
                        `;
                    }
                    return;
                }
                return initializer.apply(this, arguments);
            };
            guardedInitializer.permissionGuarded = true;
            window[initName] = guardedInitializer;
        });
    }

    document.addEventListener("DOMContentLoaded", protectModuleInitializers, { once: true });

    /* =====================================================
       PUBLIC FUNCTIONS
       ===================================================== */

    window.applyRoleNavigation = applyRoleNavigation;
    window.canAccessPage = canAccessPage;
    window.isNavigationItemVisible = isNavigationItemVisible;
    window.renderWorkspaceModule = renderWorkspaceModule;
    window.WORKSPACE_MODULES = MODULES;

})();