requireAuth();

let tenantsMap = {};

async function loadPayments() {
    try {
        const payments = await apiGet("/rents/payments");
        if (!payments) return;

        const tbody = document.getElementById("payments-table");
        const cards = document.getElementById("payments-cards");
        const emptyMsg = document.getElementById("empty-msg");

        if (payments.length === 0) {
            tbody.innerHTML = "";
            cards.innerHTML = "";
            emptyMsg.classList.remove("hidden");
            return;
        }

        emptyMsg.classList.add("hidden");
        const methodLabels = { cash: "\u{1F4B5} Cash", upi: "\u{1F4F1} UPI", bank_transfer: "\u{1F3E6} Bank", other: "\u{1F4CB} Other" };

        // Desktop table rows
        tbody.innerHTML = payments.map(p => `
            <tr class="table-row border-b border-gray-50">
                <td class="px-5 py-3 text-gray-600">${p.date}</td>
                <td class="px-5 py-3 font-medium text-gray-800">${p.tenant_name || "Unknown"}</td>
                <td class="px-5 py-3 font-semibold text-emerald-600">${formatMoney(p.amount)}</td>
                <td class="px-5 py-3 text-gray-600">${methodLabels[p.method] || p.method}</td>
                <td class="px-5 py-3 text-gray-400 text-sm">${p.note || "-"}</td>
            </tr>
        `).join("");

        // Mobile cards
        cards.innerHTML = payments.map(p => `
            <div class="mobile-card">
                <div class="card-header">
                    <span class="font-semibold text-gray-800">${p.tenant_name || "Unknown"}</span>
                    <span class="font-bold text-emerald-600">${formatMoney(p.amount)}</span>
                </div>
                <div class="card-row"><span class="label">Date</span><span class="value">${p.date}</span></div>
                <div class="card-row"><span class="label">Method</span><span class="value">${methodLabels[p.method] || p.method}</span></div>
                <div class="card-row"><span class="label">Note</span><span class="value">${p.note || "-"}</span></div>
            </div>
        `).join("");
    } catch (err) {
        showToast("Failed to load payments", "error");
    }
}

async function loadTenantDropdown() {
    try {
        const tenants = await apiGet("/tenants/?active_only=true");
        if (!tenants) return;

        const select = document.getElementById("p-tenant");
        tenants.forEach(t => {
            tenantsMap[t.id] = t;
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = `${t.name} (Room ${t.room_number})`;
            select.appendChild(opt);
        });
    } catch (err) {
        showToast("Failed to load tenants", "error");
    }
}

async function loadPendingRents() {
    const tenantId = document.getElementById("p-tenant").value;
    const section = document.getElementById("pending-rents-section");
    const select = document.getElementById("p-rent");
    const info = document.getElementById("pending-info");

    select.innerHTML = '<option value="">Select pending rent...</option>';
    info.textContent = "";

    if (!tenantId) {
        section.classList.add("hidden");
        return;
    }

    try {
        const rents = await apiGet(`/rents/?status_filter=pending`);
        const tenantRents = (rents || []).filter(r =>
            r.tenant_id == tenantId && r.status !== "paid"
        );

        // Also include overdue and partial
        const allRents = await apiGet(`/rents/`);
        const unpaid = (allRents || []).filter(r =>
            r.tenant_id == tenantId && r.status !== "paid"
        );

        if (unpaid.length === 0) {
            info.textContent = "No pending rents for this tenant.";
            section.classList.remove("hidden");
            return;
        }

        unpaid.forEach(r => {
            const remaining = r.amount_due - r.amount_paid;
            const opt = document.createElement("option");
            opt.value = r.id;
            opt.textContent = `${r.month}/${r.year} — Due: ${formatMoney(r.amount_due)}, Remaining: ${formatMoney(remaining)}`;
            opt.dataset.remaining = remaining;
            select.appendChild(opt);
        });

        // Auto-fill amount when rent is selected
        select.onchange = () => {
            const selected = select.options[select.selectedIndex];
            if (selected && selected.dataset.remaining) {
                document.getElementById("p-amount").value = selected.dataset.remaining;
            }
        };

        section.classList.remove("hidden");
    } catch (err) {
        showToast("Failed to load rents", "error");
    }
}

function openPaymentModal() {
    document.getElementById("payment-form").reset();
    document.getElementById("pending-rents-section").classList.add("hidden");
    document.getElementById("p-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("pay-modal").classList.remove("hidden");
}

function closePaymentModal() {
    document.getElementById("pay-modal").classList.add("hidden");
}

// Submit payment
document.getElementById("payment-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        rent_id: parseInt(document.getElementById("p-rent").value),
        tenant_id: parseInt(document.getElementById("p-tenant").value),
        amount: parseFloat(document.getElementById("p-amount").value),
        date: document.getElementById("p-date").value,
        method: document.getElementById("p-method").value,
        note: document.getElementById("p-note").value || null,
    };

    if (!data.rent_id) {
        showToast("Please select a pending rent", "warning");
        return;
    }

    try {
        await apiPost("/rents/payments", data);
        showToast("Payment recorded!", "success");
        closePaymentModal();
        loadPayments();
    } catch (err) {
        showToast(err.message, "error");
    }
});

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("-translate-x-full");
    document.getElementById("sidebar-overlay").classList.toggle("hidden");
}

// Init
loadTenantDropdown();
loadPayments();
