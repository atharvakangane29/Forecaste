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
        // --- DEMO CONFIGURATION ---
        // Change this to 'false' to hide the Rose colored exit nodes
        const SHOW_DROPOFFS = false; 

        // 1. Safety Check
        if (!this.data.patientJourney || typeof d3 === 'undefined') return;
        
        const rawData = this.data.patientJourney;
        const container = document.getElementById('diagram-container');
        if (!container) return;

        // 2. Clear previous SVG content
        d3.select("#sankey-svg").selectAll("*").remove();
        
        // 3. Setup Dimensions
        const containerRect = container.getBoundingClientRect();
        const margin = { top: 40, right: 10, bottom: 20, left: 10 };
        const width = containerRect.width - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = d3.select("#sankey-svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // 4. Force Create Tooltip
        let tooltip = d3.select("#sankey-tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("id", "sankey-tooltip")
                .attr("class", "bg-slate-900 text-white text-xs p-3 rounded shadow-xl max-w-xs")
                .style("position", "absolute")
                .style("z-index", "9999")
                .style("pointer-events", "none")
                .style("opacity", "0")
                .style("transition", "opacity 0.2s");
        }

        // --- 5. DATA PROCESSING ---
        
        // Deep clone to avoid mutating original data on re-renders
        let nodes = rawData.nodes.map(n => ({ ...n }));
        let links = rawData.links.map(l => ({ ...l }));

        // Only calculate drop-offs if the flag is TRUE
        if (SHOW_DROPOFFS) {
            const nodeFlows = {};
            nodes.forEach(n => nodeFlows[n.id] = { in: 0, out: 0 });

            links.forEach(l => {
                if(nodeFlows[l.source]) nodeFlows[l.source].out += l.value;
                if(nodeFlows[l.target]) nodeFlows[l.target].in += l.value;
            });

            const newLinks = [];
            const newNodes = [];

            nodes.forEach(node => {
                const flow = nodeFlows[node.id];
                if (!flow) return;

                // Effective Volume logic
                const volume = Math.max(flow.in, node.patients || 0, flow.out);
                
                if (flow.out > 0 && flow.out < volume) {
                    const loss = volume - flow.out;
                    
                    if (loss > 0) {
                        const exitId = `exit_${node.id}`;
                        
                        newNodes.push({
                            id: exitId,
                            name: "Loss / Drop-off", 
                            isExitNode: true,
                            stage: node.stage
                        });

                        newLinks.push({
                            source: node.id,
                            target: exitId,
                            value: loss,
                            isExitLink: true
                        });
                    }
                }
            });

            // Merge Synthetic Data
            nodes = [...nodes, ...newNodes];
            links = [...links, ...newLinks];
        }

        // --- 6. SANKEY GENERATOR ---
        const sankey = d3.sankey()
            .nodeId(d => d.id)
            .nodeWidth(20)
            .nodePadding(30)
            .extent([[0, 0], [width, height]]);

        const graph = sankey({ nodes, links });

        // --- 7. RENDERING ---

        const getNodeColor = (d) => {
            if (d.isExitNode) return "#e11d48"; 
            const stage = rawData.stages.find(s => s.id === d.stage);
            return stage ? stage.color : "#cbd5e1";
        };

        // Draw Links
        svg.append("g")
            .selectAll("path")
            .data(graph.links)
            .enter()
            .append("path")
            .attr("class", "sankey-link")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("stroke", d => d.isExitLink ? "#e11d48" : getNodeColor(d.source))
            .style("fill", "none")
            .style("stroke-opacity", 0.2)
            .on("mouseover", function(event, d) {
                d3.select(this).transition().duration(200).style("stroke-opacity", 0.6);

                const percent = Math.round((d.value / d.source.value) * 100);
                const label = d.isExitLink ? "Dropout / Loss" : `${d.source.name} → ${d.target.name}`;

                tooltip.style("opacity", 1)
                       .html(`
                           <div class="font-bold border-b border-white/20 pb-1 mb-1">${label}</div>
                           <div class="flex justify-between gap-4 text-xs">
                               <span class="text-slate-400">Volume:</span>
                               <span class="font-mono text-emerald-400 font-bold">${d.value}</span>
                           </div>
                           <div class="flex justify-between gap-4 text-xs">
                               <span class="text-slate-400">Split:</span>
                               <span class="font-mono ${d.isExitLink ? 'text-rose-400' : 'text-blue-400'} font-bold">${percent}%</span>
                           </div>
                       `)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).transition().duration(200).style("stroke-opacity", 0.2);
                tooltip.style("opacity", 0);
            });

        // Draw Nodes
        const node = svg.append("g")
            .selectAll("g")
            .data(graph.nodes)
            .enter()
            .append("g")
            .attr("class", "sankey-node");

        node.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => getNodeColor(d))
            .style("stroke", "#334155")
            .style("opacity", d => d.isExitNode ? 0.6 : 1)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                       .html(`
                           <strong>${d.name}</strong><br/>
                           Total: ${d.value}
                       `)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));

        // Draw Labels (Skip for Exit nodes)
        node.filter(d => !d.isExitNode)
            .append("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", "#334155")
            .text(d => d.name)
            .each(function(d) {
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