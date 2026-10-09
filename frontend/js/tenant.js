requireAuth();

const params = new URLSearchParams(window.location.search);
const tenantId = params.get("id");
if (!tenantId) window.location.href = "dashboard.html";

const isTenantRole = getRole() === "tenant";

// Tenant users: restrict access to only their own page
if (isTenantRole && getTenantAccessId() !== tenantId) {
    window.location.href = "tenant.html?id=" + getTenantAccessId();
}

// Hide admin-only UI elements for tenants
if (isTenantRole) {
    document.querySelectorAll('[onclick="openEditModal()"]').forEach(function(el) { el.style.display = "none"; });
    var deactBtn = document.getElementById("btn-deactivate");
    if (deactBtn) deactBtn.style.display = "none";
    document.querySelectorAll('[onclick="sendReminder()"]').forEach(function(el) { el.style.display = "none"; });
    // Hide sidebar nav and bottom nav links to dashboard/notifications
    document.querySelectorAll('a[href="dashboard.html"], a[href="notifications.html"]').forEach(function(el) { el.style.display = "none"; });
}

const now = new Date();
let currentMonth = now.getMonth() + 1;
let currentYear = now.getFullYear();
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

        // Hide deactivate button if already inactive
        var deactivateBtn = document.getElementById("btn-deactivate");
        if (deactivateBtn) {
            deactivateBtn.style.display = isActive ? "" : "none";
        }
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
        const elecAmt = currentRent.electricity_amount || 0;
        const baseRent = currentRent.amount_due - elecAmt;

        // Show breakdown if electricity is included
        const breakdownHtml = elecAmt > 0 ? `
            <div class="bg-gray-50 rounded-lg p-3">
                <span class="text-gray-500 text-xs uppercase tracking-wide">Base Rent</span>
                <p class="font-semibold text-gray-800 mt-1">${formatMoney(baseRent)}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
                <span class="text-gray-500 text-xs uppercase tracking-wide">Electricity</span>
                <p class="font-semibold text-amber-600 mt-1">${formatMoney(elecAmt)}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
                <span class="text-gray-500 text-xs uppercase tracking-wide">Total Due</span>
                <p class="font-semibold text-gray-800 mt-1">${formatMoney(currentRent.amount_due)}</p>
            </div>
        ` : `
            <div class="bg-gray-50 rounded-lg p-3">
                <span class="text-gray-500 text-xs uppercase tracking-wide">Due</span>
                <p class="font-semibold text-gray-800 mt-1">${formatMoney(currentRent.amount_due)}</p>
            </div>
        `;

        container.innerHTML = `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                ${breakdownHtml}
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
        const readings = await apiGet(`/electricity/?tenant_id=${tenantId}&month=${currentMonth}&year=${currentYear}`);
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
            <div class="mt-3 flex gap-2">
                <button onclick="deleteElectricity(${reading.id})" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    🗑️ Delete Reading
                </button>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load electricity info.</div>';
    }
}

// ─── Load Transaction History (Payments + Electricity) ─────────────
async function loadPaymentHistory() {
    const container = document.getElementById("payment-history-content");
    try {
        const [payments, electricityBills] = await Promise.all([
            apiGet(`/rents/payments?tenant_id=${tenantId}`),
            apiGet(`/electricity/?tenant_id=${tenantId}`)
        ]);

        const timeline = [];

        if (Array.isArray(payments)) {
            payments.forEach(p => {
                timeline.push({
                    type: 'payment',
                    sortDate: new Date(p.date || p.created_at),
                    data: p
                });
            });
        }

        if (Array.isArray(electricityBills)) {
            electricityBills.forEach(b => {
                timeline.push({
                    type: 'electricity',
                    sortDate: new Date(b.year, b.month - 1, 1),
                    data: b
                });
            });
        }

        if (timeline.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-center py-6">No transactions yet.</div>';
            return;
        }

        timeline.sort((a, b) => b.sortDate - a.sortDate);

        container.innerHTML = `<div class="flex flex-col gap-3">${timeline.map(item => {
            if (item.type === 'payment') {
                const p = item.data;
                const date = p.date || p.created_at;
                const formattedDate = date ? new Date(date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "-";
                const method = p.method || "-";
                const note = p.note || "";

                return `
                    <div class="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Payment</span>
                                <span class="font-semibold text-emerald-600">${formatMoney(p.amount)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-gray-400 text-sm">${formattedDate}</span>
                                <button onclick="event.stopPropagation(); deletePayment(${p.id})" class="text-red-400 hover:text-red-600 text-sm" title="Delete payment">🗑️</button>
                            </div>
                        </div>
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span class="text-gray-500">Method: <span class="text-gray-800 capitalize">${method}</span></span>
                            ${note ? `<span class="text-gray-500">Note: <span class="text-gray-800">${note}</span></span>` : ''}
                        </div>
                    </div>
                `;
            } else {
                const b = item.data;
                const units = (b.curr_reading || 0) - (b.prev_reading || 0);

                return `
                    <div class="border border-amber-200 rounded-lg p-4 bg-amber-50/30 hover:bg-amber-50 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Electricity</span>
                                <span class="font-semibold text-amber-600">${formatMoney(b.total_amount)}</span>
                            </div>
                            <span class="text-gray-400 text-sm">${monthNames[b.month]} ${b.year}</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span class="text-gray-500">Reading: <span class="text-gray-800">${b.prev_reading} → ${b.curr_reading}</span></span>
                            <span class="text-gray-500">Units: <span class="text-gray-800">${units}</span></span>
                            <span class="text-gray-500">Rate: <span class="text-gray-800">₹${b.rate_per_unit}/unit</span></span>
                        </div>
                    </div>
                `;
            }
        }).join("")}</div>`;
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load transaction history.</div>';
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
    if (tenant) {
        try {
            var last = await apiGet("/electricity/last-reading/" + tenantId);
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
            tenant_id: parseInt(tenantId),
            room_number: tenant.room_number,
            month: currentMonth,
            year: currentYear,
            prev_reading: prev,
            curr_reading: curr,
            rate_per_unit: rate
        });
        showToast("Electricity reading saved", "success");
        closeElectricityModal();
        await Promise.all([loadElectricity(), loadElectricityHistory(), loadRent()]);
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

// ─── Deactivate Tenant ─────────────────────────────────────────────
async function deactivateTenant() {
    if (!tenant) return;
    if (!confirm(`Are you sure you want to deactivate ${tenant.name}? They will be hidden from the dashboard.`)) return;
    try {
        await apiDelete(`/tenants/${tenantId}`);
        showToast("Tenant deactivated", "success");
        window.location.href = "dashboard.html";
    } catch (err) {
        showToast("Failed to deactivate tenant", "error");
    }
}

// ─── Delete Payment ────────────────────────────────────────────────
async function deletePayment(paymentId) {
    if (!confirm("Delete this payment? The rent status will be updated accordingly.")) return;
    try {
        await apiDelete(`/rents/payments/${paymentId}`);
        showToast("Payment deleted", "success");
        await Promise.all([loadRent(), loadPaymentHistory()]);
    } catch (err) {
        showToast("Failed to delete payment", "error");
    }
}

// ─── Delete Electricity Reading ────────────────────────────────────
async function deleteElectricity(billId) {
    if (!confirm("Delete this electricity reading?")) return;
    try {
        await apiDelete(`/electricity/${billId}`);
        showToast("Electricity reading deleted", "success");
        await Promise.all([loadElectricity(), loadElectricityHistory(), loadRent()]);
    } catch (err) {
        showToast("Failed to delete reading", "error");
    }
}

// ─── Electricity History ───────────────────────────────────────────
async function loadElectricityHistory() {
    const container = document.getElementById("electricity-history-content");
    if (!tenant) {
        container.innerHTML = '<div class="text-gray-400 text-center py-4">Loading...</div>';
        return;
    }
    try {
        const bills = await apiGet(`/electricity/?tenant_id=${tenantId}`);
        if (!Array.isArray(bills) || bills.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-center py-6">No electricity readings yet.</div>';
            return;
        }

        container.innerHTML = `<div class="flex flex-col gap-3">${bills.map(b => {
            const units = (b.curr_reading || 0) - (b.prev_reading || 0);
            return `
                <div class="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold text-gray-800">${monthNames[b.month]} ${b.year}</span>
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-amber-600">${formatMoney(b.total_amount)}</span>
                            <button onclick="event.stopPropagation(); deleteElectricity(${b.id})" class="text-red-400 hover:text-red-600 text-sm" title="Delete reading">🗑️</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-sm">
                        <div><span class="text-gray-500">Prev:</span> <span class="text-gray-800">${b.prev_reading}</span></div>
                        <div><span class="text-gray-500">Curr:</span> <span class="text-gray-800">${b.curr_reading}</span></div>
                        <div><span class="text-gray-500">Units:</span> <span class="text-gray-800">${units} × ₹${b.rate_per_unit}</span></div>
                    </div>
                </div>
            `;
        }).join("")}</div>`;
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load electricity history.</div>';
    }
}

// ─── Month Navigation ──────────────────────────────────────────────
function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthLabel();
    loadRent();
    loadElectricity();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    updateMonthLabel();
    loadRent();
    loadElectricity();
}

function updateMonthLabel() {
    var label = monthNames[currentMonth] + " " + currentYear;
    var el = document.getElementById("month-nav-label");
    if (el) el.textContent = label;
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
    updateMonthLabel();
    await loadTenant();
    await Promise.all([
        loadRent(),
        loadElectricity(),
        loadElectricityHistory(),
        loadPaymentHistory(),
        loadNotificationHistory()
    ]);
}

init();
