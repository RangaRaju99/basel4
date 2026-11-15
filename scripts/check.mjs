import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { buildPages, compilePages, compileBundles, projectRoot } from "./build.mjs";

const failures = [];
const fail = message => failures.push(message);

function filesUnder(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(file) : entry.isFile() ? [file] : [];
    });
}

function attributes(tag) {
    const values = {};
    for (const match of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
        values[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
    }
    return values;
}

function localAsset(reference, page) {
    if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)) return null;
    let clean;
    try {
        clean = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    } catch {
        fail(page + ": invalid asset URL " + reference);
        return null;
    }
    if (!clean) return null;
    const absolute = clean.startsWith("/")
        ? path.resolve(projectRoot, "." + clean)
        : path.resolve(projectRoot, path.dirname(page), clean);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
        fail(page + ": missing asset " + reference);
        return null;
    }
    return absolute;
}

try {
    buildPages({ check: true });
} catch (error) {
    fail(error.message);
}

let pages = [];
let bundles = [];
try {
    pages = compilePages();
    bundles = compileBundles();
} catch (error) {
    fail(error.message);
}

const scriptFiles = new Set();
const templateCounts = new Map();
let assetCount = 0;

for (const page of pages) {
    for (const match of page.content.matchAll(/<(script|link|img)\b[^>]*>/gi)) {
        const tag = match[1].toLowerCase();
        const attrs = attributes(match[0]);
        const reference = tag === "link" && /(?:^|\s)stylesheet(?:\s|$)/i.test(attrs.rel || "")
            ? attrs.href : tag === "script" || tag === "img" ? attrs.src : null;
        if (!reference) continue;
        const asset = localAsset(reference, page.output);
        if (asset) {
            assetCount++;
            if (tag === "script") scriptFiles.add(asset);
        }
    }
    const pageTemplates = new Set();
    for (const match of page.content.matchAll(/<template\b[^>]*>/gi)) {
        const id = attributes(match[0]).id;
        if (!id) {
            fail(page.output + ": template has no id.");
            continue;
        }
        if (pageTemplates.has(id)) fail(page.output + ": duplicate template id " + id);
        pageTemplates.add(id);
        templateCounts.set(id, (templateCounts.get(id) || 0) + 1);
    }
}

const sourceFiles = filesUnder(path.join(projectRoot, "src"));
for (const file of sourceFiles.filter(file => file.endsWith(".html"))) {
    const content = fs.readFileSync(file, "utf8");
    const relative = path.relative(projectRoot, file);
    if (/<style\b/i.test(content)) {
        fail(relative + ": inline <style> block; place styles in a CSS file.");
    }
    for (const match of content.matchAll(/<script\b[^>]*>/gi)) {
        if (!attributes(match[0]).src) {
            fail(relative + ": inline <script> block; place logic in a JS file.");
        }
    }
}

const jsFiles = new Set([
    ...sourceFiles,
    ...filesUnder(path.join(projectRoot, "scripts")),
    ...scriptFiles,
    ...bundles.map(bundle => path.join(projectRoot, bundle.output))
].filter(file => /\.(?:js|mjs|cjs)$/.test(file)));

for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.error || result.status !== 0) {
        fail("JavaScript syntax: " + path.relative(projectRoot, file) + "\n" +
            (result.error?.message || result.stderr || result.stdout).trim());
    }
}

const permissionsPath = path.join(projectRoot, "src/core/permissions/permissions.js");
if (!fs.existsSync(permissionsPath)) {
    fail("Missing central permission map: src/core/permissions/permissions.js");
} else {
    const permissionContext = { window: {} };
    try {
        vm.runInNewContext(fs.readFileSync(permissionsPath, "utf8"), permissionContext);
        const permissions = permissionContext.window;
        const expectations = [
            ["superadmin", "manage-user", "C", true],
            ["superadmin", "manage-role", "C", false],
            ["superadmin", "manage-role", "U", true],
            ["regulatoryAdmin", "report-templates", "U", true],
            ["regulatoryAdmin", "capital-calculation", "R", false],
            ["regulatoryAdmin", "manage-reports", "R", false],
            ["dqa", "issue-workbench", "C", true],
            ["dqa", "generate-report", "U", true],
            ["dqa", "data-ingestion", "R", true],
            ["risk", "variance-analysis", "R", true],
            ["risk", "variance-analysis", "C", false],
            ["risk", "exception-management", "U", true],
            ["risk", "rwa-calculation", "U", true],
            ["risk", "generate-report", "C", false],
            ["finance", "capital-calculation", "U", true],
            ["finance", "rwa-calculation", "U", false],
            ["compliance", "manage-query", "U", true],
            ["manager", "manage-query", "R", false],
            ["rr", "raise-query", "C", true],
            ["rr", "manage-reports", "R", false],
            ["auditor", "data-ingestion", "R", true],
            ["doa", "data-ingestion", "C", true],
            ["superadmin", "manage-user", "D", false],
            ["superadmin", "manage-role", "A", false]
        ];
        for (const [role, page, action, expected] of expectations) {
            if (permissions.hasPermission(role, page, action) !== expected) {
                fail("Permission matrix mismatch: " + role + " " + action + " " + page +
                    " should be " + (expected ? "allowed" : "denied") + ".");
            }
        }
        if (permissions.hasPermission("system", "capital-calculation", "C")) {
            fail("System permissions must remain separate from human login roles.");
        }
        if (!permissions.hasSystemPermission("capital-calculation", "C") ||
            !permissions.hasSystemPermission("calculation-repository", "U")) {
            fail("System calculation permissions do not match the permission matrix.");
        }
        permissions.getCurrentRole = () => "risk";
        permissions.showToast = message => { permissions.lastToast = message; };
        if (!permissions.requireCurrentPermission("exception-management", "U") ||
            permissions.requireCurrentPermission("variance-analysis", "C") ||
            !permissions.lastToast) {
            fail("Action guard did not enforce the active user's exact permission.");
        }
        if (permissions.PROFILE_PERMISSIONS.regulatoryAdmin.notifications !== false ||
            permissions.PROFILE_PERMISSIONS.superadmin.profile !== true) {
            fail("Profile permissions do not match the supplied matrix.");
        }
    } catch (error) {
        fail("Central permission map could not be evaluated: " + error.message);
    }
}

const navigationPath = path.join(projectRoot, "src/core/navigation/navigation.js");
let moduleCount = 0;
if (!fs.existsSync(navigationPath)) {
    fail("Missing navigation registry: src/core/navigation/navigation.js");
} else {
    const navigation = fs.readFileSync(navigationPath, "utf8");
    const registry = navigation.match(/const\s+MODULES\s*=\s*\{([\s\S]*?)\n\s*\};/);
    if (!registry) {
        fail("Cannot locate MODULES registry in src/core/navigation/navigation.js");
    } else {
        const loadedScripts = [...scriptFiles].map(file => fs.readFileSync(file, "utf8")).join("\n");
        const entryPattern = /"([^"]+)"\s*:\s*\{\s*template\s*:\s*"([^"]+)"\s*,\s*init\s*:\s*"([^"]+)"\s*\}/g;
        const routes = new Set();
        for (const match of registry[1].matchAll(entryPattern)) {
            const [, route, template, initializer] = match;
            moduleCount++;
            if (routes.has(route)) fail("Duplicate module route: " + route);
            routes.add(route);
            if (templateCounts.get(template) !== 1) {
                fail(route + ": expected one template named " + template +
                    ", found " + (templateCounts.get(template) || 0));
            }
            const escaped = initializer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            if (!new RegExp("window\\." + escaped + "\\s*=").test(loadedScripts)) {
                fail(route + ": initializer " + initializer + " is not exported by a loaded script.");
            }
        }
        const declaredCount = (registry[1].match(/\btemplate\s*:/g) || []).length;
        if (!moduleCount || moduleCount !== declaredCount) {
            fail("Some MODULES registry entries could not be checked.");
        }
    }
}

if (failures.length) {
    console.error("Project checks failed:\n" + [...new Set(failures)].map(message => "- " + message).join("\n"));
    process.exitCode = 1;
} else {
    console.log("Checks passed: " + pages.length + " generated pages, " +
        assetCount + " local asset references, " + jsFiles.size +
        " JavaScript files, " + moduleCount + " module routes.");
}
