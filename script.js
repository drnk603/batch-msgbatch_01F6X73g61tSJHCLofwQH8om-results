(function() {
    'use strict';

    if (window.__modernApp) return;
    window.__modernApp = { initialized: false };

    const STATE = {
        menuOpen: false,
        formSubmitting: false,
        activeFilter: 'all'
    };

    const VALIDATORS = {
        name: /^[a-zA-ZÀ-ÿ\s-']{2,50}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\d+\-()\[\]\s]{10,20}$/,
        message: /^.{10,1000}$/
    };

    const ERROR_MESSAGES = {
        name: 'Bitte geben Sie einen gültigen Namen ein (2-50 Zeichen, nur Buchstaben)',
        email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
        phone: 'Bitte geben Sie eine gültige Telefonnummer ein (10-20 Zeichen)',
        message: 'Nachricht muss mindestens 10 Zeichen lang sein',
        privacy: 'Bitte akzeptieren Sie die Datenschutzbestimmungen',
        required: 'Dieses Feld ist erforderlich'
    };

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    class BurgerMenu {
        constructor() {
            this.toggle = document.querySelector('.navbar-toggler');
            this.menu = document.querySelector('.navbar-collapse');
            this.nav = document.querySelector('.navbar');
            this.links = document.querySelectorAll('.nav-link');
            
            if (!this.toggle || !this.menu) return;
            
            this.init();
        }

        init() {
            this.toggle.addEventListener('click', () => this.toggleMenu());
            this.links.forEach(link => {
                link.addEventListener('click', () => this.closeMenu());
            });
            document.addEventListener('click', (e) => this.handleOutsideClick(e));
            document.addEventListener('keydown', (e) => this.handleEscape(e));
            window.addEventListener('resize', debounce(() => this.handleResize(), 250));
        }

        toggleMenu() {
            STATE.menuOpen = !STATE.menuOpen;
            
            if (STATE.menuOpen) {
                this.openMenu();
            } else {
                this.closeMenu();
            }
        }

        openMenu() {
            this.menu.classList.add('show');
            this.toggle.setAttribute('aria-expanded', 'true');
            document.body.classList.add('u-no-scroll');
            
            const header = document.querySelector('.l-header');
            if (header) {
                const headerHeight = header.offsetHeight;
                this.menu.style.height = `calc(100vh - ${headerHeight}px)`;
            }
        }

        closeMenu() {
            STATE.menuOpen = false;
            this.menu.classList.remove('show');
            this.toggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('u-no-scroll');
            this.menu.style.height = '';
        }

        handleOutsideClick(e) {
            if (STATE.menuOpen && this.nav && !this.nav.contains(e.target)) {
                this.closeMenu();
            }
        }

        handleEscape(e) {
            if (e.key === 'Escape' && STATE.menuOpen) {
                this.closeMenu();
            }
        }

        handleResize() {
            if (window.innerWidth >= 768 && STATE.menuOpen) {
                this.closeMenu();
            }
        }
    }

    class FormValidator {
        constructor(form) {
            this.form = form;
            this.fields = {};
            this.init();
        }

        init() {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            
            const inputs = this.form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                this.fields[input.id] = input;
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', debounce(() => this.clearError(input), 300));
            });
        }

        validateField(field) {
            const value = field.value.trim();
            const type = field.type;
            const required = field.hasAttribute('required');
            
            if (required && !value) {
                this.showError(field, ERROR_MESSAGES.required);
                return false;
            }

            if (!value && !required) return true;

            if (field.id.includes('Name') || field.id.includes('firstName') || field.id.includes('lastName')) {
                if (!VALIDATORS.name.test(value)) {
                    this.showError(field, ERROR_MESSAGES.name);
                    return false;
                }
            }

            if (type === 'email' || field.id.includes('email')) {
                if (!VALIDATORS.email.test(value)) {
                    this.showError(field, ERROR_MESSAGES.email);
                    return false;
                }
            }

            if (type === 'tel' || field.id.includes('phone')) {
                if (value && !VALIDATORS.phone.test(value)) {
                    this.showError(field, ERROR_MESSAGES.phone);
                    return false;
                }
            }

            if (field.tagName === 'TEXTAREA' && field.id.includes('message')) {
                if (!VALIDATORS.message.test(value)) {
                    this.showError(field, ERROR_MESSAGES.message);
                    return false;
                }
            }

            if (type === 'checkbox' && required && !field.checked) {
                this.showError(field, ERROR_MESSAGES.privacy);
                return false;
            }

            this.clearError(field);
            return true;
        }

        showError(field, message) {
            field.classList.add('is-invalid');
            
            let feedback = field.parentElement.querySelector('.invalid-feedback');
            if (!feedback) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                field.parentElement.appendChild(feedback);
            }
            feedback.textContent = message;
            feedback.style.display = 'block';
        }

        clearError(field) {
            field.classList.remove('is-invalid');
            const feedback = field.parentElement.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.style.display = 'none';
            }
        }

        validateForm() {
            let isValid = true;
            
            Object.values(this.fields).forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });

            return isValid;
        }

        async handleSubmit(e) {
            e.preventDefault();
            
            if (STATE.formSubmitting) return;
            
            if (!this.validateForm()) {
                this.showNotification('Bitte korrigieren Sie die Fehler im Formular', 'error');
                return;
            }

            const submitBtn = this.form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            STATE.formSubmitting = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Wird gesendet...';

            try {
                await this.simulateSubmit();
                this.showNotification('Nachricht erfolgreich gesendet!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'thank_you.html';
                }, 1500);
                
            } catch (error) {
                this.showNotification('Verbindungsfehler. Bitte versuchen Sie es später erneut.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            } finally {
                STATE.formSubmitting = false;
            }
        }

        simulateSubmit() {
            return new Promise((resolve) => {
                setTimeout(resolve, 1500);
            });
        }

        showNotification(message, type) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
            alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
            `;
            
            document.body.appendChild(alert);
            
            setTimeout(() => {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 300);
            }, 5000);
        }
    }

    class ScrollAnimations {
        constructor() {
            this.elements = document.querySelectorAll('[data-aos]');
            this.observer = null;
            this.init();
        }

        init() {
            if (!this.elements.length) return;

            const options = {
                root: null,
                rootMargin: '0px 0px -100px 0px',
                threshold: 0.1
            };

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('aos-animate');
                    }
                });
            }, options);

            this.elements.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = this.getTransform(el);
                el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                this.observer.observe(el);
            });
        }

        getTransform(el) {
            const animation = el.getAttribute('data-aos');
            switch (animation) {
                case 'fade-up': return 'translateY(30px)';
                case 'fade-down': return 'translateY(-30px)';
                case 'fade-left': return 'translateX(-30px)';
                case 'fade-right': return 'translateX(30px)';
                case 'zoom-in': return 'scale(0.9)';
                default: return 'none';
            }
        }
    }

    class ImageAnimations {
        constructor() {
            this.images = document.querySelectorAll('img');
            this.init();
        }

        init() {
            this.images.forEach((img, index) => {
                if (!img.hasAttribute('loading') && !img.closest('.navbar-brand')) {
                    img.setAttribute('loading', 'lazy');
                }

                img.style.opacity = '0';
                img.style.transform = 'scale(0.95)';
                img.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            setTimeout(() => {
                                entry.target.style.opacity = '1';
                                entry.target.style.transform = 'scale(1)';
                            }, index * 50);
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1 });

                observer.observe(img);

                img.addEventListener('error', function() {
                    this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%239ca3af" font-size="14"%3EBild nicht verfügbar%3C/text%3E%3C/svg%3E';
                });
            });
        }
    }

    class RippleEffect {
        constructor() {
            this.elements = document.querySelectorAll('.btn, .card, .nav-link');
            this.init();
        }

        init() {
            this.elements.forEach(element => {
                element.style.position = 'relative';
                element.style.overflow = 'hidden';

                element.addEventListener('click', (e) => {
                    const ripple = document.createElement('span');
                    const rect = element.getBoundingClientRect();
                    const size = Math.max(rect.width, rect.height);
                    const x = e.clientX - rect.left - size / 2;
                    const y = e.clientY - rect.top - size / 2;

                    ripple.style.cssText = `
                        position: absolute;
                        width: ${size}px;
                        height: ${size}px;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.5);
                        left: ${x}px;
                        top: ${y}px;
                        pointer-events: none;
                        animation: ripple-animation 0.6s ease-out;
                    `;

                    element.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 600);
                });
            });

            const style = document.createElement('style');
            style.textContent = `
                @keyframes ripple-animation {
                    from {
                        transform: scale(0);
                        opacity: 1;
                    }
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    class SmoothScroll {
        constructor() {
            this.links = document.querySelectorAll('a[href^="#"]');
            this.init();
        }

        init() {
            this.links.forEach(link => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (href === '#' || href === '#!') return;

                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        const header = document.querySelector('.l-header');
                        const offset = header ? header.offsetHeight : 80;
                        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;

                        window.scrollTo({
                            top: top,
                            behavior: 'smooth'
                        });
                    }
                });
            });
        }
    }

    class ScrollSpy {
        constructor() {
            this.sections = document.querySelectorAll('section[id]');
            this.navLinks = document.querySelectorAll('.nav-link');
            this.init();
        }

        init() {
            if (!this.sections.length) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.updateActiveLink(entry.target.id);
                    }
                });
            }, {
                rootMargin: '-20% 0px -80% 0px'
            });

            this.sections.forEach(section => observer.observe(section));
        }

        updateActiveLink(id) {
            this.navLinks.forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');

                if (link.getAttribute('href') === `#${id}` || link.getAttribute('href') === `/#${id}`) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                }
            });
        }
    }

    class CountUpAnimation {
        constructor() {
            this.counters = document.querySelectorAll('[data-count]');
            this.init();
        }

        init() {
            this.counters.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-count'));
                const duration = 2000;
                const start = 0;
                const increment = target / (duration / 16);

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.animate(counter, start, target, increment);
                            observer.unobserve(counter);
                        }
                    });
                }, { threshold: 0.5 });

                observer.observe(counter);
            });
        }

        animate(element, current, target, increment) {
            if (current < target) {
                element.textContent = Math.ceil(current);
                requestAnimationFrame(() => {
                    this.animate(element, current + increment, target, increment);
                });
            } else {
                element.textContent = target;
            }
        }
    }

    class PortfolioFilter {
        constructor() {
            this.filterButtons = document.querySelectorAll('[data-filter]');
            this.items = document.querySelectorAll('[data-category]');
            this.init();
        }

        init() {
            if (!this.filterButtons.length) return;

            this.filterButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const filter = button.getAttribute('data-filter');
                    this.filter(filter);
                    this.updateActiveButton(button);
                });
            });
        }

        filter(category) {
            this.items.forEach(item => {
                const itemCategory = item.getAttribute('data-category');
                
                if (category === 'all' || itemCategory === category) {
                    item.style.display = 'block';
                    item.style.animation = 'fadeIn 0.6s ease-in-out';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        updateActiveButton(activeButton) {
            this.filterButtons.forEach(button => {
                button.classList.remove('btn-primary');
                button.classList.add('btn-outline-primary');
            });
            activeButton.classList.remove('btn-outline-primary');
            activeButton.classList.add('btn-primary');
        }
    }

    class ScrollToTop {
        constructor() {
            this.button = this.createButton();
            this.init();
        }

        createButton() {
            const button = document.createElement('button');
            button.innerHTML = '↑';
            button.className = 'scroll-to-top';
            button.setAttribute('aria-label', 'Nach oben scrollen');
            button.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: var(--color-primary);
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease-in-out;
                z-index: 999;
                box-shadow: var(--shadow-lg);
            `;
            document.body.appendChild(button);
            return button;
        }

        init() {
            window.addEventListener('scroll', throttle(() => {
                if (window.pageYOffset > 300) {
                    this.button.style.opacity = '1';
                    this.button.style.visibility = 'visible';
                } else {
                    this.button.style.opacity = '0';
                    this.button.style.visibility = 'hidden';
                }
            }, 200));

            this.button.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });

            this.button.addEventListener('mouseenter', () => {
                this.button.style.transform = 'scale(1.1)';
            });

            this.button.addEventListener('mouseleave', () => {
                this.button.style.transform = 'scale(1)';
            });
        }
    }

    function init() {
        if (window.__modernApp.initialized) return;

        new BurgerMenu();
        new ScrollAnimations();
        new ImageAnimations();
        new RippleEffect();
        new SmoothScroll();
        new ScrollSpy();
        new CountUpAnimation();
        new PortfolioFilter();
        new ScrollToTop();

        const forms = document.querySelectorAll('form');
        forms.forEach(form => new FormValidator(form));

        window.__modernApp.initialized = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();