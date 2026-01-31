/* src/schema.js */

// Connection Map: Source of Truth for all node relationships
const schemaConnections = [
  // Sources → Process
  { from: 'source-emr', to: 'process' },
  { from: 'source-registry', to: 'process' },
  { from: 'source-referrals', to: 'process' },
  
  // Process → Fact Table
  { from: 'process', to: 'table-fact-patients' },
  
  // Star Schema: Dimension tables → Fact Table (creating the star pattern)
  { from: 'table-dim-diagnosis', to: 'table-fact-patients' },
  { from: 'table-hcp', to: 'table-fact-patients' }
  // Note: Add demographic info connection if it has an ID
  // { from: 'table-demographic', to: 'table-fact-patients' }
];

const SchemaBuilder = {
  container: null,
  svgLines: null,
  activeNode: null,
  offset: { x: 0, y: 0 },
  snapToGrid: true,
  gridSize: 20,

  init() {
    this.container = document.getElementById('schema-container');
    this.svgLines  = document.getElementById('schema-lines');
    if (!this.container || !this.svgLines) return;

    this.bindEvents();
    this.ensureArrowMarker();              // Optional arrowheads
    
    // Delay layout until container has proper dimensions
    setTimeout(() => {
      this.initializeLayout();             // Auto-position nodes
      this.drawLines();                    // Draw connections
    }, 150);
    
    window.addEventListener('resize', () => {
      this.initializeLayout();             // Recalculate layout on resize
      this.drawLines();
    });
  },

  /**
   * Auto-Layout System: Star Schema Pattern
   * - Sources on left (vertical stack)
   * - Process in center
   * - Fact table at top-right
   * - Dimension tables below fact table (creating star pattern)
   */
  initializeLayout() {
    const containerRect = this.container.getBoundingClientRect();
    
    // Ensure container has dimensions
    if (containerRect.width === 0 || containerRect.height === 0) {
      console.warn('Container has no dimensions yet, retrying...');
      setTimeout(() => this.initializeLayout(), 100);
      return;
    }
    
    const cWidth = containerRect.width;
    const cHeight = containerRect.height;
    
    console.log('Container dimensions:', cWidth, 'x', cHeight);
    
    // Get all nodes and ensure absolute positioning
    const nodes = document.querySelectorAll('.schema-node');
    nodes.forEach(node => {
      if (getComputedStyle(node).position !== 'absolute') {
        node.style.position = 'absolute';
      }
    });
    
    // Get specific nodes by ID
    const sourceEmr = document.getElementById('source-emr');
    const sourceRegistry = document.getElementById('source-registry');
    const sourceReferrals = document.getElementById('source-referrals');
    const process = document.getElementById('process');
    const factPatients = document.getElementById('table-fact-patients');
    const dimDiagnosis = document.getElementById('table-dim-diagnosis');
    const hcpData = document.getElementById('table-hcp');
    
    // Get the demographic info table (might have duplicate ID or be 4th table)
    const allTables = Array.from(document.querySelectorAll('[data-role="table"]'));
    const demographicInfo = allTables.find(t => 
      t.textContent.includes('Demographic') || t.classList.contains('table-danger')
    );
    
    // === LEFT COLUMN: SOURCES (vertical stack) ===
    if (sourceEmr) {
      sourceEmr.style.left = '50px';
      sourceEmr.style.top = '110px';
    }
    if (sourceRegistry) {
      sourceRegistry.style.left = '50px';
      sourceRegistry.style.top = '215px';
    }
    if (sourceReferrals) {
      sourceReferrals.style.left = '50px';
      sourceReferrals.style.top = '320px';
    }
    
    // === CENTER: PROCESS NODE ===
    if (process) {
      const processLeft = (cWidth / 2) - 96; // Center with ~192px width
      process.style.left = `${processLeft}px`;
      process.style.top = '195px';
    }
    
    // === RIGHT SIDE: STAR SCHEMA ===
    
    // Fact table at TOP-RIGHT (hub of the star)
    if (factPatients) {
      factPatients.style.left = `${cWidth - 220}px`;
      factPatients.style.top = '80px';
    }
    
    // Dimension tables BELOW fact table
    // Position them in a row to create the star pattern
    if (dimDiagnosis) {
      dimDiagnosis.style.left = `${cWidth - 390}px`; // Left position
      dimDiagnosis.style.top = '230px';
    }
    
    if (hcpData) {
      hcpData.style.left = `${cWidth - 220}px`; // Center-right position
      hcpData.style.top = '230px';
    }
    
    // Demographic info at BOTTOM-RIGHT
    if (demographicInfo) {
      demographicInfo.style.left = `${cWidth - 220}px`;
      demographicInfo.style.top = '365px';
    }
    
    console.log('Layout initialized with star schema pattern');
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

      // Snap to grid for organized layout
      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
      }

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

  /**
   * Calculate center point of an element relative to container
   */
  getCenter(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = this.container.getBoundingClientRect();
    return {
      x: (r.left - c.left) + r.width / 2,
      y: (r.top  - c.top)  + r.height / 2
    };
  },

  /**
   * Refactored drawLines: Uses schemaConnections configuration
   */
  drawLines() {
    const lines = [];

    // Iterate through the connection map
    schemaConnections.forEach(conn => {
      const fromEl = document.getElementById(conn.from);
      const toEl = document.getElementById(conn.to);

      // Skip if either element doesn't exist (graceful failure)
      if (!fromEl || !toEl) return;

      const fromCenter = this.getCenter(fromEl);
      const toCenter = this.getCenter(toEl);

      // Skip if we couldn't calculate centers
      if (!fromCenter || !toCenter) return;

      // Create SVG line
      const line = `<line 
        x1="${fromCenter.x}" 
        y1="${fromCenter.y}" 
        x2="${toCenter.x}" 
        y2="${toCenter.y}" 
        stroke="#cbd5e1" 
        stroke-width="2" 
        stroke-opacity="0.6" 
        marker-end="url(#arrow)" 
      />`;

      lines.push(line);
    });

    // Update SVG with all lines
    this.svgLines.innerHTML = `<g>${lines.join('')}</g>`;
    
    // Re-ensure arrow marker after innerHTML update
    this.ensureArrowMarker();
  },

  /**
   * Optional arrow marker for line endpoints
   */
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