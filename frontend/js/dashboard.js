requireAdmin();

const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const now = new Date();
let currentMonth = now.getMonth() + 1;
let currentYear = now.getFullYear();

function updateMonthLabel() {
    document.getElementById("month-label").textContent =
        `${monthNames[currentMonth]} ${currentYear}`;
    const btn = document.getElementById("btn-next-month");
    if (btn) {
        const atCurrent = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;
        btn.disabled = atCurrent;
        btn.classList.toggle("opacity-30", atCurrent);
        btn.classList.toggle("cursor-not-allowed", atCurrent);
    }
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthLabel();
    loadDashboard();
    loadTenants();
}

function nextMonth() {
    const today = new Date();
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newYear > today.getFullYear() || (newYear === today.getFullYear() && newMonth > today.getMonth() + 1)) return;
    currentMonth = newMonth;
    currentYear = newYear;
    updateMonthLabel();
    loadDashboard();
    loadTenants();
}

updateMonthLabel();

// --- Load dashboard stats ---
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
}

// --- Load tenants with rent status ---
async function loadTenants() {
    try {
        // Fetch active tenants and current month rents in parallel
        const [tenants, rents] = await Promise.all([
            apiGet("/tenants/?active_only=true"),
            apiGet(`/rents/?month=${currentMonth}&year=${currentYear}`)
        ]);

        if (!tenants) return;

        // Build a map of tenant_id -> rent record for current month
        const rentMap = {};
        if (rents && rents.length) {
            rents.forEach(r => { rentMap[r.tenant_id] = r; });
        }

        const tbody = document.getElementById("tenant-table");
        const cards = document.getElementById("tenant-cards");
        const noMsg = document.getElementById("no-tenants-msg");

        if (tenants.length === 0) {
            tbody.innerHTML = "";
            cards.innerHTML = "";
            noMsg.classList.remove("hidden");
            return;
        }

        noMsg.classList.add("hidden");

        // Merge tenant data with rent data
        const merged = tenants.map(t => {
            const rent = rentMap[t.id] || null;
            return {
                id: t.id,
                name: t.name,
                room: t.room_number,
                monthly_rent: t.monthly_rent,
                status: rent ? rent.status : null,
                amount_due: rent ? rent.amount_due : t.monthly_rent,
                amount_paid: rent ? rent.amount_paid : 0,
                rent_id: rent ? rent.id : null
            };
        });

        // Render desktop table
        tbody.innerHTML = merged.map(t => {
            const badge = t.status
                ? statusBadge(t.status)
                : '<span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">No rent</span>';

            const remindBtn = t.status && t.status !== "paid"
                ? `<button onclick="event.preventDefault(); sendReminder(${t.id})" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium mr-3">📱 Remind</button>`
                : '';

            return `
                <tr class="table-row border-b border-gray-50 cursor-pointer hover:bg-gray-50" onclick="window.location.href='tenant.html?id=${t.id}'">
                    <td class="px-5 py-3 font-medium text-gray-800">${t.name}</td>
                    <td class="px-5 py-3 text-gray-600">${t.room}</td>
                    <td class="px-5 py-3 font-medium">${formatMoney(t.monthly_rent)}</td>
                    <td class="px-5 py-3">${badge}</td>
                    <td class="px-5 py-3">${formatMoney(t.amount_paid)}</td>
                    <td class="px-5 py-3">
                        ${remindBtn}
                        <a href="tenant.html?id=${t.id}" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View →</a>
                    </td>
                </tr>
            `;
        }).join("");

        // Render mobile cards
        cards.innerHTML = merged.map(t => {
            const badge = t.status
                ? statusBadge(t.status)
                : '<span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">No rent</span>';

            return `
                <a href="tenant.html?id=${t.id}" class="mobile-card block">
                    <div class="card-header">
                        <span class="font-semibold text-gray-800">${t.name}</span>
                        ${badge}
                    </div>
                    <div class="card-row"><span class="label">Room</span><span class="value">${t.room}</span></div>
                    <div class="card-row"><span class="label">Rent</span><span class="value">${formatMoney(t.monthly_rent)}</span></div>
                    <div class="card-row"><span class="label">Paid</span><span class="value">${formatMoney(t.amount_paid)}</span></div>
                </a>
            `;
        }).join("");

    } catch (err) {
        showToast("Failed to load tenants", "error");
    }
}

// --- Generate rents for current month ---
async function generateRents() {
    try {
        const result = await apiPost("/rents/generate", { month: currentMonth, year: currentYear });
        if (result) {
            showToast(result.message, "success");
            loadDashboard();
            loadTenants();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

// --- Mark overdue rents ---
async function markOverdue() {
    try {
        const result = await apiPost("/rents/mark-overdue");
        if (result) {
            showToast(result.message, "info");
            loadDashboard();
            loadTenants();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

// --- Send reminder to a tenant (opens phone SMS app) ---
async function sendReminder(tenantId) {
    try {
        var result = await apiPost("/notifications/send-reminder", { tenant_id: tenantId });
        var phone = result.phone;
        var message = encodeURIComponent(result.message);

        window.open("sms:" + phone + "?body=" + message, "_self");
        showToast("Opening SMS app...", "success");
    } catch (err) {
        showToast("Failed to create reminder", "error");
    }
}

// --- Add Tenant Modal ---
function openAddModal() {
    document.getElementById("add-modal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("add-modal").classList.add("hidden");
    document.getElementById("add-tenant-form").reset();
}

async function addTenant(event) {
    event.preventDefault();
    const form = event.target;
    const data = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        room_number: form.room_number.value.trim(),
        monthly_rent: Number(form.monthly_rent.value),
        rent_due_day: Number(form.rent_due_day.value),
        join_date: form.join_date.value
    };

    try {
        const result = await apiPost("/tenants/", data);
        if (result) {
            showToast("Tenant added successfully", "success");
            closeModal();
            loadDashboard();
            loadTenants();
        }
    } catch (err) {
        // Show validation errors from API
        showToast(err.message || "Failed to add tenant", "error");
    }
}

// --- Sidebar toggle for mobile ---
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
}

// --- Init ---
loadDashboard();
loadTenants();
