/* =========================================================
   BASELTRACK - NAVIGATION & MODULE MANAGEMENT
    Supports direct file opening and served workspaces.
    Module HTML normally comes from <template> elements; routes with an
    external HTML path load that file over HTTP and retain an inline fallback.
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
      folder: "modules/user-access/manage-roles/manage-roles",
      init: "initManageRolesModule",
    },
    "manage-user": {
      folder: "modules/user-access/manage-users/manage-users",
      init: "initManageUsersModule",
    },
    "system-configuration": {
      folder: "modules/configuration/system-configuration/system-configuration",
      init: "initSystemConfigurationModule",
    },
    module: {
      folder: "modules/configuration/module-management/module-management",
      init: "initManageModulesModule",
    },
    "report-templates": {
      folder: "modules/configuration/report-templates/report-templates",
      init: "initManageReportTemplatesModule",
    },
    "reporting-calendar": {
      folder: "modules/configuration/reporting-calendar/reporting-calendar",
      init: "initReportingCalendarModule",
    },
    "audit-trail": {
      folder: "modules/configuration/audit-trail/audit-trail",
      init: "initAuditTrailModule",
    },
    "data-ingestion": {
      template: "feedMonitorTemplate",
      folder: "modules/data-ingestion/feed-monitor/feed-monitor",
      init: "initFeedMonitorModule",
    },
    "sla-escalations": {
      template: "slaEscalationsTemplate",
      folder: "modules/data-ingestion/sla-escalations/sla-escalations",
      init: "initSlaEscalationsModule",
    },
    "landing-zone": {
      template: "landingZoneTemplate",
      folder: "modules/data-ingestion/landing-zone/landing-zone",
      init: "initLandingZoneModule",
    },
    "ingestion-audit-log": {
      template: "ingestionAuditLogTemplate",
      folder: "modules/data-ingestion/ingestion-audit-log/ingestion-audit-log",
      init: "initIngestionAuditLogModule",
    },
    "operations-center": {
      folder: "modules/data-quality/operations-center/operations-center",
      init: "initOperationsCenterModule",
    },
    "file-intake-center": {
      folder: "modules/data-quality/file-intake-center/file-intake-center",
      init: "initFileIntakeModule",
    },
    "validation-results": {
      folder: "modules/data-quality/validation-results/validation-results",
      init: "initValidationResultsModule",
    },
    "issue-workbench": {
      folder: "modules/data-quality/issue-workbench/issue-workbench",
      init: "initIssueWorkbenchModule",
    },
    "revalidation-center": {
      folder: "modules/data-quality/revalidation-center/revalidation-center",
      init: "initRevalidationCenterModule",
    },
    "reporting-readiness": {
      folder: "modules/data-quality/reporting-readiness/reporting-readiness",
      init: "initReportingReadinessModule",
    },
    "rwa-calculation": {
      folder: "modules/basel-calculations/rwa-calculation/rwa-calculation",
      init: "initRWACalculationModule",
    },
    "liquidity-calculation": {
      folder:
        "modules/basel-calculations/liquidity-calculation/liquidity-calculation",
      init: "initLiquidityCalculationModule",
    },
    "capital-calculation": {
      folder:
        "modules/basel-calculations/capital-calculation/capital-calculation",
      init: "initCapitalCalculationModule",
    },
    "leverage-calculation": {
      folder:
        "modules/basel-calculations/leverage-calculation/leverage-calculation",
      init: "initLeverageCalculationModule",
    },
    "calculation-repository": {
      folder:
        "modules/basel-calculations/calculation-repository/calculation-repository",
      init: "initCalculationRepositoryModule",
    },
    "variance-analysis": {
      template: "varianceAnalysisTemplate",
      init: "initVarianceAnalysisModule",
    },
    "exception-management": {
      template: "exceptionManagementTemplate",
      init: "initExceptionManagementModule",
    },
    investigation: {
      template: "investigationTemplate",
      init: "initInvestigationModule",
    },
    "evidence-repository": {
      template: "evidenceRepositoryTemplate",
      init: "initEvidenceRepositoryModule",
    },
    "approval-closure": {
      template: "approvalClosureTemplate",
      init: "initApprovalClosureModule",
    },
    "reconciliation-audit-logs": {
      template: "reconciliationAuditLogsTemplate",
      init: "initReconciliationAuditLogsModule",
    },
    "generate-report": {
      template: "generateReportsTemplate",
      init: "initGenerateReportsModule",
    },
    "manage-reports": {
      template: "manageReportsTemplate",
      init: "initManageReportsModule",
    },
    "raise-query": {
      template: "raiseQueryTemplate",
      init: "initRaiseQueryModule",
    },
    "manage-query": {
      template: "manageQueryTemplate",
      init: "initManageQueryModule",
    },
  };

  const PAGE_NAMES = {
    "manage-user": "Manage Users",
    module: "Module Management",
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
    investigation: "Investigation",
    "evidence-repository": "Evidence Repository",
    "approval-closure": "Approval and Closure",
    "reconciliation-audit-logs": "Reconciliation Audit Logs",

    "generate-report": "Generate Reports",

    "reporting-dashboard": "Reporting Dashboard",
    "manage-reports": "Manage Reports",
    "view-reports": "View Reports",
    "raise-query": "Raise Query",
    "manage-query": "Manage Queries",
  };

  /* =====================================================
       CURRENT ROLE
       ===================================================== */

  function getNavigationRole() {
    if (typeof window.getCurrentRole === "function") {
      return window.getCurrentRole();
    }

    try {
      const user = JSON.parse(localStorage.getItem("baseltrack-user") || "{}");

      return user.role || localStorage.getItem("baseltrack-role") || "";
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

    console.warn("BaselTrack: canRead() was not found in permissions.js.");

    return false;
  }

  function isNavigationItemVisible(element) {
    if (!element) {
      return false;
    }

    return !element.hidden && getComputedStyle(element).display !== "none";
  }

  /* =====================================================
       ROLE-BASED SIDEBAR NAVIGATION
       ===================================================== */

  function applyRoleNavigation(role) {
    role = role || getNavigationRole();

    if (!role) {
      console.warn("BaselTrack: No current role found.");
      return;
    }

    const sidebarNav = document.getElementById("sidebarNav");

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

    sidebarNav
      .querySelectorAll(".nav-group, .sidebar-group, .nav-section")
      .forEach(function (group) {
        const hasVisibleLink = Array.from(
          group.querySelectorAll("[data-page]"),
        ).some(isNavigationItemVisible);

        group.hidden = !hasVisibleLink;
      });

    document.querySelectorAll("[data-quick-page]").forEach(function (button) {
      button.hidden = !canAccessPage(role, button.dataset.quickPage);
    });

    let profileAllowed = role !== "regulatoryAdmin";

    if (window.PROFILE_PERMISSIONS && window.PROFILE_PERMISSIONS[role]) {
      const permission = window.PROFILE_PERMISSIONS[role];

      profileAllowed =
        permission.profile === true ||
        permission.password === true ||
        permission.notifications === true;
    }

    document
      .querySelectorAll("[data-profile-action]")
      .forEach(function (action) {
        action.hidden = !profileAllowed;
      });

    const notificationToggle = document.getElementById("notificationToggle");

    if (notificationToggle) {
      notificationToggle.hidden = !profileAllowed;
    }
  }

  /* =====================================================
       MODULE RENDERING
       ===================================================== */

  let renderToken = 0;
  const loadedScripts = {};

  function loadCssOnce(href) {
    if (document.querySelector('link[data-module-css="' + href + '"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.moduleCss = href;
    document.head.appendChild(link);
  }

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      if (loadedScripts[src]) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.onload = function () {
        loadedScripts[src] = true;
        resolve();
      };
      script.onerror = function () {
        reject(new Error("Could not load " + src));
      };
      document.body.appendChild(script);
    });
  }

  async function loadExternalModule(config) {
    loadCssOnce(config.folder + ".css");
    const response = await fetch(config.folder + ".html");
    if (!response.ok) throw new Error(config.folder + ".html not found");
    const html = await response.text();
    await loadScriptOnce(config.folder + ".js");
    return html;
  }

  let dashboardLoaded = false;

  async function ensureDashboard(dashboardView) {
    if (dashboardLoaded) return;
    const base = "modules/dashboard/dashboard";
    loadCssOnce(base + ".css");
    const response = await fetch(base + ".html");
    if (!response.ok) throw new Error(base + ".html not found");
    dashboardView.innerHTML = await response.text();
    await loadScriptOnce(base + ".js");
    dashboardLoaded = true;
    if (typeof window.initDashboardModule === "function")
      window.initDashboardModule();
    applyRoleNavigation(); // hides quick-access buttons the role can't use
  }

  function renderWorkspaceModule(pageId) {
    const token = ++renderToken;
    const dashboardView = document.getElementById("dashboardView");
    const moduleView = document.getElementById("moduleView");

    if (!dashboardView || !moduleView) {
      console.error("BaselTrack: dashboardView or moduleView was not found.");
      return;
    }

    if (pageId === "dashboard") {
      moduleView.hidden = true;
      moduleView.innerHTML = "";
      dashboardView.hidden = false;
      ensureDashboard(dashboardView).catch(function (error) {
        console.error("BaselTrack:", error);
        dashboardView.innerHTML =
          '<p style="padding:30px">Dashboard failed to load: ' +
          error.message +
          "</p>";
      });
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

    dashboardView.hidden = true;
    moduleView.hidden = false;

    const moduleConfig = MODULES[pageId];

    if (moduleConfig && moduleConfig.folder) {
      moduleView.innerHTML = '<p style="padding:30px">Loading...</p>';

      loadExternalModule(moduleConfig)
        .then(function (html) {
          if (token !== renderToken) return; // user already navigated away
          moduleView.innerHTML = html;
          if (typeof window[moduleConfig.init] === "function") {
            window[moduleConfig.init]();
          } else {
            console.error(
              "BaselTrack: " + moduleConfig.init + "() was not found.",
            );
          }
        })
        .catch(function (error) {
          console.error("BaselTrack:", error);
          moduleView.innerHTML =
            '<div class="mr-panel" style="padding:30px;"><h3>Module failed to load</h3><p>' +
            error.message +
            "</p></div>";
        });
      return;
    }

    if (moduleConfig) {
      const template = document.getElementById(moduleConfig.template);

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
          "BaselTrack: " + moduleConfig.template + " was not found.",
        );

        return;
      }

      moduleView.innerHTML = "";
      moduleView.appendChild(template.content.cloneNode(true));

      if (typeof window[moduleConfig.init] === "function") {
        window[moduleConfig.init]();
      } else {
        console.error("BaselTrack: " + moduleConfig.init + "() was not found.");
      }

      return;
    }

    const pageName = PAGE_NAMES[pageId] || "Application Module";

    moduleView.innerHTML = `
            <div class="mr-panel" style="padding:30px;">
                <div class="mr-panel-heading">
                    <div>
                        <h3>${pageName}</h3>
                        <p>This module is currently under development.</p>
                    </div>
                </div>

                <div class="mr-empty">
                    <i class="fa-solid fa-screwdriver-wrench"></i>
                    <strong>Module Under Development</strong>
                    <span>
                        The ${pageName} module will be available
                        in a future BaselTrack update.
                    </span>
                </div>
            </div>
        `;
  }

  /* =====================================================
       PUBLIC FUNCTIONS
       ===================================================== */

  window.applyRoleNavigation = applyRoleNavigation;
  window.canAccessPage = canAccessPage;
  window.isNavigationItemVisible = isNavigationItemVisible;
  window.renderWorkspaceModule = renderWorkspaceModule;
})();
