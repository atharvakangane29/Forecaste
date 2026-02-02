/* src/geographyDashboard.js */

const GeographyDashboard = {
    chart: null,
    data: null,
    activeFilter: 'all',

    // Define colors mapped to Payor Groups
    colors: {
        'Medicare': '#2C3B4D',   // Blue Fantastic
        'Commercial': '#FFB162', // Burning Flame
        'Medicaid': '#A35139'    // Truffle Trouble
    },

    init(data) {
        if (!data || !data.geographyDashboard) return;
        this.data = data.geographyDashboard;

        this.renderInsight();
        this.initMap();
        this.bindEvents();
    },

    renderInsight() {
        const el = document.getElementById('geo-insight-text');
        if (el) el.innerHTML = this.data.insight;
    },

    bindEvents() {
        const buttons = document.querySelectorAll('#geo-filters button');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update UI classes
                buttons.forEach(b => {
                    b.className = 'px-3 py-1 text-xs font-bold rounded text-slate-500 hover:bg-slate-50 transition-all';
                });
                e.target.className = 'px-3 py-1 text-xs font-bold rounded bg-slate-800 text-white shadow-sm transition-all';

                // Update Filter State
                this.activeFilter = e.target.dataset.filter;
                this.updateMap();
            });
        });
    },

    initMap() {
        const ctx = document.getElementById('geoMapChart');
        if (!ctx) return;

        this.chart = new Chart(ctx.getContext('2d'), {
            type: 'bubble',
            data: { datasets: [] }, // Populated in updateMap
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(27, 38, 50, 0.9)',
                        padding: 12,
                        callbacks: {
                            label: (ctx) => {
                                const raw = ctx.raw;
                                return `${raw.label} (${raw.payor})`;
                            },
                            afterLabel: (ctx) => `Dist: ${ctx.raw.distance} | Vol: ${ctx.raw.r * 10}`
                        }
                    }
                },
                scales: {
                    x: { 
                        display: false, // Hide axes to look like a map
                        min: 0, max: 100 
                    },
                    y: { 
                        display: false, 
                        min: 0, max: 100 
                    }
                },
                layout: { padding: 20 }
            }
        });

        this.updateMap();
    },

    updateMap() {
        if (!this.chart || !this.data) return;

        // 1. Filter Data
        const filteredPoints = this.activeFilter === 'all' 
            ? this.data.mapData 
            : this.data.mapData.filter(p => p.distance === this.activeFilter);

        // 2. Group by Payor to create datasets (for coloring)
        const groups = {};
        
        filteredPoints.forEach(pt => {
            if (!groups[pt.payor]) {
                groups[pt.payor] = {
                    label: pt.payor,
                    data: [],
                    backgroundColor: this.colors[pt.payor] || '#ccc',
                    borderColor: '#fff',
                    borderWidth: 2
                };
            }
            groups[pt.payor].data.push(pt);
        });

        // 3. Update Chart
        this.chart.data.datasets = Object.values(groups);
        this.chart.update();
    }
};