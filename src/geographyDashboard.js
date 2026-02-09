/* src/geographyDashboard.js - OPTIMIZED LEAFLET MAP */

const GeographyDashboard = (() => {
    // Private state
    let chart = null;
    let crossChart = null;
    let payerCharts = [];
    let data = null;
    let map = null;  // Leaflet map instance

    // Private constants
    const COLORS = {
        'Medicare': '#2C3B4D',
        'Commercial': '#9333ea',
        'Medicaid': '#06b6d4'
    };

    // Private helper functions
    function destroyCharts() {
        if (chart) chart.destroy();
        if (crossChart) crossChart.destroy();
        payerCharts.forEach(c => c.destroy());
        payerCharts = [];
    }

    // Render functions
    function renderInsight() {
        const el = document.getElementById('geo-insight-text');
        if (el && data.insight) el.innerHTML = data.insight;
    }

    function renderDistanceAnalysis() {
        const container = document.getElementById('geo-dist-list');
        if (!container || !data.marketAnalysis) return;

        container.innerHTML = data.marketAnalysis.distanceBands.map(band => `
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                        <span class="geo-legend-dot" style="background-color: ${band.color}"></span>
                        ${band.label}
                    </p>
                    <p class="text-xl font-bold text-slate-800 pl-4">${band.count} <span class="text-xs text-slate-400 font-normal">patients</span></p>
                </div>
                <div class="text-right">
                    <span class="text-lg font-bold text-slate-700">${band.pct}%</span>
                </div>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-1.5 mt-1 pl-4 ml-4" style="width: calc(100% - 1rem)">
                <div class="h-1.5 rounded-full" style="width: ${band.pct}%; background-color: ${band.color}"></div>
            </div>
        `).join('');
    }

    function renderPayerMix() {
        const container = document.getElementById('payer-mix-container');
        if (!container || !data.payerMix) return;

        container.innerHTML = data.payerMix.map((payer, index) => `
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm payer-card flex flex-col justify-between">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="font-bold text-lg" style="color: ${payer.color}">${payer.type}</h4>
                        <p class="text-sm text-slate-500">${payer.pct}% of total volume</p>
                    </div>
                    <div class="h-12 w-12 relative">
                        <canvas id="payer-donut-${index}"></canvas>
                    </div>
                </div>
                <div class="mb-6">
                    <div class="flex justify-between items-end mb-2">
                        <span class="text-3xl font-bold text-slate-800">${payer.volume}</span>
                        <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded mb-1">${payer.trend}</span>
                    </div>
                    <p class="text-xs text-slate-400">Avg Reimbursement: <strong class="text-slate-600">${payer.reimbursement}</strong></p>
                </div>
                <div class="border-t border-slate-100 pt-4 mt-auto">
                    <p class="text-[10px] uppercase font-bold text-slate-400 mb-2">Top Payers</p>
                    <div class="flex flex-wrap gap-2">
                        ${payer.topPayers.map(tp => 
                            `<span class="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">${tp}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        // Create donut charts
        data.payerMix.forEach((payer, index) => {
            const ctx = document.getElementById(`payer-donut-${index}`);
            if (!ctx) return;

            const payerChart = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [payer.pct, 100 - payer.pct],
                        backgroundColor: [payer.color, '#f1f5f9'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    events: []
                }
            });
            payerCharts.push(payerChart);
        });
    }

    function renderCrossAnalysis() {
        const d = data.crossAnalysis;
        if (!d) return;

        const ctx = document.getElementById('geoCrossChart');
        if (ctx) {
            if (crossChart) crossChart.destroy();
            
            crossChart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: d.byDistance,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true, grid: { display: false } },
                        y: { stacked: true, max: 100, grid: { borderDash: [2, 4] } }
                    },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        const tbody = document.getElementById('geo-county-body');
        if (tbody && d.topCounties) {
            tbody.innerHTML = d.topCounties.map(row => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 font-medium text-slate-800">${row.county}</td>
                    <td class="px-6 py-4 text-right font-mono text-slate-600">${row.volume}</td>
                    <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600">${row.primaryPayer}</span></td>
                </tr>
            `).join('');
            if (window.lucide) lucide.createIcons();
        }
    }

    function renderFacilityMarker(point) {
        if (!map || !point.lat || !point.lng) return;

        const size = point.volume === 'High' ? 24 : 18;
        
        // Create custom icon
        const facilityIcon = L.divIcon({
            className: 'custom-facility-marker',
            html: `
                <div style="
                    width: ${size}px;
                    height: ${size}px;
                    background-color: #2563eb;
                    border: 3px solid white;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4), 0 0 0 4px rgba(37, 99, 235, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: white;
                    font-size: ${size * 0.6}px;
                    cursor: pointer;
                ">H</div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });

        // Create marker
        const marker = L.marker([point.lat, point.lng], {
            icon: facilityIcon,
            pane: 'facilities'
        }).addTo(map);

        // Add tooltip
        marker.bindTooltip(`
            <div style="padding: 4px 8px;">
                <strong style="display: block; margin-bottom: 4px;">${point.label}</strong>
                <span style="font-size: 11px; color: #64748b;">Volume: ${point.volume}</span><br>
                <span style="font-size: 10px; color: #2563eb; font-weight: bold;">Facility</span>
            </div>
        `, {
            permanent: false,
            direction: 'top',
            offset: [0, -10],
            className: 'custom-tooltip'
        });
    }

    function renderPatientCluster(point) {
        if (!map || !point.lat || !point.lng) return;

        const color = COLORS[point.payor] || '#cbd5e1';
        const radius = point.density === 'High' ? 30 : (point.density === 'Medium' ? 22 : 14);

        // Create circle marker
        const circle = L.circle([point.lat, point.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.35,
            weight: 3,
            radius: radius * 40,  // Convert to meters (approximate)
            pane: 'clusters'
        }).addTo(map);

        // Add center dot
        const centerDot = L.circleMarker([point.lat, point.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 1,
            weight: 0,
            radius: 4,
            pane: 'clusters'
        }).addTo(map);

        // Add tooltip to circle
        circle.bindTooltip(`
            <div style="padding: 4px 8px;">
                <strong style="display: block; margin-bottom: 4px;">Patient Hotspot</strong>
                <span style="font-size: 11px; color: #64748b;">Payor: ${point.payor}</span><br>
                <span style="font-size: 11px; color: #64748b;">Density: ${point.density}</span><br>
                <span style="font-size: 10px; color: #94a3b8;">Radius: ${point.radius}m</span>
            </div>
        `, {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip'
        });
    }

    function addCustomControls() {
        if (!map) return;

        // Hook up existing HTML buttons to Leaflet controls
        const zoomInBtn = document.querySelector('[data-lucide="plus"]')?.closest('button');
        const zoomOutBtn = document.querySelector('[data-lucide="minus"]')?.closest('button');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => map.zoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => map.zoomOut());
        }
    }

    function addMapLegend() {
        if (!map) return;

        const legend = L.control({ position: 'bottomleft' });

        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'map-legend');
            div.style.cssText = `
                background: rgba(255, 255, 255, 0.95);
                padding: 12px 16px;
                border-radius: 8px;
                border: 1px solid #cbd5e1;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                font-size: 13px;
                line-height: 1.8;
            `;

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div style="width: 14px; height: 14px; background: #2563eb; border: 2px solid white; border-radius: 2px;"></div>
                    <span style="font-weight: 600; color: #1e293b;">Facility</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 14px; height: 14px; background: #cbd5e1; opacity: 0.5; border: 2px solid #64748b; border-radius: 50%;"></div>
                    <span style="font-weight: 600; color: #1e293b;">Patient Cluster</span>
                </div>
            `;

            return div;
        };

        legend.addTo(map);
    }

    function initMap() {
        const container = document.getElementById('geoMap');
        if (!container || !data.mapData) return;

        // Clear existing content
        container.innerHTML = '';
        
        // Destroy existing map instance if present
        if (map) {
            map.remove();
            map = null;
        }

        // Show loading indicator
        container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8fafc;"><div style="text-align: center;"><div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px;"></div><p style="color: #64748b; font-size: 14px;">Loading map...</p></div></div>';

        // Initialize map after slight delay to allow UI to update
        setTimeout(() => {
            // Initialize Leaflet map centered on Detroit metro area
            map = L.map('geoMap', {
                center: [42.4, -83.15],
                zoom: 9.5,
                zoomControl: false,
                scrollWheelZoom: true,
                preferCanvas: true,  // Use canvas for better performance
                fadeAnimation: false,  // Disable fade for faster load
                zoomAnimation: true,
                markerZoomAnimation: false
            });

            // Use faster tile provider with better caching
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 18,
                updateWhenIdle: true,  // Only update tiles when map stops moving
                updateWhenZooming: false,  // Don't update during zoom
                keepBuffer: 2  // Keep tiles in memory for faster pan
            }).addTo(map);

            // Create custom pane for patient clusters (renders below facilities)
            map.createPane('clusters');
            map.getPane('clusters').style.zIndex = 400;

            // Create custom pane for facilities (renders on top)
            map.createPane('facilities');
            map.getPane('facilities').style.zIndex = 450;

            // Render map elements
            data.mapData.forEach(point => {
                if (point.type === 'facility') {
                    renderFacilityMarker(point);
                } else if (point.type === 'patient_cluster') {
                    renderPatientCluster(point);
                }
            });

            // Add custom zoom controls
            addCustomControls();
            
            // Add legend
            addMapLegend();

            // Force initial render
            map.invalidateSize();
        }, 50);
    }

    // Public API
    return {
        init(dashboardData) {
            if (!dashboardData || !dashboardData.geographyDashboard) return;
            
            data = dashboardData.geographyDashboard;
            destroyCharts();
            
            renderInsight();
            renderDistanceAnalysis();
            renderPayerMix();
            renderCrossAnalysis();
            initMap();
        },

        destroy() {
            destroyCharts();
            if (map) {
                map.remove();
                map = null;
            }
            data = null;
        }
    };
})();