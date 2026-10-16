requireAuth();

const params = new URLSearchParams(window.location.search);
const tenantId = params.get("id");
if (!tenantId) {
    if (getRole() === "tenant" && getTenantAccessId()) {
        window.location.href = "tenant.html?id=" + getTenantAccessId();
    } else {
        window.location.href = "dashboard.html";
    }
}

const isTenantRole = getRole() === "tenant";

if (isTenantRole && getTenantAccessId() !== tenantId) {
    window.location.href = "tenant.html?id=" + getTenantAccessId();
}

if (isTenantRole) {
    var adminActions = document.getElementById("admin-actions");
    if (adminActions) adminActions.style.display = "none";
    var editBtn = document.getElementById("btn-edit-tenant");
    if (editBtn) editBtn.style.display = "none";
    var notifHistory = document.getElementById("notification-history");
    if (notifHistory) notifHistory.style.display = "none";
    document.querySelectorAll('nav a[href="dashboard.html"], nav a[href="notifications.html"]').forEach(function(el) { el.style.display = "none"; });
    var mobileBack = document.getElementById("mobile-back-link");
    if (mobileBack) mobileBack.style.display = "none";
    var mobileLogout = document.getElementById("mobile-logout-btn");
    if (mobileLogout) mobileLogout.classList.remove("hidden");
    var desktopBack = document.getElementById("desktop-back-link");
    if (desktopBack) desktopBack.style.display = "none";
    var bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = "none";
}

renderLangSwitcher(document.getElementById("lang-switcher-sidebar"));
renderLangSwitcher(document.getElementById("lang-switcher-mobile"));

const now = new Date();
let currentMonth = now.getMonth() + 1;
let currentYear = now.getFullYear();
let tenant = null;
let currentRent = null;

async function loadTenant() {
    try {
        const data = await apiGet("/tenants/" + tenantId);
        tenant = data;

        document.title = tenant.name + " - " + t("app_name");
        var mobileName = document.getElementById("mobile-tenant-name");
        var desktopName = document.getElementById("desktop-tenant-name");
        if (mobileName) mobileName.textContent = tenant.name;
        if (desktopName) desktopName.textContent = tenant.name;

        var locale = getLang() === "hi" ? "hi-IN" : "en-IN";
        var joinDate = tenant.join_date
            ? new Date(tenant.join_date).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
            : "-";

        var isActive = tenant.is_active !== false;
        var badge = isActive
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">' + t("active") + '</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">' + t("inactive") + '</span>';

        document.getElementById("tenant-info").innerHTML =
            '<div>' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_name") + '</span>' +
                '<p class="font-medium text-gray-800 mt-0.5">' + tenant.name + '</p>' +
            '</div>' +
            '<div>' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_phone") + '</span>' +
                '<p class="font-medium text-gray-800 mt-0.5">' + (tenant.phone || "-") + '</p>' +
            '</div>' +
            '<div>' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_room_number") + '</span>' +
                '<p class="font-medium text-gray-800 mt-0.5">' + (tenant.room_number || "-") + '</p>' +
            '</div>' +
            '<div>' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_monthly_rent") + '</span>' +
                '<p class="font-medium text-gray-800 mt-0.5">' + formatMoney(tenant.monthly_rent) + '</p>' +
            '</div>' +
            '<div>' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_due_day_short") + '</span>' +
                '<p class="font-medium text-gray-800 mt-0.5">' + (tenant.rent_due_day || "-") + '<sup>th</sup> ' + t("of_every_month") + '</p>' +
            '</div>' +
            '<div>' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_join_date_short") + '</span>' +
                '<p class="font-medium text-gray-800 mt-0.5">' + joinDate + '</p>' +
            '</div>' +
            '<div class="sm:col-span-2">' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_status") + '</span>' +
                '<p class="mt-1">' + badge + '</p>' +
            '</div>';

        var deactivateBtn = document.getElementById("btn-deactivate");
        if (deactivateBtn) {
            deactivateBtn.style.display = (isActive && !isTenantRole) ? "" : "none";
        }
    } catch (err) {
        document.getElementById("tenant-info").innerHTML =
            '<div class="text-red-500 text-center py-4 col-span-full">' + t("failed_load_tenant_info") + '</div>';
    }
}

async function loadRent() {
    var container = document.getElementById("rent-content");
    var mn = getMonthNames();
    try {
        var rents = await apiGet("/rents/?month=" + currentMonth + "&year=" + currentYear);
        currentRent = Array.isArray(rents)
            ? rents.find(function(r) { return String(r.tenant_id) === String(tenantId); })
            : null;

        if (!currentRent) {
            if (isTenantRole) {
                container.innerHTML = '<div class="text-center py-6"><p class="text-gray-500">' + t("no_rent_generated") + ' ' + mn[currentMonth] + ' ' + currentYear + '</p></div>';
            } else {
                container.innerHTML =
                    '<div class="text-center py-6">' +
                        '<p class="text-gray-500 mb-4">' + t("no_rent_generated") + ' ' + mn[currentMonth] + ' ' + currentYear + '</p>' +
                        '<button onclick="generateRentForTenant()" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">' +
                            t("generate_rent_btn") +
                        '</button>' +
                    '</div>';
            }
            return;
        }

        var remaining = (currentRent.amount_due || 0) - (currentRent.amount_paid || 0);
        var status = currentRent.status || "pending";
        var elecAmt = currentRent.electricity_amount || 0;
        var baseRent = currentRent.amount_due - elecAmt;

        var breakdownHtml = elecAmt > 0 ?
            '<div class="bg-gray-50 rounded-lg p-3">' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_base_rent") + '</span>' +
                '<p class="font-semibold text-gray-800 mt-1">' + formatMoney(baseRent) + '</p>' +
            '</div>' +
            '<div class="bg-gray-50 rounded-lg p-3">' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_electricity") + '</span>' +
                '<p class="font-semibold text-amber-600 mt-1">' + formatMoney(elecAmt) + '</p>' +
            '</div>' +
            '<div class="bg-gray-50 rounded-lg p-3">' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_total_due") + '</span>' +
                '<p class="font-semibold text-gray-800 mt-1">' + formatMoney(currentRent.amount_due) + '</p>' +
            '</div>'
            :
            '<div class="bg-gray-50 rounded-lg p-3">' +
                '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_due") + '</span>' +
                '<p class="font-semibold text-gray-800 mt-1">' + formatMoney(currentRent.amount_due) + '</p>' +
            '</div>';

        var payBtn = (!isTenantRole && remaining > 0)
            ? '<button onclick="openPaymentModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">' + t("record_payment_btn") + '</button>'
            : '';

        container.innerHTML =
            '<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">' +
                breakdownHtml +
                '<div class="bg-gray-50 rounded-lg p-3">' +
                    '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_paid") + '</span>' +
                    '<p class="font-semibold text-emerald-600 mt-1">' + formatMoney(currentRent.amount_paid) + '</p>' +
                '</div>' +
                '<div class="bg-gray-50 rounded-lg p-3">' +
                    '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_remaining") + '</span>' +
                    '<p class="font-semibold ' + (remaining > 0 ? 'text-red-600' : 'text-gray-800') + ' mt-1">' + formatMoney(remaining) + '</p>' +
                '</div>' +
                '<div class="bg-gray-50 rounded-lg p-3">' +
                    '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_status") + '</span>' +
                    '<p class="mt-1">' + statusBadge(status) + '</p>' +
                '</div>' +
            '</div>' + payBtn;
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">' + t("failed_load_rent_info") + '</div>';
    }
}

async function generateRentForTenant() {
    try {
        await apiPost("/rents/generate", { month: currentMonth, year: currentYear });
        showToast(t("toast_rent_generated"), "success");
        await loadRent();
    } catch (err) {
        showToast(t("toast_rent_generate_failed"), "error");
    }
}

async function loadElectricity() {
    var container = document.getElementById("electricity-content");
    var mn = getMonthNames();
    if (!tenant) {
        container.innerHTML = '<div class="text-gray-400 text-center py-4">Loading...</div>';
        return;
    }
    try {
        var readings = await apiGet("/electricity/?tenant_id=" + tenantId + "&month=" + currentMonth + "&year=" + currentYear);
        var reading = Array.isArray(readings) && readings.length > 0 ? readings[0] : null;

        if (!reading) {
            if (isTenantRole) {
                container.innerHTML = '<div class="text-center py-6"><p class="text-gray-500">' + t("no_reading_for") + ' ' + mn[currentMonth] + ' ' + currentYear + '</p></div>';
            } else {
                container.innerHTML =
                    '<div class="text-center py-6">' +
                        '<p class="text-gray-500 mb-4">' + t("no_reading_for") + ' ' + mn[currentMonth] + ' ' + currentYear + '</p>' +
                        '<button onclick="openElectricityModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors">' +
                            t("add_reading_btn") +
                        '</button>' +
                    '</div>';
            }
            return;
        }

        var units = (reading.curr_reading || 0) - (reading.prev_reading || 0);
        var total = reading.total_amount || (units * (reading.rate_per_unit || 0));

        var deleteBtn = !isTenantRole
            ? '<button onclick="deleteElectricity(' + reading.id + ')" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">' + t("delete_reading_btn") + '</button>'
            : '';

        container.innerHTML =
            '<div class="grid grid-cols-2 sm:grid-cols-5 gap-4">' +
                '<div class="bg-gray-50 rounded-lg p-3">' +
                    '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_previous") + '</span>' +
                    '<p class="font-semibold text-gray-800 mt-1">' + reading.prev_reading + '</p>' +
                '</div>' +
                '<div class="bg-gray-50 rounded-lg p-3">' +
                    '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_current") + '</span>' +
                    '<p class="font-semibold text-gray-800 mt-1">' + reading.curr_reading + '</p>' +
                '</div>' +
                '<div class="bg-gray-50 rounded-lg p-3">' +
                    '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_units") + '</span>' +
                    '<p class="font-semibold text-gray-800 mt-1">' + units + '</p>' +
                '</div>' +
                '<div class="bg-gray-50 rounded-lg p-3">' +
                    '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_rate") + '</span>' +
                    '<p class="font-semibold text-gray-800 mt-1">' + formatMoney(reading.rate_per_unit) + '/unit</p>' +
                '</div>' +
                '<div class="bg-gray-50 rounded-lg p-3">' +
                    '<span class="text-gray-500 text-xs uppercase tracking-wide">' + t("label_total") + '</span>' +
                    '<p class="font-semibold text-amber-600 mt-1">' + formatMoney(total) + '</p>' +
                '</div>' +
            '</div>' +
            '<div class="mt-3 flex gap-2">' + deleteBtn + '</div>';
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">' + t("failed_load_electricity_info") + '</div>';
    }
}

async function loadPaymentHistory() {
    var container = document.getElementById("payment-history-content");
    var mn = getMonthNames();
    try {
        var results = await Promise.all([
            apiGet("/rents/payments?tenant_id=" + tenantId),
            apiGet("/electricity/?tenant_id=" + tenantId)
        ]);
        var payments = results[0];
        var electricityBills = results[1];

        var timeline = [];

        if (Array.isArray(payments)) {
            payments.forEach(function(p) {
                timeline.push({ type: 'payment', sortDate: new Date(p.date || p.created_at), data: p });
            });
        }

        if (Array.isArray(electricityBills)) {
            electricityBills.forEach(function(b) {
                timeline.push({ type: 'electricity', sortDate: new Date(b.year, b.month - 1, 1), data: b });
            });
        }

        if (timeline.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-center py-6">' + t("no_transactions_yet") + '</div>';
            return;
        }

        timeline.sort(function(a, b) { return b.sortDate - a.sortDate; });

        var locale = getLang() === "hi" ? "hi-IN" : "en-IN";

        container.innerHTML = '<div class="flex flex-col gap-3">' + timeline.map(function(item) {
            if (item.type === 'payment') {
                var p = item.data;
                var date = p.date || p.created_at;
                var formattedDate = date ? new Date(date).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "-";
                var method = p.method || "-";
                var note = p.note || "";

                var deleteHtml = !isTenantRole
                    ? '<button onclick="event.stopPropagation(); deletePayment(' + p.id + ')" class="text-red-400 hover:text-red-600 text-sm" title="Delete">🗑️</button>'
                    : '';

                return '<div class="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">' +
                    '<div class="flex items-center justify-between mb-2">' +
                        '<div class="flex items-center gap-2">' +
                            '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">' + t("tag_payment") + '</span>' +
                            '<span class="font-semibold text-emerald-600">' + formatMoney(p.amount) + '</span>' +
                        '</div>' +
                        '<div class="flex items-center gap-2">' +
                            '<span class="text-gray-400 text-sm">' + formattedDate + '</span>' +
                            deleteHtml +
                        '</div>' +
                    '</div>' +
                    '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">' +
                        '<span class="text-gray-500">' + t("label_method") + ': <span class="text-gray-800 capitalize">' + method + '</span></span>' +
                        (note ? '<span class="text-gray-500">' + t("label_note") + ': <span class="text-gray-800">' + note + '</span></span>' : '') +
                    '</div>' +
                '</div>';
            } else {
                var b = item.data;
                var units = (b.curr_reading || 0) - (b.prev_reading || 0);

                return '<div class="border border-amber-200 rounded-lg p-4 bg-amber-50/30 hover:bg-amber-50 transition-colors">' +
                    '<div class="flex items-center justify-between mb-2">' +
                        '<div class="flex items-center gap-2">' +
                            '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">' + t("tag_electricity") + '</span>' +
                            '<span class="font-semibold text-amber-600">' + formatMoney(b.total_amount) + '</span>' +
                        '</div>' +
                        '<span class="text-gray-400 text-sm">' + mn[b.month] + ' ' + b.year + '</span>' +
                    '</div>' +
                    '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">' +
                        '<span class="text-gray-500">' + t("reading_label") + ': <span class="text-gray-800">' + b.prev_reading + ' → ' + b.curr_reading + '</span></span>' +
                        '<span class="text-gray-500">' + t("label_units") + ': <span class="text-gray-800">' + units + '</span></span>' +
                        '<span class="text-gray-500">' + t("rate_label") + ': <span class="text-gray-800">₹' + b.rate_per_unit + '/unit</span></span>' +
                    '</div>' +
                '</div>';
            }
        }).join("") + '</div>';
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">' + t("failed_load_payment_history") + '</div>';
    }
}

async function loadNotificationHistory() {
    var container = document.getElementById("notification-history-content");
    try {
        var notifications = await apiGet("/notifications/?tenant_id=" + tenantId);
        if (!Array.isArray(notifications) || notifications.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-center py-6">' + t("no_notifications_sent") + '</div>';
            return;
        }

        var locale = getLang() === "hi" ? "hi-IN" : "en-IN";
        var sorted = notifications.sort(function(a, b) { return new Date(b.sent_at || b.created_at || 0) - new Date(a.sent_at || a.created_at || 0); });

        container.innerHTML = '<div class="flex flex-col gap-3">' + sorted.map(function(n) {
            var rawDate = n.sent_at || n.created_at;
            var date = rawDate ? new Date(rawDate).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
            var message = n.message || "-";
            var truncated = message.length > 100 ? message.substring(0, 100) + "..." : message;
            var status = n.status || "unknown";
            var statusClass = status === "sent"
                ? "bg-emerald-100 text-emerald-700"
                : status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600";

            return '<div class="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">' +
                '<div class="flex items-start justify-between gap-3 mb-2">' +
                    '<p class="text-sm text-gray-700 flex-1">' + truncated + '</p>' +
                    '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + statusClass + ' shrink-0 capitalize">' + status + '</span>' +
                '</div>' +
                '<p class="text-xs text-gray-400">' + date + '</p>' +
            '</div>';
        }).join("") + '</div>';
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">' + t("failed_load_notification_history") + '</div>';
    }
}

function openEditModal() {
    if (!tenant) return;
    document.getElementById("edit-name").value = tenant.name || "";
    document.getElementById("edit-phone").value = tenant.phone || "";
    document.getElementById("edit-room").value = tenant.room_number || "";
    document.getElementById("edit-rent").value = tenant.monthly_rent || "";
    document.getElementById("edit-due-day").value = tenant.rent_due_day || "";
    var modal = document.getElementById("edit-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeEditModal() {
    var modal = document.getElementById("edit-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

async function saveEdit(e) {
    e.preventDefault();
    try {
        await apiPut("/tenants/" + tenantId, {
            name: document.getElementById("edit-name").value.trim(),
            phone: document.getElementById("edit-phone").value.trim(),
            room_number: document.getElementById("edit-room").value.trim(),
            monthly_rent: parseFloat(document.getElementById("edit-rent").value),
            rent_due_day: parseInt(document.getElementById("edit-due-day").value)
        });
        showToast(t("toast_tenant_updated"), "success");
        closeEditModal();
        await loadTenant();
    } catch (err) {
        showToast(t("toast_tenant_update_failed"), "error");
    }
}

function openPaymentModal() {
    if (!currentRent) return;
    var remaining = (currentRent.amount_due || 0) - (currentRent.amount_paid || 0);
    document.getElementById("pay-amount").value = remaining > 0 ? remaining : "";
    document.getElementById("pay-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("pay-method").value = "cash";
    document.getElementById("pay-note").value = "";
    var modal = document.getElementById("payment-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closePaymentModal() {
    var modal = document.getElementById("payment-modal");
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
        showToast(t("toast_payment_recorded"), "success");
        closePaymentModal();
        await Promise.all([loadRent(), loadPaymentHistory()]);
    } catch (err) {
        showToast(t("toast_payment_record_failed"), "error");
    }
}

async function openElectricityModal() {
    document.getElementById("elec-prev").value = "";
    document.getElementById("elec-curr").value = "";
    document.getElementById("elec-rate").value = "8";
    document.getElementById("elec-estimate").classList.add("hidden");
    var modal = document.getElementById("electricity-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    if (tenant) {
        try {
            var last = await apiGet("/electricity/last-reading/" + tenantId);
            if (last && last.curr_reading !== null) {
                document.getElementById("elec-prev").value = last.curr_reading;
                document.getElementById("elec-rate").value = last.rate_per_unit || "8";
            }
        } catch (err) {}
    }
}

function closeElectricityModal() {
    var modal = document.getElementById("electricity-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function updateEstimate() {
    var prev = parseFloat(document.getElementById("elec-prev").value) || 0;
    var curr = parseFloat(document.getElementById("elec-curr").value) || 0;
    var rate = parseFloat(document.getElementById("elec-rate").value) || 0;
    var estimateBox = document.getElementById("elec-estimate");

    if (curr > 0 && curr >= prev && rate > 0) {
        var units = curr - prev;
        var total = units * rate;
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

    var prev = parseFloat(document.getElementById("elec-prev").value);
    var curr = parseFloat(document.getElementById("elec-curr").value);
    var rate = parseFloat(document.getElementById("elec-rate").value);

    if (curr < prev) {
        showToast(t("toast_reading_invalid"), "error");
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
        showToast(t("toast_electricity_saved"), "success");
        closeElectricityModal();
        await Promise.all([loadElectricity(), loadElectricityHistory(), loadRent()]);
    } catch (err) {
        showToast(t("toast_electricity_save_failed"), "error");
    }
}

async function sendReminder() {
    if (!tenant) return;
    try {
        var result = await apiPost("/notifications/send-reminder", { tenant_id: parseInt(tenantId) });
        var phone = result.phone || tenant.phone;
        var message = encodeURIComponent(result.message);
        window.open("sms:" + phone + "?body=" + message, "_self");
        showToast(t("toast_reminder_opening"), "success");
        await loadNotificationHistory();
    } catch (err) {
        showToast(t("toast_reminder_failed"), "error");
    }
}

async function deactivateTenant() {
    if (!tenant) return;
    if (!confirm(t("confirm_deactivate") + " " + tenant.name + t("confirm_deactivate_suffix"))) return;
    try {
        await apiDelete("/tenants/" + tenantId);
        showToast(t("toast_tenant_deactivated"), "success");
        window.location.href = "dashboard.html";
    } catch (err) {
        showToast(t("toast_tenant_deactivate_failed"), "error");
    }
}

async function deletePayment(paymentId) {
    if (!confirm(t("confirm_delete_payment"))) return;
    try {
        await apiDelete("/rents/payments/" + paymentId);
        showToast(t("toast_payment_deleted"), "success");
        await Promise.all([loadRent(), loadPaymentHistory()]);
    } catch (err) {
        showToast(t("toast_payment_delete_failed"), "error");
    }
}

async function deleteElectricity(billId) {
    if (!confirm(t("confirm_delete_reading"))) return;
    try {
        await apiDelete("/electricity/" + billId);
        showToast(t("toast_electricity_deleted"), "success");
        await Promise.all([loadElectricity(), loadElectricityHistory(), loadRent()]);
    } catch (err) {
        showToast(t("toast_electricity_delete_failed"), "error");
    }
}

async function loadElectricityHistory() {
    var container = document.getElementById("electricity-history-content");
    var mn = getMonthNames();
    if (!tenant) {
        container.innerHTML = '<div class="text-gray-400 text-center py-4">Loading...</div>';
        return;
    }
    try {
        var bills = await apiGet("/electricity/?tenant_id=" + tenantId);
        if (!Array.isArray(bills) || bills.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-center py-6">' + t("no_readings_yet") + '</div>';
            return;
        }

        container.innerHTML = '<div class="flex flex-col gap-3">' + bills.map(function(b) {
            var units = (b.curr_reading || 0) - (b.prev_reading || 0);
            var deleteBtn = !isTenantRole
                ? '<button onclick="event.stopPropagation(); deleteElectricity(' + b.id + ')" class="text-red-400 hover:text-red-600 text-sm" title="Delete">🗑️</button>'
                : '';
            return '<div class="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">' +
                '<div class="flex items-center justify-between mb-2">' +
                    '<span class="font-semibold text-gray-800">' + mn[b.month] + ' ' + b.year + '</span>' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="font-semibold text-amber-600">' + formatMoney(b.total_amount) + '</span>' +
                        deleteBtn +
                    '</div>' +
                '</div>' +
                '<div class="grid grid-cols-3 gap-2 text-sm">' +
                    '<div><span class="text-gray-500">' + t("label_previous") + ':</span> <span class="text-gray-800">' + b.prev_reading + '</span></div>' +
                    '<div><span class="text-gray-500">' + t("label_current") + ':</span> <span class="text-gray-800">' + b.curr_reading + '</span></div>' +
                    '<div><span class="text-gray-500">' + t("label_units") + ':</span> <span class="text-gray-800">' + units + ' × ₹' + b.rate_per_unit + '</span></div>' +
                '</div>' +
            '</div>';
        }).join("") + '</div>';
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">' + t("failed_load_electricity_history") + '</div>';
    }
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthLabel();
    loadRent();
    loadElectricity();
}

function nextMonth() {
    var today = new Date();
    var newMonth = currentMonth + 1;
    var newYear = currentYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newYear > today.getFullYear() || (newYear === today.getFullYear() && newMonth > today.getMonth() + 1)) return;
    currentMonth = newMonth;
    currentYear = newYear;
    updateMonthLabel();
    loadRent();
    loadElectricity();
}

function updateMonthLabel() {
    var mn = getMonthNames();
    var label = mn[currentMonth] + " " + currentYear;
    var el = document.getElementById("month-nav-label");
    if (el) el.textContent = label;
    var nextBtn = document.querySelector('#rent-section button[onclick="nextMonth()"]');
    if (nextBtn) {
        var today = new Date();
        var atCurrent = currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1;
        nextBtn.disabled = atCurrent;
        nextBtn.classList.toggle("opacity-30", atCurrent);
        nextBtn.classList.toggle("cursor-not-allowed", atCurrent);
    }
}

function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
}

document.addEventListener("langchange", function() {
    updateMonthLabel();
    if (tenant) {
        loadTenant();
        loadRent();
        loadElectricity();
        loadElectricityHistory();
        loadPaymentHistory();
        loadNotificationHistory();
    }
});

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
