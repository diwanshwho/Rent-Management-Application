requireAuth();

const params = new URLSearchParams(window.location.search);
const tenantId = params.get("id");
if (!tenantId) window.location.href = "dashboard.html";

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();
let tenant = null;
let currentRent = null;

const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// ─── Load Tenant Info ───────────────────────────────────────────────
async function loadTenant() {
    try {
        const data = await apiGet(`/tenants/${tenantId}`);
        tenant = data;

        document.title = `${tenant.name} - Rent Manager`;
        const mobileName = document.getElementById("mobile-tenant-name");
        const desktopName = document.getElementById("desktop-tenant-name");
        if (mobileName) mobileName.textContent = tenant.name;
        if (desktopName) desktopName.textContent = tenant.name;

        const joinDate = tenant.join_date
            ? new Date(tenant.join_date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
            : "-";

        const isActive = tenant.is_active !== false;
        const badge = isActive
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>';

        document.getElementById("tenant-info").innerHTML = `
            <div>
                <span class="text-gray-500 text-xs uppercase tracking-wide">Name</span>
                <p class="font-medium text-gray-800 mt-0.5">${tenant.name}</p>
            </div>
            <div>
                <span class="text-gray-500 text-xs uppercase tracking-wide">Phone</span>
                <p class="font-medium text-gray-800 mt-0.5">${tenant.phone || "-"}</p>
            </div>
            <div>
                <span class="text-gray-500 text-xs uppercase tracking-wide">Room</span>
                <p class="font-medium text-gray-800 mt-0.5">${tenant.room_number || "-"}</p>
            </div>
            <div>
                <span class="text-gray-500 text-xs uppercase tracking-wide">Monthly Rent</span>
                <p class="font-medium text-gray-800 mt-0.5">${formatMoney(tenant.monthly_rent)}</p>
            </div>
            <div>
                <span class="text-gray-500 text-xs uppercase tracking-wide">Due Day</span>
                <p class="font-medium text-gray-800 mt-0.5">${tenant.rent_due_day || "-"}<sup>th</sup> of every month</p>
            </div>
            <div>
                <span class="text-gray-500 text-xs uppercase tracking-wide">Join Date</span>
                <p class="font-medium text-gray-800 mt-0.5">${joinDate}</p>
            </div>
            <div class="sm:col-span-2">
                <span class="text-gray-500 text-xs uppercase tracking-wide">Status</span>
                <p class="mt-1">${badge}</p>
            </div>
        `;
    } catch (err) {
        document.getElementById("tenant-info").innerHTML =
            '<div class="text-red-500 text-center py-4 col-span-full">Failed to load tenant info.</div>';
    }
}

// ─── Load This Month's Rent ─────────────────────────────────────────
async function loadRent() {
    const container = document.getElementById("rent-content");
    try {
        const rents = await apiGet(`/rents/?month=${currentMonth}&year=${currentYear}`);
        currentRent = Array.isArray(rents)
            ? rents.find(r => String(r.tenant_id) === String(tenantId))
            : null;

        if (!currentRent) {
            container.innerHTML = `
                <div class="text-center py-6">
                    <p class="text-gray-500 mb-4">No rent generated for ${monthNames[currentMonth]} ${currentYear}</p>
                    <button onclick="generateRentForTenant()" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                        Generate Rent
                    </button>
                </div>
            `;
            return;
        }

        const remaining = (currentRent.amount_due || 0) - (currentRent.amount_paid || 0);
        const status = currentRent.status || "pending";

        container.innerHTML = `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Due</span>
                    <p class="font-semibold text-gray-800 mt-1">${formatMoney(currentRent.amount_due)}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Paid</span>
                    <p class="font-semibold text-emerald-600 mt-1">${formatMoney(currentRent.amount_paid)}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Remaining</span>
                    <p class="font-semibold ${remaining > 0 ? 'text-red-600' : 'text-gray-800'} mt-1">${formatMoney(remaining)}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Status</span>
                    <p class="mt-1">${statusBadge(status)}</p>
                </div>
            </div>
            ${remaining > 0 ? `
            <button onclick="openPaymentModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                Record Payment
            </button>
            ` : ''}
        `;
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load rent info.</div>';
    }
}

// ─── Generate Rent ──────────────────────────────────────────────────
async function generateRentForTenant() {
    try {
        await apiPost("/rents/generate", { month: currentMonth, year: currentYear });
        showToast("Rent generated successfully", "success");
        await loadRent();
    } catch (err) {
        showToast("Failed to generate rent", "error");
    }
}

// ─── Load Electricity ───────────────────────────────────────────────
async function loadElectricity() {
    const container = document.getElementById("electricity-content");
    if (!tenant) {
        container.innerHTML = '<div class="text-gray-400 text-center py-4">Loading...</div>';
        return;
    }
    try {
        const readings = await apiGet(`/electricity/?room_number=${encodeURIComponent(tenant.room_number)}&month=${currentMonth}&year=${currentYear}`);
        const reading = Array.isArray(readings) && readings.length > 0 ? readings[0] : null;

        if (!reading) {
            container.innerHTML = `
                <div class="text-center py-6">
                    <p class="text-gray-500 mb-4">No reading for ${monthNames[currentMonth]} ${currentYear}</p>
                    <button onclick="openElectricityModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors">
                        Add Reading
                    </button>
                </div>
            `;
            return;
        }

        const units = (reading.curr_reading || 0) - (reading.prev_reading || 0);
        const total = reading.total_amount || (units * (reading.rate_per_unit || 0));

        container.innerHTML = `
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Previous</span>
                    <p class="font-semibold text-gray-800 mt-1">${reading.prev_reading}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Current</span>
                    <p class="font-semibold text-gray-800 mt-1">${reading.curr_reading}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Units</span>
                    <p class="font-semibold text-gray-800 mt-1">${units}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Rate</span>
                    <p class="font-semibold text-gray-800 mt-1">${formatMoney(reading.rate_per_unit)}/unit</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wide">Total</span>
                    <p class="font-semibold text-amber-600 mt-1">${formatMoney(total)}</p>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load electricity info.</div>';
    }
}

// ─── Load Payment History ───────────────────────────────────────────
async function loadPaymentHistory() {
    const container = document.getElementById("payment-history-content");
    try {
        const payments = await apiGet(`/rents/payments?tenant_id=${tenantId}`);
        if (!Array.isArray(payments) || payments.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-center py-6">No payments recorded yet.</div>';
            return;
        }

        const sorted = payments.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

        container.innerHTML = `<div class="flex flex-col gap-3">${sorted.map(p => {
            const date = p.date || p.created_at;
            const formattedDate = date ? new Date(date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "-";
            const monthLabel = p.month && p.year ? `${monthNames[p.month]} ${p.year}` : "-";
            const method = p.method || "-";
            const note = p.note || "-";

            return `
                <div class="mobile-card border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div class="card-header flex items-center justify-between mb-2">
                        <span class="font-semibold text-emerald-600">${formatMoney(p.amount)}</span>
                        <span class="text-gray-400 text-sm">${formattedDate}</span>
                    </div>
                    <div class="card-row flex items-center justify-between text-sm py-1">
                        <span class="label text-gray-500">Month</span>
                        <span class="value text-gray-800">${monthLabel}</span>
                    </div>
                    <div class="card-row flex items-center justify-between text-sm py-1">
                        <span class="label text-gray-500">Method</span>
                        <span class="value text-gray-800 capitalize">${method}</span>
                    </div>
                    <div class="card-row flex items-center justify-between text-sm py-1">
                        <span class="label text-gray-500">Note</span>
                        <span class="value text-gray-800">${note}</span>
                    </div>
                </div>
            `;
        }).join("")}</div>`;
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load payment history.</div>';
    }
}

// ─── Load Notification History ──────────────────────────────────────
async function loadNotificationHistory() {
    const container = document.getElementById("notification-history-content");
    try {
        const notifications = await apiGet(`/notifications/?tenant_id=${tenantId}`);
        if (!Array.isArray(notifications) || notifications.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-center py-6">No notifications sent yet.</div>';
            return;
        }

        const sorted = notifications.sort((a, b) => new Date(b.sent_at || b.created_at || 0) - new Date(a.sent_at || a.created_at || 0));

        container.innerHTML = `<div class="flex flex-col gap-3">${sorted.map(n => {
            const rawDate = n.sent_at || n.created_at;
            const date = rawDate ? new Date(rawDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
            const message = n.message || "-";
            const truncated = message.length > 100 ? message.substring(0, 100) + "..." : message;
            const status = n.status || "unknown";
            const statusClass = status === "sent"
                ? "bg-emerald-100 text-emerald-700"
                : status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600";

            return `
                <div class="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div class="flex items-start justify-between gap-3 mb-2">
                        <p class="text-sm text-gray-700 flex-1">${truncated}</p>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass} shrink-0 capitalize">${status}</span>
                    </div>
                    <p class="text-xs text-gray-400">${date}</p>
                </div>
            `;
        }).join("")}</div>`;
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load notification history.</div>';
    }
}

// ─── Edit Tenant Modal ──────────────────────────────────────────────
function openEditModal() {
    if (!tenant) return;
    document.getElementById("edit-name").value = tenant.name || "";
    document.getElementById("edit-phone").value = tenant.phone || "";
    document.getElementById("edit-room").value = tenant.room_number || "";
    document.getElementById("edit-rent").value = tenant.monthly_rent || "";
    document.getElementById("edit-due-day").value = tenant.rent_due_day || "";
    const modal = document.getElementById("edit-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeEditModal() {
    const modal = document.getElementById("edit-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

async function saveEdit(e) {
    e.preventDefault();
    try {
        await apiPut(`/tenants/${tenantId}`, {
            name: document.getElementById("edit-name").value.trim(),
            phone: document.getElementById("edit-phone").value.trim(),
            room_number: document.getElementById("edit-room").value.trim(),
            monthly_rent: parseFloat(document.getElementById("edit-rent").value),
            rent_due_day: parseInt(document.getElementById("edit-due-day").value)
        });
        showToast("Tenant updated successfully", "success");
        closeEditModal();
        await loadTenant();
    } catch (err) {
        showToast("Failed to update tenant", "error");
    }
}

// ─── Payment Modal ──────────────────────────────────────────────────
function openPaymentModal() {
    if (!currentRent) return;
    const remaining = (currentRent.amount_due || 0) - (currentRent.amount_paid || 0);
    document.getElementById("pay-amount").value = remaining > 0 ? remaining : "";
    document.getElementById("pay-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("pay-method").value = "cash";
    document.getElementById("pay-note").value = "";
    const modal = document.getElementById("payment-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closePaymentModal() {
    const modal = document.getElementById("payment-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

async function savePayment(e) {
    e.preventDefault();
    if (!currentRent) return;
    try {
        await apiPost("/rents/payments", {
            rent_id: currentRent.id,
            tenant_id: parseInt(tenantId),
            amount: parseFloat(document.getElementById("pay-amount").value),
            date: document.getElementById("pay-date").value,
            method: document.getElementById("pay-method").value,
            note: document.getElementById("pay-note").value.trim() || null
        });
        showToast("Payment recorded successfully", "success");
        closePaymentModal();
        await Promise.all([loadRent(), loadPaymentHistory()]);
    } catch (err) {
        showToast("Failed to record payment", "error");
    }
}

// ─── Electricity Modal ──────────────────────────────────────────────
async function openElectricityModal() {
    document.getElementById("elec-prev").value = "";
    document.getElementById("elec-curr").value = "";
    document.getElementById("elec-rate").value = "8";
    document.getElementById("elec-estimate").classList.add("hidden");
    const modal = document.getElementById("electricity-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    // Auto-populate previous reading from the last bill
    if (tenant && tenant.room_number) {
        try {
            var last = await apiGet("/electricity/last-reading/" + encodeURIComponent(tenant.room_number));
            if (last && last.curr_reading !== null) {
                document.getElementById("elec-prev").value = last.curr_reading;
                document.getElementById("elec-rate").value = last.rate_per_unit || "8";
            }
        } catch (err) {
            // Ignore — user can type manually
        }
    }
}

function closeElectricityModal() {
    const modal = document.getElementById("electricity-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function updateEstimate() {
    const prev = parseFloat(document.getElementById("elec-prev").value) || 0;
    const curr = parseFloat(document.getElementById("elec-curr").value) || 0;
    const rate = parseFloat(document.getElementById("elec-rate").value) || 0;
    const estimateBox = document.getElementById("elec-estimate");

    if (curr > 0 && curr >= prev && rate > 0) {
        const units = curr - prev;
        const total = units * rate;
        document.getElementById("elec-estimate-value").textContent = formatMoney(total);
        document.getElementById("elec-estimate-units").textContent = units;
        estimateBox.classList.remove("hidden");
    } else {
        estimateBox.classList.add("hidden");
    }
}

async function saveElectricity(e) {
    e.preventDefault();
    if (!tenant) return;

    const prev = parseFloat(document.getElementById("elec-prev").value);
    const curr = parseFloat(document.getElementById("elec-curr").value);
    const rate = parseFloat(document.getElementById("elec-rate").value);

    if (curr < prev) {
        showToast("Current reading must be greater than previous reading", "error");
        return;
    }

    try {
        await apiPost("/electricity/", {
            room_number: tenant.room_number,
            month: currentMonth,
            year: currentYear,
            prev_reading: prev,
            curr_reading: curr,
            rate_per_unit: rate
        });
        showToast("Electricity reading saved", "success");
        closeElectricityModal();
        await loadElectricity();
    } catch (err) {
        showToast("Failed to save electricity reading", "error");
    }
}

// ─── Send Reminder (opens phone SMS app) ───────────────────────────
async function sendReminder() {
    if (!tenant) return;
    try {
        var result = await apiPost("/notifications/send-reminder", { tenant_id: parseInt(tenantId) });
        var phone = result.phone || tenant.phone;
        var message = encodeURIComponent(result.message);

        // Open phone SMS app with number + message pre-filled
        window.open("sms:" + phone + "?body=" + message, "_self");

        showToast("Opening SMS app...", "success");
        await loadNotificationHistory();
    } catch (err) {
        showToast("Failed to create reminder", "error");
    }
}

// ─── Sidebar Toggle ─────────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
}

// ─── Init ───────────────────────────────────────────────────────────
async function init() {
    await loadTenant();
    await Promise.all([
        loadRent(),
        loadElectricity(),
        loadPaymentHistory(),
        loadNotificationHistory()
    ]);
}

init();
