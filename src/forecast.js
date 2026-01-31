/* src/forecast.js */

const ForecastManager = {
    charts: {},
    selectedScenarios: [], // Stores IDs of selected scenarios
    // Palette: Blue Fantastic, Burning Flame, Truffle Trouble, Abyssal, Oatmeal
    colors: [
        '#2C3B4D', 
        '#FFB162', 
        '#A35139', 
        '#1B2632', 
        '#C9C1B1'
    ],

    init(data) {
        // Read configuration from JSON
        this.config = data.forecasting.config;
        this.baseParams = data.forecasting.baseParams;
        
        // Use colors from JSON
        this.colors = this.config.palette;

        this.bindEvents();
        
        // Default selection logic...
        if (typeof ScenarioManager !== 'undefined' && this.selectedScenarios.length === 0) {
             const defaults = ScenarioManager.scenarios.slice(0, 3).map(s => s.id);
             defaults.forEach(id => this.addScenario(id));
        }
    },

    bindEvents() {
        const input = document.getElementById('scenario-input');
        const container = document.getElementById('forecast-scenario-container');
        const dropdown = document.getElementById('forecast-scenario-dropdown');

        if (!input || !container || !dropdown) return;

        // Toggle Dropdown on Input Click
        container.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') { // Don't toggle if clicking delete
                dropdown.classList.toggle('hidden');
                this.renderDropdownOptions();
                input.focus();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    },

    renderDropdownOptions() {
        const dropdown = document.getElementById('forecast-scenario-dropdown');
        dropdown.innerHTML = '';

        if (typeof ScenarioManager === 'undefined') return;

        ScenarioManager.scenarios.forEach(scenario => {
            const isSelected = this.selectedScenarios.includes(scenario.id);
            
            const item = document.createElement('div');
            item.className = `dropdown-item ${isSelected ? 'selected' : ''}`;
            item.innerHTML = `
                <span>${scenario.name}</span>
                ${isSelected ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
            `;

            if (!isSelected) {
                item.addEventListener('click', () => {
                    this.addScenario(scenario.id);
                    document.getElementById('forecast-scenario-dropdown').classList.add('hidden');
                });
            }

            dropdown.appendChild(item);
        });
        
        if(window.lucide) lucide.createIcons();
    },

    addScenario(id) {
        if (this.selectedScenarios.includes(id)) return;
        this.selectedScenarios.push(id);
        this.renderChips();
        this.updateCharts();
    },

    removeScenario(id) {
        this.selectedScenarios = this.selectedScenarios.filter(sId => sId !== id);
        this.renderChips();
        this.updateCharts();
    },

    renderChips() {
        const container = document.getElementById('forecast-scenario-container');
        // Remove existing chips (keep the input and icon)
        const chips = container.querySelectorAll('.scenario-chip');
        chips.forEach(chip => chip.remove());

        const input = document.getElementById('scenario-input');
        
        this.selectedScenarios.forEach((id, index) => {
            const scenario = ScenarioManager.scenarios.find(s => s.id === id);
            if (!scenario) return;

            // Cycle through colors
            const colorClass = ['chip-blue', 'chip-green', 'chip-rose', 'chip-purple', 'chip-orange'][index % 5];

            const chip = document.createElement('div');
            chip.className = `scenario-chip ${colorClass}`;
            chip.innerHTML = `
                ${scenario.name}
                <button onclick="ForecastManager.removeScenario('${id}')">
                    <i data-lucide="x" class="w-3 h-3 text-white"></i>
                </button>
            `;
            
            // Insert before the input field
            container.insertBefore(chip, input);
        });

        if(window.lucide) lucide.createIcons();
    },

    // --- Chart Generation Logic ---

    // REMOVED: getYears()
    // REMOVED: generateDataPoints()

    updateCharts() {
        // Destroy existing to rebuild
        Object.values(this.charts).forEach(chart => chart.destroy());

        // Get timeline labels from the first selected scenario (assuming aligned timelines)
        if (this.selectedScenarios.length === 0) return;
        const firstScenario = ScenarioManager.scenarios.find(s => s.id === this.selectedScenarios[0]);
        if (!firstScenario) return;
        
        const labels = firstScenario.forecast.timeline; 
        const datasets = [];

        // Prepare datasets via direct JSON access
        this.selectedScenarios.forEach((id, index) => {
            const scenario = ScenarioManager.scenarios.find(s => s.id === id);
            if (!scenario) return;

            const color = this.colors[index % this.colors.length];
            
            datasets.push({
                label: scenario.name,
                color: color,
                // DIRECT READ: No calculation
                inpatientData: scenario.forecast.inpatientValues,
                outpatientData: scenario.forecast.outpatientValues,
                growthData: scenario.forecast.growthRates, 
                gapData: scenario.forecast.capacityGap,
                // Metadata
                capacityLimits: scenario.data.applyCapacityLimits,
                addBeds: scenario.data.addBeds
            });
        });

        this.renderInpatientChart(labels, datasets);
        this.renderOutpatientChart(labels, datasets);
        this.renderGrowthChart(labels, datasets);
        this.renderGapChart(labels, datasets);
    },

    renderInpatientChart(labels, scenarioData) {
        const ctx = document.getElementById('chart-forecast-inpatient').getContext('2d');
        
        const datasets = scenarioData.map(d => ({
            label: d.label,
            data: d.inpatientData,
            borderColor: d.color,
            backgroundColor: d.color,
            tension: 0.4,
            // borderDash: (ctx) => ctx.p0.parsed.x >= 5 ? [5, 5] : [] // Dashed line starting from index 5 (2025)
            borderDash: (ctx) => {
                if (!ctx || !ctx.parsed || ctx.parsed.y == null) return [];
                return ctx.parsed.y > 0 ? [] : [6, 6];
                }
        }));

        this.charts.inpatient = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: this.getCommonOptions('Volume (Patients)')
        });
    },

    renderOutpatientChart(labels, scenarioData) {
        const ctx = document.getElementById('chart-forecast-outpatient').getContext('2d');
        
        const datasets = scenarioData.map(d => ({
            label: d.label,
            data: d.outpatientData,
            borderColor: d.color,
            backgroundColor: d.color,
            tension: 0.4,
            // borderDash: (ctx) => ctx.p0.parsed.x >= 5 ? [5, 5] : []
            borderDash: (ctx) => {
                if (!ctx || !ctx.parsed || ctx.parsed.y == null) return [];
                return ctx.parsed.y > 0 ? [] : [6, 6];
            }
        }));

        this.charts.outpatient = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: this.getCommonOptions('Volume (Visits)')
        });
    },

    renderGrowthChart(labels, scenarioData) {
        const ctx = document.getElementById('chart-forecast-growth').getContext('2d');
        
        // Calculate YoY growth for each scenario
        const datasets = scenarioData.map(s => {
            const growthRates = s.inpatientData.map((val, i, arr) => {
                if (i === 0) return 0;
                return ((val - arr[i-1]) / arr[i-1] * 100).toFixed(1);
            });

            return {
                label: s.label,
                data: growthRates,
                backgroundColor: s.color,
                borderRadius: 4
            };
        });

        this.charts.growth = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', align: 'end' } },
                scales: { y: { beginAtZero: true, title: {display:true, text: 'Growth Rate (%)'} } }
            }
        });
    },

    renderGapChart(labels, scenarioData) {
        const ctx = document.getElementById('chart-forecast-gap').getContext('2d');
        
        // Use JSON key 'bedCapacity'
        const baseCapacity = this.baseParams.bedCapacity;

        const datasets = scenarioData.map(s => {
            // Calculate capacity line (Base + Added Beds over time)
            // Assuming added beds come online in 2026
            const capacityLine = labels.map(year => {
                return year > 2025 ? baseCapacity + (s.addBeds * 10) : baseCapacity; // *10 just to scale visuals
            });

            return {
                label: `${s.label} Capacity Gap`,
                data: s.gapData, // Plotting capacity vs demand is complex, here plotting just Capacity for simplicity per instructions
                borderColor: s.color,
                borderWidth: 2,
                borderDash: [2,2],
                pointRadius: 0
            };
        });

        // Add Demand Line (Reference - usually the highest scenario demand)
        // Here we just plot the Inpatient Volume of the first scenario as "Demand" context
        if(scenarioData.length > 0) {
             datasets.push({
                label: 'Projected Demand (Primary)',
                data: scenarioData[0].inpatientData,
                borderColor: '#64748b', // Slate-500
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                fill: true,
                tension: 0.4
             });
        }

        this.charts.gap = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: this.getCommonOptions('Bed Count')
        });
    },

    getCommonOptions(yTitle) {
        // Local reference to palette colors
        const colorText = '#1B2632'; // Abyssal
        const colorGrid = '#C9C1B1'; // Oatmeal

        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end', labels: { color: colorText } },
                tooltip: { mode: 'index', intersect: false, backgroundColor: colorText, titleColor: '#EEE9DF' }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                y: { 
                    display: true, 
                    title: { display: true, text: yTitle, color: colorText }, 
                    grid: { borderDash: [2, 4], color: colorGrid },
                    ticks: { color: colorText }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: colorText }
                }
            }
        };
    }
};