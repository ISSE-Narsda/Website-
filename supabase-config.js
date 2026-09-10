// ============================================================
//  ISSE — SHARED SUPABASE CLIENT
// ============================================================

const SUPABASE_URL = 'https://ptqkcdpdfkkxcnpvkbin.supabase.co';  // Paste your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cWtjZHBkZmtreGNucHZrYmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDE3MjcsImV4cCI6MjEwMzkxNzcyN30.rHbM7yVDaOVp0H_eOHjEQ4FrI1cICucXxlsEqdeoXt4';  // Paste your anon public key

const PROD_COOKIE_DOMAIN = '.isse.edu.ng';
// Only behave like "production" once the page is genuinely served from the
// real isse.edu.ng domain. Localhost, Bluehost temporary testing domains,
// and anything else all fall through to normal same-origin cookies —
// nothing subdomain-specific happens until the real domain is actually live.
const IS_PRODUCTION_DOMAIN = window.location.hostname.endsWith('isse.edu.ng');
const IS_HTTPS = window.location.protocol === 'https:';
const COOKIE_DOMAIN = IS_PRODUCTION_DOMAIN ? PROD_COOKIE_DOMAIN : '';
const ACADEMY_URL = IS_PRODUCTION_DOMAIN ? 'https://academy.isse.edu.ng/academy-dashboard.html' : 'academy-dashboard.html';

function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    const domainPart = COOKIE_DOMAIN ? `domain=${COOKIE_DOMAIN}; ` : '';
    const securePart = IS_HTTPS ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; ${domainPart}SameSite=Lax${securePart}`;
}
function getCookie(name) {
    const safeName = name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&');
    const match = document.cookie.match(new RegExp('(?:^|; )' + safeName + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name) {
    const domainPart = COOKIE_DOMAIN ? `domain=${COOKIE_DOMAIN}; ` : '';
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; ${domainPart}SameSite=Lax`;
}

const cookieAuthStorage = {
    getItem: (key) => getCookie(key),
    setItem: (key, value) => setCookie(key, value, 7),
    removeItem: (key) => deleteCookie(key)
};

// Create client with anon key — session persisted in a shared cookie
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: cookieAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

window.db = db;
window.supabaseClient = db;

console.log('Supabase client initialized from config');

// ==================== EMAILJS CONFIG ====================
const EMAILJS_PUBLIC_KEY = 'GKH7pnImZKwl7k3vZ';
const EMAILJS_SERVICE_ID = 'service_hwsisjp';
const EMAILJS_TEMPLATE_ID = 'template_s4cgwlp';

const SITE_ORIGIN = 'https://isse.edu.ng';
const NEWS_BUCKET = 'site-media';
const DEFAULT_NEWS_IMAGE = 'images/default-news.png';

// ==================== SAFETY ====================

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==================== FORMATTING ====================

function formatNewsDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function formatTimestamp(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ==================== STORAGE ====================

function storageUrl(bucket, filePath, fallback) {
    if (!filePath) return fallback || '';
    const { data } = db.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
}

function newsImageUrl(imagePath) {
    return storageUrl(NEWS_BUCKET, imagePath, DEFAULT_NEWS_IMAGE);
}

// ==================== SKELETON LOADERS ====================

function skeletonCards(count, variant) {
    let inner;
    if (variant === 'square') {
        inner = '<div class="skeleton skeleton-square"></div>';
    } else if (variant === 'person') {
        inner = `
            <div class="skeleton skeleton-avatar"></div>
            <div class="skeleton skeleton-line short"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>`;
    } else {
        inner = `
            <div class="skeleton skeleton-thumb"></div>
            <div class="skeleton-body">
                <div class="skeleton skeleton-line short"></div>
                <div class="skeleton skeleton-line title"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
            </div>`;
    }
    return Array.from({ length: count }, () =>
        `<div class="skeleton-card" aria-hidden="true">${inner}</div>`
    ).join('');
}

function skeletonRows(rows, columns) {
    const cells = Array.from({ length: columns },
        () => '<td><div class="skeleton skeleton-line"></div></td>').join('');
    return Array.from({ length: rows },
        () => `<tr aria-hidden="true">${cells}</tr>`).join('');
}

// ==================== NEWS ====================

async function fetchNews(limit) {
    let query = db
        .from('news')
        .select('id, title, content, date, image_url')
        .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) {
        console.error('Could not load news:', error.message);
        return null;
    }
    return data;
}

// ==================== NEWSLETTER ====================

function initNewsletterForm() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    const input = document.getElementById('newsletterEmail');
    const button = document.getElementById('newsletterButton');
    const note = document.getElementById('newsletterNote');

    function say(text, kind) {
        note.textContent = text;
        note.className = 'newsletter-note ' + kind;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            say('Please enter a valid email address.', 'error');
            return;
        }

        button.disabled = true;
        const originalLabel = button.textContent;
        button.textContent = 'Subscribing…';

        const { error } = await db.from('subscribers').insert({
            email: email,
            status: 'active',
            source: window.location.pathname.split('/').pop() || 'index.html'
        });

        button.disabled = false;
        button.textContent = originalLabel;

        if (!error) {
            form.reset();
            say('You are subscribed. Watch for our next announcement.', 'success');
            return;
        }

        if (error.code === '23505') {
            form.reset();
            say('That address is already on the list.', 'success');
        } else {
            console.error('Subscription failed:', error.message);
            say('Something went wrong. Please try again shortly.', 'error');
        }
    });
}

// ==================== ADMIN AUTHENTICATION ====================

// Get the currently signed-in admin profile
async function getCurrentAdmin() {
    try {
        const { data: { session } } = await db.auth.getSession();

        if (!session) {
            return null;
        }

        // Fetch the profile, with one retry in case of a transient network
        // hiccup (common right as a page is loading/navigating).
        let data, error;
        for (let attempt = 0; attempt < 2; attempt++) {
            ({ data, error } = await db
                .from('admin_profiles')
                .select('id, email, username, role, is_active, created_at')
                .eq('id', session.user.id)
                .maybeSingle());

            if (!error) break;
            console.warn('⚠️ Profile fetch failed, attempt ' + (attempt + 1) + ':', error.message);
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        if (error) {
            console.error('❌ Profile fetch error after retry:', error.message);
            return null;
        }

        if (!data) {
            return null;
        }

        if (data.is_active === false) {
            await db.auth.signOut();
            return null;
        }

        return data;
    } catch (error) {
        console.error('❌ getCurrentAdmin error:', error.message);
        return null;
    }
}

// Guard for admin pages - redirects to login if not authenticated
async function requireAdmin() {
    const admin = await getCurrentAdmin();

    if (!admin) {
        await db.auth.signOut();
        window.location.replace('admin-login.html');
        return null;
    }

    // Update the header with admin info
    const nameEl = document.getElementById('adminNameDisplay');
    const roleEl = document.getElementById('adminRoleDisplay');
    if (nameEl) nameEl.textContent = admin.username;
    if (roleEl) roleEl.textContent = admin.role;

    document.body.classList.add('admin-ready');
    return admin;
}

// Log admin activity
async function logActivity(action, admin, details = {}) {
    const { error } = await db.from('activity_log').insert({
        admin_id: admin ? admin.id : null,
        admin_email: admin ? admin.email : null,
        action: action,
        details: details
    });
    if (error) console.error('Could not record activity:', error.message);
}

// Sign out admin
async function signOutAdmin() {
    await db.auth.signOut();
    window.location.replace('admin-login.html');
}

// Initialize admin panel chrome (sidebar toggle, logout)
function initAdminChrome() {
    const hamburger = document.getElementById('adminHamburger');
    const sidebar = document.getElementById('adminSidebar');
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOutAdmin();
        });
    }
}

// ==================== ACTIVITY LOGGING ====================

// Log an admin action to the database
async function logAdminAction(admin, action, details = {}) {
    if (!admin) {
        console.error('Cannot log action: No admin provided');
        return;
    }

    const { error } = await db.from('activity_log').insert({
        admin_id: admin.id,
        admin_email: admin.email,
        action: action,
        details: details
    });

    if (error) {
        console.error('Could not log activity:', error.message);
    }
}

// ==================== ADMIN PROFILE ====================

// Update admin username
async function updateAdminUsername(adminId, newUsername) {
    const { data, error } = await db
        .from('admin_profiles')
        .update({ username: newUsername })
        .eq('id', adminId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Get all admins (Super Admin only)
async function getAllAdmins() {
    const { data, error } = await db
        .from('admin_profiles')
        .select('id, email, username, role, created_at, last_login, is_active')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

// ==================== ADMIN MANAGEMENT (Super Admin only) ====================

// Add a new admin (Super Admin only) — now routed through the secure Edge Function
async function addAdmin(email, username, password, role) {
    const { data: { session } } = await db.auth.getSession();

    const response = await fetch(SUPABASE_URL + '/functions/v1/admin-manage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({ action: 'addAdmin', email, username, password, role })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to add admin');

    return result;
}

// Deactivate an admin (Super Admin only)
async function deactivateAdmin(adminId) {
    const { data, error } = await db
        .from('admin_profiles')
        .update({ is_active: false })
        .eq('id', adminId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Reactivate an admin (Super Admin only)
async function reactivateAdmin(adminId) {
    const { data, error } = await db
        .from('admin_profiles')
        .update({ is_active: true })
        .eq('id', adminId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Delete an admin (Super Admin only) — now routed through the secure Edge Function
async function deleteAdmin(adminId) {
    const { data: { session } } = await db.auth.getSession();

    const response = await fetch(SUPABASE_URL + '/functions/v1/admin-manage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({ action: 'deleteAdmin', adminId })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete admin');

    return result;
}

// Get audit logs (Super Admin only)
async function getAuditLogs(limit = 100) {
    const { data, error } = await db
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

// Check if admin is Super Admin
async function isSuperAdmin() {
    const admin = await getCurrentAdmin();
    return admin && admin.role === 'Super Admin';
}

// Check if admin is active
async function isAdminActive() {
    const admin = await getCurrentAdmin();
    return admin && admin.is_active === true;
}

// Auto-init newsletter form if it exists
if (document.getElementById('newsletterForm')) {
    initNewsletterForm();
}

// ==================== DYNAMIC PAGE BANNERS ====================
// Looks for any element with a data-banner-page="..." attribute and,
// if an admin has uploaded a custom banner for that page in the
// site_banners table, swaps its background-image to the uploaded one.
// If no custom banner exists, the element just keeps its CSS default.

async function applyPageBanners() {
    const elements = document.querySelectorAll('[data-banner-page]');
    if (!elements.length) return;

    try {
        const { data, error } = await db
            .from('site_banners')
            .select('page, image_url');

        if (error) throw error;

        const bannerMap = {};
        (data || []).forEach(row => { bannerMap[row.page] = row.image_url; });

        elements.forEach(el => {
            const key = el.getAttribute('data-banner-page');
            const imageUrl = bannerMap[key];
            if (imageUrl) {
                el.style.backgroundImage = `url('${imageUrl}')`;
            }
        });

    } catch (error) {
        console.error('Could not load page banners:', error.message);
    }
}

applyPageBanners();

// ==================== DYNAMIC SITE CONTENT ====================
// Looks for elements tagged with data-content-key="page_section" (plain text/
// paragraph fields) or data-content-list="page_section" (fields the admin
// panel treats as "one item per line", rendered as <li> items) and, if an
// admin has saved a custom value for that page+section in site_content,
// swaps the element's content. Anything without a saved row keeps its
// original hardcoded HTML.

async function applySiteContent() {
    const textElements = document.querySelectorAll('[data-content-key]');
    const listElements = document.querySelectorAll('[data-content-list]');
    if (!textElements.length && !listElements.length) return;

    try {
        const { data, error } = await db
            .from('site_content')
            .select('page, section, content');

        if (error) throw error;

        const contentMap = {};
        (data || []).forEach(row => {
            contentMap[`${row.page}_${row.section}`] = row.content;
        });

        textElements.forEach(el => {
            const key = el.getAttribute('data-content-key');
            const value = contentMap[key];
            if (value) {
                el.textContent = value;
            }
        });

        listElements.forEach(el => {
            const key = el.getAttribute('data-content-list');
            const value = contentMap[key];
            if (value) {
                const items = value.split('\n').map(line => line.trim()).filter(Boolean);
                el.innerHTML = items.map(line => `<li>${escapeHtml(line)}</li>`).join('');
            }
        });

    } catch (error) {
        console.error('Could not load site content:', error.message);
    }
}

applySiteContent();

// ==================== DYNAMIC PROGRAM BLURBS ====================
// For any element tagged data-program-blurb="<slug>" (used on the homepage
// and programs listing page program cards), swaps in the first paragraph of
// that program's saved overview, if an admin has set one.

async function applyProgramBlurbs() {
    const elements = document.querySelectorAll('[data-program-blurb]');
    if (!elements.length) return;

    try {
        const { data, error } = await db.from('programs').select('slug, overview');
        if (error) throw error;

        const overviewMap = {};
        (data || []).forEach(p => { overviewMap[p.slug] = p.overview; });

        elements.forEach(el => {
            const slug = el.getAttribute('data-program-blurb');
            const overview = overviewMap[slug];
            if (!overview) return;
            const firstParagraph = overview.split('\n').map(s => s.trim()).filter(Boolean)[0];
            if (firstParagraph) el.textContent = firstParagraph;
        });

    } catch (error) {
        console.error('Could not load program blurbs:', error.message);
    }
}

applyProgramBlurbs();

// ==================== DYNAMIC PROGRAM DETAIL PAGE ====================
// On a program detail page, finds the element tagged data-program-slug="<slug>"
// and, using saved data from the programs / program_courses / program_requirements
// tables, fills in the overview, durations, course list and requirement lists.
// Anything the admin hasn't set keeps its original hardcoded HTML.

async function applyProgramDetail() {
    const root = document.querySelector('[data-program-slug]');
    if (!root) return;

    const slug = root.getAttribute('data-program-slug');

    try {
        const [programResult, coursesResult, requirementsResult] = await Promise.all([
            db.from('programs').select('*').eq('slug', slug).maybeSingle(),
            db.from('program_courses').select('*').eq('program_slug', slug).order('sort_order', { ascending: true }),
            db.from('program_requirements').select('*').eq('program_slug', slug).order('sort_order', { ascending: true })
        ]);

        if (programResult.error) throw programResult.error;
        if (coursesResult.error) throw coursesResult.error;
        if (requirementsResult.error) throw requirementsResult.error;

        const program = programResult.data;
        const courses = coursesResult.data || [];
        const requirements = requirementsResult.data || [];

        // Overview (one paragraph per line the admin entered)
        if (program && program.overview) {
            const overviewEl = document.querySelector('[data-program-overview]');
            if (overviewEl) {
                const paragraphs = program.overview.split('\n').map(p => p.trim()).filter(Boolean);
                overviewEl.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
            }
        }

        // Durations
        if (program && program.duration_master) {
            const el = document.querySelector('[data-program-duration="master"]');
            if (el) el.textContent = program.duration_master;
        }
        if (program && program.duration_phd) {
            const el = document.querySelector('[data-program-duration="phd"]');
            if (el) el.textContent = program.duration_phd;
        }

        // Course list
        if (courses.length) {
            const el = document.querySelector('[data-program-courses]');
            if (el) el.innerHTML = courses.map(c => `<li>${escapeHtml(c.course_name)}</li>`).join('');
        }

        // Admission requirements, split by level
        if (requirements.length) {
            const masterReqs = requirements.filter(r => r.level === 'master');
            const phdReqs = requirements.filter(r => r.level === 'phd');

            if (masterReqs.length) {
                const el = document.querySelector('[data-program-requirements="master"]');
                if (el) el.innerHTML = masterReqs.map(r => `<li>${escapeHtml(r.requirement_text)}</li>`).join('');
            }
            if (phdReqs.length) {
                const el = document.querySelector('[data-program-requirements="phd"]');
                if (el) el.innerHTML = phdReqs.map(r => `<li>${escapeHtml(r.requirement_text)}</li>`).join('');
            }
        }

    } catch (error) {
        console.error('Could not load program detail:', error.message);
    }
}

applyProgramDetail();

// ==================== PASSWORD REVEAL TOGGLE ====================
// Wire up any password input built as:
//   <div class="password-field-wrapper">
//       <input type="password" ...>
//       <button type="button" class="password-toggle-btn" aria-label="Show password">...</button>
//   </div>
// Clicking the button flips the input between hidden and plain text so
// people can check what they've typed, especially for long passwords.

const PASSWORD_EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const PASSWORD_EYE_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-3.35 2.86A9.12 9.12 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 4.22-5.94"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

function initPasswordToggles() {
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
        if (btn.dataset.toggleBound) return;
        btn.dataset.toggleBound = 'true';

        if (!btn.innerHTML.trim()) {
            btn.innerHTML = PASSWORD_EYE_ICON;
        }

        btn.addEventListener('click', function() {
            const wrapper = btn.closest('.password-field-wrapper');
            const input = wrapper ? wrapper.querySelector('input') : null;
            if (!input) return;

            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
            btn.innerHTML = isHidden ? PASSWORD_EYE_OFF_ICON : PASSWORD_EYE_ICON;
        });
    });
}

initPasswordToggles();


// ==================== ADMIN DARK MODE TOGGLE ====================
// Same behavior/icons as the public site's dark toggle (script.js), just
// packaged as a reusable function since admin pages don't load script.js.
// Each admin page calls this once, after its darkToggle button exists in
// the DOM.
function initDarkModeToggle() {
    const darkToggle = document.getElementById('darkToggle');
    const darkIcon = document.getElementById('darkIcon');
    if (!darkToggle || !darkIcon) return;

    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkIcon.src = 'icons/sun-icon.png';
        darkIcon.alt = 'Light Mode';
    }

    darkToggle.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.classList.toggle('dark-mode');

        if (document.body.classList.contains('dark-mode')) {
            darkIcon.src = 'icons/sun-icon.png';
            darkIcon.alt = 'Light Mode';
            localStorage.setItem('darkMode', 'enabled');
        } else {
            darkIcon.src = 'icons/moon-icon.png';
            darkIcon.alt = 'Dark Mode';
            localStorage.setItem('darkMode', 'disabled');
        }
    });
}