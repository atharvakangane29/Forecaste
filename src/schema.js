/* src/schema.js */

const SchemaBuilder = {
    container: null,
    svgLines: null,
    activeNode: null,
    offset: { x: 0, y: 0 },

    init() {
        this.container = document.getElementById('schema-container');
        this.svgLines = document.getElementById('schema-lines');
        
        if (!this.container || !this.svgLines) return;

        this.bindEvents();
        setTimeout(() => this.drawLines(), 100); 
    },

    bindEvents() {
        const nodes = document.querySelectorAll('.schema-node');

        nodes.forEach(node => {
            node.addEventListener('mousedown', (e) => {
                this.activeNode = node;
                const rect = node.getBoundingClientRect();
                this.offset.x = e.clientX - rect.left;
                this.offset.y = e.clientY - rect.top;
                node.style.zIndex = 100;
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (this.activeNode) {
                e.preventDefault();
                const cRect = this.container.getBoundingClientRect();
                
                let newX = e.clientX - cRect.left - this.offset.x;
                let newY = e.clientY - cRect.top - this.offset.y;
                
                newX = Math.max(0, Math.min(newX, cRect.width - this.activeNode.offsetWidth));
                newY = Math.max(0, Math.min(newY, cRect.height - this.activeNode.offsetHeight));

                this.activeNode.style.left = `${newX}px`;
                this.activeNode.style.top = `${newY}px`;
                
                this.drawLines();
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.activeNode) {
                this.activeNode.style.zIndex = '';
                this.activeNode = null;
            }
        });
    },

    drawLines() {
        const getCenter = (id) => {
            const el = document.getElementById(id);
            if (!el) return { x: 0, y: 0 };
            
            const r = el.getBoundingClientRect();
            const c = this.container.getBoundingClientRect();
            return { 
                x: (r.left - c.left) + r.width/2, 
                y: (r.top - c.top) + r.height/2 
            };
        };

        const n1 = getCenter('node-1');
        const n2 = getCenter('node-2');
        const n3 = getCenter('node-3');
        const n4 = getCenter('node-4');

        const createLine = (start, end) => 
            `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#cbd5e1" stroke-width="2" stroke-opacity="0.5" />`;

        // Connect: Source -> Process -> Table 1 & Table 2
        this.svgLines.innerHTML = createLine(n1, n2) + createLine(n2, n3) + createLine(n2, n4);
    }
};