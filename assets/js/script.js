/**
 * script.js — Particle System & UI Logic
 * Shared across all pages via #particle-canvas
 */

// ============================================================
//  MOBILE NAV DRAWER
// ============================================================
function initMobileNav() {
    const toggle   = document.getElementById('nav-toggle');
    const drawer   = document.getElementById('nav-drawer');
    const backdrop = document.getElementById('nav-backdrop');
    if (!toggle || !drawer || !backdrop) return;

    function openDrawer() {
        drawer.classList.add('open');
        backdrop.classList.add('visible');
        backdrop.style.pointerEvents = 'auto';
        toggle.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        drawer.classList.remove('open');
        backdrop.classList.remove('visible');
        backdrop.style.pointerEvents = 'none';
        toggle.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Start with backdrop non-interactive
    backdrop.style.pointerEvents = 'none';

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });

    backdrop.addEventListener('click', closeDrawer);

    // Close on drawer link click (let page transition handle navigation)
    drawer.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', closeDrawer);
    });
}

// ============================================================
//  PAGE TRANSITION
// ============================================================
function initPageTransition() {
    const overlay = document.getElementById('page-transition');
    if (!overlay) return;

    const panels = overlay.querySelectorAll('.pt-panel');

    // ── PAGE LOAD: panels start scaleY(1) then animate to scaleY(0) ──
    // 1. Instantly set all panels to scaleY(1) with no transition
    panels.forEach(p => {
        p.style.transition = 'none';
        p.style.transform  = 'scaleY(1)';
        p.style.transformOrigin = 'top';
    });

    // 2. Force reflow so browser registers the scaleY(1) state
    overlay.getBoundingClientRect();

    // 3. Re-enable transition and animate to scaleY(0) — panels retract downward
    panels.forEach((p, i) => {
        p.style.transition = `transform 0.55s cubic-bezier(0.76, 0, 0.24, 1) ${i * 70}ms`;
        p.style.transform  = 'scaleY(0)';
    });

    // ── LINK CLICK: panels animate from scaleY(0) to scaleY(1) upward ──
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

        link.addEventListener('click', e => {
            e.preventDefault();
            const target = link.href;

            // Reset to scaleY(0) instantly, origin bottom
            panels.forEach(p => {
                p.style.transition = 'none';
                p.style.transform  = 'scaleY(0)';
                p.style.transformOrigin = 'bottom';
            });

            // Force reflow
            overlay.getBoundingClientRect();

            // Animate to scaleY(1) — panels rise from bottom
            panels.forEach((p, i) => {
                p.style.transition = `transform 0.5s cubic-bezier(0.76, 0, 0.24, 1) ${i * 60}ms`;
                p.style.transform  = 'scaleY(1)';
            });

            // Navigate after animation completes (500ms + last delay 180ms + buffer)
            setTimeout(() => {
                window.location.href = target;
            }, 750);
        });
    });
}

// ============================================================
//  PARTICLE BACKGROUND
// ============================================================
class ParticleBackground {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) return;

        this.ctx    = this.canvas.getContext('2d');
        this.W      = 0;
        this.H      = 0;
        this.particles = [];
        this.mouse  = { x: -9999, y: -9999 };
        this.RAF    = null;

        this._resize  = this.resize.bind(this);
        this._onMouse = this.onMouse.bind(this);

        this.init();
    }

    /* ---- setup ---- */
    init() {
        this.resize();
        this.buildParticles();
        this.animate();
        window.addEventListener('resize',    this._resize);
        window.addEventListener('mousemove', this._onMouse);
    }

    resize() {
        this.W = this.canvas.width  = window.innerWidth;
        this.H = this.canvas.height = window.innerHeight;
        this.buildParticles();
    }

    onMouse(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    /* ---- particles ---- */
    buildParticles() {
        const count = Math.min(Math.floor((this.W * this.H) / 8000), 140);
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(this.makeParticle());
        }
    }

    makeParticle(fromBottom = false) {
        const colors = ['30,215,96', '0,180,216', '120,80,255'];
        return {
            x:     Math.random() * this.W,
            y:     fromBottom ? this.H + 5 : Math.random() * this.H,
            vx:    (Math.random() - 0.5) * 0.5,
            vy:    (Math.random() - 0.5) * 0.5,
            r:     Math.random() * 1.8 + 0.4,
            alpha: Math.random() * 0.5 + 0.2,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.015 + 0.008,
            color: colors[Math.floor(Math.random() * colors.length)],
        };
    }

    /* ---- draw ---- */
    drawBackground() {
        const { ctx, W, H } = this;
        const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.85);
        grad.addColorStop(0, '#181818');
        grad.addColorStop(1, '#0c0c0c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    drawMouseGlow() {
        const { ctx, W, H, mouse } = this;
        const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
        mg.addColorStop(0, 'rgba(30,215,96,0.05)');
        mg.addColorStop(1, 'transparent');
        ctx.fillStyle = mg;
        ctx.fillRect(0, 0, W, H);
    }

    drawConnections() {
        const { ctx, particles } = this;
        const MAX = 130;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx   = particles[i].x - particles[j].x;
                const dy   = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX) {
                    const op = (1 - dist / MAX) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(30,215,96,${op})`;
                    ctx.lineWidth   = 0.6;
                    ctx.stroke();
                }
            }
        }
    }

    updateAndDrawParticles() {
        const { ctx, particles, mouse, W, H } = this;
        const REPEL_DIST = 100;
        const REPEL_STR  = 2.5;

        particles.forEach(p => {
            // Pulse alpha
            p.pulse += p.pulseSpeed;
            p.alpha  = 0.15 + Math.abs(Math.sin(p.pulse)) * 0.55;

            // Mouse repel
            const dx   = p.x - mouse.x;
            const dy   = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < REPEL_DIST && dist > 0) {
                const force = (REPEL_DIST - dist) / REPEL_DIST;
                p.vx += (dx / dist) * force * REPEL_STR * 0.05;
                p.vy += (dy / dist) * force * REPEL_STR * 0.05;
            }

            // Dampen velocity
            p.vx *= 0.98;
            p.vy *= 0.98;

            // Clamp speed
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 1.5) { p.vx = (p.vx / speed) * 1.5; p.vy = (p.vy / speed) * 1.5; }

            p.x += p.vx;
            p.y += p.vy;

            // Wrap edges
            if (p.x < -5)     p.x = W + 5;
            if (p.x > W + 5)  p.x = -5;
            if (p.y < -5)     p.y = H + 5;
            if (p.y > H + 5)  p.y = -5;

            // Draw
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
            ctx.fill();
        });
    }

    /* ---- loop ---- */
    animate() {
        this.drawBackground();
        this.drawMouseGlow();
        this.drawConnections();
        this.updateAndDrawParticles();
        this.RAF = requestAnimationFrame(() => this.animate());
    }
}

// ============================================================
//  TYPING EFFECT
// ============================================================
function initTyping() {
    const el = document.getElementById('typing-text');
    if (!el) return;

    const lines = [
        'Informatics Engineering Student — USTI.',
        'Network & Frontend Enthusiast.',
        'Turning ideas into clean, functional code.',
    ];

    let lineIdx = 0, charIdx = 0, deleting = false;

    function tick() {
        const current = lines[lineIdx];

        if (!deleting) {
            el.textContent = current.slice(0, ++charIdx);
            if (charIdx === current.length) {
                deleting = true;
                setTimeout(tick, 1800);
                return;
            }
            setTimeout(tick, 50);
        } else {
            el.textContent = current.slice(0, --charIdx);
            if (charIdx === 0) {
                deleting  = false;
                lineIdx   = (lineIdx + 1) % lines.length;
                setTimeout(tick, 400);
                return;
            }
            setTimeout(tick, 28);
        }
    }

    tick();
}

// ============================================================
//  ABOUT PAGE — particle canvas + skill bars
// ============================================================
function initAboutPage() {
    const canvas = document.getElementById('about-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    });

    const GREEN = '30, 215, 96';
    const BLUE  = '0, 180, 216';
    let mouse = { x: W / 2, y: H / 2 };
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

    class Particle {
        constructor() { this.reset(true); }
        reset(init = false) {
            this.x  = Math.random() * W;
            this.y  = init ? Math.random() * H : H + 10;
            this.r  = Math.random() * 2 + 0.5;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = -(Math.random() * 0.6 + 0.2);
            this.alpha = Math.random() * 0.5 + 0.2;
            this.color = Math.random() > 0.5 ? GREEN : BLUE;
            this.pulse = Math.random() * Math.PI * 2;
            this.pulseSpeed = Math.random() * 0.02 + 0.01;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            this.pulse += this.pulseSpeed;
            this.alpha = 0.2 + Math.abs(Math.sin(this.pulse)) * 0.5;
            if (this.y < -10) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
            ctx.fill();
        }
    }

    const particles = Array.from({ length: 90 }, () => new Particle());

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${GREEN}, ${(1 - dist / 120) * 0.15})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.8);
        grad.addColorStop(0, '#181818'); grad.addColorStop(1, '#0d0d0d');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

        const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 200);
        mg.addColorStop(0, `rgba(${GREEN}, 0.04)`); mg.addColorStop(1, 'transparent');
        ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);

        drawConnections();
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }
    animate();

    // Skill bars
    setTimeout(() => {
        document.querySelectorAll('.skill-per').forEach(per => {
            per.style.width = per.getAttribute('data-width') + '%';
        });
    }, 600);
}
document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initPageTransition();
    new ParticleBackground();
    initAboutPage();
    initTyping();
});
