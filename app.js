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

    // --- Lightbox Logic ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    let galleryImages = [];
    let currentIndex = 0;

    function openLightbox(index, images) {
        galleryImages = images;
        currentIndex = index;
        lightboxImg.src = galleryImages[currentIndex];
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeLightbox() {
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
        lightboxImg.src = ''; // Clear src
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % galleryImages.length;
        lightboxImg.src = galleryImages[currentIndex];
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        lightboxImg.src = galleryImages[currentIndex];
    }

    // Event listener for gallery clicks (delegated)
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.lightbox-trigger');
        if (trigger) {
            e.preventDefault();
            // Find all triggers in the same gallery container
            const container = trigger.closest('.gallery-grid');
            const siblingTriggers = Array.from(container.querySelectorAll('.lightbox-trigger'));
            const images = siblingTriggers.map(t => t.getAttribute('href'));
            const index = siblingTriggers.indexOf(trigger);
            
            openLightbox(index, images);
        }
    });

    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    
    // Close on backdrop click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox.getAttribute('aria-hidden') === 'false') {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') showNext();
            if (e.key === 'ArrowLeft') showPrev();
        }
    });

    // Initial Load
    const initialHash = window.location.hash.substring(1) || 'about';
    switchPage(initialHash);
});
