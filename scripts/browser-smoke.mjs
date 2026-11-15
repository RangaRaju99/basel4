#!/usr/bin/env node
// Dependency-free browser regression checks. Uses an isolated temporary Chrome profile.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import http from 'node:http';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i === -1 ? fallback : args[i + 1]; };
const root = path.resolve(option('--root', defaultRoot));
const output = path.resolve(option('--output', path.join(os.tmpdir(), 'baseltrack-browser-smoke.json')));
const compareFile = option('--compare', null);
const chromePath = option('--chrome', process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const modes = args.includes('--http') ? ['file', 'http'] : ['file'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baseltrack-smoke-'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
let chrome, socket, server;
const failures = [];
const result = { version: 1, modes: {}, failures };

class CDP {
    constructor(ws) {
        this.ws = ws; this.nextId = 1; this.pending = new Map(); this.listeners = new Map();
        ws.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const pending = this.pending.get(message.id);
                if (!pending) return;
                clearTimeout(pending.timeout); this.pending.delete(message.id);
                if (message.error) pending.reject(new Error(message.error.message));
                else pending.resolve(message.result);
            } else for (const listener of this.listeners.get(message.method) || []) listener(message.params);
        });
    }
    on(name, listener) {
        const list = this.listeners.get(name) || []; list.push(listener); this.listeners.set(name, list);
        return () => this.listeners.set(name, list.filter(item => item !== listener));
    }
    send(method, params = {}) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
            this.pending.set(id, { resolve, reject, timeout });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }
    async evaluate(expression) {
        const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
        return response.result.value;
    }
}

function check(condition, label) { if (!condition) failures.push(label); }

function deterministicEnvironment() {
    const NativeDate = Date;
    const instant = NativeDate.parse('2026-11-15T12:00:00.000Z');
    window.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [instant])); }
        static now() { return instant; }
    };
    let seed = 163;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function inspectRole() {
    const role = window.getCurrentRole();
    const issues = [];
    const visible = element => !!element && !element.hidden && getComputedStyle(element).display !== 'none';
    const compact = value => String(value || '').replace(/\s+/g, ' ').trim();
    const snapshot = element => {
        if (!element) return null;
        const nodes = [element, ...element.querySelectorAll('*')];
        const semantic = nodes.map(node => [
            node.tagName, node.id, node.getAttribute('type'), node.getAttribute('name'),
            node.getAttribute('data-page'), node.hidden,
            node.childElementCount ? '' : compact(node.textContent),
            'value' in node ? node.value : null, 'disabled' in node ? node.disabled : null
        ]);
        const sampleStep = Math.max(1, Math.floor(nodes.length / 24));
        const styles = nodes.filter((_, index) => index % sampleStep === 0).slice(0, 25).map(node => {
            const css = getComputedStyle(node);
            return [node.tagName, node.id, css.display, css.color, css.backgroundColor, css.fontFamily,
                css.fontSize, css.fontWeight, css.padding, css.margin, css.borderRadius, css.gridTemplateColumns];
        });
        return { semantic, styles };
    };
    const routes = [...new Set([
        'dashboard', ...document.querySelectorAll('[data-page]')
    ].map(item => typeof item === 'string' ? item : item.dataset.page).concat(
        ...Object.values(window.ROLE_PERMISSIONS).map(pages => Object.keys(pages))
    ))].sort();
    const sidebar = [...document.querySelectorAll('#sidebarNav [data-page]')].map(link => {
        const allowed = canRead(role, link.dataset.page);
        if (visible(link) !== allowed) issues.push(`sidebar ${link.dataset.page}: visibility does not match R permission`);
        return [link.dataset.page, visible(link)];
    });
    const profile = [...document.querySelectorAll('[data-profile-action]')].map(node => [node.dataset.profileAction, visible(node)]);
    const expectedProfile = Object.values(window.PROFILE_PERMISSIONS[role] || {}).some(Boolean);
    if (profile.some(([, shown]) => shown !== expectedProfile)) issues.push('profile visibility differs from profile permission');
    const rendered = {};
    for (const page of routes) {
        const allowed = page === 'dashboard' || canRead(role, page);
        try {
            if (allowed) {
                window.setActivePage(page);
                const active = document.getElementById(page === 'dashboard' ? 'dashboardView' : 'moduleView');
                if (!visible(active)) issues.push(`${page}: active view hidden`);
                if (/Template Not Found/.test(active.textContent)) issues.push(`${page}: missing template`);
                rendered[page] = { allowed, title: document.getElementById('pageTitle').textContent, view: snapshot(active) };
            } else {
                window.setActivePage('dashboard');
                window.setActivePage(page);
                if (!visible(document.getElementById('dashboardView'))) issues.push(`${page}: setActivePage bypassed denial`);
                window.renderWorkspaceModule(page);
                const denied = compact(document.getElementById('moduleView').textContent);
                if (!denied.includes('Access Restricted')) issues.push(`${page}: renderer bypassed denial`);
                rendered[page] = { allowed, denied };
                const config = window.WORKSPACE_MODULES && window.WORKSPACE_MODULES[page];
                const template = config && document.getElementById(config.template);
                if (config && template && typeof window[config.init] === 'function') {
                    const moduleView = document.getElementById('moduleView');
                    moduleView.innerHTML = '';
                    moduleView.appendChild(template.content.cloneNode(true));
                    window[config.init]();
                    if (!compact(moduleView.textContent).includes('Access Restricted')) {
                        issues.push(`${page}: direct initializer bypassed read permission`);
                    }
                }
            }
        } catch (error) { issues.push(`${page}: ${error.message}`); rendered[page] = { allowed, error: error.message }; }
    }
    // Exercise initialization a second time to expose stale roots and non-repeatable setup.
    for (const page of routes.filter(page => page !== 'dashboard' && canRead(role, page))) {
        try { window.setActivePage(page); } catch (error) { issues.push(`${page} second visit: ${error.message}`); }
    }
    if (role === 'risk') {
        window.setActivePage('rwa-calculation');
        const before = window.baselTrackCalculationData.results.length;
        document.getElementById('rwaCalculateBtn').click();
        const after = window.baselTrackCalculationData.results.length;
        if (after !== before) issues.push('RWA read/update permission created a new calculation record');
        if (!/preview/i.test(document.getElementById('rwaMessage').textContent)) {
            issues.push('RWA preview did not explain that the result was not persisted');
        }
        if (window.baselTrackCalculationStore.add({
            calculationId: 'SMOKE-DENIED-CREATE', type: 'RWA',
            bank: 'HDFC Bank', reportingPeriod: 'Oct 2026'
        })) {
            issues.push('Calculation store accepted record creation without C permission');
        }
        window.baselTrackCalculationData.results.push({
            calculationId: 'SMOKE-CAL-001', type: 'RWA', bank: 'HDFC Bank',
            reportingPeriod: 'Oct 2026', status: 'Completed', metrics: { totalRWA: 1 }
        });
        if (window.baselTrackCalculationStore.remove('SMOKE-CAL-001')) {
            issues.push('Calculation store accepted deletion without D permission');
        }
        window.setActivePage('calculation-repository');
        if (document.querySelector('#moduleView [data-action="delete"]')) {
            issues.push('Calculation repository exposed Delete without D permission');
        }
    }
    if (role === 'superadmin') {
        window.setActivePage('manage-user');
        const initialUserRows = document.querySelectorAll('#userTableBody tr').length;
        const usersStart = initialUserRows;
        if (initialUserRows !== 8) issues.push('Manage Users initial table does not render the expected first page');

        document.querySelector('#userTableBody [data-action="view"]')?.click();
        const userProfile = document.getElementById('viewModal');
        if (!visible(userProfile) || /User ID/.test(compact(userProfile.textContent))) {
            issues.push('Manage Users profile popup visibility or content is incorrect');
        }
        document.getElementById('closeViewBtn')?.click();

        document.getElementById('openFilterBtn')?.click();
        const userSearch = document.getElementById('searchKeyword');
        if (!visible(document.getElementById('filterOverlay')) || !userSearch) {
            issues.push('Manage Users filter popup did not open');
        } else {
            userSearch.value = 'arun';
            document.getElementById('applyFilterBtn').click();
            if (document.querySelectorAll('#userTableBody tr').length !== 1 ||
                !compact(document.querySelector('#userTableBody').textContent).includes('arun.d')) {
                issues.push('Manage Users search/filter did not narrow the table');
            }
        }
        document.getElementById('openFilterBtn')?.click();
        document.getElementById('resetFilterBtn')?.click();

        document.getElementById('openAddUserBtn')?.click();
        document.getElementById('addUsername').value = 'smoke.created';
        document.getElementById('addFullName').value = 'Smoke Created';
        document.getElementById('addRole').value = 'auditor';
        document.getElementById('addUserForm').dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        );
        const addedUsers = JSON.parse(localStorage.getItem('baseltrack-user-directory-v1') || '[]');
        const addedUser = addedUsers.find(user => user.username === 'smoke.created');
        if (!addedUser || addedUsers.length !== usersStart + 1) {
            issues.push('Manage Users add workflow did not persist the new user');
        } else {
            window.setActivePage('manage-user');
            const editButton = document.querySelector(`#userTableBody [data-action="edit"][data-id="${addedUser.id}"]`);
            if (!editButton) {
                issues.push('Manage Users did not render the new user for editing');
            } else {
                editButton.click();
                document.getElementById('editFullName').value = 'Smoke Updated';
                document.getElementById('editStatusToggle').click();
                document.getElementById('editUserForm').dispatchEvent(
                    new Event('submit', { bubbles: true, cancelable: true })
                );
                const updated = JSON.parse(localStorage.getItem('baseltrack-user-directory-v1') || '[]')
                    .find(user => user.id === addedUser.id);
                if (!updated || updated.fullName !== 'Smoke Updated' || updated.status !== 'Inactive') {
                    issues.push('Manage Users edit workflow did not persist name/status changes');
                }
            }
        }

        window.setActivePage('manage-role');
        const roleRows = document.querySelectorAll('#roleTableBody tr').length;
        const rolePagination = document.querySelector('#rolePagination');
        if (roleRows !== 10 || !rolePagination?.textContent.includes('Page 1 of 2')) {
            issues.push('Manage Roles default page size or page count is incorrect');
        } else {
            rolePagination.querySelector('[data-pagination-action="next"]').click();
            if (document.querySelectorAll('#roleTableBody tr').length !== 1 ||
                !rolePagination.textContent.includes('Page 2 of 2')) {
                issues.push('Manage Roles next-page pagination is incorrect');
            }
            const pageSize = rolePagination.querySelector('.pagination-size');
            pageSize.value = '20';
            pageSize.dispatchEvent(new Event('change', { bubbles: true }));
            if (document.querySelectorAll('#roleTableBody tr').length !== 11 ||
                !rolePagination.textContent.includes('Page 1 of 1')) {
                issues.push('Manage Roles page-size selection did not reset to page one');
            }
        }

        document.querySelector('#roleTableBody [data-action="edit"][data-role="superadmin"]')?.click();
        const roleDescription = document.getElementById('editDescription');
        const roleStatus = document.getElementById('editStatusToggle');
        if (!visible(document.getElementById('editModal')) || !roleDescription || !roleStatus ||
            !document.getElementById('editRoleId').disabled ||
            !document.getElementById('editRoleName').disabled ||
            !document.getElementById('editUsers').disabled) {
            issues.push('Manage Roles edit popup does not enforce its read-only field layout');
        } else {
            roleDescription.value = 'Smoke audit description';
            roleStatus.click();
            document.getElementById('editRoleForm').dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true })
            );
            const metadata = JSON.parse(localStorage.getItem('baseltrack-role-directory-v1') || '{}');
            if (metadata.superadmin?.description !== 'Smoke audit description' ||
                metadata.superadmin?.status !== 'Inactive') {
                issues.push('Manage Roles edit workflow did not persist description/status');
            }
        }
    }
    if (role === 'regulatoryAdmin') {
        const globalNotificationToggle = document.getElementById('notificationToggle');
        window.setActivePage('report-templates');
        const templateSearch = document.getElementById('templateSearch');
        templateSearch.value = 'B4C_002';
        templateSearch.dispatchEvent(new Event('input', { bubbles: true }));
        if (document.querySelectorAll('#reportBody tr').length !== 1 ||
            !document.querySelector('#reportBody').textContent.includes('B4C_002')) {
            issues.push('Report Templates search did not filter the catalog');
        }
        document.querySelector('#reportBody [data-action="edit"][data-id="2"]')?.click();
        if (!visible(document.getElementById('editModal'))) {
            issues.push('Report Templates edit popup did not open for an authorized role');
        } else {
            document.getElementById('editName').value = 'Smoke Template Update';
            document.getElementById('editTemplate').value = 'Smoke template content';
            document.getElementById('editStatus').click();
            document.getElementById('updateTemplate').click();
            const templates = JSON.parse(localStorage.getItem('baseltrack-report-templates') || '[]');
            const updatedTemplate = templates.find(template => template.id === 2);
            if (!updatedTemplate || updatedTemplate.name !== 'Smoke Template Update' ||
                updatedTemplate.template !== 'Smoke template content') {
                issues.push('Report Templates update did not persist its changes');
            }
        }

        window.setActivePage('reporting-calendar');
        document.querySelector('#reportingCalendarApp [data-view="list"]')?.click();
        document.getElementById('openFilterBtn').click();
        document.getElementById('searchFilter').value = 'REP-001';
        document.getElementById('applyFilters').click();
        if (document.querySelectorAll('#reportTableBody tr').length !== 1 ||
            !document.getElementById('reportTableBody').textContent.includes('REP-001')) {
            issues.push('Reporting Calendar filters did not narrow the list view');
        }
        document.querySelector('#reportTableBody [data-id="REP-001"]')?.click();
        if (!visible(document.getElementById('reportModal'))) {
            issues.push('Reporting Calendar report details modal did not open');
        }
        document.getElementById('closeReportBottom').click();
        document.getElementById('openDeadlineAlerts').click();
        if (!visible(document.getElementById('notificationOverlay'))) {
            issues.push('Reporting Calendar deadline alerts did not open from their module control');
        }
        document.getElementById('closeNotification').click();
        if (!globalNotificationToggle.hidden) {
            issues.push('Reporting Calendar exposed the restricted global notification control');
        }

        const profileAction = document.querySelector('[data-profile-action="profile"]');
        const notificationToggle = document.getElementById('notificationToggle');
        if (profileAction) profileAction.click();
        if (notificationToggle) notificationToggle.click();
        if (visible(document.getElementById('modalBackdrop'))) {
            issues.push('Profile modal bypassed the profile permission');
        }
        if (visible(document.getElementById('notificationPanel'))) {
            issues.push('Notification panel bypassed the notification permission');
        }
    }
    window.setActivePage('dashboard');
    const theme = document.documentElement.dataset.theme;
    document.getElementById('themeToggle').click();
    const changedTheme = document.documentElement.dataset.theme;
    if (theme === changedTheme || localStorage.getItem('baseltrack-theme') !== changedTheme) issues.push('theme toggle/persistence failed');
    document.getElementById('themeToggle').click();
    const profileActions = {};
    for (const button of document.querySelectorAll('[data-profile-action]')) {
        if (!visible(button)) continue;
        button.click();
        const modal = document.getElementById('modalBackdrop');
        if (!visible(modal)) issues.push(`${button.dataset.profileAction}: modal did not open`);
        profileActions[button.dataset.profileAction] = snapshot(document.getElementById('modalBody'));
        window.closeModal();
        if (!modal.hidden) issues.push(`${button.dataset.profileAction}: modal did not close`);
    }
    const notifications = document.getElementById('notificationToggle');
    const notificationsAllowed = Boolean(
        window.PROFILE_PERMISSIONS[role] &&
        window.PROFILE_PERMISSIONS[role].notifications
    );
    if (visible(notifications) !== notificationsAllowed) {
        issues.push('notification control visibility differs from notification permission');
    }
    if (notificationsAllowed) {
        notifications.click();
        if (!visible(document.getElementById('notificationPanel'))) issues.push('notification popup failed');
        notifications.click();
    }
    return {
        role, sidebar, profile, rendered, profileActions, issues
    };
}

try {
    if (!fs.existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}; supply --chrome or CHROME_PATH.`);
    chrome = spawn(chromePath, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--disable-background-networking', '--disable-component-update', '--disable-sync',
        '--disable-extensions', '--remote-debugging-port=0', '--remote-allow-origins=*',
        `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'
    ], { windowsHide: true, stdio: 'ignore' });
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
    if (!fs.existsSync(portFile)) throw new Error('Chrome did not publish its debugging port.');
    const port = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(item => item.type === 'page');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    const cdp = new CDP(socket);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] });
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Calcutta' });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(${deterministicEnvironment.toString()})();` });
    let errors = [];
    cdp.on('Runtime.exceptionThrown', data => errors.push((data.exceptionDetails.exception?.description || data.exceptionDetails.text).split('\n')[0]));
    cdp.on('Runtime.consoleAPICalled', data => { if (data.type === 'error') errors.push(data.args.map(arg => arg.value || arg.description || '').join(' ').split('\n')[0]); });
    cdp.on('Page.javascriptDialogOpening', () => { cdp.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    async function navigate(url) {
        let done = false;
        const off = cdp.on('Page.loadEventFired', () => { done = true; });
        await cdp.send('Page.navigate', { url });
        for (let i = 0; i < 200 && !done; i++) await sleep(50);
        off(); if (!done) throw new Error(`Navigation timed out: ${url}`);
        await sleep(80);
    }
    if (modes.includes('http')) {
        server = http.createServer((request, response) => {
            const filename = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
            if (!filename.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
            fs.readFile(filename, (error, content) => {
                if (error) { response.writeHead(404); response.end(); return; }
                response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(filename)] || 'application/octet-stream');
                response.end(content);
            });
        });
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    }
    for (const mode of modes) {
        const base = mode === 'file' ? pathToFileURL(root + path.sep).href : `http://127.0.0.1:${server.address().port}/`;
        const modeResult = result.modes[mode] = { roles: {}, login: {}, permissions: null };
        await navigate(base + 'index.html');
        const roles = await cdp.evaluate(`Array.from(document.querySelectorAll('#role option')).map(option => option.value).filter(Boolean)`);
        check(roles.length === 11, `${mode}: expected 11 login roles, found ${roles.length}`);
        for (const role of roles) {
            errors = [];
            // Seed via the landing-page origin so file:// localStorage behavior matches normal login.
            await navigate(base + 'index.html');
            await cdp.evaluate(`localStorage.clear(); localStorage.setItem('baseltrack-user', JSON.stringify({employeeId:'SMOKE', role:${JSON.stringify(role)}})); localStorage.setItem('baseltrack-role', ${JSON.stringify(role)}); localStorage.setItem('baseltrack-theme','light');`);
            await navigate(base + 'workspace.html');
            if (!modeResult.permissions) modeResult.permissions = await cdp.evaluate(`({roles:window.ROLE_CONFIG, permissions:window.ROLE_PERMISSIONS, profiles:window.PROFILE_PERMISSIONS, system:window.SYSTEM_PERMISSIONS})`);
            const inspected = await cdp.evaluate(`(${inspectRole.toString()})()`);
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: 390, height: 844, deviceScaleFactor: 1, mobile: true
            });
            const responsiveIssues = await cdp.evaluate(`(() => {
                const role = window.getCurrentRole();
                const issues = [];
                const pages = Object.keys(window.ROLE_PERMISSIONS[role] || {})
                    .filter(page => canRead(role, page));
                for (const page of pages) {
                    window.setActivePage(page);
                    const width = Math.max(
                        document.documentElement.scrollWidth,
                        document.body.scrollWidth
                    );
                    if (width > window.innerWidth + 2) {
                        issues.push(page + ': page overflows viewport (' +
                            width + 'px > ' + window.innerWidth + 'px)');
                    }
                }
                window.setActivePage('dashboard');
                return issues;
            })()`);
            inspected.issues.push(...responsiveIssues.map(issue => `mobile: ${issue}`));
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false
            });
            inspected.errors = [...new Set(errors)];
            for (const issue of inspected.issues) failures.push(`${mode}/${role}: ${issue}`);
            for (const error of inspected.errors) failures.push(`${mode}/${role}: console ${error}`);
            for (const entry of Object.values(inspected.rendered)) if (entry.view) {
                entry.semanticHash = hash(entry.view.semantic); entry.styleHash = hash(entry.view.styles);
                entry.elementCount = entry.view.semantic.length; delete entry.view;
            }
            for (const [action, view] of Object.entries(inspected.profileActions)) inspected.profileActions[action] = hash(view);
            modeResult.roles[role] = inspected;
            console.log(`${mode}: ${role}: ${Object.keys(inspected.rendered).length} routes, ${inspected.issues.length} issues, ${inspected.errors.length} console errors`);
        }
        // Real landing-page form submission and workspace logout, using application event handlers.
        await navigate(base + 'index.html');
        await cdp.evaluate(`localStorage.clear(); document.querySelector('[data-login]').click(); document.getElementById('employeeId').value='SMOKE'; document.getElementById('password').value='test-password'; document.getElementById('role').value='risk'; document.getElementById('togglePassword').click();`);
        modeResult.login.passwordToggle = await cdp.evaluate(`document.getElementById('password').type === 'text'`);
        await cdp.evaluate(`document.getElementById('loginForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));`);
        for (let i = 0; i < 100; i++) {
            await sleep(100);
            const ready = await cdp.evaluate(`location.pathname.endsWith('workspace.html') && document.readyState === 'complete' && typeof window.getCurrentRole === 'function' && window.getCurrentRole() === 'risk'`).catch(() => false);
            if (ready) break;
        }
        modeResult.login.signedIn = await cdp.evaluate(`location.pathname.endsWith('workspace.html') && window.getCurrentRole?.() === 'risk'`);
        check(modeResult.login.signedIn, `${mode}: login form did not enter workspace`);
        await cdp.evaluate(`document.getElementById('logoutButton').click()`);
        for (let i = 0; i < 100; i++) {
            await sleep(50);
            if (await cdp.evaluate(`location.pathname.endsWith('index.html') && document.readyState === 'complete'`).catch(() => false)) break;
        }
        modeResult.login.signedOut = await cdp.evaluate(`location.pathname.endsWith('index.html') && !localStorage.getItem('baseltrack-role') && !localStorage.getItem('baseltrack-user')`);
        check(modeResult.login.signedOut, `${mode}: logout failed to clear session/return to landing`);
        check(modeResult.login.passwordToggle, `${mode}: password visibility toggle failed`);
    }
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Snapshot: ${output}`);
    if (compareFile) {
        const baseline = JSON.parse(fs.readFileSync(compareFile, 'utf8'));
        const differences = [];
        for (const mode of modes) {
            if (!baseline.modes[mode]) { differences.push(`${mode}: no baseline`); continue; }
            if (hash(baseline.modes[mode].permissions) !== hash(result.modes[mode].permissions)) differences.push(`${mode}: role/permission definitions changed`);
            if (hash(baseline.modes[mode].login) !== hash(result.modes[mode].login)) differences.push(`${mode}: login/logout behavior changed`);
            for (const [role, actual] of Object.entries(result.modes[mode].roles)) {
                const expected = baseline.modes[mode].roles[role];
                if (!expected) { differences.push(`${mode}/${role}: absent from baseline`); continue; }
                for (const key of ['sidebar', 'profile', 'profileActions', 'errors', 'issues']) if (hash(expected[key]) !== hash(actual[key])) differences.push(`${mode}/${role}: ${key} changed`);
                for (const [route, entry] of Object.entries(actual.rendered)) if (hash(expected.rendered[route]) !== hash(entry)) differences.push(`${mode}/${role}/${route}: rendered behavior or styles changed`);
            }
        }
        console.log(`Regression differences: ${differences.length}`);
        for (const difference of differences) console.log(`  ${difference}`);
        process.exitCode = differences.length ? 1 : 0;
    } else {
        console.log(`Baseline findings: ${failures.length}`);
        for (const failure of failures) console.log(`  ${failure}`);
        process.exitCode = failures.length ? 1 : 0;
    }
    await cdp.send('Browser.close').catch(() => {});
} catch (error) {
    console.error(error.stack || error.message); process.exitCode = 1;
} finally {
    if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    if (server) server.close();
    if (chrome && chrome.exitCode === null) chrome.kill();
    // Only this harness-created temporary directory is eligible for cleanup.
    if (path.dirname(profile) === os.tmpdir() && path.basename(profile).startsWith('baseltrack-smoke-')) {
        await sleep(300);
        try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { console.warn(`Temporary browser profile retained: ${profile}`); }
    }
}
