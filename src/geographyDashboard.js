/* src/geographyDashboard.js - ULTRA-OPTIMIZED WITH FALLBACK TO STATIC MAP */

const GeographyDashboard = (() => {
    // Private state
    let chart = null;
    let crossChart = null;
    let payerCharts = [];
    let data = null;
    let map = null;  // Leaflet map instance
    let mapLoadTimeout = null;
    const MAP_LOAD_TIMEOUT_MS = 3000; // 3 seconds max wait

    // Private constants
    const COLORS = {
        'Medicare': '#2C3B4D',
        'Commercial': '#FFB162',
        'Medicaid': '#A35139'
    };

    // chart.register(ChartDataLabels);

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
                        <h4 class="font-bold text-lg" style="color: ${COLORS[payer.type] || payer.color}">${payer.type}</h4>
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
                        backgroundColor: [COLORS[payer.type] || payer.color, '#EEE9DF'],
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
    
    // Chart.register(ChartDataLabels);

    function renderCrossAnalysis() {
        const d = data.crossAnalysis;
        if (!d) return;

        const ctx = document.getElementById('geoCrossChart');
        if (ctx) {
            if (crossChart) crossChart.destroy();
            
            // Update dataset colors to use legacy COLORS
            const updatedData = {
                ...d.byDistance,
                datasets: d.byDistance.datasets.map(ds => ({
                    ...ds,
                    backgroundColor: COLORS[ds.label] || ds.backgroundColor
                }))
            };
            
            crossChart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: updatedData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true, grid: { display: false } },
                        y: { stacked: true, max: 100, grid: { borderDash: [2, 4] } }
                    },
                    plugins: {
                        legend: { position: 'bottom' },
                        datalabels: {
                            anchor: 'center',
                            align: 'center',
                            formatter: function(value) {
                                return value + '%';
                            },
                            color: '#ffffff',
                            font: {
                                weight: 'bold',
                                size: 11
                            }
                        }
                    }
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

    // Coordinate conversion for static map overlay
    const MAP_BOUNDS = {
        minLat: 42.20,
        maxLat: 42.60,
        minLng: -83.40,
        maxLng: -82.90
    };

    function latLngToPixel(lat, lng, width, height) {
        const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
        const y = height - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;
        return { x, y };
    }

    function createSVGElement(tag, attrs = {}) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
        return el;
    }

    function ensureContainerSized() {
        const container = document.getElementById('geoMap');
        if (!container) return;

        // Force proper sizing - critical for Leaflet
        container.style.display = 'block';
        container.style.width = '100%';
        container.style.height = '500px';
        container.style.minHeight = '500px';
        container.style.position = 'relative';
    }

    function renderStaticMap() {
        const container = document.getElementById('geoMap');
        if (!container || !data.mapData) return;

        console.log('Rendering static map fallback');
        
        ensureContainerSized();
        
        container.innerHTML = '';
        container.style.borderRadius = '12px';
        container.style.overflow = 'hidden';
        container.style.backgroundColor = '#EEE9DF';

        // Static map image
        const mapImg = document.createElement('img');
        mapImg.src = 'https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-83.15,42.4,9.5,0/900x500@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
        mapImg.style.width = '100%';
        mapImg.style.height = '100%';
        mapImg.style.objectFit = 'cover';
        mapImg.alt = 'Detroit Metro Area';
        mapImg.onload = () => renderStaticOverlay();
        container.appendChild(mapImg);
    }

    function renderStaticOverlay() {
        const container = document.getElementById('geoMap');
        if (!container) return;

        const svg = createSVGElement('svg', {
            viewBox: '0 0 900 500',
            width: '100%',
            height: '100%'
        });
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';

        const g = createSVGElement('g');
        g.style.pointerEvents = 'auto';

        // Render markers
        data.mapData.forEach(point => {
            const { x, y } = latLngToPixel(point.lat, point.lng, 900, 500);

            if (point.type === 'facility') {
                const size = point.volume === 'High' ? 16 : 12;
                
                // Glow
                g.appendChild(createSVGElement('rect', {
                    x: x - size/2 - 2, y: y - size/2 - 2,
                    width: size + 4, height: size + 4,
                    fill: '#2C3B4D', opacity: 0.2, rx: 2
                }));

                // Main
                g.appendChild(createSVGElement('rect', {
                    x: x - size/2, y: y - size/2,
                    width: size, height: size,
                    fill: '#2C3B4D', stroke: 'white', 'stroke-width': 3, rx: 2
                }));

                // Label
                const text = createSVGElement('text', {
                    x, y: y + 4, 'text-anchor': 'middle',
                    fill: 'white', 'font-size': size * 0.7, 'font-weight': 'bold'
                });
                text.textContent = 'H';
                text.style.pointerEvents = 'none';
                g.appendChild(text);

            } else if (point.type === 'patient_cluster') {
                const color = COLORS[point.payor] || '#cd5454';
                const radius = point.density === 'High' ? 30 : (point.density === 'Medium' ? 22 : 14);

                // Outer glow
                g.appendChild(createSVGElement('circle', {
                    cx: x, cy: y, r: radius + 4,
                    fill: color, 'fill-opacity': 0.15
                }));

                // Main circle
                g.appendChild(createSVGElement('circle', {
                    cx: x, cy: y, r: radius,
                    fill: color, 'fill-opacity': 0.35,
                    stroke: color, 'stroke-width': 3
                }));

                // Center dot
                g.appendChild(createSVGElement('circle', {
                    cx: x, cy: y, r: 4, fill: color
                }));
            }
        });

        svg.appendChild(g);

        // Add legend
        const legendG = createSVGElement('g');
        legendG.appendChild(createSVGElement('rect', {
            x: 30, y: 440, width: 350, height: 45,
            fill: 'white', opacity: 0.95, rx: 8,
            stroke: '#cbd5e1', 'stroke-width': 1
        }));

        // Facility
        legendG.appendChild(createSVGElement('rect', {
            x: 60, y: 455, width: 14, height: 14,
            fill: '#2C3B4D', stroke: 'white', 'stroke-width': 2, rx: 2
        }));
        const facilityText = createSVGElement('text', {
            x: 80, y: 466, 'font-size': 13, 'font-weight': 600, fill: '#1e293b'
        });
        facilityText.textContent = 'Facility';
        legendG.appendChild(facilityText);

        // Patient Cluster
        legendG.appendChild(createSVGElement('circle', {
            cx: 207, cy: 462, r: 8,
            fill: '#C9C1B1', 'fill-opacity': 0.35,
            stroke: '#C9C1B1', 'stroke-width': 2
        }));
        const clusterText = createSVGElement('text', {
            x: 220, y: 466, 'font-size': 13, 'font-weight': 600, fill: '#1e293b'
        });
        clusterText.textContent = 'Patient Cluster';
        legendG.appendChild(clusterText);

        svg.appendChild(legendG);
        container.appendChild(svg);
    }

    function renderFacilityMarker(point) {
        if (!map || !point.lat || !point.lng) return;

        const size = point.volume === 'High' ? 20 : 16;
        
        const facilityIcon = L.divIcon({
            className: 'custom-facility-marker',
            html: `<div style="width:${size}px;height:${size}px;background:#2C3B4D;border:3px solid white;border-radius:3px;box-shadow:0 2px 6px rgba(50, 170, 222, 0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${size*0.6}px;">H</div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });

        const marker = L.marker([point.lat, point.lng], {
            icon: facilityIcon,
            pane: 'facilities'
        }).addTo(map);

        // Add tooltip on hover
        marker.bindTooltip(
            `<div style="font-weight:bold;color:#eeeeee;font-size:12px;">
                <div>${point.label}</div>
                <div style="font-size:11px;color:#eeeeee;margin-top:4px;">Volume: ${point.volume}</div>
            </div>`,
            {
                permanent: false,
                direction: 'top',
                offset: [0, -10],
                className: 'leaflet-tooltip-facility',
                opacity: 0.95
            }
        );
    }

    function renderPatientCluster(point) {
        if (!map || !point.lat || !point.lng) return;

        const color = COLORS[point.payor] || '#ffaa00';
        const radius = point.density === 'High' ? 1200 : (point.density === 'Medium' ? 800 : 500);

        const circle = L.circle([point.lat, point.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 2,
            radius: radius,
            pane: 'clusters'
        }).addTo(map);

        // Add tooltip on hover
        circle.bindTooltip(
            `<div style="font-weight:bold;color:#eeee;font-size:12px;">
                <div>Patient Cluster</div>
                <div style="font-size:11px;color:#eeee;margin-top:4px;">
                    Payer: ${point.payor}<br/>
                    Density: ${point.density}
                </div>
            </div>`,
            {
                permanent: false,
                direction: 'top',
                offset: [0, -10],
                className: 'leaflet-tooltip-cluster',
                opacity: 0.95
            }
        );
    }

    function initMap() {
        const container = document.getElementById('geoMap');
        if (!container || !data.mapData) return;

        // Step 1: Ensure container has proper dimensions BEFORE creating map
        ensureContainerSized();
        
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f8fafc;"><p style="color:#81b3d6;">Loading map...</p></div>';

        // Clear any existing timeout
        if (mapLoadTimeout) {
            clearTimeout(mapLoadTimeout);
        }

        // Destroy existing map
        if (map) {
            map.remove();
            map = null;
        }

        // Set timeout to fallback to static map
        mapLoadTimeout = setTimeout(() => {
            console.warn('Map tiles took too long to load, falling back to static map');
            if (map) {
                map.remove();
                map = null;
            }
            renderStaticMap();
        }, MAP_LOAD_TIMEOUT_MS);

        try {
            // Give the DOM time to render the container before initializing Leaflet
            setTimeout(() => {
                try {
                    // Try Leaflet first
                    map = L.map('geoMap', {
                        center: [42.4, -83.15],
                        zoom: 10,
                        zoomControl: false,
                        scrollWheelZoom: true,
                        preferCanvas: true,
                        fadeAnimation: false,
                        zoomAnimation: false,
                        markerZoomAnimation: false,
                        trackResize: false
                    });

                    // Simpler, faster tile layer with dark styling
                    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                        maxZoom: 18,
                        updateWhenIdle: true,
                        updateWhenZooming: false,
                        keepBuffer: 1,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    });

                    tileLayer.on('load', () => {
                        clearTimeout(mapLoadTimeout);
                        console.log('Map tiles loaded successfully');
                    });

                    tileLayer.on('tileerror', () => {
                        console.warn('Tile loading error, switching to static map');
                        clearTimeout(mapLoadTimeout);
                        if (map) {
                            map.remove();
                            map = null;
                        }
                        renderStaticMap();
                    });

                    tileLayer.addTo(map);
                    map.getContainer().style.backgroundColor = '#2c3b4e';
                    map.getContainer().style.filter = 'brightness(0.85) contrast(0.95)';

                    // Create panes
                    map.createPane('clusters');
                    map.getPane('clusters').style.zIndex = 400;
                    map.createPane('facilities');
                    map.getPane('facilities').style.zIndex = 450;

                    // Render markers (simplified - no tooltips for speed)
                    data.mapData.forEach(point => {
                        if (point.type === 'facility') {
                            renderFacilityMarker(point);
                        } else if (point.type === 'patient_cluster') {
                            renderPatientCluster(point);
                        }
                    });

                    // Add simple legend
                    const legend = L.control({ position: 'bottomleft' });
                    legend.onAdd = function() {
                        const div = L.DomUtil.create('div', 'map-legend');
                        div.innerHTML = '<div style="background:rgba(255,255,255,0.95);padding:10px 14px;border-radius:6px;border:1px solid #cbd5e1;font-size:12px;line-height:1.6;"><div style="margin-bottom:4px;"><span style="display:inline-block;width:12px;height:12px;background:#2C3B4D;border:2px solid white;border-radius:2px;margin-right:6px;vertical-align:middle;"></span><strong>Facility</strong></div><div><span style="display:inline-block;width:12px;height:12px;background:#C9C1B1;opacity:0.4;border:2px solid #C9C1B1;border-radius:50%;margin-right:6px;vertical-align:middle;"></span><strong>Patient Cluster</strong></div></div>';
                        return div;
                    };
                    legend.addTo(map);

                    // Hook up zoom buttons
                    // const zoomInBtn = document.querySelector('[data-lucide="plus"]')?.closest('button');
                    // const zoomOutBtn = document.querySelector('[data-lucide="minus"]')?.closest('button');
                    // if (zoomInBtn) zoomInBtn.addEventListener('click', () => map && map.zoomIn());
                    // if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => map && map.zoomOut());

                    // CRITICAL: Invalidate size after map is fully initialized
                    // This tells Leaflet to recalculate based on container dimensions
                    setTimeout(() => {
                        if (map) {
                            map.invalidateSize(true); // true = animate zoom
                        }
                    }, 300);

                    // Clear the timeout since map loaded successfully
                    if (mapLoadTimeout) {
                        clearTimeout(mapLoadTimeout);
                        mapLoadTimeout = null;
                    }

                } catch (innerError) {
                    console.error('Error initializing Leaflet map:', innerError);
                    clearTimeout(mapLoadTimeout);
                    renderStaticMap();
                }
            }, 100); // Small delay to let DOM render

        } catch (error) {
            console.error('Error initializing Leaflet map:', error);
            clearTimeout(mapLoadTimeout);
            renderStaticMap();
        }
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

        // Recalculate map size when view becomes visible
        // Call this when switching to the geography view
        resizeMap() {
            if (map) {
                try {
                    const container = document.getElementById('geoMap');
                    if (container) {
                        ensureContainerSized();
                    }
                    map.invalidateSize(true); // true = animate zoom
                } catch (error) {
                    console.warn('Error resizing map:', error);
                }
            }
        },

        destroy() {
            destroyCharts();
            if (mapLoadTimeout) {
                clearTimeout(mapLoadTimeout);
            }
            if (map) {
                map.remove();
                map = null;
            }
            data = null;
        }
    };
})();