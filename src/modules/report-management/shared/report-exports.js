(function () {
    "use strict";

    const REPORT_COLUMNS = {
        RWA: [
            ["creditRWA", "Credit RWA"],
            ["marketRWA", "Market RWA"],
            ["operationalRWA", "Operational RWA"],
            ["totalRWA", "Total RWA"]
        ],
        Liquidity: [
            ["HQLA", "HQLA"],
            ["netCashOutflows", "Net Cash Outflows"],
            ["LCR", "LCR (%)"],
            ["NSFR", "NSFR (%)"]
        ],
        Capital: [
            ["CET1", "CET1 Capital"],
            ["AT1", "Additional Tier 1 Capital"],
            ["tier2", "Tier 2 Capital"],
            ["tier1Capital", "Tier 1 Capital"],
            ["totalCapital", "Total Capital"],
            ["rwa", "Risk Weighted Assets"],
            ["cet1Ratio", "CET1 Ratio (%)"],
            ["tier1Ratio", "Tier 1 Ratio (%)"],
            ["CAR", "Capital Adequacy Ratio (%)"]
        ],
        Leverage: [
            ["CET1", "CET1 Capital"],
            ["AT1", "Additional Tier 1 Capital"],
            ["tier1Capital", "Tier 1 Capital"],
            ["totalExposure", "Total Exposure"],
            ["leverageRatio", "Leverage Ratio (%)"]
        ]
    };

    const FIELD_ALIASES = {
        creditRWA: ["creditRWA", "creditRiskRWA", "credit"],
        marketRWA: ["marketRWA", "marketRiskRWA", "market"],
        operationalRWA: ["operationalRWA", "operationalRiskRWA", "operational"],
        totalRWA: ["totalRWA", "totalRwa", "total"],
        HQLA: ["HQLA", "hqla"],
        netCashOutflows: ["netCashOutflows", "netCashOutflow", "netOutflows"],
        LCR: ["LCR", "lcr", "lcrRatio"],
        NSFR: ["NSFR", "nsfr", "nsfrRatio"],
        CET1: ["CET1", "cet1", "cet1Capital"],
        AT1: ["AT1", "at1", "additionalTier1Capital"],
        tier2: ["tier2", "Tier2", "tierTwo", "tier2Capital"],
        tier1Capital: ["tier1Capital", "tier1", "Tier1"],
        totalCapital: ["totalCapital", "total"],
        rwa: ["rwa", "riskWeightedAssets"],
        cet1Ratio: ["cet1Ratio"],
        tier1Ratio: ["tier1Ratio"],
        CAR: ["CAR", "car", "carRatio"],
        totalExposure: ["totalExposure", "exposure"],
        leverageRatio: ["leverageRatio", "ratio", "leverage"]
    };

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function xmlEscape(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&apos;"
            }[character];
        });
    }

    function getRecordValue(record, key) {
        const aliases = FIELD_ALIASES[key] || [key];
        const metrics = record.metrics || {};

        for (const alias of aliases) {
            if (metrics[alias] !== undefined) return metrics[alias];
            if (record[alias] !== undefined) return record[alias];
        }

        return "";
    }

    function getRecordType(record) {
        const value = String(
            record.type || record.calculationType || record.module || ""
        ).toLowerCase();

        if (value.includes("rwa")) return "RWA";
        if (value.includes("liquidity") || value.includes("lcr")) return "Liquidity";
        if (value.includes("capital") || value.includes("car")) return "Capital";
        if (value.includes("leverage")) return "Leverage";
        return record.type || "Other";
    }

    function getRecords(report) {
        const values = [
            report.records,
            report.selectedRecords,
            report.calculations,
            report.selectedCalculations,
            report.items,
            report.data
        ];
        return values.find(Array.isArray) || [];
    }

    function getReportId(report) {
        return report.reportId || report.id || report.reference || "REPORT";
    }

    function getReportName(report) {
        return report.reportName || report.name || report.title ||
            "Consolidated Regulatory Report";
    }

    function getRecordId(record, index) {
        return record.calculationId || record.id || record.resultId ||
            record.reference || `Record ${index + 1}`;
    }

    function getReportTypes(report, records) {
        const types = report.reportTypes || report.types;
        if (Array.isArray(types)) return types;
        if (types) return [String(types)];
        return [...new Set(records.map(getRecordType))];
    }

    function getReportBanks(report, records) {
        const banks = Array.isArray(report.banks)
            ? report.banks
            : [report.banks, report.bank, report.bankName];
        return [...new Set(banks.concat(records.map(record =>
            record.bank || record.bankName
        )).filter(Boolean).map(String))];
    }

    function getReportPeriods(report, records) {
        const periods = Array.isArray(report.periods)
            ? report.periods
            : [report.periods, report.period, report.reportingPeriod];
        return [...new Set(periods.concat(records.map(record =>
            record.period || record.reportingPeriod
        )).filter(Boolean).map(String))];
    }

    function getTheme() {
        const styles = getComputedStyle(document.documentElement);
        const read = function (name, fallback) {
            return styles.getPropertyValue(name).trim() || fallback;
        };

        return {
            primary: read("--primary", "#A44C91"),
            primaryHover: read("--primary-hover", "#873B78"),
            text: read("--text", "#29232D"),
            muted: read("--muted", "#77717C"),
            card: read("--card", "#FFFFFF"),
            surface: read("--surface-alt", "#F0EAF2"),
            line: read("--line", "#E6DDE9")
        };
    }

    function getExportColumns(records) {
        const types = [...new Set(records.map(getRecordType))];
        const columns = [];
        const seen = new Set();

        types.forEach(function (type) {
            (REPORT_COLUMNS[type] || []).forEach(function (column) {
                if (!seen.has(column[0])) {
                    seen.add(column[0]);
                    columns.push(column);
                }
            });
        });

        return columns;
    }

    function formatDate(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function primaryResult(record) {
        const type = getRecordType(record);
        const metricKey = {
            RWA: "totalRWA",
            Liquidity: "LCR",
            Capital: "CAR",
            Leverage: "leverageRatio"
        }[type];

        if (!metricKey) return "-";

        const value = getRecordValue(record, metricKey);
        if (value === "") return "-";

        const formatted = typeof value === "number"
            ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
            : String(value);

        const labels = {
            Liquidity: "LCR",
            Capital: "CAR",
            Leverage: "Leverage Ratio"
        };
        return type === "RWA"
            ? `Total RWA: ${formatted}`
            : `${labels[type]}: ${formatted}%`;
    }

    function print(report) {
        const records = getRecords(report);
        const printWindow = window.open("", "_blank", "width=1100,height=800");

        if (!printWindow) return false;

        const theme = getTheme();
        const columns = getExportColumns(records);
        const headers = [
            "Calculation ID",
            "Type",
            "Bank",
            "Reporting Period",
            "Business Date",
            ...columns.map(column => column[1]),
            "Status"
        ];
        const rows = records.map(function (record, index) {
            return [
                getRecordId(record, index),
                getRecordType(record),
                record.bank || record.bankName || "-",
                record.period || record.reportingPeriod || "-",
                formatDate(record.businessDate || record.date),
                ...columns.map(column => getRecordValue(record, column[0])),
                record.status || "-"
            ];
        });

        const table = `
            <div class="table-wrap">
                <table>
                    <thead><tr>${headers.map(value =>
                        `<th>${escapeHTML(value)}</th>`
                    ).join("")}</tr></thead>
                    <tbody>${rows.map(row =>
                        `<tr>${row.map(value =>
                            `<td>${escapeHTML(value)}</td>`
                        ).join("")}</tr>`
                    ).join("")}</tbody>
                </table>
            </div>
        `;

        printWindow.document.open();
        printWindow.document.write(`
            <!doctype html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${escapeHTML(getReportId(report))}</title>
                <style>
                    :root {
                        --primary: ${theme.primary};
                        --text: ${theme.text};
                        --muted: ${theme.muted};
                        --card: ${theme.card};
                        --surface: ${theme.surface};
                        --line: ${theme.line};
                    }
                    * { box-sizing: border-box; }
                    body { margin: 0; padding: 28px; color: var(--text); font: 13px "DM Sans", Arial, sans-serif; }
                    h1 { margin: 0 0 5px; color: var(--primary); font-size: 23px; }
                    p { margin: 5px 0; color: var(--muted); }
                    .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 20px 0; }
                    .meta div { padding: 10px; border: 1px solid var(--line); border-radius: 8px; }
                    .meta span { display: block; margin-bottom: 4px; color: var(--muted); font-size: 10px; }
                    .meta strong { overflow-wrap: anywhere; }
                    .table-wrap { overflow: visible; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 7px; border: 1px solid var(--line); text-align: left; font-size: 9px; }
                    th { background: var(--surface); color: var(--primary); }
                    @page { size: landscape; margin: 12mm; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>${escapeHTML(getReportName(report))}</h1>
                <p>BaselTrack Regulatory Reporting</p>
                <div class="meta">
                    <div><span>Report ID</span><strong>${escapeHTML(getReportId(report))}</strong></div>
                    <div><span>Generated</span><strong>${escapeHTML(formatDate(report.generatedAt || report.createdAt))}</strong></div>
                    <div><span>Status</span><strong>${escapeHTML(report.status || "Generated")}</strong></div>
                    <div><span>Bank(s)</span><strong>${escapeHTML(getReportBanks(report, records).join(", ") || "-")}</strong></div>
                    <div><span>Reporting Period(s)</span><strong>${escapeHTML(getReportPeriods(report, records).join(", ") || "-")}</strong></div>
                    <div><span>Calculation Records</span><strong>${records.length}</strong></div>
                </div>
                ${table}
                <script>window.onload = () => setTimeout(() => window.print(), 250);<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
        return true;
    }

    function excelCell(value, style) {
        const numeric = typeof value === "number" && Number.isFinite(value);
        return `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${numeric ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`;
    }

    function worksheetName(value) {
        return String(value || "Report")
            .replace(/[:\\/?*\[\]]/g, "-")
            .slice(0, 31) || "Report";
    }

    function excelSheet(name, headers, rows) {
        return `<Worksheet ss:Name="${xmlEscape(worksheetName(name))}"><Table><Row>${headers.map(value => excelCell(value, "Header")).join("")}</Row>${rows.map(row => `<Row>${row.map(value => excelCell(value)).join("")}</Row>`).join("")}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
    }

    function downloadExcel(report) {
        const records = getRecords(report);
        const types = [...new Set(records.map(getRecordType))];
        const summaryRows = [
            ["Report ID", getReportId(report)],
            ["Report Name", getReportName(report)],
            ["Generated At", report.generatedAt || report.createdAt || ""],
            ["Status", report.status || "Generated"],
            ["Total Records", records.length],
            ["Banks", getReportBanks(report, records).join(", ")],
            ["Reporting Periods", getReportPeriods(report, records).join(", ")],
            ["Report Types", getReportTypes(report, records).join(", ")]
        ];
        let sheets = excelSheet("Summary", ["Field", "Value"], summaryRows);

        types.forEach(function (type) {
            const columns = REPORT_COLUMNS[type] || [];
            const rows = records
                .filter(record => getRecordType(record) === type)
                .map(function (record, index) {
                    return [
                        getRecordId(record, index),
                        record.bank || record.bankName || "",
                        record.period || record.reportingPeriod || "",
                        formatDate(record.businessDate || record.date),
                        ...columns.map(column => getRecordValue(record, column[0])),
                        record.status || ""
                    ];
                });

            sheets += excelSheet(
                type,
                [
                    "Calculation ID",
                    "Bank",
                    "Reporting Period",
                    "Business Date",
                    ...columns.map(column => column[1]),
                    "Status"
                ],
                rows
            );
        });

        const theme = getTheme();
        const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="${xmlEscape(theme.primary)}" ss:Pattern="Solid"/></Style></Styles>${sheets}</Workbook>`;
        const blob = new Blob([workbook], {
            type: "application/vnd.ms-excel;charset=utf-8"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `${getReportId(report).replace(/[^a-z0-9-_]/gi, "_")}.xls`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    window.baselTrackReportExports = {
        print: print,
        excel: downloadExcel,
        primaryResult: primaryResult
    };
})();
