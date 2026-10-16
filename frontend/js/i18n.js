// ─── i18n: English / Hindi translation engine ───────────────────────

const translations = {
    en: {
        app_name: "Rent Manager",
        nav_dashboard: "Dashboard",
        nav_notifications: "Notifications",
        logout: "Logout",
        back: "Back",

        // Login page
        login_subtitle: "Sign in to continue",
        tab_admin_login: "Landlord Login",
        tab_tenant_login: "Tenant Login",
        tab_signup: "Sign Up",
        label_email: "Email",
        label_password: "Password",
        btn_signin: "Sign In",
        tenant_login_desc: "Enter your registered mobile number to view your rent details.",
        label_mobile: "Mobile Number",
        placeholder_mobile: "10 digit mobile number",
        btn_view_rent: "View My Rent",
        label_name: "Name",
        placeholder_name: "Your name",
        placeholder_email: "you@example.com",
        placeholder_password_min: "Min 6 characters",
        btn_create_account: "Create Account",

        // Dashboard
        dashboard_title: "Dashboard",
        add_tenant_btn: "+ Add Tenant",
        stat_active: "Active Tenants",
        stat_paid: "Paid",
        stat_pending: "Pending",
        stat_overdue: "Overdue",
        total_collected: "Total Collected",
        pending_amount: "Pending Amount",
        generate_rents: "Generate Rents",
        mark_overdue: "Mark Overdue",
        all_tenants: "All Tenants",
        th_name: "Tenant Name",
        th_room: "Property",
        th_rent: "Rent",
        th_status: "Status",
        th_paid: "Paid",
        th_actions: "Actions",
        no_tenants: "No active tenants found.",
        modal_add_tenant_title: "Add Tenant",
        label_phone: "Phone",
        label_room_number: "Property",
        label_monthly_rent: "Monthly Rent",
        label_due_day: "Rent Due Day (1-28)",
        label_join_date: "Join Date",
        btn_add_tenant: "Add Tenant",
        view_link: "View →",
        remind_btn: "📱 Remind",
        no_rent: "No rent",

        // Status badges
        status_paid: "paid",
        status_pending: "pending",
        status_overdue: "overdue",
        status_partial: "partial",

        // Notifications page
        notifications_title: "Notifications",
        notifications_subtitle: "History of all sent reminders",
        no_notifications_title: "No notifications yet",
        no_notifications_desc: "Send reminders from tenant pages.",
        failed_load_notifications: "Failed to load notifications",
        failed_load_notifications_desc: "Please try again later.",

        // Tenant page
        tenant_details_title: "Tenant Details",
        tenant_info_title: "Tenant Information",
        edit_btn: "Edit",
        send_reminder_btn: "📱 Send Reminder",
        deactivate_tenant_btn: "🗑️ Deactivate Tenant",
        label_due_day_short: "Due Day",
        of_every_month: "of every month",
        label_join_date_short: "Join Date",
        label_status: "Status",
        active: "Active",
        inactive: "Inactive",
        rent_electricity_header: "Rent & Electricity",
        label_due: "Due",
        label_base_rent: "Base Rent",
        label_electricity: "Electricity",
        label_total_due: "Total Due",
        label_paid: "Paid",
        label_remaining: "Remaining",
        record_payment_btn: "Record Payment",
        generate_rent_btn: "Generate Rent",
        no_rent_generated: "No rent generated for",
        electricity_bill_title: "Electricity Bill",
        no_reading_for: "No reading for",
        add_reading_btn: "Add Reading",
        label_previous: "Previous",
        label_current: "Current",
        label_units: "Units",
        label_rate: "Rate",
        label_total: "Total",
        delete_reading_btn: "🗑️ Delete Reading",
        electricity_history_title: "Electricity History",
        no_readings_yet: "No electricity readings yet.",
        transaction_history_title: "Transaction History",
        no_transactions_yet: "No transactions yet.",
        notification_history_title: "Notification History",
        no_notifications_sent: "No notifications sent yet.",
        label_method: "Method",
        label_note: "Note",
        tag_payment: "Payment",
        tag_electricity: "Electricity",
        reading_label: "Reading",
        rate_label: "Rate",

        // Modals
        modal_edit_tenant_title: "Edit Tenant",
        btn_cancel: "Cancel",
        btn_save_changes: "Save Changes",
        modal_record_payment_title: "Record Payment",
        label_amount: "Amount (₹)",
        label_date: "Date",
        label_note_optional: "Note (optional)",
        placeholder_remarks: "Any remarks...",
        method_cash: "Cash",
        method_upi: "UPI",
        method_bank_transfer: "Bank Transfer",
        method_other: "Other",
        modal_add_electricity_title: "Add Electricity Reading",
        label_previous_reading: "Previous Reading",
        label_current_reading: "Current Reading",
        label_rate_per_unit: "Rate per Unit (₹)",
        estimated_total: "Estimated Total:",
        units_label: "units",
        save_reading_btn: "Save Reading",

        // Loading / generic states
        loading_tenant_info: "Loading tenant info...",
        loading_rent_info: "Loading rent info...",
        loading_electricity_info: "Loading electricity info...",
        loading_electricity_history: "Loading electricity history...",
        loading_payment_history: "Loading payment history...",
        loading_notification_history: "Loading notification history...",
        loading_notifications: "Loading notifications...",

        // Toasts
        toast_tenant_added: "Tenant added successfully",
        toast_tenant_add_failed: "Failed to add tenant",
        toast_failed_load_stats: "Failed to load stats",
        toast_failed_load_tenants: "Failed to load tenants",
        toast_reminder_opening: "Opening SMS app...",
        toast_reminder_failed: "Failed to create reminder",
        toast_cannot_connect: "Cannot connect to server",
        toast_tenant_updated: "Tenant updated successfully",
        toast_tenant_update_failed: "Failed to update tenant",
        toast_payment_recorded: "Payment recorded successfully",
        toast_payment_record_failed: "Failed to record payment",
        toast_payment_deleted: "Payment deleted",
        toast_payment_delete_failed: "Failed to delete payment",
        toast_electricity_saved: "Electricity reading saved",
        toast_electricity_save_failed: "Failed to save electricity reading",
        toast_electricity_deleted: "Electricity reading deleted",
        toast_electricity_delete_failed: "Failed to delete reading",
        toast_rent_generated: "Rent generated successfully",
        toast_rent_generate_failed: "Failed to generate rent",
        toast_tenant_deactivated: "Tenant deactivated",
        toast_tenant_deactivate_failed: "Failed to deactivate tenant",
        toast_reading_invalid: "Current reading must be greater than previous reading",
        confirm_deactivate: "Are you sure you want to deactivate",
        confirm_deactivate_suffix: "? They will be hidden from the dashboard.",
        confirm_delete_payment: "Delete this payment? The rent status will be updated accordingly.",
        confirm_delete_reading: "Delete this electricity reading?",
        failed_load_tenant_info: "Failed to load tenant info.",
        failed_load_rent_info: "Failed to load rent info.",
        failed_load_electricity_info: "Failed to load electricity info.",
        failed_load_payment_history: "Failed to load transaction history.",
        failed_load_notification_history: "Failed to load notification history.",
        failed_load_electricity_history: "Failed to load electricity history.",
    },
    hi: {
        app_name: "रेंट मैनेजर",
        nav_dashboard: "डैशबोर्ड",
        nav_notifications: "सूचनाएं",
        logout: "लॉगआउट",
        back: "वापस",

        // Login page
        login_subtitle: "जारी रखने के लिए साइन इन करें",
        tab_admin_login: "मालिक लॉगिन",
        tab_tenant_login: "किरायेदार लॉगिन",
        tab_signup: "साइन अप करें",
        label_email: "ईमेल",
        label_password: "पासवर्ड",
        btn_signin: "साइन इन करें",
        tenant_login_desc: "अपने किराए का विवरण देखने के लिए अपना रजिस्टर्ड मोबाइल नंबर दर्ज करें।",
        label_mobile: "मोबाइल नंबर",
        placeholder_mobile: "10 अंकों का मोबाइल नंबर",
        btn_view_rent: "मेरा किराया देखें",
        label_name: "नाम",
        placeholder_name: "आपका नाम",
        placeholder_email: "you@example.com",
        placeholder_password_min: "कम से कम 6 अक्षर",
        btn_create_account: "खाता बनाएं",

        // Dashboard
        dashboard_title: "डैशबोर्ड",
        add_tenant_btn: "+ किरायेदार जोड़ें",
        stat_active: "सक्रिय किरायेदार",
        stat_paid: "भुगतान किया",
        stat_pending: "बाकी",
        stat_overdue: "अतिदेय",
        total_collected: "कुल एकत्रित",
        pending_amount: "बाकी राशि",
        generate_rents: "किराया जनरेट करें",
        mark_overdue: "अतिदेय चिह्नित करें",
        all_tenants: "सभी किरायेदार",
        th_name: "किरायेदार का नाम",
        th_room: "प्रॉपर्टी",
        th_rent: "किराया",
        th_status: "स्थिति",
        th_paid: "भुगतान",
        th_actions: "कार्रवाई",
        no_tenants: "कोई सक्रिय किरायेदार नहीं मिला।",
        modal_add_tenant_title: "किरायेदार जोड़ें",
        label_phone: "फ़ोन",
        label_room_number: "प्रॉपर्टी",
        label_monthly_rent: "मासिक किराया",
        label_due_day: "किराया देय दिन (1-28)",
        label_join_date: "जुड़ने की तारीख",
        btn_add_tenant: "किरायेदार जोड़ें",
        view_link: "देखें →",
        remind_btn: "📱 याद दिलाएं",
        no_rent: "कोई किराया नहीं",

        // Status badges
        status_paid: "भुगतान हुआ",
        status_pending: "बाकी",
        status_overdue: "अतिदेय",
        status_partial: "आंशिक",

        // Notifications page
        notifications_title: "सूचनाएं",
        notifications_subtitle: "भेजे गए सभी रिमाइंडर का इतिहास",
        no_notifications_title: "अभी तक कोई सूचना नहीं",
        no_notifications_desc: "किरायेदार पेज से रिमाइंडर भेजें।",
        failed_load_notifications: "सूचनाएं लोड करने में विफल",
        failed_load_notifications_desc: "कृपया बाद में फिर से प्रयास करें।",

        // Tenant page
        tenant_details_title: "किरायेदार विवरण",
        tenant_info_title: "किरायेदार जानकारी",
        edit_btn: "संपादित करें",
        send_reminder_btn: "📱 रिमाइंडर भेजें",
        deactivate_tenant_btn: "🗑️ किरायेदार निष्क्रिय करें",
        label_due_day_short: "देय दिन",
        of_every_month: "हर महीने का",
        label_join_date_short: "जुड़ने की तारीख",
        label_status: "स्थिति",
        active: "सक्रिय",
        inactive: "निष्क्रिय",
        rent_electricity_header: "किराया और बिजली",
        label_due: "देय",
        label_base_rent: "मूल किराया",
        label_electricity: "बिजली",
        label_total_due: "कुल देय",
        label_paid: "भुगतान",
        label_remaining: "शेष",
        record_payment_btn: "भुगतान दर्ज करें",
        generate_rent_btn: "किराया जनरेट करें",
        no_rent_generated: "के लिए कोई किराया जनरेट नहीं हुआ",
        electricity_bill_title: "बिजली बिल",
        no_reading_for: "के लिए कोई रीडिंग नहीं",
        add_reading_btn: "रीडिंग जोड़ें",
        label_previous: "पिछला",
        label_current: "वर्तमान",
        label_units: "यूनिट",
        label_rate: "दर",
        label_total: "कुल",
        delete_reading_btn: "🗑️ रीडिंग हटाएं",
        electricity_history_title: "बिजली इतिहास",
        no_readings_yet: "अभी तक कोई बिजली रीडिंग नहीं।",
        transaction_history_title: "लेन-देन इतिहास",
        no_transactions_yet: "अभी तक कोई लेन-देन नहीं।",
        notification_history_title: "सूचना इतिहास",
        no_notifications_sent: "अभी तक कोई सूचना नहीं भेजी गई।",
        label_method: "माध्यम",
        label_note: "नोट",
        tag_payment: "भुगतान",
        tag_electricity: "बिजली",
        reading_label: "रीडिंग",
        rate_label: "दर",

        // Modals
        modal_edit_tenant_title: "किरायेदार संपादित करें",
        btn_cancel: "रद्द करें",
        btn_save_changes: "परिवर्तन सहेजें",
        modal_record_payment_title: "भुगतान दर्ज करें",
        label_amount: "राशि (₹)",
        label_date: "तारीख",
        label_note_optional: "नोट (वैकल्पिक)",
        placeholder_remarks: "कोई टिप्पणी...",
        method_cash: "नकद",
        method_upi: "यूपीआई",
        method_bank_transfer: "बैंक ट्रांसफर",
        method_other: "अन्य",
        modal_add_electricity_title: "बिजली रीडिंग जोड़ें",
        label_previous_reading: "पिछली रीडिंग",
        label_current_reading: "वर्तमान रीडिंग",
        label_rate_per_unit: "प्रति यूनिट दर (₹)",
        estimated_total: "अनुमानित कुल:",
        units_label: "यूनिट",
        save_reading_btn: "रीडिंग सहेजें",

        // Loading / generic states
        loading_tenant_info: "किरायेदार जानकारी लोड हो रही है...",
        loading_rent_info: "किराया जानकारी लोड हो रही है...",
        loading_electricity_info: "बिजली जानकारी लोड हो रही है...",
        loading_electricity_history: "बिजली इतिहास लोड हो रहा है...",
        loading_payment_history: "भुगतान इतिहास लोड हो रहा है...",
        loading_notification_history: "सूचना इतिहास लोड हो रहा है...",
        loading_notifications: "सूचनाएं लोड हो रही हैं...",

        // Toasts
        toast_tenant_added: "किरायेदार सफलतापूर्वक जोड़ा गया",
        toast_tenant_add_failed: "किरायेदार जोड़ने में विफल",
        toast_failed_load_stats: "आंकड़े लोड करने में विफल",
        toast_failed_load_tenants: "किरायेदार लोड करने में विफल",
        toast_reminder_opening: "SMS ऐप खोल रहे हैं...",
        toast_reminder_failed: "रिमाइंडर बनाने में विफल",
        toast_cannot_connect: "सर्वर से कनेक्ट नहीं हो सका",
        toast_tenant_updated: "किरायेदार सफलतापूर्वक अपडेट किया गया",
        toast_tenant_update_failed: "किरायेदार अपडेट करने में विफल",
        toast_payment_recorded: "भुगतान सफलतापूर्वक दर्ज किया गया",
        toast_payment_record_failed: "भुगतान दर्ज करने में विफल",
        toast_payment_deleted: "भुगतान हटाया गया",
        toast_payment_delete_failed: "भुगतान हटाने में विफल",
        toast_electricity_saved: "बिजली रीडिंग सहेजी गई",
        toast_electricity_save_failed: "बिजली रीडिंग सहेजने में विफल",
        toast_electricity_deleted: "बिजली रीडिंग हटाई गई",
        toast_electricity_delete_failed: "रीडिंग हटाने में विफल",
        toast_rent_generated: "किराया सफलतापूर्वक जनरेट हुआ",
        toast_rent_generate_failed: "किराया जनरेट करने में विफल",
        toast_tenant_deactivated: "किरायेदार निष्क्रिय किया गया",
        toast_tenant_deactivate_failed: "किरायेदार निष्क्रिय करने में विफल",
        toast_reading_invalid: "वर्तमान रीडिंग पिछली रीडिंग से अधिक होनी चाहिए",
        confirm_deactivate: "क्या आप वाकई",
        confirm_deactivate_suffix: "को निष्क्रिय करना चाहते हैं? वे डैशबोर्ड से छिप जाएंगे।",
        confirm_delete_payment: "यह भुगतान हटाएं? किराए की स्थिति तदनुसार अपडेट हो जाएगी।",
        confirm_delete_reading: "यह बिजली रीडिंग हटाएं?",
        failed_load_tenant_info: "किरायेदार जानकारी लोड करने में विफल।",
        failed_load_rent_info: "किराया जानकारी लोड करने में विफल।",
        failed_load_electricity_info: "बिजली जानकारी लोड करने में विफल।",
        failed_load_payment_history: "लेन-देन इतिहास लोड करने में विफल।",
        failed_load_notification_history: "सूचना इतिहास लोड करने में विफल।",
        failed_load_electricity_history: "बिजली इतिहास लोड करने में विफल।",
    },
};

const monthNamesByLang = {
    en: ["", "January", "February", "March", "April", "May", "June",
         "July", "August", "September", "October", "November", "December"],
    hi: ["", "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
         "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
};

/** Get the current language ("en" or "hi"), defaulting to English */
function getLang() {
    return localStorage.getItem("lang") || "en";
}

/** Persist the chosen language */
function setLang(lang) {
    localStorage.setItem("lang", lang);
}

/** Translate a key for the current language, falling back to English then the key itself */
function t(key) {
    const lang = getLang();
    return (translations[lang] && translations[lang][key])
        || translations.en[key]
        || key;
}

/** Month names array for the current language (index 1-12, index 0 is blank) */
function getMonthNames() {
    return monthNamesByLang[getLang()] || monthNamesByLang.en;
}

/**
 * Walk the DOM and apply translations to every element with data-i18n* attributes:
 *  - data-i18n: sets textContent
 *  - data-i18n-placeholder: sets the placeholder attribute
 *  - data-i18n-title: sets the title attribute
 */
function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
    document.documentElement.lang = getLang() === "hi" ? "hi" : "en";

    // Reflect active state on any language switcher buttons present on the page
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
        const isActive = btn.getAttribute("data-lang-btn") === getLang();
        btn.classList.toggle("bg-indigo-600", isActive);
        btn.classList.toggle("text-white", isActive);
        btn.classList.toggle("text-gray-500", !isActive);
    });
}

/** Switch language, re-apply translations, and notify the page (for dynamic content) */
function switchLang(lang) {
    setLang(lang);
    applyI18n();
    document.dispatchEvent(new CustomEvent("langchange"));
}

/** Insert a language switcher pill (EN | HI) into the given container element */
function renderLangSwitcher(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = `
        <div class="inline-flex items-center bg-gray-100 rounded-full p-0.5 text-xs font-medium">
            <button type="button" data-lang-btn="en" onclick="switchLang('en')" class="px-2.5 py-1 rounded-full transition-colors text-gray-500">EN</button>
            <button type="button" data-lang-btn="hi" onclick="switchLang('hi')" class="px-2.5 py-1 rounded-full transition-colors text-gray-500">हिं</button>
        </div>
    `;
    applyI18n();
}

document.addEventListener("DOMContentLoaded", applyI18n);
