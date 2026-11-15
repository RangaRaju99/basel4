/* =========================================================
   BASELTRACK - WORKSPACE CONTROLLER
   Works with direct file opening (file://). No fetch(), no iframe.
   Login/permissions/password are frontend demos only.
   ========================================================= */

(function () {
  "use strict";

  const $ = function (selector, parent) {
    return (parent || document).querySelector(selector);
  };

  const $$ = function (selector, parent) {
    return Array.from((parent || document).querySelectorAll(selector));
  };

  let toastTimer = null;
  let currentUser = null;
  let currentRole = "";

  /* =====================================================
       PAGE CONFIGURATION
       ===================================================== */

  const PAGE_CONFIG = {
    dashboard: {
      title: "Dashboard",
      description: "Overview of your BaselTrack workspace.",
    },
    "manage-role": {
      title: "Manage Roles",
      description: "View and manage application roles.",
    },
    "manage-user": {
      title: "Manage Users",
      description: "Manage application users and their access.",
    },
    module: {
      title: "Module Management",
      description: "Manage application modules.",
    },
    "report-templates": {
      title: "Report Templates",
      description: "Manage regulatory report templates.",
    },
    "reporting-calendar": {
      title: "Reporting Calendar",
      description: "Manage regulatory reporting schedules.",
    },
    "system-configuration": {
      title: "System Configuration",
      description: "Manage application configuration.",
    },
    "audit-trail": {
      title: "Audit Trail",
      description: "Review application audit records.",
    },
    "feed-monitor": {
      title: "Feed Monitor",
      description: "Monitor incoming regulatory data feeds.",
    },
    "sla-escalations": {
      title: "SLA & Escalations",
      description: "Monitor service levels and escalations.",
    },
    "landing-zone": {
      title: "Landing Zone",
      description: "Review incoming data files.",
    },
    "ingestion-audit-log": {
      title: "Ingestion Audit Log",
      description: "Review data ingestion activities.",
    },
    "quality-dashboard": {
      title: "Quality Dashboard",
      description: "Monitor data quality and validation.",
    },
    "validation-categories": {
      title: "Validation Categories",
      description: "Manage data validation categories.",
    },
    "validation-issues": {
      title: "Validation Issues",
      description: "Review data validation issues.",
    },
    "validation-rules": {
      title: "Validation Rules",
      description: "Manage data validation rules.",
    },
    "audit-activity": {
      title: "Audit Activity",
      description: "Review data quality audit activities.",
    },
    "rwa-calculation": {
      title: "RWA Calculation",
      description: "Review risk-weighted asset calculations.",
    },
    "liquidity-calculation": {
      title: "Liquidity Calculation",
      description: "Review liquidity calculations.",
    },
    "capital-calculation": {
      title: "Capital Calculation",
      description: "Review capital adequacy calculations.",
    },
    "leverage-calculation": {
      title: "Leverage Calculation",
      description: "Review leverage ratio calculations.",
    },
    "calculation-repository": {
      title: "Calculation Repository",
      description: "View stored calculation records.",
    },
    "risk-reconciliation": {
      title: "Risk Reconciliation",
      description: "Review risk reconciliation activities.",
    },
    "variance-analysis": {
      title: "Variance Analysis",
      description: "Review reporting variances.",
    },
    "exception-management": {
      title: "Exception Management",
      description: "Manage reconciliation exceptions.",
    },
    "reconciliation-report": {
      title: "Reconciliation Report",
      description: "Review reconciliation reports.",
    },
    "generate-report": {
      title: "Generate Report",
      description: "Prepare regulatory reports.",
    },
    "reporting-dashboard": {
      title: "Reporting Dashboard",
      description: "Monitor regulatory reporting progress.",
    },
    "manage-reports": {
      title: "Manage Reports",
      description: "Review and manage regulatory reports.",
    },
    "view-reports": {
      title: "View Reports",
      description: "View submitted regulatory reports.",
    },
    "raise-query": {
      title: "Raise Query",
      description: "Raise queries related to regulatory reports.",
    },
    "manage-query": {
      title: "Manage Queries",
      description: "Review and manage reporting queries.",
    },
  };

  /* =====================================================
       USER SESSION
       ===================================================== */

  function initUserSession() {
    try {
      currentUser = JSON.parse(
        localStorage.getItem("baseltrack-user") || "null",
      );
    } catch (error) {
      currentUser = null;
    }

    currentRole =
      localStorage.getItem("baseltrack-role") || currentUser?.role || "";

    if (!currentUser || !currentRole) {
      redirectToLogin();
      return false;
    }

    if (
      typeof window.isValidRole === "function" &&
      !window.isValidRole(currentRole)
    ) {
      redirectToLogin();
      return false;
    }

    currentUser.role = currentRole;

    updateTopbarUser();

    return true;
  }

  function redirectToLogin() {
    localStorage.removeItem("baseltrack-user");
    localStorage.removeItem("baseltrack-role");

    window.location.href = "index.html";
  }

  function getCurrentUser() {
    return currentUser;
  }

  function getCurrentRole() {
    return currentRole;
  }

  function getCurrentEmployeeId() {
    return currentUser?.employeeId || "";
  }

  function getRoleLabel() {
    return typeof window.getRoleName === "function"
      ? window.getRoleName(currentRole)
      : currentRole;
  }

  function updateTopbarUser() {
    const employeeId = getCurrentEmployeeId();
    const roleLabel = getRoleLabel();

    const roleElement = $("#currentRole");

    if (roleElement) {
      roleElement.textContent = roleLabel;
    }

    const profileName = $("#profileName");
    const profileRole = $("#profileRole");

    if (profileName) {
      profileName.textContent = employeeId || "BaselTrack User";
    }

    if (profileRole) {
      profileRole.textContent = roleLabel;
    }

    // Profile dropdown summary
    const summaryName = $(".profile-summary strong");
    const summaryRole = $(".profile-summary small");

    if (summaryName) {
      summaryName.textContent = employeeId || "BaselTrack User";
    }

    if (summaryRole) {
      summaryRole.textContent = roleLabel;
    }

    // Avatar initials
    const initials = (employeeId || "BT").slice(0, 2).toUpperCase();

    $$(".avatar").forEach(function (avatar) {
      avatar.textContent = initials;
    });
  }

  /* =====================================================
       DASHBOARD INITIALIZATION
       ===================================================== */

  function getDashboardTitle() {
    return typeof window.getRoleDashboardTitle === "function"
      ? window.getRoleDashboardTitle(currentRole)
      : "BaselTrack Dashboard";
  }

  function getDashboardDescription() {
    return typeof window.getRoleDescription === "function"
      ? window.getRoleDescription(currentRole)
      : "Welcome to BaselTrack.";
  }

  function initDashboard() {
    const titleElement = $("#pageTitle");
    const descriptionElement = $("#pageDescription");

    if (titleElement) {
      titleElement.textContent = getDashboardTitle();
    }

    if (descriptionElement) {
      descriptionElement.textContent = getDashboardDescription();
    }

    const welcomeTitle = $("#welcomeTitle");
    const welcomeDescription = $("#welcomeDescription");

    if (welcomeTitle) {
      welcomeTitle.textContent = "Welcome to BaselTrack";
    }

    if (welcomeDescription) {
      welcomeDescription.textContent = getDashboardDescription();
    }

    const breadcrumb = $("#breadcrumb");

    if (breadcrumb) {
      breadcrumb.textContent = "Dashboard";
    }
  }

  /* =====================================================
       PAGE NAVIGATION
       ===================================================== */

  function setActivePage(pageId, label) {
    if (!pageId) {
      return;
    }

    // Role permission check
    if (
      pageId !== "dashboard" &&
      typeof window.canRead === "function" &&
      !window.canRead(currentRole, pageId)
    ) {
      showToast("You do not have permission to access this page.");
      return;
    }

    // Sidebar active state
    $$("[data-page]").forEach(function (link) {
      const isActive = link.dataset.page === pageId;

      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    // Open the group that contains the active link
    const activeLink = $(`[data-page="${pageId}"]`);

    if (activeLink) {
      const group = activeLink.closest(".nav-group");

      if (group) {
        group.classList.add("open");

        const parentButton = group.querySelector(".nav-parent");

        if (parentButton) {
          parentButton.setAttribute("aria-expanded", "true");
        }
      }
    }

    // Title / description
    const pageConfig = PAGE_CONFIG[pageId] || {};

    let pageTitle = label || pageConfig.title || "BaselTrack";
    let pageDescription =
      pageConfig.description || "Manage regulatory reporting activities.";

    if (pageId === "dashboard") {
      pageTitle = getDashboardTitle();
      pageDescription = getDashboardDescription();
    }

    const titleElement = $("#pageTitle");
    const descriptionElement = $("#pageDescription");

    if (titleElement) {
      titleElement.textContent = pageTitle;
    }

    if (descriptionElement) {
      descriptionElement.textContent = pageDescription;
    }

    const breadcrumb = $("#breadcrumb");

    if (breadcrumb) {
      breadcrumb.textContent = pageTitle;
    }

    // Switch dashboard / module content (navigation.js)
    if (typeof window.renderWorkspaceModule === "function") {
      window.renderWorkspaceModule(pageId);
    }

    closeSidebar();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restoreDashboardView() {
    setActivePage("dashboard", "Dashboard");
  }

  /* =====================================================
       ROLE-BASED NAVIGATION INITIALIZATION
       ===================================================== */

  function initRoleNavigation() {
    if (typeof window.applyRoleNavigation === "function") {
      window.applyRoleNavigation(currentRole);
    }

    setActivePage("dashboard", "Dashboard");
  }

  /* =====================================================
       THEME MANAGEMENT
       ===================================================== */

  function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", selectedTheme);

    const themeIcon = $("#themeIcon");

    if (themeIcon) {
      themeIcon.textContent = selectedTheme === "dark" ? "☀" : "☾";
    }

    const themeToggle = $("#themeToggle");

    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        selectedTheme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme",
      );
    }

    try {
      localStorage.setItem("baseltrack-theme", selectedTheme);
    } catch (error) {
      console.warn("Unable to save theme preference:", error);
    }
  }

  function initTheme() {
    let savedTheme = "light";

    try {
      savedTheme = localStorage.getItem("baseltrack-theme") || "light";
    } catch (error) {
      savedTheme = "light";
    }

    applyTheme(savedTheme);

    const themeToggle = $("#themeToggle");

    if (themeToggle) {
      themeToggle.addEventListener("click", function () {
        const currentTheme =
          document.documentElement.getAttribute("data-theme");

        applyTheme(currentTheme === "dark" ? "light" : "dark");
      });
    }
  }

  /* =====================================================
       SIDEBAR
       ===================================================== */

  function openSidebar() {
    const sidebar = $("#sidebar");
    const backdrop = $("#sidebarBackdrop");
    const toggle = $("#sidebarToggle");

    if (sidebar) {
      sidebar.classList.add("open");
    }

    if (backdrop) {
      backdrop.classList.add("show");
    }

    if (toggle) {
      toggle.setAttribute("aria-expanded", "true");
    }

    document.body.classList.add("sidebar-open");
  }

  function closeSidebar() {
    const sidebar = $("#sidebar");
    const backdrop = $("#sidebarBackdrop");
    const toggle = $("#sidebarToggle");

    if (sidebar) {
      sidebar.classList.remove("open");
    }

    if (backdrop) {
      backdrop.classList.remove("show");
    }

    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
    }

    document.body.classList.remove("sidebar-open");
  }

  function initSidebar() {
    const sidebarToggle = $("#sidebarToggle");
    const sidebarClose = $("#sidebarClose");
    const sidebarBackdrop = $("#sidebarBackdrop");
    const sidebarNav = $("#sidebarNav");

    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", function () {
        const sidebar = $("#sidebar");

        if (sidebar && sidebar.classList.contains("open")) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    }

    if (sidebarClose) {
      sidebarClose.addEventListener("click", closeSidebar);
    }

    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener("click", closeSidebar);
    }

    if (sidebarNav) {
      /* Page links */
      sidebarNav.addEventListener("click", function (event) {
        const link = event.target.closest("[data-page]");

        if (!link) {
          return;
        }

        event.preventDefault();

        const pageId = link.dataset.page;

        if (!pageId) {
          return;
        }

        setActivePage(pageId, PAGE_CONFIG[pageId]?.title);
      });

      /* Accordion groups (.nav-parent buttons) */
      sidebarNav.addEventListener("click", function (event) {
        const toggle = event.target.closest(".nav-parent");

        if (!toggle) {
          return;
        }

        const group = toggle.closest(".nav-group");

        if (!group) {
          return;
        }

        const willOpen = !group.classList.contains("open");

        // Keep only one group open at a time
        $$(".nav-group.open", sidebarNav).forEach(function (other) {
          if (other !== group) {
            other.classList.remove("open");

            const otherButton = other.querySelector(".nav-parent");

            if (otherButton) {
              otherButton.setAttribute("aria-expanded", "false");
            }
          }
        });

        group.classList.toggle("open", willOpen);

        toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    }

    /* Quick-access buttons */
    // $$("[data-quick-page]").forEach(function (button) {

    //     button.addEventListener("click", function () {

    //         const pageId = button.dataset.quickPage;

    //         if (!pageId) {
    //             return;
    //         }

    //         setActivePage(pageId, PAGE_CONFIG[pageId]?.title);
    //     });
    // });

    document.addEventListener("click", function (event) {
      const button = event.target.closest("[data-quick-page]");
      if (!button) return;
      const pageId = button.dataset.quickPage;
      if (pageId) setActivePage(pageId, PAGE_CONFIG[pageId]?.title);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeSidebar();
      }
    });
  }

  /* =====================================================
       POPUP MANAGEMENT
       ===================================================== */

  function closeAllPopups() {
    const notificationPanel = $("#notificationPanel");
    const profilePanel = $("#profilePanel");

    if (notificationPanel) {
      notificationPanel.hidden = true;
      notificationPanel.classList.remove("show");
    }

    if (profilePanel) {
      profilePanel.hidden = true;
      profilePanel.classList.remove("show");
    }

    const notificationToggle = $("#notificationToggle");
    const profileToggle = $("#profileToggle");

    if (notificationToggle) {
      notificationToggle.setAttribute("aria-expanded", "false");
    }

    if (profileToggle) {
      profileToggle.setAttribute("aria-expanded", "false");
    }
  }

  function togglePopup(panel, toggle) {
    if (!panel) {
      return;
    }

    const shouldOpen = panel.hidden || !panel.classList.contains("show");

    closeAllPopups();

    if (shouldOpen) {
      panel.hidden = false;
      panel.classList.add("show");

      if (toggle) {
        toggle.setAttribute("aria-expanded", "true");
      }
    }
  }

  function initPopups() {
    const notificationToggle = $("#notificationToggle");
    const notificationPanel = $("#notificationPanel");
    const profileToggle = $("#profileToggle");
    const profilePanel = $("#profilePanel");

    if (notificationToggle && notificationPanel) {
      notificationToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        togglePopup(notificationPanel, notificationToggle);
      });
    }

    if (profileToggle && profilePanel) {
      profileToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        togglePopup(profilePanel, profileToggle);
      });
    }

    // Clicking inside a popup should not close it
    [notificationPanel, profilePanel].forEach(function (panel) {
      if (panel) {
        panel.addEventListener("click", function (event) {
          event.stopPropagation();
        });
      }
    });

    // Clicking outside closes popups
    document.addEventListener("click", closeAllPopups);

    // Profile actions
    $$("[data-profile-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        const action = button.dataset.profileAction;

        closeAllPopups();

        if (action === "profile") {
          openProfileModal();
        }

        if (action === "password") {
          openPasswordModal();
        }
      });
    });

    // Clear notifications
    const clearNotifications = $("#clearNotifications");

    if (clearNotifications) {
      clearNotifications.addEventListener("click", function () {
        $$(".notification-item").forEach(function (item) {
          item.remove();
        });

        const emptyNotifications = $("#emptyNotifications");

        if (emptyNotifications) {
          emptyNotifications.hidden = false;
        }

        const dot = $(".notification-dot");

        if (dot) {
          dot.remove();
        }

        showToast("Notifications cleared.");
      });
    }
  }

  /* =====================================================
       MODAL MANAGEMENT
       ===================================================== */

  function openModal(title, content) {
    const backdrop = $("#modalBackdrop");
    const modalTitle = $("#modalTitle");
    const modalBody = $("#modalBody");

    if (!backdrop || !modalTitle || !modalBody) {
      return;
    }

    modalTitle.textContent = title;
    modalBody.innerHTML = content;

    backdrop.hidden = false;
    backdrop.classList.add("show");

    document.body.classList.add("modal-open");
  }

  function closeModal() {
    const backdrop = $("#modalBackdrop");

    if (!backdrop) {
      return;
    }

    backdrop.hidden = true;
    backdrop.classList.remove("show");

    document.body.classList.remove("modal-open");
  }

  function openProfileModal() {
    openModal(
      "My Profile",
      `
                <div class="profile-modal-content">

                    <div class="profile-detail-row">
                        <span>Employee ID</span>
                        <strong>${escapeHTML(getCurrentEmployeeId())}</strong>
                    </div>

                    <div class="profile-detail-row">
                        <span>Role</span>
                        <strong>${escapeHTML(getRoleLabel())}</strong>
                    </div>

                    <div class="profile-detail-row">
                        <span>Application</span>
                        <strong>BaselTrack</strong>
                    </div>

                </div>
            `,
    );
  }

  function openPasswordModal() {
    openModal(
      "Change Password",
      `
                <form id="demoPasswordForm">

                    <div class="form-group">
                        <label for="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword"
                               required autocomplete="current-password">
                    </div>

                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" minlength="6"
                               required autocomplete="new-password">
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">Confirm New Password</label>
                        <input type="password" id="confirmPassword" minlength="6"
                               required autocomplete="new-password">
                    </div>

                    <p class="form-hint">
                        Demonstration only. This form does not
                        change a real account password.
                    </p>

                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary"
                                id="cancelPasswordChange">Cancel</button>

                        <button type="submit" class="btn btn-primary">
                            Update Password
                        </button>
                    </div>

                </form>
            `,
    );

    const passwordForm = $("#demoPasswordForm");

    if (passwordForm) {
      passwordForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const currentPassword = $("#currentPassword").value;
        const newPassword = $("#newPassword").value;
        const confirmPassword = $("#confirmPassword").value;

        if (!currentPassword) {
          showToast("Please enter your current password.");
          return;
        }

        if (newPassword.length < 6) {
          showToast("New password must contain at least 6 characters.");
          return;
        }

        if (newPassword !== confirmPassword) {
          showToast("New password and confirmation do not match.");
          return;
        }

        closeModal();

        showToast(
          "Password form validated. Demo only; no password was changed.",
        );
      });
    }

    const cancelButton = $("#cancelPasswordChange");

    if (cancelButton) {
      cancelButton.addEventListener("click", closeModal);
    }
  }

  function initModal() {
    const modalClose = $("#modalClose");
    const modalBackdrop = $("#modalBackdrop");

    if (modalClose) {
      modalClose.addEventListener("click", closeModal);
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", function (event) {
        if (event.target === modalBackdrop) {
          closeModal();
        }
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  }

  /* =====================================================
       LOGOUT
       ===================================================== */

  function logout() {
    const confirmed = window.confirm("Are you sure you want to logout?");

    if (!confirmed) {
      return;
    }

    localStorage.removeItem("baseltrack-user");
    localStorage.removeItem("baseltrack-role");

    window.location.href = "index.html";
  }

  function initLogout() {
    const logoutButton = $("#logoutButton");

    if (logoutButton) {
      logoutButton.addEventListener("click", logout);
    }
  }

  /* =====================================================
       DATE
       ===================================================== */

  function initDate() {
    const dateElement = $("#currentDate");

    if (!dateElement) {
      return;
    }

    dateElement.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  /* =====================================================
       BACK TO TOP
       ===================================================== */

  function initBackToTop() {
    const button = $("#backToTop");

    if (!button) {
      return;
    }

    window.addEventListener("scroll", function () {
      button.classList.toggle("show", window.scrollY > 300);
    });

    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* =====================================================
       TOAST
       ===================================================== */

  function showToast(message) {
    const toast = $("#toast");

    if (!toast) {
      console.log("BaselTrack:", message);
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2800);
  }

  /* =====================================================
       HTML ESCAPING
       ===================================================== */

  function escapeHTML(value) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return entities[char];
    });
  }

  /* =====================================================
       EXPOSE WORKSPACE FUNCTIONS
       ===================================================== */

  window.setActivePage = setActivePage;
  window.restoreDashboardView = restoreDashboardView;
  window.getCurrentRole = getCurrentRole;
  window.getCurrentUser = getCurrentUser;
  window.getCurrentEmployeeId = getCurrentEmployeeId;
  window.showToast = showToast;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.logoutBaselTrack = logout;

  /* =====================================================
       APPLICATION INITIALIZATION
       ===================================================== */

  function initWorkspace() {
    if (!initUserSession()) {
      return;
    }

    // initDashboard();
    initTheme();
    initSidebar();
    initRoleNavigation();
    initPopups();
    initModal();
    initLogout();
    // initDate();
    initBackToTop();
  }

  document.addEventListener("DOMContentLoaded", initWorkspace);
})();
