/* src/forecast.js */

// --- Pure Calculation Engine ---
// src/forecast.js

const ForecastEngine = {
    getYears(config) {
        const count = config.endYear - config.startYear + 1;
        return Array.from({ length: count }, (_, i) => config.startYear + i);
    },

    // NEW: Deterministic Random Helper
    // Returns a consistent number between 0 and 1 based on the input string.
    pseudoRandom(input) {
        let h = 0xdeadbeef;
        for(let i = 0; i < input.length; i++)
            h = Math.imul(h ^ input.charCodeAt(i), 2654435761);
        return ((h ^ h >>> 16) >>> 0) / 4294967296;
    },

    // UPDATED: Now accepts 'seedStr' to ensure consistent volatility
    generateSeries(baseValue, targetGrowthRate, config, seedStr = '') {
        // console.log("Generating deterministic series for:", seedStr);
        
        let data = [];
        let currentValue = baseValue;
        const { startYear, endYear, historyCutoff } = config;
        const totalYears = endYear - startYear + 1;

        for (let i = 0; i < totalYears; i++) {
            const year = startYear + i;
            
            // Generate a unique seed for this specific year + scenario
            const yearSeed = seedStr + "_" + year;
            
            // Deterministic Variance: result is consistent for the same Scenario + Year
            // Range: -1.2 to +1.2
            const rawRandom = this.pseudoRandom(yearSeed); 
            const variance = (rawRandom - 0.5) * 2.4; 

            if (year <= historyCutoff) {
                // Historical Volatility
                // Range: 0.5% to 3.5%
                const histRandom = this.pseudoRandom("hist_" + yearSeed);
                const historicalRate = (histRandom * 3.0) + 0.5;
                
                if (i > 0) { 
                   currentValue = currentValue * (1 + (historicalRate / 100));
                }
                data.push(Math.round(currentValue));

            } else {
                // Forecast Volatility
                const appliedRate = parseFloat(targetGrowthRate) + variance;
                currentValue = currentValue * (1 + (appliedRate / 100));
                data.push(Math.round(currentValue));
            }
        }
        return data;
    },

    calculateGap(demandSeries, baseCapacity, addedBeds, config) {
        const activationYear = config.historyCutoff + 1;
        return demandSeries.map((demand, index) => {
            const currentYear = config.startYear + index;
            const currentCapacity = currentYear >= activationYear 
                ? baseCapacity + addedBeds 
                : baseCapacity;
            return Math.round(demand - currentCapacity);
        });
    }
};

// --- UI & State Manager ---
const ForecastManager = {
    charts: {},
    selectedScenarios: [], 
    config: null,
    baseParams: null,
    
    colors: [
        '#2C3B4D', // Index 0 - Blue Fantastic
        '#FFB162', // Index 1 - Burning Flame (Orange)
        '#A35139', // Index 2 - Truffle Trouble (Brown)
        '#1B2632', // Index 3 - Abyssal (Dark)
        '#C9C1B1'  // Index 4 - Oatmeal (Tan)
    ],

    init(data) {
        this.config = data.forecasting.config;
        this.baseParams = data.forecasting.baseParams;
        // Don't override colors with JSON palette - keep hardcoded colors
        
        this.bindEvents();
        
        // Select defaults if empty
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

        container.addEventListener('click', (e) => {
            if (e.target.closest('button')) return; 
            dropdown.classList.toggle('hidden');
            this.renderDropdownOptions();
            input.focus();
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    },

    renderDropdownOptions() {
        const dropdown = document.getElementById('forecast-scenario-dropdown');
        if (!dropdown) return;
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
                    dropdown.classList.add('hidden');
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
        if (!container) return;
        container.querySelectorAll('.scenario-chip').forEach(c => c.remove());
        const input = document.getElementById('scenario-input');
        
        this.selectedScenarios.forEach((id, index) => {
            const scenario = ScenarioManager.scenarios.find(s => s.id === id);
            if (!scenario) return;

            // 1. Get the Hex Color directly from the shared palette
            // This ensures it MATCHES THE CHARTS exactly
            const colorHex = this.colors[index % this.colors.length];
            
            // 2. Keep the class for shape/size, but add inline background
            const chip = document.createElement('div');
            chip.className = `scenario-chip`; 
            
            // --- FIX: Force properties inline (Bypasses CSS issues) ---
            chip.style.backgroundColor = colorHex;
            chip.style.color = '#ffffff'; 
            chip.style.display = 'inline-flex';
            chip.style.alignItems = 'center';
            chip.style.gap = '6px';
            chip.style.padding = '4px 12px';
            chip.style.borderRadius = '9999px';
            chip.style.fontSize = '0.75rem';
            chip.style.fontWeight = '700';
            chip.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
            
            chip.innerHTML = `
                ${scenario.name} 
                <button onclick="ForecastManager.removeScenario('${id}')" class="hover:opacity-75 transition-opacity flex items-center justify-center">
                    <i data-lucide="x" class="w-3 h-3 text-white"></i>
                </button>
            `;
            
            container.insertBefore(chip, input);
        });
        if(window.lucide) lucide.createIcons();
    },

    // --- Charting Logic ---

    updateCharts() {
        if (typeof Chart === 'undefined') return;

        Object.values(this.charts).forEach(chart => chart && chart.destroy());

        if (this.selectedScenarios.length === 0) return;

        const years = ForecastEngine.getYears(this.config);
        const datasets = [];

        // Inside ForecastManager.updateCharts ...

        this.selectedScenarios.forEach((id, index) => {
            const scenario = ScenarioManager.scenarios.find(s => s.id === id);
            if (!scenario) return;

            const color = this.colors[index % this.colors.length];
            const d = scenario.data;

            // UPDATED: Pass 'scenario.id' as the 4th argument (the seed)
            const inpatientSeries = ForecastEngine.generateSeries(
                this.baseParams.inpatient, 
                d.inpatientGrowth, 
                this.config, 
                scenario.id // <--- SEED
            );

            const outpatientSeries = ForecastEngine.generateSeries(
                this.baseParams.outpatient, 
                d.outpatientGrowth, 
                this.config, 
                scenario.id // <--- SEED
            );
            
            const gapSeries = ForecastEngine.calculateGap(inpatientSeries, this.baseParams.bedCapacity, d.addBeds, this.config);

            datasets.push({
                label: scenario.name,
                color: color,
                inpatientData: inpatientSeries,
                outpatientData: outpatientSeries,
                growthData: inpatientSeries,
                gapData: gapSeries
            });
        });

        if(document.getElementById('chart-forecast-inpatient')) this.renderInpatientChart(years, datasets);
        if(document.getElementById('chart-forecast-outpatient')) this.renderOutpatientChart(years, datasets);
        if(document.getElementById('chart-forecast-growth')) this.renderGrowthChart(years, datasets);
        if(document.getElementById('chart-forecast-gap')) this.renderGapChart(years, datasets);
    },

    renderInpatientChart(labels, scenarioData) {
        const ctx = document.getElementById('chart-forecast-inpatient').getContext('2d');
        const cutoffIndex = this.config.historyCutoff - this.config.startYear;

        const datasets = scenarioData.map(d => ({
            label: d.label,
            data: d.inpatientData,
            borderColor: d.color, // Uses color from dataset
            backgroundColor: d.color,
            tension: 0.4,
            segment: {
                borderDash: (ctx) => ctx.p0.parsed.x >= cutoffIndex ? [6, 6] : undefined
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
        const cutoffIndex = this.config.historyCutoff - this.config.startYear;

        const datasets = scenarioData.map(d => ({
            label: d.label,
            data: d.outpatientData,
            borderColor: d.color, // Uses color from dataset
            backgroundColor: d.color,
            tension: 0.4,
            segment: {
                borderDash: (ctx) => ctx.p0.parsed.x >= cutoffIndex ? [6, 6] : undefined
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
        const datasets = scenarioData.map(d => {
            // Calculate YoY % change based on the VOLATILE series
            const growthRates = d.growthData.map((val, i, arr) => {
                if (i === 0) return 0;
                // Standard Growth Formula: (Present - Past) / Past * 100
                return ((val - arr[i-1]) / arr[i-1] * 100).toFixed(1);
            });
            
            return {
                label: d.label,
                data: growthRates,
                backgroundColor: d.color, // Uses color from dataset
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
        const cutoffIndex = this.config.historyCutoff - this.config.startYear;

        const datasets = scenarioData.map(d => ({
            label: `${d.label} Deficit`,
            data: d.gapData,
            borderColor: d.color, // Uses color from dataset
            backgroundColor: d.color,
            borderWidth: 2,
            pointRadius: 2,
            segment: {
                borderDash: (ctx) => ctx.p0.parsed.x >= cutoffIndex ? [6, 6] : undefined
            }
        }));

        this.charts.gap = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: this.getCommonOptions('Capacity Gap (Beds Needed)')
        });
    },

    getCommonOptions(yTitle) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end', labels: { color: '#1B2632' } },
                tooltip: { mode: 'index', intersect: false }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                y: { display: true, title: { display: true, text: yTitle }, grid: { borderDash: [2, 4] } },
                x: { grid: { display: false } }
            }
        };
    }
};