// Notifications page logic
requireAuth();

/**
 * Load SMS configuration status and display badge
 */
async function loadSmsStatus() {
    const statusEl = document.getElementById('sms-status');
    try {
        const data = await apiGet('/notifications/sms-status');
        if (data.configured) {
            statusEl.innerHTML = `
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    SMS Active
                </span>`;
        } else {
            statusEl.innerHTML = `
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                    SMS Not Configured &mdash; reminders are saved but not sent
                </span>`;
        }
    } catch (err) {
        statusEl.innerHTML = `
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                SMS status unknown
            </span>`;
    }
}

/**
 * Format an ISO date string into a readable format.
 * Returns relative time for recent dates (e.g. "2 hours ago")
 * and absolute format for older dates (e.g. "Oct 5, 2026 2:30 PM").
 */
function formatDate(isoString) {
    if (!isoString) return '';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Relative time for recent notifications
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    // Absolute format for older dates
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Get the appropriate badge class for a notification status.
 */
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

/**
 * Render a single notification card.
 */
function renderNotificationCard(notif) {
    const badgeClass = getStatusBadgeClass(notif.status);
    const statusLabel = notif.status ? notif.status.charAt(0).toUpperCase() + notif.status.slice(1) : 'Unknown';
    const tenantName = notif.tenant_name || 'Unknown Tenant';
    const message = notif.message || '';
    const dateStr = formatDate(notif.sent_at);

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

/**
 * Load all notifications and render the card list.
 */
async function loadNotifications() {
    const listEl = document.getElementById('notif-list');
    try {
        const notifications = await apiGet('/notifications/');

        if (!notifications || notifications.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-16">
                    <div class="text-4xl mb-3">🔕</div>
                    <h3 class="text-lg font-medium text-gray-700 mb-1">No notifications yet</h3>
                    <p class="text-sm text-gray-500">Send reminders from tenant pages.</p>
                </div>`;
            return;
        }

        listEl.innerHTML = notifications.map(renderNotificationCard).join('');
    } catch (err) {
        listEl.innerHTML = `
            <div class="text-center py-16">
                <div class="text-4xl mb-3">⚠️</div>
                <h3 class="text-lg font-medium text-gray-700 mb-1">Failed to load notifications</h3>
                <p class="text-sm text-gray-500">${err.message || 'Please try again later.'}</p>
            </div>`;
        showToast('Failed to load notifications', 'error');
    }
}

/**
 * Toggle mobile sidebar visibility.
 */
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

// Initialize page
loadSmsStatus();
loadNotifications();
