requireAdmin();

renderLangSwitcher(document.getElementById("lang-switcher-sidebar"));
renderLangSwitcher(document.getElementById("lang-switcher-mobile"));

function formatDate(isoString) {
    if (!isoString) return '';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return getLang() === 'hi' ? 'अभी' : 'Just now';
    if (diffMinutes < 60) return getLang() === 'hi' ? diffMinutes + ' मिनट पहले' : diffMinutes + ' min ago';
    if (diffHours < 24) return getLang() === 'hi' ? diffHours + ' घंटे पहले' : diffHours + ' hour' + (diffHours !== 1 ? 's' : '') + ' ago';
    if (diffDays < 7) return getLang() === 'hi' ? diffDays + ' दिन पहले' : diffDays + ' day' + (diffDays !== 1 ? 's' : '') + ' ago';

    const locale = getLang() === 'hi' ? 'hi-IN' : 'en-US';
    return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function getStatusBadgeClass(status) {
    switch ((status || '').toLowerCase()) {
        case 'sent':
            return 'bg-emerald-100 text-emerald-700';
        case 'failed':
            return 'bg-rose-100 text-rose-700';
        case 'pending':
            return 'bg-amber-100 text-amber-700';
        default:
            return 'bg-gray-100 text-gray-600';
    }
}

function renderNotificationCard(notif) {
    const badgeClass = getStatusBadgeClass(notif.status);
    const statusLabel = notif.status ? notif.status.charAt(0).toUpperCase() + notif.status.slice(1) : 'Unknown';
    const tenantName = notif.tenant_name || (getLang() === 'hi' ? 'अज्ञात किरायेदार' : 'Unknown Tenant');
    const message = notif.message || '';
    const dateStr = formatDate(notif.sent_at || notif.created_at);

    return `
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div class="flex items-start justify-between gap-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium text-gray-800">${tenantName}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${statusLabel}</span>
                    </div>
                    <p class="text-sm text-gray-600 line-clamp-2">${message}</p>
                </div>
                <span class="text-xs text-gray-400 whitespace-nowrap">${dateStr}</span>
            </div>
        </div>`;
}

async function loadNotifications() {
    const listEl = document.getElementById('notif-list');
    try {
        const notifications = await apiGet('/notifications/');

        if (!notifications || notifications.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-16">
                    <div class="text-4xl mb-3">🔕</div>
                    <h3 class="text-lg font-medium text-gray-700 mb-1">${t('no_notifications_title')}</h3>
                    <p class="text-sm text-gray-500">${t('no_notifications_desc')}</p>
                </div>`;
            return;
        }

        listEl.innerHTML = notifications.map(renderNotificationCard).join('');
    } catch (err) {
        listEl.innerHTML = `
            <div class="text-center py-16">
                <div class="text-4xl mb-3">⚠️</div>
                <h3 class="text-lg font-medium text-gray-700 mb-1">${t('failed_load_notifications')}</h3>
                <p class="text-sm text-gray-500">${err.message || t('failed_load_notifications_desc')}</p>
            </div>`;
        showToast(t('failed_load_notifications'), 'error');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = !sidebar.classList.contains('-translate-x-full');

    if (isOpen) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    } else {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }
}

document.addEventListener("langchange", function() {
    loadNotifications();
});

loadNotifications();
