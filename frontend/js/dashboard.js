requireAuth();

const now = new Date();
let currentMonth = now.getMonth() + 1;
let currentYear = now.getFullYear();

document.getElementById("month-label").textContent =
    `${now.toLocaleString("default", { month: "long" })} ${currentYear}`;

// --- Load dashboard ---
async function loadDashboard() {
    try {
        const stats = await apiGet(`/rents/dashboard?month=${currentMonth}&year=${currentYear}`);
        if (!stats) return;

        document.getElementById("stat-active").textContent = stats.active_tenants;
        document.getElementById("stat-paid").textContent = stats.paid_count;
        document.getElementById("stat-pending").textContent = stats.pending_count;
        document.getElementById("stat-overdue").textContent = stats.overdue_count;
        document.getElementById("total-collected").textContent = formatMoney(stats.total_collected);
        document.getElementById("total-pending").textContent = formatMoney(stats.total_pending);
    } catch (err) {
        showToast("Failed to load stats", "error");
    }

    // Load unpaid tenants
    try {
        const rents = await apiGet(`/rents/?month=${currentMonth}&year=${currentYear}`);
        if (!rents) return;

        const unpaid = rents.filter(r => r.status !== "paid");
        const tbody = document.getElementById("unpaid-table");
        const cards = document.getElementById("unpaid-cards");
        const allPaidMsg = document.getElementById("all-paid-msg");

        if (unpaid.length === 0) {
            tbody.innerHTML = "";
            cards.innerHTML = "";
            allPaidMsg.classList.remove("hidden");
            return;
        }

        allPaidMsg.classList.add("hidden");

        // Desktop table rows
        tbody.innerHTML = unpaid.map(r => `
            <tr class="table-row border-b border-gray-50">
                <td class="px-5 py-3 font-medium text-gray-800">${r.tenant_name || "Unknown"}</td>
                <td class="px-5 py-3 text-gray-600">${getTenantRoom(r.tenant_id)}</td>
                <td class="px-5 py-3 font-medium">${formatMoney(r.amount_due)}</td>
                <td class="px-5 py-3">${formatMoney(r.amount_paid)}</td>
                <td class="px-5 py-3">${statusBadge(r.status)}</td>
                <td class="px-5 py-3">
                    <button onclick="sendReminder(${r.tenant_id})"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">📱 Remind</button>
                </td>
            </tr>
        `).join("");

        // Mobile cards
        cards.innerHTML = unpaid.map(r => `
            <div class="mobile-card">
                <div class="card-header">
                    <span class="font-semibold text-gray-800">${r.tenant_name || "Unknown"}</span>
                    ${statusBadge(r.status)}
                </div>
                <div class="card-row"><span class="label">Room</span><span class="value">${getTenantRoom(r.tenant_id)}</span></div>
                <div class="card-row"><span class="label">Due</span><span class="value">${formatMoney(r.amount_due)}</span></div>
                <div class="card-row"><span class="label">Paid</span><span class="value">${formatMoney(r.amount_paid)}</span></div>
                <div class="card-actions">
                    <button onclick="sendReminder(${r.tenant_id})" class="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded-lg text-sm font-medium">📱 Remind</button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        showToast("Failed to load rents", "error");
    }
}

// Tenant room cache
let tenantCache = {};
async function loadTenants() {
    try {
        const tenants = await apiGet("/tenants/?active_only=true");
        if (tenants) {
            tenants.forEach(t => { tenantCache[t.id] = t; });
        }
    } catch (err) { /* ignore */ }
}

function getTenantRoom(tenantId) {
    return tenantCache[tenantId]?.room_number || "-";
}

// --- Actions ---
async function generateRents() {
    try {
        const result = await apiPost("/rents/generate", { month: currentMonth, year: currentYear });
        if (result) {
            showToast(result.message, "success");
            loadDashboard();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function markOverdue() {
    try {
        const result = await apiPost("/rents/mark-overdue");
        if (result) {
            showToast(result.message, "info");
            loadDashboard();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function sendReminder(tenantId) {
    try {
        const result = await apiPost("/notifications/send-reminder", { tenant_id: tenantId });
        if (result) showToast(result.message, "success");
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function sendBulkReminders() {
    try {
        const result = await apiPost(`/notifications/send-bulk?month=${currentMonth}&year=${currentYear}`);
        if (result) showToast(`Sent reminders to ${result.sent} tenants`, "success");
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Sidebar toggle for mobile
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
}

// Init
loadTenants().then(() => loadDashboard());
