/* ═══════════════════════════════════════════════════════════════════
   InternManage — Shared JavaScript
   ═══════════════════════════════════════════════════════════════════ */

// ── API Base URL ────────────────────────────────────────────────────
const API_BASE = '';  // Same origin

// ── Auth State Management ───────────────────────────────────────────
const Auth = {
    getToken() {
        return localStorage.getItem('internmanage_token');
    },

    getUser() {
        const user = localStorage.getItem('internmanage_user');
        return user ? JSON.parse(user) : null;
    },

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
        updateAuthUI();
        window.location.href = '/';
    },

    isLoggedIn() {
        return !!this.getToken();
    }
};

// ── Toast Notifications ────────────────────────────────────────────
function showToast(message, type = 'success') {
    // Create container if it doesn't exist
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

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ── Update Auth UI (Navbar) ────────────────────────────────────────
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
        const name = userSection.querySelector('.navbar-user-name');

        if (avatar && user) {
            avatar.textContent = user.name.charAt(0).toUpperCase();
        }
        if (name && user) {
            name.textContent = user.name;
        }
    } else {
        authButtons.classList.remove('hide');
        userSection.classList.remove('show');
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
}

// ── Navbar Scroll Effect ───────────────────────────────────────────
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ── Mobile Menu Toggle ─────────────────────────────────────────────
function initMobileMenu() {
    const toggle = document.querySelector('.navbar-toggle');
    const nav = document.querySelector('.navbar-nav');

    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('open');
        nav.classList.toggle('open');
    });

    // Close on nav link click
    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('open');
            nav.classList.remove('open');
        });
    });
}

// ── Active Nav Link ────────────────────────────────────────────────
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav a');

    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        }
    });
}

// ── Scroll Animations (Intersection Observer) ─────────────────────
function initScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll, .stagger-children');

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
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

// ── Contact Form Handler ───────────────────────────────────────────
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
        submitBtn.disabled = true;

        const data = {
            name: form.querySelector('#contactName').value.trim(),
            email: form.querySelector('#contactEmail').value.trim(),
            subject: form.querySelector('#contactSubject').value.trim(),
            message: form.querySelector('#contactMessage').value.trim(),
        };

        try {
            const res = await fetch(`${API_BASE}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Failed to send message');
            }

            showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
            form.reset();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ── Login Form Handler ─────────────────────────────────────────────
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
        submitBtn.disabled = true;

        const data = {
            email: form.querySelector('#loginEmail').value.trim(),
            password: form.querySelector('#loginPassword').value,
        };

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Login failed');
            }

            Auth.setAuth(result);
            showToast(`Welcome back, ${result.name}!`, 'success');

            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ── Register Form Handler ──────────────────────────────────────────
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    // Role selector
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

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';
        submitBtn.disabled = true;

        const password = form.querySelector('#registerPassword').value;
        const confirmPassword = form.querySelector('#registerConfirmPassword').value;

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }

        const data = {
            name: form.querySelector('#registerName').value.trim(),
            email: form.querySelector('#registerEmail').value.trim(),
            password: password,
            role: selectedRole,
        };

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Registration failed');
            }

            showToast('Account created successfully! Please login.', 'success');

            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ── Password Visibility Toggle ─────────────────────────────────────
function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });
    });
}

// ── Smooth scroll for anchor links ─────────────────────────────────
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

// ── Counter Animation ──────────────────────────────────────────────
function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.count);
                    const suffix = el.dataset.suffix || '';
                    let current = 0;
                    const step = Math.ceil(target / 60);
                    const timer = setInterval(() => {
                        current += step;
                        if (current >= target) {
                            current = target;
                            clearInterval(timer);
                        }
                        el.textContent = current + suffix;
                    }, 20);
                    observer.unobserve(el);
                }
            });
        },
        { threshold: 0.5 }
    );

    counters.forEach(el => observer.observe(el));
}

// ── Initialize Everything ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initNavbarScroll();
    initMobileMenu();
    setActiveNavLink();
    initScrollAnimations();
    initSmoothScroll();
    updateAuthUI();
    animateCounters();
    initPasswordToggles();

    // Page-specific initializations
    initContactForm();
    initLoginForm();
    initRegisterForm();
});
