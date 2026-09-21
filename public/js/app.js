/*
 * InternManage — app.js
 *
 * One script loaded on every public-facing page. Handles:
 *   - Auth state (read/write localStorage, update navbar UI)
 *   - Toast notifications
 *   - Navbar scroll shadow
 *   - Mobile hamburger menu + touch swipe to close
 *   - Scroll-triggered animations via IntersectionObserver
 *   - Counter animations for stat numbers
 *   - Form submissions: login, register, contact
 *   - Password visibility toggles
 *
 * Intentionally no framework — keeping it vanilla keeps the bundle
 * tiny and there's no build step needed. If this grows much bigger
 * we should probably split it into per-feature modules.
 */

// Base URL for API calls. Empty string = same origin, which works fine
// for both dev (express running on 3000) and prod (served from same host).
// If the API ever moves to a separate subdomain, update this one spot.
const API_BASE = '';  // same origin

/*
 * Auth — thin wrapper around localStorage for token + user data.
 *
 * We store two separate keys:
 *   internmanage_token  → raw JWT string, sent as Bearer header on API calls
 *   internmanage_user   → JSON blob with _id, name, email, role
 *
 * Keeping user info in localStorage means we can populate the navbar
 * avatar/name without an extra API round-trip on every page load.
 * The trade-off is that if the user's name/role changes server-side,
 * they won't see it until they log out and back in. Acceptable for now.
 *
 * Role values coming from the backend: 'user' | 'company' | 'admin'
 * (defined in the User mongoose model).
 */
const Auth = {
    getToken() {
        return localStorage.getItem('internmanage_token');
    },

    getUser() {
        const user = localStorage.getItem('internmanage_user');
        // JSON.parse can throw if the stored value somehow got corrupted,
        // but in practice localStorage always returns what we put in.
        return user ? JSON.parse(user) : null;
    },

    /*
     * Called right after a successful login or register response.
     * We only store the fields we actually need client-side — no point
     * caching the full user object when the navbar just needs a name.
     */
    setAuth(data) {
        localStorage.setItem('internmanage_token', data.token);
        localStorage.setItem('internmanage_user', JSON.stringify({
            _id: data._id,
            name: data.name,
            email: data.email,
            role: data.role
        }));
    },

    logout() {
        localStorage.removeItem('internmanage_token');
        localStorage.removeItem('internmanage_user');
        updateAuthUI();              // flip navbar back to guest state immediately
        window.location.href = '/'; // then redirect to home
    },

    isLoggedIn() {
        // double-bang coerces null (not logged in) → false, string → true
        return !!this.getToken();
    }
};

/*
 * showToast(message, type)
 *
 * Pops a small notification at the corner of the screen. Creates the
 * container div on first call and reuses it for subsequent toasts so
 * they stack neatly without duplicating the wrapper.
 *
 * type: 'success' | 'error' | 'warning'
 *
 * Timing:
 *   3500ms visible → remove 'show' class (CSS fade-out transition) →
 *   400ms later actually remove the DOM node (matches transition duration
 *   in style.css so it's fully invisible before being deleted).
 *
 * requestAnimationFrame trick: adding .show in the same tick as
 * appendChild won't trigger the CSS transition. We need to let the
 * browser paint the element first, then add the class.
 */
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;

    container.appendChild(toast);

    // Must be in rAF so the transition actually fires (see note above)
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // wait for fade-out to finish
    }, 3500);
}

/*
 * updateAuthUI()
 *
 * Reads auth state from localStorage and swaps the navbar between
 * its two states:
 *   Guest: Login + Register buttons visible (.navbar-auth)
 *   User:  Avatar initial + name + Logout visible (.navbar-user)
 *
 * Called once on DOMContentLoaded and again after logout so the UI
 * updates immediately without a page reload.
 *
 * Guard clause at the top (`if (!authButtons || !userSection) return`)
 * is important because this runs on every page — pages like login.html
 * that don't have a full navbar would otherwise throw null ref errors.
 */
function updateAuthUI() {
    const authButtons = document.querySelector('.navbar-auth');
    const userSection = document.querySelector('.navbar-user');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!authButtons || !userSection) return;

    if (Auth.isLoggedIn()) {
        const user = Auth.getUser();
        authButtons.classList.add('hide');
        userSection.classList.add('show');

        const avatar = userSection.querySelector('.navbar-user-avatar');
        const name   = userSection.querySelector('.navbar-user-name');

        // Show first letter of name as avatar (e.g. "Niramay" → "N")
        if (avatar && user) avatar.textContent = user.name.charAt(0).toUpperCase();
        if (name   && user) name.textContent   = user.name;
    } else {
        authButtons.classList.remove('hide');
        userSection.classList.remove('show');
    }

    // Wire up logout only if the button exists on this page.
    // addEventListener is idempotent for the same listener function
    // but since we're using an arrow here it's a new ref each call —
    // fine since updateAuthUI only runs once per page in practice.
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
}

/*
 * initNavbarScroll()
 *
 * Adds a drop shadow to the fixed navbar once the user has scrolled
 * down a bit. The 20px threshold avoids the shadow flickering on and
 * off if the page is right at the top and the user scrolls by a pixel
 * or two. The actual styles are in style.css (.navbar.scrolled).
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        // toggle the class — CSS handles the visual transition
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
}

/*
 * initMobileMenu()
 *
 * Wires up the hamburger button and the slide-in nav panel for mobile.
 *
 * Three ways to close the menu:
 *   1. Tap the hamburger again
 *   2. Tap any link in the nav (so it doesn't hang open after navigation)
 *   3. Tap anywhere outside the nav panel
 *   4. Swipe right (>50px) on the panel itself — feels more native on iOS
 *
 * body overflow:hidden when open prevents the background from scrolling
 * while the menu is up, which is the expected behavior on mobile.
 *
 * stopPropagation on the toggle click is needed so the outside-click
 * handler (on document) doesn't immediately close the menu we just opened.
 */
function initMobileMenu() {
    const toggle = document.querySelector('.navbar-toggle');
    const nav    = document.querySelector('.navbar-nav');

    if (!toggle || !nav) return;

    function closeMenu() {
        toggle.classList.remove('open');
        nav.classList.remove('open');
        document.body.style.overflow = '';
    }

    function openMenu() {
        toggle.classList.add('open');
        nav.classList.add('open');
        document.body.style.overflow = 'hidden'; // lock background scroll
    }

    toggle.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent immediately triggering the outside-click handler
        toggle.classList.contains('open') ? closeMenu() : openMenu();
    });

    // Close when a nav link is tapped — without this the menu just sits
    // there after the page navigates away, which looks broken.
    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close on tap outside the nav panel
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('open') &&
            !nav.contains(e.target) &&
            !toggle.contains(e.target)) {
            closeMenu();
        }
    });

    /*
     * Swipe-right to close — tracks touch start X and compares at end.
     * 50px threshold feels right; too low and accidental scrolls dismiss
     * the menu, too high and intentional swipes get ignored.
     * passive:true tells the browser we won't call preventDefault so it
     * can optimise scrolling without waiting for our handler.
     */
    let touchStartX = 0;
    nav.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    nav.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        if (touchEndX > touchStartX + 50) closeMenu();
    }, { passive: true });
}

/*
 * setActiveNavLink()
 *
 * Highlights the nav link that matches the current page. We derive a
 * "key" from the last path segment so that /how-it-works and /how-it-works/
 * both match the <a href="/how-it-works"> link regardless of trailing slash.
 *
 * The active class is also set statically in the HTML on each page
 * as a fallback (avoids a visible flash before JS loads). This function
 * runs on top of that to keep things correct on any edge case.
 */
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks    = document.querySelectorAll('.navbar-nav a');

    // Strip trailing slash then take the last segment — e.g. "/how-it-works" → "how-it-works"
    const currentKey = currentPath === '/'
        ? '/'
        : currentPath.replace(/\/+$/, '').split('/').pop();

    navLinks.forEach(link => {
        link.classList.remove('active');
        const href    = link.getAttribute('href') || '';
        const hrefKey = href === '/' ? '/' : href.replace(/\/+$/, '').split('/').pop();

        if (href === currentPath || hrefKey === currentKey || (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        }
    });
}

/*
 * initScrollAnimations()
 *
 * Uses IntersectionObserver to trigger CSS animations when elements
 * scroll into view. Two classes are observed:
 *
 *   .animate-on-scroll   — element fades/slides in when visible
 *   .stagger-children    — each child gets an nth-child delay via CSS
 *                          so they cascade in one after another
 *
 * Observer options:
 *   threshold: 0.1   → fires when 10% of the element is visible
 *   rootMargin: -50px bottom → effectively fires 50px BEFORE the
 *               element fully enters, so the animation starts as it
 *               approaches rather than only after it's fully in view
 *
 * Once visible we unobserve — no need to keep watching elements that
 * have already animated. This also prevents re-triggering if the user
 * scrolls back up and down (intentional: animate only once).
 */
function initScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll, .stagger-children');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // fire once, then stop watching
                }
            });
        },
        {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        }
    );

    elements.forEach(el => observer.observe(el));
}

/*
 * initContactForm()
 *
 * Handles the contact form on contact.html. Early return if the
 * form doesn't exist — this function runs on every page so we need
 * to be defensive.
 *
 * Pattern used in all three form handlers:
 *   1. Disable button + show spinner to prevent double-submit
 *   2. Collect and trim field values
 *   3. POST to the API
 *   4. Show toast on success/fail
 *   5. Re-enable button in `finally` so it always comes back
 *      even if there's a network error
 */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn   = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
        submitBtn.disabled  = true;

        const data = {
            name:    form.querySelector('#contactName').value.trim(),
            email:   form.querySelector('#contactEmail').value.trim(),
            subject: form.querySelector('#contactSubject').value.trim(),
            message: form.querySelector('#contactMessage').value.trim(),
        };

        try {
            const res    = await fetch(`${API_BASE}/api/contact`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(data),
            });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Failed to send message');

            showToast("Message sent successfully! We'll get back to you soon.", 'success');
            form.reset();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            // always restore the button — even on network failure
            submitBtn.innerHTML = originalText;
            submitBtn.disabled  = false;
        }
    });
}

/*
 * initLoginForm()
 *
 * POST to /api/auth/login. On success the server returns the user
 * object with a JWT token — we pass that straight to Auth.setAuth()
 * to persist it. Then we show a welcome toast and redirect after a
 * 1s delay so the user actually sees the success message before the
 * page changes.
 *
 * Password is NOT trimmed — spaces are valid in passwords and trimming
 * would cause a mismatch if the user intentionally included them.
 */
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn    = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
        submitBtn.disabled  = true;

        const data = {
            email:    form.querySelector('#loginEmail').value.trim(),
            password: form.querySelector('#loginPassword').value, // intentionally no .trim()
        };

        try {
            const res    = await fetch(`${API_BASE}/api/auth/login`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(data),
            });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Login failed');

            Auth.setAuth(result);
            showToast(`Welcome back, ${result.name}!`, 'success');

            // Short delay so user sees the success toast before redirect
            setTimeout(() => { window.location.href = '/'; }, 1000);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled  = false;
        }
    });
}

/*
 * initRegisterForm()
 *
 * Register page has an extra piece of UI: a role selector (Student /
 * Company) that's a group of styled clickable cards, not a <select>.
 * We track the selected role in a closure variable and include it in
 * the POST body.
 *
 * Client-side validation done before hitting the API:
 *   - Passwords must match
 *   - Password must be ≥6 chars (mirrors the backend validator so
 *     we can give instant feedback without a round-trip)
 *
 * On success we redirect to /login (not /). The user needs to log in
 * explicitly — we don't auto-login after register because some flows
 * might require email verification in the future.
 */
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    /*
     * Role selector — clicking a .role-option card updates selectedRole.
     * Default is 'user' (student) which should be the most common case.
     * The role values here must match what the backend User model expects.
     */
    let selectedRole = 'user';
    const roleOptions = form.querySelectorAll('.role-option');
    roleOptions.forEach(option => {
        option.addEventListener('click', () => {
            roleOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedRole = option.dataset.role;
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn    = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';
        submitBtn.disabled  = true;

        const password        = form.querySelector('#registerPassword').value;
        const confirmPassword = form.querySelector('#registerConfirmPassword').value;

        // Validate before API call — saves a round-trip and gives faster feedback
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled  = false;
            return;
        }
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled  = false;
            return;
        }

        const data = {
            name:     form.querySelector('#registerName').value.trim(),
            email:    form.querySelector('#registerEmail').value.trim(),
            password: password,
            role:     selectedRole,
        };

        try {
            const res    = await fetch(`${API_BASE}/api/auth/register`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(data),
            });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Registration failed');

            showToast('Account created successfully! Please login.', 'success');

            // Give the toast 1.5s to read, then bounce to login
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled  = false;
        }
    });
}

/*
 * initPasswordToggles()
 *
 * Toggles input type between 'password' and 'text' for any input that
 * has a .password-toggle button as its immediate next sibling.
 *
 * The expected DOM structure in the HTML is:
 *   <input type="password" id="..." class="form-input">
 *   <button class="password-toggle">👁️</button>
 *
 * Emoji changes to signal state: 👁️ (hidden) → 🙈 (visible).
 * This is slightly backwards from convention but our designer liked it.
 */
function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling; // expects the <input> right before the button
            if (input.type === 'password') {
                input.type      = 'text';
                btn.textContent = '🙈';
            } else {
                input.type      = 'password';
                btn.textContent = '👁️';
            }
        });
    });
}

/*
 * initSmoothScroll()
 *
 * Intercepts clicks on in-page anchor links (href starting with "#")
 * and scrolls smoothly instead of jumping. Only applies to hash links
 * so regular page navigation isn't affected.
 *
 * Note: most modern browsers now support scroll-behavior: smooth in CSS
 * which would handle this automatically, but having it in JS gives us
 * better control and covers older browsers too.
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/*
 * animateCounters()
 *
 * Counts up any element with a `data-count` attribute when it enters
 * the viewport. Optionally reads `data-suffix` for units like "+" or "k".
 *
 * Example markup:
 *   <span data-count="500" data-suffix="+">500+</span>
 *
 * Algorithm:
 *   step  = ceil(target / 60) — roughly 60 increments to reach the target
 *   timer = setInterval every 20ms → ~60fps, total duration ~1.2s
 *
 *   When `current` overshoots `target` we clamp it and clear the timer.
 *   This handles cases where step doesn't divide evenly into target.
 *
 * threshold: 0.5 means the element needs to be half-visible before
 * the counter starts — looks better than firing at the first pixel.
 */
function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const el     = entry.target;
                const target = parseInt(el.dataset.count);
                const suffix = el.dataset.suffix || '';
                let current  = 0;
                const step   = Math.ceil(target / 60); // ~60 steps to complete

                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        current = target;       // clamp — step might overshoot
                        clearInterval(timer);
                    }
                    el.textContent = current + suffix;
                }, 20); // 20ms ≈ 60fps

                observer.unobserve(el); // run only once
            });
        },
        { threshold: 0.5 }
    );

    counters.forEach(el => observer.observe(el));
}

/*
 * DOMContentLoaded bootstrap — runs once, in order.
 *
 * Global inits come first (navbar, auth, animations) so the page
 * looks correct before any page-specific logic fires.
 *
 * The form inits are safe to call on every page — each one starts
 * with `if (!form) return` so they're no-ops on pages that don't
 * have those forms.
 */
document.addEventListener('DOMContentLoaded', () => {
    initNavbarScroll();
    initMobileMenu();
    setActiveNavLink();
    initScrollAnimations();
    initSmoothScroll();
    updateAuthUI();
    animateCounters();
    initPasswordToggles();

    // Page-specific — safe to call everywhere, each guards with an early return
    initContactForm();
    initLoginForm();
    initRegisterForm();
});
