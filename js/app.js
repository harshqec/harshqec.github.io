/**
 * app.js - Robust SPA Router
 * Intercepts navigation to prevent browser jumps and handles clean section switching.
 */

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('nav ul li a, .footer-links a');
    const sections = document.querySelectorAll('.page-section');

    function initHeroFragmentAssemble() {
        const heroImage = document.querySelector('.hero-image');
        const photo = document.querySelector('.hero-photo-fallback');
        if (!heroImage || !photo) return;

        let isAnimating = false;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            photo.classList.add('fragment-revealed');
            return;
        }

        const runAssemble = () => {
            if (isAnimating) return;
            isAnimating = true;

            const renderWidth = Math.floor(photo.clientWidth);
            const renderHeight = Math.floor(photo.clientHeight);
            if (!renderWidth || !renderHeight) {
                photo.classList.add('fragment-revealed');
                isAnimating = false;
                return;
            }

            const photoRect = photo.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const canvas = document.createElement('canvas');
            canvas.className = 'hero-fragment-canvas';
            canvas.width = Math.floor(viewportWidth * dpr);
            canvas.height = Math.floor(viewportHeight * dpr);
            canvas.style.width = `${viewportWidth}px`;
            canvas.style.height = `${viewportHeight}px`;
            document.body.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                canvas.remove();
                photo.classList.add('fragment-revealed');
                isAnimating = false;
                return;
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            photo.classList.add('fragment-hidden');
            photo.classList.remove('fragment-revealed');

            // If 3D model is active, hide it during animation for a cleaner look
            const was3D = heroImage.classList.contains('has-3d');
            if (was3D) {
                heroImage.classList.remove('has-3d');
            }

            const cols = 60;
            const rows = 32;
            const pieceWidth = renderWidth / cols;
            const pieceHeight = renderHeight / rows;
            const sourcePieceWidth = photo.naturalWidth / cols;
            const sourcePieceHeight = photo.naturalHeight / rows;

            const randomStartPoint = () => {
                const mode = Math.random();
                if (mode < 0.72) {
                    const edge = Math.floor(Math.random() * 4);
                    if (edge === 0) return { x: -80 - Math.random() * 320, y: Math.random() * viewportHeight };
                    if (edge === 1) return { x: viewportWidth + 80 + Math.random() * 320, y: Math.random() * viewportHeight };
                    if (edge === 2) return { x: Math.random() * viewportWidth, y: -80 - Math.random() * 260 };
                    return { x: Math.random() * viewportWidth, y: viewportHeight + 80 + Math.random() * 260 };
                }
                return {
                    x: -0.2 * viewportWidth + Math.random() * viewportWidth * 1.4,
                    y: -0.2 * viewportHeight + Math.random() * viewportHeight * 1.4,
                };
            };

            const pieces = [];
            for (let row = 0; row < rows; row += 1) {
                for (let col = 0; col < cols; col += 1) {
                    const tx = photoRect.left + col * pieceWidth;
                    const ty = photoRect.top + row * pieceHeight;
                    const start = randomStartPoint();
                    pieces.push({
                        sx: start.x, sy: start.y, tx, ty,
                        imgX: col * sourcePieceWidth, imgY: row * sourcePieceHeight,
                        delay: Math.random() * 0.3,
                    });
                }
            }

            const durationMs = 2800;
            const startedAt = performance.now();
            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

            const animate = (now) => {
                const elapsed = now - startedAt;
                const progress = Math.min(1, elapsed / durationMs);

                ctx.clearRect(0, 0, viewportWidth, viewportHeight);

                pieces.forEach((piece) => {
                    const localProgress = Math.max(0, Math.min(1, (progress - piece.delay) / (1 - piece.delay)));
                    const eased = easeOutCubic(localProgress);
                    const x = piece.sx + (piece.tx - piece.sx) * eased;
                    const y = piece.sy + (piece.ty - piece.sy) * eased;

                    ctx.globalAlpha = 0.08 + 0.92 * localProgress;
                    ctx.drawImage(photo, piece.imgX, piece.imgY, sourcePieceWidth, sourcePieceHeight, x, y, pieceWidth, pieceHeight);
                });

                if (progress < 1) {
                    window.requestAnimationFrame(animate);
                    return;
                }

                ctx.clearRect(0, 0, viewportWidth, viewportHeight);
                photo.classList.remove('fragment-hidden');
                photo.classList.add('fragment-revealed');
                if (was3D) {
                    // Slight delay before bringing back 3D for smoothness
                    setTimeout(() => heroImage.classList.add('has-3d'), 400);
                }
                canvas.remove();
                isAnimating = false;
            };

            window.requestAnimationFrame(animate);
        };

        // Run once on load
        if (photo.complete) {
            runAssemble();
        } else {
            photo.addEventListener('load', runAssemble, { once: true });
            photo.addEventListener('error', () => photo.classList.add('fragment-revealed'), { once: true });
        }



        // Global trigger for flexibility
        window.addEventListener('trigger-hero-fragmentation', () => {
            if (!isAnimating) runAssemble();
        });
    }

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

    function initJourneySequence() {
        const journeyTrack = document.getElementById('journey-track');
        const canvas = document.getElementById('journey-canvas');

        if (!journeyTrack || !canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const totalFrames = 120;
        const frames = Array.from({ length: totalFrames }, (_, index) => {
            const frame = String(index + 1).padStart(3, '0');
            return `pictures/part1/ezgif-frame-${frame}.jpg`;
        });

        const images = new Array(totalFrames);
        let currentFrame = 0;
        let tickScheduled = false;

        function drawCoverImage(image) {
            if (!image || !image.naturalWidth || !image.naturalHeight) return;

            const canvasWidth = canvas.clientWidth;
            const canvasHeight = canvas.clientHeight;
            const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
            const drawWidth = image.naturalWidth * scale;
            const drawHeight = image.naturalHeight * scale;
            const dx = (canvasWidth - drawWidth) / 2;
            const dy = (canvasHeight - drawHeight) / 2;

            context.clearRect(0, 0, canvasWidth, canvasHeight);
            context.drawImage(image, dx, dy, drawWidth, drawHeight);
        }

        function resizeCanvas() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawCoverImage(images[currentFrame] || images[0]);
        }

        function syncToScroll() {
            tickScheduled = false;

            const rect = journeyTrack.getBoundingClientRect();
            const totalTravel = rect.height - window.innerHeight;
            const traveled = Math.min(Math.max(-rect.top, 0), Math.max(totalTravel, 0));
            const progress = totalTravel > 0 ? traveled / totalTravel : 0;

            const nextFrame = Math.min(totalFrames - 1, Math.max(0, Math.round(progress * (totalFrames - 1))));
            const image = images[nextFrame] || images[currentFrame] || images[0];
            if (image) {
                drawCoverImage(image);
                currentFrame = nextFrame;
            }
        }

        function requestSync() {
            if (tickScheduled) return;
            tickScheduled = true;
            window.requestAnimationFrame(syncToScroll);
        }

        frames.forEach((src, index) => {
            const image = new Image();
            image.src = src;
            image.onload = () => {
                if (index === 0) {
                    resizeCanvas();
                    syncToScroll();
                }
                if (index === currentFrame) {
                    requestSync();
                }
            };
            images[index] = image;
        });

        window.addEventListener('resize', () => {
            resizeCanvas();
            requestSync();
        });
        window.addEventListener('scroll', requestSync, { passive: true });

        resizeCanvas();
        syncToScroll();
    }

    initJourneySequence();

    // --- Lightbox Logic ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    let galleryImages = [];
    let currentIndex = 0;

    if (lightbox && lightboxImg && closeBtn && prevBtn && nextBtn) {
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
                if (!container) return;

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
    }

    // Initial Load
    const initialHash = window.location.hash.substring(1) || 'about';
    switchPage(initialHash);
    initHeroFragmentAssemble();
});
