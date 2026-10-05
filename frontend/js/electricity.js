requireAuth();

const now = new Date();

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("e-month").value = now.getMonth() + 1;
    document.getElementById("e-year").value = now.getFullYear();
});

async function loadBills() {
    try {
        const bills = await apiGet("/electricity/");
        if (!bills) return;

        const tbody = document.getElementById("bills-table");
        const cardsContainer = document.getElementById("bills-cards");
        const emptyMsg = document.getElementById("empty-msg");

        if (bills.length === 0) {
            tbody.innerHTML = "";
            cardsContainer.innerHTML = "";
            emptyMsg.classList.remove("hidden");
            return;
        }

        emptyMsg.classList.add("hidden");

        // Desktop table rows
        tbody.innerHTML = bills.map(b => {
            const units = (b.curr_reading - b.prev_reading).toFixed(1);
            return `
                <tr class="table-row border-b border-gray-50">
                    <td class="px-5 py-3 font-medium text-gray-800">${b.room_number}</td>
                    <td class="px-5 py-3 text-gray-600">${b.month}/${b.year}</td>
                    <td class="px-5 py-3 text-gray-600">${b.prev_reading}</td>
                    <td class="px-5 py-3 text-gray-600">${b.curr_reading}</td>
                    <td class="px-5 py-3 font-medium">${units}</td>
                    <td class="px-5 py-3 text-gray-600">₹${b.rate_per_unit}</td>
                    <td class="px-5 py-3 font-semibold text-indigo-600">${formatMoney(b.total_amount)}</td>
                    <td class="px-5 py-3">
                        <button onclick="deleteBill(${b.id})" class="text-rose-500 hover:text-rose-700 text-sm font-medium">Delete</button>
                    </td>
                </tr>
            `;
        }).join("");

        // Mobile cards
        cardsContainer.innerHTML = bills.map(b => {
            const units = (b.curr_reading - b.prev_reading).toFixed(1);
            return `
                <div class="mobile-card">
                    <div class="card-header">
                        <span class="font-semibold text-gray-800">Room ${b.room_number}</span>
                        <span class="font-bold text-indigo-600">${formatMoney(b.total_amount)}</span>
                    </div>
                    <div class="card-row"><span class="label">Period</span><span class="value">${b.month}/${b.year}</span></div>
                    <div class="card-row"><span class="label">Reading</span><span class="value">${b.prev_reading} → ${b.curr_reading}</span></div>
                    <div class="card-row"><span class="label">Units</span><span class="value">${units} × ₹${b.rate_per_unit}</span></div>
                    <div class="card-actions">
                        <button onclick="deleteBill(${b.id})" class="flex-1 bg-rose-50 text-rose-600 py-2 rounded-lg text-sm font-medium">Delete</button>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        showToast("Failed to load bills", "error");
    }
}

function openModal() {
    document.getElementById("elec-form").reset();
    document.getElementById("e-month").value = now.getMonth() + 1;
    document.getElementById("e-year").value = now.getFullYear();
    document.getElementById("e-rate").value = 8;
    document.getElementById("estimated-total").textContent = "₹0";
    document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

// Live estimate calculation
["e-prev", "e-curr", "e-rate"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateEstimate);
});

function updateEstimate() {
    const prev = parseFloat(document.getElementById("e-prev").value) || 0;
    const curr = parseFloat(document.getElementById("e-curr").value) || 0;
    const rate = parseFloat(document.getElementById("e-rate").value) || 0;
    const total = Math.max(0, (curr - prev) * rate);
    document.getElementById("estimated-total").textContent = formatMoney(total.toFixed(2));
}

// Submit
document.getElementById("elec-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        room_number: document.getElementById("e-room").value.trim(),
        month: parseInt(document.getElementById("e-month").value),
        year: parseInt(document.getElementById("e-year").value),
        prev_reading: parseFloat(document.getElementById("e-prev").value),
        curr_reading: parseFloat(document.getElementById("e-curr").value),
        rate_per_unit: parseFloat(document.getElementById("e-rate").value),
    };

    try {
        await apiPost("/electricity/", data);
        showToast("Reading saved!", "success");
        closeModal();
        loadBills();
    } catch (err) {
        showToast(err.message, "error");
    }
});

async function deleteBill(id) {
    if (!confirm("Delete this electricity reading?")) return;
    try {
        await apiDelete(`/electricity/${id}`);
        showToast("Deleted", "info");
        loadBills();
    } catch (err) {
        showToast(err.message, "error");
    }
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("-translate-x-full");
    document.getElementById("sidebar-overlay").classList.toggle("hidden");
}

loadBills();
