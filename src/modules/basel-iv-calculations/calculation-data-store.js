(function () {
    "use strict";

    const STORAGE_KEY = "module4Calculations";
    const METRIC_FIELDS = [
        "creditRWA",
        "creditRiskRWA",
        "marketRWA",
        "marketRiskRWA",
        "operationalRWA",
        "operationalRiskRWA",
        "totalRWA",
        "hqla",
        "HQLA",
        "cashOutflows",
        "cashInflows",
        "netOutflows",
        "netCashOutflow",
        "netCashOutflows",
        "availableStableFunding",
        "requiredStableFunding",
        "lcr",
        "LCR",
        "nsfr",
        "NSFR",
        "cet1",
        "CET1",
        "cet1Capital",
        "at1",
        "AT1",
        "additionalTier1Capital",
        "tier1",
        "tier2",
        "tier2Capital",
        "rwa",
        "riskWeightedAssets",
        "totalCapital",
        "cet1Ratio",
        "tier1Ratio",
        "car",
        "CAR",
        "tier1Capital",
        "onBalanceExposure",
        "onBalanceSheetExposure",
        "offBalanceExposure",
        "offBalanceSheetExposure",
        "derivativeExposure",
        "sftExposure",
        "securitiesFinancingExposure",
        "totalExposure",
        "leverageRatio"
    ];

    const calculationData = window.baselTrackCalculationData || {};
    window.baselTrackCalculationData = calculationData;

    function normalizeRecord(record, index) {
        if (!record || typeof record !== "object" || Array.isArray(record)) {
            throw new TypeError("Calculation records must be objects.");
        }

        const calculationId = String(
            record.calculationId ||
            record.id ||
            record.reference ||
            `CAL-${index + 1}`
        );
        const bank = record.bank || record.bankName || record.institution || "";
        const reportingPeriod =
            record.reportingPeriod || record.period || record.reportPeriod || "";
        const metrics = {
            ...(record.metrics &&
            typeof record.metrics === "object" &&
            !Array.isArray(record.metrics)
                ? record.metrics
                : {})
        };

        METRIC_FIELDS.forEach(function (field) {
            if (record[field] !== undefined && metrics[field] === undefined) {
                metrics[field] = record[field];
            }
        });

        return {
            ...record,
            calculationId: calculationId,
            id: record.id || calculationId,
            bank: bank,
            bankName: record.bankName || bank,
            reportingPeriod: reportingPeriod,
            period: record.period || reportingPeriod,
            type: record.type || record.calculationType || "Unknown",
            businessDate: record.businessDate || "",
            executionDate:
                record.executionDate || record.calculatedAt || record.createdAt || "",
            calculatedAt:
                record.calculatedAt || record.executionDate || record.createdAt || "",
            status: record.status || "Completed",
            metrics: metrics,
            details: record.details || {}
        };
    }

    function readStoredRecords() {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) return [];

        const parsed = JSON.parse(serialized);
        if (!Array.isArray(parsed)) {
            throw new TypeError("Stored calculation data must be an array.");
        }

        return parsed.reduce(function (normalizedRecords, record, index) {
            try {
                normalizedRecords.push(normalizeRecord(record, index));
            } catch (error) {
                reportStorageError("normalize stored", error);
            }

            return normalizedRecords;
        }, []);
    }

    function reportStorageError(action, error) {
        console.error(`Unable to ${action} calculation records:`, error);
    }

    function calculationPage(type) {
        const normalized = String(type || "").toLowerCase();
        if (normalized.includes("rwa")) return "rwa-calculation";
        if (normalized.includes("liquidity")) return "liquidity-calculation";
        if (normalized.includes("capital")) return "capital-calculation";
        if (normalized.includes("leverage")) return "leverage-calculation";
        return "";
    }

    function canCreateRecord(record) {
        const role = typeof window.getCurrentRole === "function"
            ? window.getCurrentRole()
            : "";
        const page = calculationPage(record.type);
        return !!role && !!page &&
            typeof window.canCreate === "function" &&
            window.canCreate(role, page);
    }

    let records = [];

    try {
        records = readStoredRecords();
    } catch (error) {
        reportStorageError("read", error);
    }

    if (Array.isArray(calculationData.results)) {
        calculationData.results.forEach(function (record, index) {
            try {
                const normalized = normalizeRecord(record, index);
                const existing = records.findIndex(item =>
                    item.calculationId === normalized.calculationId
                );

                if (existing === -1) records.push(normalized);
            } catch (error) {
                reportStorageError("normalize", error);
            }
        });
    }

    calculationData.results = records;

    function save(nextRecords) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
        } catch (error) {
            reportStorageError("save", error);
            return false;
        }

        calculationData.results = nextRecords;
        records = nextRecords;
        return true;
    }

    window.baselTrackCalculationStore = {
        add: function (record) {
            let normalized;

            try {
                normalized = normalizeRecord(record, records.length);
            } catch (error) {
                reportStorageError("normalize", error);
                return false;
            }

            if (!canCreateRecord(normalized)) {
                console.warn(
                    "BaselTrack: calculation record creation denied by role permissions."
                );
                return false;
            }

            if (records.some(item =>
                item.calculationId === normalized.calculationId
            )) {
                reportStorageError(
                    "save",
                    new Error("A calculation with this ID already exists.")
                );
                return false;
            }

            return save(records.concat(normalized));
        },

        remove: function (calculationId) {
            const role = typeof window.getCurrentRole === "function"
                ? window.getCurrentRole()
                : "";
            if (!role || typeof window.hasPermission !== "function" ||
                !window.hasPermission(role, "calculation-repository", "D")) {
                console.warn(
                    "BaselTrack: calculation record deletion denied by role permissions."
                );
                return false;
            }

            const nextRecords = records.filter(record =>
                record.calculationId !== String(calculationId)
            );

            if (nextRecords.length === records.length) return false;
            return save(nextRecords);
        }
    };
})();
