/* src/cancerDashboard.js */

const CancerDashboard = {
    charts: {},

    init(data) {
        if (!data || !data.cancerDashboard) {
            console.warn('CancerDashboard: No data found');
            return;
        }

        this.data = data.cancerDashboard;
        this.renderKPIs();
        this.renderCharts();
        this.renderSankey();
    },

    renderKPIs() {
        const container = document.getElementById('cancer-kpi-container');
        if (!container) return;

        container.innerHTML = this.data.kpis.map(kpi => `
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <i data-lucide="${kpi.icon}" class="w-6 h-6"></i>
                    </div>
                    <span class="text-xs font-bold ${kpi.trend.includes('+') ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-1 rounded">
                        ${kpi.trend}
                    </span>
                </div>
                <h4 class="text-slate-500 text-xs font-bold uppercase tracking-wide">${kpi.label}</h4>
                <p class="text-3xl font-bold text-slate-800 mt-2">${kpi.value}</p>
            </div>
        `).join('');
        
        // Refresh icons if library is loaded
        if (window.lucide) lucide.createIcons();
    },

    renderCharts() {
        this.destroyCharts(); // Clean up before rendering

        const chartConfig = this.data.charts;

        // 1. Cancer Type (Doughnut)
        this.createChart('cancerTypeChart', 'doughnut', {
            labels: chartConfig.cancerType.labels,
            datasets: [{
                data: chartConfig.cancerType.data,
                backgroundColor: ['#2C3B4D', '#FFB162', '#A35139', '#C9C1B1', '#1B2632'],
                borderWidth: 0
            }]
        });

        // 2. Disease Site (Pie)
        this.createChart('diseaseSiteChart', 'pie', {
            labels: chartConfig.diseaseSite.labels,
            datasets: [{
                data: chartConfig.diseaseSite.data,
                backgroundColor: ['#2C3B4D', '#FFB162', '#A35139', '#C9C1B1', '#1B2632','#64748b'],
                borderWidth: 0
            }]
        });

        // 3. Infusion Trends (Line)
        this.createChart('infusionTrendChart', 'line', {
            labels: chartConfig.infusionTrends.labels,
            datasets: [{
                label: 'Infusion Volume',
                data: chartConfig.infusionTrends.data,
                borderColor: '#2C3B4D',
                backgroundColor: 'rgba(44, 59, 77, 0.1)',
                fill: true,
                tension: 0.4
            }]
        });
    },

    createChart(canvasId, type, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.charts[canvasId] = new Chart(ctx.getContext('2d'), {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true } }
                },
                scales: type === 'line' ? {
                    y: { grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                } : {}
            }
        });
    },
    
    renderSankey() {
        if (!this.data.patientJourney || typeof d3 === 'undefined') return;
        
        const rawData = this.data.patientJourney;
        const container = document.getElementById('diagram-container');
        if (!container) return;

        // Clear previous if any
        d3.select("#sankey-svg").selectAll("*").remove();
        
        // Dimensions
        // We use container width but fixed height logic for the diagram aspect ratio
        const containerRect = container.getBoundingClientRect();
        const margin = { top: 40, right: 10, bottom: 20, left: 10 };
        const width = containerRect.width - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom; // Fit within the min-h-600px

        const svg = d3.select("#sankey-svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Create Tooltip div if not exists
        let tooltip = d3.select("#sankey-tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("id", "sankey-tooltip")
                .attr("class", "bg-slate-900 text-white text-xs p-3 rounded shadow-xl max-w-xs");
        }

        // Color Logic
        const getNodeColor = (nodeName) => {
            const node = rawData.nodes.find(n => n.id === nodeName || n.name === nodeName);
            const stage = node ? rawData.stages.find(s => s.id === node.stage) : null;
            return stage ? stage.color : "#cbd5e1";
        };

        // Prepare Data for D3
        const sankeyData = {
            nodes: rawData.nodes.map(n => ({ ...n })), // Clone
            links: rawData.links.map(l => ({ ...l }))  // Clone
        };

        // Generator
        const sankey = d3.sankey()
            .nodeId(d => d.id)
            .nodeWidth(20)
            .nodePadding(30)
            .extent([[0, 0], [width, height]]);

        const { nodes, links } = sankey(sankeyData);

        // Draw Links
        svg.append("g")
            .selectAll("path")
            .data(links)
            .enter()
            .append("path")
            .attr("class", "sankey-link")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", d => getNodeColor(d.source.id))
            .attr("stroke-width", d => Math.max(1, d.width))
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                       .html(`
                           <strong>${d.source.name} → ${d.target.name}</strong><br/>
                           Patients: ${d.value}
                       `)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));

        // Draw Nodes
        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "sankey-node");

        node.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => getNodeColor(d.id))
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                       .html(`
                           <strong>${d.name}</strong><br/>
                           Total Patients: ${d.patients}
                       `)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));

        // Node Labels (Smart Positioning)
        node.append("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .text(d => d.name)
            .each(function(d) {
                // Multiline text handling
                const el = d3.select(this);
                const words = d.name.split('\n');
                el.text('');
                words.forEach((word, i) => {
                    el.append('tspan')
                      .attr('x', d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
                      .attr('dy', i === 0 ? 0 : "1.2em")
                      .text(word);
                });
            });
    },

    destroyCharts() {
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};
    }
};