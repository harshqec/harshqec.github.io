/* quantum-bg.js */
const canvas = document.getElementById('quantum-bg');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

let mouseX = -1000;
let mouseY = -1000;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

window.addEventListener('mouseout', () => {
    mouseX = -1000;
    mouseY = -1000;
});

const symbols = ['|0⟩', '|1⟩', '|ψ⟩', '|+⟩', '|-⟩', '|Φ⟩', 'H', 'X', 'Y', 'Z', '√X'];

class QuantumBlock {
    constructor() {
        this.reset(true);
    }

    reset(randomHeight = false) {
        this.x = Math.random() * width;
        this.y = randomHeight ? Math.random() * height : height + 50;
        this.z = Math.random() * 0.7 + 0.3; // scale/depth
        this.speedY = -(Math.random() * 0.5 + 0.2) * this.z;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.type = Math.random() < 0.2 ? 'grid' : 'symbol'; // 20% chance for 3x3 grid
        this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
        this.size = this.type === 'grid' ? Math.random() * 20 + 80 : Math.random() * 30 + 40;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.01;
    }

    update(allBlocks) {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotSpeed;
        
        // Anti-overlap repulsion
        for (let other of allBlocks) {
            if (other === this) continue;
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = (this.size + other.size) * 0.75 * this.z;
            
            if (dist < minDist && dist > 0) {
                const force = (minDist - dist) / dist * 0.05;
                this.x += dx * force;
                this.y += dy * force;
            }
        }

        if (this.y < -150 || this.x < -150 || this.x > width + 150) {
            this.reset();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.z, this.z);
        
        const s = this.size;

        if (this.type === 'grid') {
            const step = s / 3;
            const start = -s / 2 + step / 2;
            
            // Edges
            ctx.strokeStyle = `rgba(0, 0, 0, ${this.opacity * 0.8})`;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                // Horizontal
                ctx.beginPath();
                ctx.moveTo(start, start + i * step);
                ctx.lineTo(start + 2 * step, start + i * step);
                ctx.stroke();
                // Vertical
                ctx.beginPath();
                ctx.moveTo(start + i * step, start);
                ctx.lineTo(start + i * step, start + 2 * step);
                ctx.stroke();
            }

            // Vertices
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const vx = start + i * step;
                    const vy = start + j * step;
                    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity + 0.5})`;
                    ctx.strokeStyle = `rgba(0, 0, 0, ${this.opacity})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(vx, vy, step / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Plus states in corners
                    if ((i === 0 && j === 0) || (i === 2 && j === 2)) {
                        ctx.fillStyle = `rgba(0, 0, 0, ${this.opacity + 0.5})`;
                        ctx.font = `600 ${step / 4}px Inter, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('|+⟩', vx, vy);
                    }
                }
            }
        } else {
            // Draw symbol only - no square boundary
            const textLen = this.symbol.length;
            const fontSize = textLen >= 4 ? s * 0.21 : (textLen > 1 ? s * 0.35 : s * 0.45);

            ctx.fillStyle = `rgba(67, 56, 202, ${this.opacity + 0.3})`;
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.symbol, 0, 0);
        }
        
        ctx.restore();
    }
}

const blocks = [];
const numBlocks = Math.floor((window.innerWidth * window.innerHeight) / 25000); // responsive count

for (let i = 0; i < numBlocks; i++) {
    blocks.push(new QuantumBlock());
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Draw entanglement threads based on cursor proximity
    ctx.lineWidth = 1;
    for (let i = 0; i < blocks.length; i++) {
        const b1 = blocks[i];
        const dxMouse = b1.x - mouseX;
        const dyMouse = b1.y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        
        if (distMouse < 240) {
            // Thread from cursor to node
            const alpha = 1 - (distMouse / 240);
            ctx.strokeStyle = `rgba(67, 56, 202, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(b1.x, b1.y);
            ctx.stroke();

            // Thread between nodes mutually near the cursor
            for (let j = i + 1; j < blocks.length; j++) {
                const b2 = blocks[j];
                const dx2 = b2.x - mouseX;
                const dy2 = b2.y - mouseY;
                const distMouse2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                
                if (distMouse2 < 240) {
                    const dxb = b1.x - b2.x;
                    const dyb = b1.y - b2.y;
                    const distBlocks = Math.sqrt(dxb * dxb + dyb * dyb);
                    
                    if (distBlocks < 200) {
                        const alphaBlock = 1 - (distBlocks / 200);
                        const combinedAlpha = Math.min(alpha, 1 - (distMouse2 / 240)) * alphaBlock * 0.8;
                        ctx.strokeStyle = `rgba(139, 92, 246, ${combinedAlpha})`; // Purplish connection
                        ctx.beginPath();
                        ctx.moveTo(b1.x, b1.y);
                        ctx.lineTo(b2.x, b2.y);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    blocks.forEach(block => {
        block.update(blocks);
        block.draw(ctx);
    });

    requestAnimationFrame(animate);
}

animate();
