requireAuth();

let editingId = null;

async function loadTenants() {
    try {
        const tenants = await apiGet("/tenants/");
        if (!tenants) return;

        const tbody = document.getElementById("tenants-table");
        const cardsContainer = document.getElementById("tenants-cards");
        const emptyMsg = document.getElementById("empty-msg");

        if (tenants.length === 0) {
            tbody.innerHTML = "";
            cardsContainer.innerHTML = "";
            emptyMsg.classList.remove("hidden");
            return;
        }

        emptyMsg.classList.add("hidden");

        // Desktop table rows
        tbody.innerHTML = tenants.map(t => `
            <tr class="table-row border-b border-gray-50">
                <td class="px-5 py-3 font-medium text-gray-800">${t.name}</td>
                <td class="px-5 py-3 text-gray-600">${t.phone}</td>
                <td class="px-5 py-3 text-gray-600">${t.room_number}</td>
                <td class="px-5 py-3 font-medium">${formatMoney(t.monthly_rent)}</td>
                <td class="px-5 py-3 text-gray-600">${t.rent_due_day}</td>
                <td class="px-5 py-3">
                    ${t.is_active
                        ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>'
                        : '<span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>'}
                </td>
                <td class="px-5 py-3">
                    <div class="flex gap-2">
                        <button onclick="editTenant(${t.id})" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                        ${t.is_active
                            ? `<button onclick="deactivateTenant(${t.id}, '${t.name}')" class="text-rose-500 hover:text-rose-700 text-sm font-medium">Remove</button>`
                            : ""}
                    </div>
                </td>
            </tr>
        `).join("");

        // Mobile cards
        cardsContainer.innerHTML = tenants.map(t => `
            <div class="mobile-card">
                <div class="card-header">
                    <span class="font-semibold text-gray-800">${t.name}</span>
                    ${t.is_active
                        ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>'
                        : '<span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>'}
                </div>
                <div class="card-row"><span class="label">Phone</span><span class="value">${t.phone}</span></div>
                <div class="card-row"><span class="label">Room</span><span class="value">${t.room_number}</span></div>
                <div class="card-row"><span class="label">Rent</span><span class="value">${formatMoney(t.monthly_rent)}</span></div>
                <div class="card-row"><span class="label">Due Day</span><span class="value">${t.rent_due_day}</span></div>
                <div class="card-actions">
                    <button onclick="editTenant(${t.id})" class="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded-lg text-sm font-medium">Edit</button>
                    ${t.is_active
                        ? `<button onclick="deactivateTenant(${t.id}, '${t.name}')" class="flex-1 bg-rose-50 text-rose-600 py-2 rounded-lg text-sm font-medium">Remove</button>`
                        : ""}
                </div>
            </div>
        `).join("");
    } catch (err) {
        showToast("Failed to load tenants", "error");
    }
}

function openModal(tenant = null) {
    editingId = null;
    document.getElementById("modal-title").textContent = "Add Tenant";
    document.getElementById("tenant-form").reset();
    document.getElementById("f-join").value = new Date().toISOString().split("T")[0];

    if (tenant) {
        editingId = tenant.id;
        document.getElementById("modal-title").textContent = "Edit Tenant";
        document.getElementById("f-name").value = tenant.name;
        document.getElementById("f-phone").value = tenant.phone;
        document.getElementById("f-room").value = tenant.room_number;
        document.getElementById("f-rent").value = tenant.monthly_rent;
        document.getElementById("f-due-day").value = tenant.rent_due_day;
        document.getElementById("f-join").value = tenant.join_date;
    }

    document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
    editingId = null;
}

async function editTenant(id) {
    try {
        const tenant = await apiGet(`/tenants/${id}`);
        if (tenant) openModal(tenant);
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deactivateTenant(id, name) {
    if (!confirm(`Remove ${name}? They will be marked as inactive.`)) return;
    try {
        const result = await apiDelete(`/tenants/${id}`);
        if (result) {
            showToast(`${name} has been deactivated`, "info");
            loadTenants();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Form submit
document.getElementById("tenant-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        name: document.getElementById("f-name").value.trim(),
        phone: document.getElementById("f-phone").value.trim(),
        room_number: document.getElementById("f-room").value.trim(),
        monthly_rent: parseFloat(document.getElementById("f-rent").value),
        rent_due_day: parseInt(document.getElementById("f-due-day").value) || 1,
        join_date: document.getElementById("f-join").value,
    };

    try {
        if (editingId) {
            await apiPut(`/tenants/${editingId}`, data);
            showToast("Tenant updated", "success");
        } else {
            await apiPost("/tenants/", data);
            showToast("Tenant added", "success");
        }
        closeModal();
        loadTenants();
    } catch (err) {
        showToast(err.message, "error");
    }
});

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("-translate-x-full");
    document.getElementById("sidebar-overlay").classList.toggle("hidden");
}

loadTenants();
