
/* =========================================================
   BASELTRACK - ROLE CONFIGURATION
   ========================================================= */

const ROLE_CONFIG = {

    superadmin: {
        name: "Super Admin",
        dashboardTitle: "Super Admin Dashboard",
        description: "Manage users, roles and system configurations."
    },

    doa: {
        name: "Data Operations Analyst",
        dashboardTitle: "Data Operations Dashboard",
        description: "Monitor operational activities and data operations."
    },

    dqa: {
        name: "Data Quality Analyst",
        dashboardTitle: "Data Quality Dashboard",
        description: "Monitor data quality and validation activities."
    },

    rra: {
        name: "Regulatory Reporting Analyst",
        dashboardTitle: "Regulatory Reporting Dashboard",
        description: "Generate and manage regulatory reports."
    },

    risk: {
        name: "Risk Analyst",
        dashboardTitle: "Risk Management Dashboard",
        description: "Monitor risk calculations and reconciliation."
    },

    finance: {
        name: "Finance Approver",
        dashboardTitle: "Finance Approval Dashboard",
        description: "Review and approve financial reports."
    },

    compliance: {
        name: "Compliance Officer",
        dashboardTitle: "Compliance Dashboard",
        description: "Review regulatory compliance activities."
    },

    manager: {
        name: "Senior Manager",
        dashboardTitle: "Senior Management Dashboard",
        description: "Monitor reporting progress and approvals."
    },

    regulatoryAdmin: {
        name: "Regulatory Admin",
        dashboardTitle: "Regulatory Administration Dashboard",
        description: "Manage regulatory templates and reporting calendars."
    },

    rr: {
        name: "Regulatory Reviewer",
        dashboardTitle: "Regulatory Review Dashboard",
        description: "Review submitted reports and manage queries."
    },

    auditor: {
        name: "Auditor",
        dashboardTitle: "Audit Dashboard",
        description: "Review audit activities and regulatory records."
    }

};


/* =========================================================
   ROLE HELPER FUNCTIONS
   ========================================================= */

function isValidRole(role) {

    return Object.prototype.hasOwnProperty.call(
        ROLE_CONFIG,
        role
    );

}


function getRoleName(role) {

    return ROLE_CONFIG[role]?.name || "Unknown Role";

}


function getRoleDashboardTitle(role) {

    return ROLE_CONFIG[role]?.dashboardTitle || "Dashboard";

}


function getRoleDescription(role) {

    return ROLE_CONFIG[role]?.description || "";

}


/* =========================================================
   SESSION HELPERS
   ========================================================= */

function getCurrentUser() {

    try {

        const user = JSON.parse(
            localStorage.getItem("baseltrack-user") || "null"
        );

        return user && typeof user === "object"
            ? user
            : null;

    } catch (error) {

        console.error("Unable to read user session:", error);

        return null;
    }

}


function getCurrentRole() {

    const user = getCurrentUser();

    return localStorage.getItem("baseltrack-role") ||
        user?.role ||
        null;

}


function getCurrentEmployeeId() {

    const user = getCurrentUser();

    return user?.employeeId || "Demo User";

}


/* =========================================================
   GLOBAL EXPOSURE
   ========================================================= */

window.ROLE_CONFIG = ROLE_CONFIG;

window.isValidRole = isValidRole;
window.getRoleName = getRoleName;
window.getRoleDashboardTitle = getRoleDashboardTitle;
window.getRoleDescription = getRoleDescription;

window.getCurrentUser = getCurrentUser;
window.getCurrentRole = getCurrentRole;
window.getCurrentEmployeeId = getCurrentEmployeeId;
