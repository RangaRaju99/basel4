/* =========================================================
   BASELTRACK - CENTRAL PERMISSION CONFIGURATION

   R = Read
   C = Create
   U = Update

   Unspecified permissions and unsupported actions are denied.
   System is an application actor, not a human login role.
========================================================= */

const ROLE_PERMISSIONS = {
    superadmin: {
        dashboard: { R: true },
        "manage-role": { R: true, U: true },
        "manage-user": { C: true, R: true, U: true },
        module: { C: true, R: true, U: true },
        "system-configuration": { R: true, U: true },
        "audit-trail": { R: true },
        "data-ingestion": { C: true, R: true, U: true }
    },
    doa: {
        dashboard: { R: true },
        "data-ingestion": { C: true, R: true, U: true }
    },
    dqa: {
        dashboard: { R: true },
        "data-ingestion": { R: true },
        "operations-center": { R: true },
        "issue-workbench": { C: true, R: true, U: true },
        "generate-report": { C: true, R: true, U: true }
    },
    rra: {
        dashboard: { R: true },
        "data-ingestion": { R: true },
        "reporting-dashboard": { R: true }
    },
    risk: {
        dashboard: { R: true },
        "data-ingestion": { R: true },
        "variance-analysis": { R: true },
        "exception-management": { C: true, R: true, U: true },
        "manage-reports": { R: true, U: true },
        "reporting-dashboard": { R: true }
    },
    finance: {
        dashboard: { R: true },
        "reporting-dashboard": { R: true },
        "manage-reports": { R: true, U: true }
    },
    compliance: {
        dashboard: { R: true },
        "data-ingestion": { R: true },
        "reporting-dashboard": { R: true },
        "manage-reports": { R: true, U: true },
        "manage-query": { R: true, U: true }
    },
    manager: {
        dashboard: { R: true },
        "data-ingestion": { R: true },
        "reporting-dashboard": { R: true },
        "manage-reports": { R: true, U: true }
    },
    regulatoryAdmin: {
        dashboard: { R: true },
        "report-templates": { C: true, R: true, U: true },
        "reporting-calendar": { C: true, R: true, U: true }
    },
    rr: {
        dashboard: { R: true },
        "view-reports": { R: true },
        "raise-query": { C: true, R: true, U: true }
    },
    auditor: {
        dashboard: { R: true },
        "data-ingestion": { R: true }
    }
};

const CALCULATION_PAGES = [
    "rwa-calculation",
    "liquidity-calculation",
    "capital-calculation",
    "leverage-calculation",
    "calculation-repository"
];

const HUMAN_CALCULATION_READERS = [
    "superadmin",
    "doa",
    "dqa",
    "rra",
    "risk",
    "finance",
    "compliance",
    "manager",
    "rr",
    "auditor"
];

HUMAN_CALCULATION_READERS.forEach(function (role) {
    CALCULATION_PAGES.forEach(function (page) {
        ROLE_PERMISSIONS[role][page] = { R: true };
    });
});

["rwa-calculation", "liquidity-calculation", "capital-calculation", "leverage-calculation"]
    .forEach(function (page) {
        ROLE_PERMISSIONS.risk[page].U = true;
    });
ROLE_PERMISSIONS.finance["capital-calculation"].U = true;

const PROFILE_PERMISSIONS = {
    superadmin: { profile: true, password: true, notifications: true },
    doa: { profile: true, password: true, notifications: true },
    dqa: { profile: true, password: true, notifications: true },
    rra: { profile: true, password: true, notifications: true },
    risk: { profile: true, password: true, notifications: true },
    finance: { profile: true, password: true, notifications: true },
    compliance: { profile: true, password: true, notifications: true },
    manager: { profile: true, password: true, notifications: true },
    regulatoryAdmin: { profile: false, password: false, notifications: false },
    rr: { profile: true, password: true, notifications: true },
    auditor: { profile: true, password: true, notifications: true }
};

const SYSTEM_PERMISSIONS = {
    "rwa-calculation": { C: true, U: true },
    "liquidity-calculation": { C: true, U: true },
    "capital-calculation": { C: true, U: true },
    "leverage-calculation": { C: true, U: true },
    "calculation-repository": { C: true, U: true }
};

function getPermissions(role, page) {
    return ROLE_PERMISSIONS[role] && ROLE_PERMISSIONS[role][page]
        ? ROLE_PERMISSIONS[role][page]
        : {};
}

function hasPermission(role, page, action) {
    action = action || "R";
    if (["R", "C", "U"].indexOf(action) === -1) {
        return false;
    }
    return getPermissions(role, page)[action] === true;
}

function hasSystemPermission(page, action) {
    action = action || "R";
    if (["R", "C", "U"].indexOf(action) === -1) {
        return false;
    }
    return !!(SYSTEM_PERMISSIONS[page] && SYSTEM_PERMISSIONS[page][action] === true);
}

function canRead(role, page) {
    return hasPermission(role, page, "R");
}

function canCreate(role, page) {
    return hasPermission(role, page, "C");
}

function canUpdate(role, page) {
    return hasPermission(role, page, "U");
}

function hasAnyPermission(role, page) {
    return canRead(role, page) || canCreate(role, page) || canUpdate(role, page);
}

function getAccessiblePages(role) {
    if (!ROLE_PERMISSIONS[role]) {
        return [];
    }
    return Object.keys(ROLE_PERMISSIONS[role]).filter(function (page) {
        return canRead(role, page);
    });
}

function getCurrentPermissions(page) {
    const role = typeof window.getCurrentRole === "function"
        ? window.getCurrentRole()
        : "";
    return role ? getPermissions(role, page) : {};
}

function canCurrentUser(page, action) {
    const role = typeof window.getCurrentRole === "function"
        ? window.getCurrentRole()
        : "";
    return !!role && hasPermission(role, page, action);
}

function requireCurrentPermission(page, action, message) {
    if (canCurrentUser(page, action)) {
        return true;
    }
    const notice = message || "You do not have permission to perform this action.";
    if (typeof window.showToast === "function") {
        window.showToast(notice);
    } else {
        console.warn("BaselTrack: " + notice);
    }
    return false;
}

window.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
window.PROFILE_PERMISSIONS = PROFILE_PERMISSIONS;
window.SYSTEM_PERMISSIONS = SYSTEM_PERMISSIONS;
window.getPermissions = getPermissions;
window.hasPermission = hasPermission;
window.hasSystemPermission = hasSystemPermission;
window.canRead = canRead;
window.canCreate = canCreate;
window.canUpdate = canUpdate;
window.hasAnyPermission = hasAnyPermission;
window.getAccessiblePages = getAccessiblePages;
window.getCurrentPermissions = getCurrentPermissions;
window.canCurrentUser = canCurrentUser;
window.requireCurrentPermission = requireCurrentPermission;
