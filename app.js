/**
 * app.js - Robust SPA Router
 * Intercepts navigation to prevent browser jumps and handles clean section switching.
 */

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('nav ul li a, .footer-links a');
    const sections = document.querySelectorAll('.page-section');

    /**
     * core switching logic
     */
    function switchPage(targetId) {
        console.log('Switching to:', targetId);
        
        let actualTarget = targetId;
        let targetSection = document.getElementById(actualTarget);
        if (!targetSection) {
            actualTarget = 'about';
            targetSection = document.getElementById('about');
        }

        // 1. Hide all sections via class
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // 2. Show the target section via class
        targetSection.classList.add('active');

        // 3. Update Navigation State
        navLinks.forEach(link => {
            link.classList.remove('nav-active');
            const href = link.getAttribute('href');
            if (href === `#${targetId}`) {
                link.classList.add('nav-active');
            }
        });

        // 4. Always scroll to top for "New Page" feeling
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    /**
     * Intercept all internal navigation clicks
     */
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Only intercept internal hash links that belong to our sections
        if (href && href.startsWith('#')) {
            const targetId = href.substring(1);
            const targetEl = document.getElementById(targetId);

            // If it's one of our page sections
            if (targetEl && targetEl.classList.contains('page-section')) {
                e.preventDefault();
                
                // Update URL hash without browser jump
                history.pushState(null, null, href);
                
                switchPage(targetId);
            }
        }
    });

    /**
     * Handle browser Back/Forward buttons
     */
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.substring(1) || 'about';
        switchPage(hash);
    });

    // Form Submission Handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const status = document.getElementById('form-status');
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const data = new FormData(contactForm);

            status.textContent = "Sending message...";
            status.style.color = "var(--text-secondary)";
            submitBtn.disabled = true;

            fetch(contactForm.action, {
                method: contactForm.method,
                body: data,
                headers: {
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    status.textContent = "Message sent successfully!";
                    status.style.color = "green";
                    contactForm.reset();
                } else {
                    response.json().then(data => {
                        if (Object.hasOwn(data, 'errors')) {
                            status.textContent = data.errors.map(error => error.message).join(", ");
                        } else {
                            status.textContent = "Oops! There was a problem submitting your form.";
                        }
                        status.style.color = "red";
                    });
                }
            }).catch(error => {
                status.textContent = "Oops! There was a problem submitting your form.";
                status.style.color = "red";
            }).finally(() => {
                submitBtn.disabled = false;
            });
        });
    }

    // Initial Load
    const initialHash = window.location.hash.substring(1) || 'about';
    switchPage(initialHash);
});
