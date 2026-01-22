
/* src/schema.js */

const SchemaBuilder = {
  container: null,
  svgLines: null,
  activeNode: null,
  offset: { x: 0, y: 0 },

  init() {
    this.container = document.getElementById('schema-container');
    this.svgLines  = document.getElementById('schema-lines');
    if (!this.container || !this.svgLines) return;

    this.bindEvents();
    this.ensureArrowMarker();          // optional arrowheads
    setTimeout(() => this.drawLines(), 100); // initial draw after layout
    window.addEventListener('resize', () => this.drawLines());
  },

  bindEvents() {
    const nodes = document.querySelectorAll('.schema-node');

    nodes.forEach(node => {
      // Ensure absolutely positioned nodes inside a relative container
      if (getComputedStyle(node).position !== 'absolute') {
        node.style.position = 'absolute';
      }

      // Mouse start
      node.addEventListener('mousedown', (e) => {
        this.activeNode = node;
        const rect = node.getBoundingClientRect();
        this.offset.x = e.clientX - rect.left;
        this.offset.y = e.clientY - rect.top;
        node.style.zIndex = 100;
      }, { passive: true });

      // Touch start
      node.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        this.activeNode = node;
        const rect = node.getBoundingClientRect();
        this.offset.x = t.clientX - rect.left;
        this.offset.y = t.clientY - rect.top;
        node.style.zIndex = 100;
      }, { passive: true });
    });

    const onMove = (e) => {
      if (!this.activeNode) return;
      e.preventDefault();

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const cRect = this.container.getBoundingClientRect();

      let newX = clientX - cRect.left - this.offset.x;
      let newY = clientY - cRect.top  - this.offset.y;

      // Clamp inside the container
      newX = Math.max(0, Math.min(newX, cRect.width  - this.activeNode.offsetWidth));
      newY = Math.max(0, Math.min(newY, cRect.height - this.activeNode.offsetHeight));

      // (Optional) Snap to grid:
      // const grid = 8;
      // newX = Math.round(newX / grid) * grid;
      // newY = Math.round(newY / grid) * grid;

      this.activeNode.style.left = `${newX}px`;
      this.activeNode.style.top  = `${newY}px`;

      this.drawLines();
    };

    document.addEventListener('mousemove', onMove, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });

    const endDrag = () => {
      if (this.activeNode) {
        this.activeNode.style.zIndex = '';
        this.activeNode = null;
      }
    };
    document.addEventListener('mouseup', endDrag, { passive: true });
    document.addEventListener('touchend', endDrag, { passive: true });
    document.addEventListener('touchcancel', endDrag, { passive: true });
  },

  drawLines() {
    const getCenter = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const c = this.container.getBoundingClientRect();
      return {
        x: (r.left - c.left) + r.width / 2,
        y: (r.top  - c.top)  + r.height / 2
      };
    };

    // Role-based selection (matches your HTML)
    const processEl = this.container.querySelector('.schema-node[data-role="process"]');
    const sources   = Array.from(this.container.querySelectorAll('.schema-node[data-role="source"]'));
    const tables    = Array.from(this.container.querySelectorAll('.schema-node[data-role="table"]'));

    const p = getCenter(processEl);
    if (!p) {
      this.svgLines.innerHTML = '';
      return;
    }

    const line = (a, b, color = '#cbd5e1') => {
      if (!a || !b) return '';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="2" stroke-opacity="0.6" marker-end="url(#arrow)" />`;
    };

    const out = [];

    // 1) All sources -> process
    sources.forEach(src => {
      const sc = getCenter(src);
      out.push(line(sc, p)); // src -> process
    });

    // 2) Process -> all tables  (this is the part you were missing)
    tables.forEach(tbl => {
      const tc = getCenter(tbl);
      out.push(line(p, tc)); // process -> table
    });

    this.svgLines.innerHTML = `<g>${out.join('')}</g>`;
  },

  // Optional arrow marker so lines have arrowheads
  ensureArrowMarker() {
    if (this.svgLines.querySelector('defs')) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('fill', '#cbd5e1');

    marker.appendChild(path);
    defs.appendChild(marker);
    this.svgLines.appendChild(defs);
  }
};

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide && lucide.createIcons) lucide.createIcons();
  SchemaBuilder.init();
});
