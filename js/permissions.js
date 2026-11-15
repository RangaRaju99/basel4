/* =========================================================
   BASELTRACK - CENTRAL PERMISSION CONFIGURATION

   Permission definitions:
   R = Read
   C = Create
   U = Update

   Unspecified permission = DENIED.

   System is a separate application actor.
   It is NOT a human login role.
========================================================= */


/* =========================================================
   1. HUMAN ROLE PERMISSIONS
========================================================= */

const ROLE_PERMISSIONS = {

    /* SUPER ADMIN */

    superadmin: {

        dashboard: { R: true },

        "manage-role": {
            R: true,
            U: true
        },

        "manage-user": {
            C: true,
            R: true,
            U: true
        },

        module: {
            C: true,
            R: true,
            U: true
        },

        "system-configuration": {
            R: true,
            U: true
        },

        "audit-trail": {
            R: true
        },

        "rwa-calculation": { R: true },
        "liquidity-calculation": { R: true },
        "capital-calculation": { R: true },
        "leverage-calculation": { R: true },
        "calculation-repository": { R: true }

    },


    /* DATA OPERATIONS ANALYST */

    doa: {

        dashboard: { R: true },

        "data-ingestion": { R: true },
        "sla-escalations": { R: true },
        "landing-zone": { R: true },
        "ingestion-audit-log": { R: true },

        "rwa-calculation": { R: true },
        "liquidity-calculation": { R: true },
        "capital-calculation": { R: true },
        "leverage-calculation": { R: true },
        "calculation-repository": { R: true }

    },


    /* DATA QUALITY ANALYST */

    dqa: {

        dashboard: { R: true },

        "operations-center": {
            R: true
        },

        "file-intake-center": {
            C: true,
            R: true,
            U: true
        },

        "validation-results": {
            R: true
        },

        "issue-workbench": {
            R: true,
            U: true
        },

        "revalidation-center": {
            R: true,
            U: true
        },

        "reporting-readiness": {
            R: true,
            U: true
        },

        "rwa-calculation": { R: true },
        "liquidity-calculation": { R: true },
        "capital-calculation": { R: true },
        "leverage-calculation": { R: true },
        "calculation-repository": { R: true }

    },


    /* REGULATORY REPORTING ANALYST */

    /* REGULATORY REPORTING ANALYST */

rra: {

    dashboard: { R: true },

    "rwa-calculation": { R: true },
    "liquidity-calculation": { R: true },
    "capital-calculation": { R: true },
    "leverage-calculation": { R: true },
    "calculation-repository": { R: true },

    "generate-report": {
        C: true,
        R: true
    },

    "reporting-dashboard": {
        R: true
    }

},


    /* RISK ANALYST */

    risk: {

        dashboard: { R: true },

        "rwa-calculation": {
            R: true,
            U: true
        },

        "liquidity-calculation": {
            R: true,
            U: true
        },

        "capital-calculation": {
            R: true,
            U: true
        },

        "leverage-calculation": {
            R: true,
            U: true
        },

        "calculation-repository": { R: true },

        "risk-reconciliation": {
            C: true,
            R: true
        },

        "variance-analysis": {
            C: true,
            R: true
        },

        "exception-management": {
            C: true,
            R: true,
            U: true
        },

        "investigation": {
            C: true,
            R: true,
            U: true
        },

        "evidence-repository": {
            C: true,
            R: true,
            U: true
        },

        "approval-closure": {
            C: true,
            R: true,
            U: true
        },

        "reconciliation-audit-logs": {
            R: true
        },

        "generate-report": {
            C: true,
            R: true,
            U: true
        },

        "reporting-dashboard": { R: true }

    },


    /* FINANCE APPROVER */

    finance: {

        dashboard: { R: true },

        "rwa-calculation": { R: true },
        "liquidity-calculation": { R: true },
        "capital-calculation": { R: true },
        "leverage-calculation": { R: true },
        "calculation-repository": { R: true },

        "reporting-dashboard": { R: true },

        "manage-reports": {
            R: true,
            U: true
        }

    },


    /* COMPLIANCE OFFICER */

    compliance: {

        dashboard: { R: true },

        "rwa-calculation": { R: true },
        "liquidity-calculation": { R: true },
        "capital-calculation": { R: true },
        "leverage-calculation": { R: true },
        "calculation-repository": { R: true },

        "reporting-dashboard": { R: true },

        "manage-reports": {
            R: true,
            U: true
        }

    },


    /* SENIOR MANAGER */

    manager: {

        dashboard: { R: true },

        "rwa-calculation": { R: true },
        "liquidity-calculation": { R: true },
        "capital-calculation": { R: true },
        "leverage-calculation": { R: true },
        "calculation-repository": { R: true },

        "reporting-dashboard": { R: true },

        "manage-reports": {
            R: true,
            U: true
        },

        "manage-query": {
            R: true,
            U: true
        }

    },


    /* REGULATORY ADMIN */

    regulatoryAdmin: {

        dashboard: { R: true },

        "report-templates": {
            C: true,
            R: true,
            U: true
        },

        "reporting-calendar": {
            C: true,
            R: true,
            U: true
        },

        "manage-reports": {
            R: true,
            U: true
        }

    },


    /* REGULATORY REVIEWER */

    /* REGULATORY REVIEWER */

rr: {

    dashboard: { R: true },

    "rwa-calculation": { R: true },
    "liquidity-calculation": { R: true },
    "capital-calculation": { R: true },
    "leverage-calculation": { R: true },
    "calculation-repository": { R: true },

    "manage-reports": {
        R: true
    },

    "view-reports": {
        R: true
    },

    "raise-query": {
        C: true,
        R: true,
        U: true
    }

},


    /* AUDITOR */

    auditor: {

        dashboard: { R: true },

        "rwa-calculation": { R: true },
        "liquidity-calculation": { R: true },
        "capital-calculation": { R: true },
        "leverage-calculation": { R: true },
        "calculation-repository": { R: true }

    }

};


/* =========================================================
   2. COMMON PROFILE PERMISSIONS
========================================================= */

const PROFILE_PERMISSIONS = {

    superadmin: {
        profile: true,
        password: true,
        notifications: true
    },

    doa: {
        profile: true,
        password: true,
        notifications: true
    },

    dqa: {
        profile: true,
        password: true,
        notifications: true
    },

    rra: {
        profile: true,
        password: true,
        notifications: true
    },

    risk: {
        profile: true,
        password: true,
        notifications: true
    },

    finance: {
        profile: true,
        password: true,
        notifications: true
    },

    compliance: {
        profile: true,
        password: true,
        notifications: true
    },

    manager: {
        profile: true,
        password: true,
        notifications: true
    },

    regulatoryAdmin: {
        profile: false,
        password: false,
        notifications: false
    },

    rr: {
        profile: true,
        password: true,
        notifications: true
    },

    auditor: {
        profile: true,
        password: true,
        notifications: true
    }

};


/* =========================================================
   3. SYSTEM ACTOR PERMISSIONS
========================================================= */

const SYSTEM_PERMISSIONS = {

    "rwa-calculation": {
        C: true,
        U: true
    },

    "liquidity-calculation": {
        C: true,
        U: true
    },

    "capital-calculation": {
        C: true,
        U: true
    },

    "leverage-calculation": {
        C: true,
        U: true
    },

    "calculation-repository": {
        C: true,
        U: true
    }

};


/* =========================================================
   4. PERMISSION HELPER FUNCTIONS
========================================================= */

function getPermissions(role, page) {
    return ROLE_PERMISSIONS[role]?.[page] || {};
}


function hasPermission(role, page, action = "R") {
    const validActions = ["R", "C", "U"];

    if (!validActions.includes(action)) {
        return false;
    }

    return getPermissions(role, page)[action] === true;
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
    return (
        canRead(role, page) ||
        canCreate(role, page) ||
        canUpdate(role, page)
    );
}


function getAccessiblePages(role) {
    const roleData = ROLE_PERMISSIONS[role];

    if (!roleData) {
        return [];
    }

    return Object.keys(roleData).filter(function (page) {
        return canRead(role, page);
    });
}


function getCurrentPermissions(page) {
    const role = getCurrentRole();

    if (!role) {
        return {};
    }

    return getPermissions(role, page);
}


function canCurrentUser(page, action = "R") {
    const role = getCurrentRole();

    if (!role) {
        return false;
    }

    return hasPermission(role, page, action);
}


/* =========================================================
   5. GLOBAL EXPOSURE
========================================================= */

window.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
window.PROFILE_PERMISSIONS = PROFILE_PERMISSIONS;
window.SYSTEM_PERMISSIONS = SYSTEM_PERMISSIONS;

window.getPermissions = getPermissions;
window.hasPermission = hasPermission;

window.canRead = canRead;
window.canCreate = canCreate;
window.canUpdate = canUpdate;

window.hasAnyPermission = hasAnyPermission;
window.getAccessiblePages = getAccessiblePages;
window.getCurrentPermissions = getCurrentPermissions;
window.canCurrentUser = canCurrentUser;