const API_BASE = "/api";

/** Get stored JWT token */
function getToken() {
    return localStorage.getItem("token");
}

/** Save JWT token */
function setToken(token) {
    localStorage.setItem("token", token);
}

/** Clear token and redirect to login */
function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

/** Check if logged in, redirect to login if not */
function requireAuth() {
    if (!getToken()) {
        window.location.href = "index.html";
    }
}

/** Fetch wrapper with JWT and error handling */
async function api(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { "Content-Type": "application/json", ...options.headers };
    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            logout();
            return null;
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Something went wrong" }));
            throw new Error(err.detail || `Error ${res.status}`);
        }
        if (res.status === 204) return null;
        return await res.json();
    } catch (err) {
        if (err.message === "Failed to fetch") {
            showToast("Cannot connect to server", "error");
            return null;
        }
        throw err;
    }
}

/** Shorthand methods */
const apiGet = (endpoint) => api(endpoint);
const apiPost = (endpoint, body) => api(endpoint, { method: "POST", body: JSON.stringify(body) });
const apiPut = (endpoint, body) => api(endpoint, { method: "PUT", body: JSON.stringify(body) });
const apiDelete = (endpoint) => api(endpoint, { method: "DELETE" });

/** Show a toast notification */
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const colors = {
        success: "bg-emerald-500",
        error: "bg-rose-500",
        warning: "bg-amber-500",
        info: "bg-indigo-500",
    };

    const toast = document.createElement("div");
    toast.className = `toast ${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg mb-2 flex items-center gap-2 text-sm`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/** Format currency */
function formatMoney(amount) {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

/** Get status badge HTML */
function statusBadge(status) {
    const cls = {
        paid: "badge-paid",
        pending: "badge-pending",
        overdue: "badge-overdue",
        partial: "badge-partial",
    };
    return `<span class="px-2 py-1 rounded-full text-xs font-medium ${cls[status] || "bg-gray-100 text-gray-600"}">${status}</span>`;
}
