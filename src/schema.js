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
        // Initial draw after layout settles
        setTimeout(() => this.drawLines(), 100); 
    },

    bindEvents() {
        const nodes = document.querySelectorAll('.schema-node');

        // Mouse Down (Start Drag)
        nodes.forEach(node => {
            node.addEventListener('mousedown', (e) => {
                this.activeNode = node;
                const rect = node.getBoundingClientRect();
                this.offset.x = e.clientX - rect.left;
                this.offset.y = e.clientY - rect.top;
                
                // Visual feedback
                node.style.zIndex = 100;
            });
        });

        // Mouse Move (Dragging)
        document.addEventListener('mousemove', (e) => {
            if (this.activeNode) {
                e.preventDefault();
                const cRect = this.container.getBoundingClientRect();
                
                // Calculate new position relative to container
                let newX = e.clientX - cRect.left - this.offset.x;
                let newY = e.clientY - cRect.top - this.offset.y;
                
                // Boundary checks (optional but good for UX)
                newX = Math.max(0, Math.min(newX, cRect.width - this.activeNode.offsetWidth));
                newY = Math.max(0, Math.min(newY, cRect.height - this.activeNode.offsetHeight));

                this.activeNode.style.left = `${newX}px`;
                this.activeNode.style.top = `${newY}px`;
                
                this.drawLines();
            }
        });

        // Mouse Up (End Drag)
        document.addEventListener('mouseup', () => {
            if (this.activeNode) {
                this.activeNode.style.zIndex = ''; // Reset z-index
                this.activeNode = null;
            }
        });
    },

    // Draw SVG lines between specific nodes
    drawLines() {
        // Helper to get center point of an element relative to container
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

        // Create SVG line string
        const createLine = (start, end) => 
            `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#475569" stroke-width="2" />`;

        // Connect: Source -> Process -> Table
        this.svgLines.innerHTML = createLine(n1, n2) + createLine(n2, n3);
    }
};