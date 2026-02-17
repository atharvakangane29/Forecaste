/* src/forecast.js */

// --- Pure Calculation Engine ---
// src/forecast.js

/* src/forecast.js - Engine Update */

const ForecastEngine = {
    getYears(config) {
        const count = config.endYear - config.startYear + 1;
        return Array.from({ length: count }, (_, i) => config.startYear + i);
    },

    // 1. Deterministic Random Generator (0.0 to 1.0)
    pseudoRandom(input) {
        let h = 0x811c9dc5;
        for (let i = 0; i < input.length; i++) {
            h ^= input.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return ((h >>> 0) / 4294967296);
    },

    // 2. Main Generation Function
    generateSeries(baseValue, targetGrowthRate, config, seedStr = '') {
        const data = [];
        let currentValue = baseValue;
        const { startYear, endYear, historyCutoff } = config;
        const totalYears = endYear - startYear + 1;

        // A. Calculate Deterministic Modifiers based on "Seed" (Hospital + Service)
        // If seed is "all_all", scalar is 1.0 (No change)
        // Otherwise, scalar is between 0.4x (small clinic) and 1.6x (large hub)
        const isDefault = seedStr.includes('all_all');
        const seedHash = this.pseudoRandom(seedStr);
        
        const volumeScalar = isDefault ? 1.0 : 0.4 + (seedHash * 1.2); 
        
        // B. Determine Seasonality / Volatility Profile
        const volatility = 0.02 + (this.pseudoRandom(seedStr + "_vol") * 0.05); // 2% to 7% noise
        const hasSeasonality = this.pseudoRandom(seedStr + "_seas") > 0.5;
        const seasonPhase = this.pseudoRandom(seedStr + "_phase") * Math.PI;

        // Apply Scalar to Start Value
        currentValue = Math.round(currentValue * volumeScalar);

        for (let i = 0; i < totalYears; i++) {
            const year = startYear + i;
            
            // 1. Base Growth (Compound)
            let rate = parseFloat(targetGrowthRate);

            // 2. Apply History Noise vs Forecast Noise
            const yearSeed = seedStr + "_" + year;
            const yearRandom = this.pseudoRandom(yearSeed); // 0.0 - 1.0
            
            // Variance: map 0.0-1.0 to -range to +range
            const variance = (yearRandom - 0.5) * 2 * (volatility * 100);

            // 3. Apply Seasonality (Sine Wave impact on growth rate)
            let seasonalEffect = 0;
            if (hasSeasonality) {
                // Sine wave oscillating every ~4 years for business cycles
                seasonalEffect = Math.sin((i * 0.5) + seasonPhase) * 1.5;
            }

            if (year <= historyCutoff) {
                // History: More chaotic, uses "actual" simulated randomness
                const histRate = (variance * 1.5) + (rate * 0.5); // Dampen growth, increase noise
                if (i > 0) currentValue = currentValue * (1 + (histRate / 100));
            } else {
                // Forecast: Smoother, blends trend + seasonality + variance
                const appliedRate = rate + variance + seasonalEffect;
                currentValue = currentValue * (1 + (appliedRate / 100));
            }

            data.push(Math.round(currentValue));
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
        this.populateFilters();
        
        // Select defaults if empty
        if (typeof ScenarioManager !== 'undefined' && this.selectedScenarios.length === 0) {
             const defaults = ScenarioManager.scenarios.slice(0, 3).map(s => s.id);
             defaults.forEach(id => this.addScenario(id));
        }
    },

    populateFilters() {
        // Safe access: defaults to empty array if data isn't ready
        const hospitals = DataService.get('meta.hospitals') || [];
        const services = DataService.get('meta.services') || [];

        const fillSelect = (elementId, items) => {
            const select = document.getElementById(elementId);
            if (!select) return;

            // Clear existing options but keep the first one
            const defaultOption = select.firstElementChild;
            select.innerHTML = '';
            if (defaultOption) select.appendChild(defaultOption);

            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item; 
                option.textContent = item;
                select.appendChild(option);
            });
        };

        // CORRECTED IDs to match index.html
        fillSelect('hospital-filter', hospitals);
        fillSelect('service-line-filter', services);
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

        // Forecast Filters
        const hospFilter = document.getElementById('hospital-filter');
        const servFilter = document.getElementById('service-line-filter');

        const handleFilterChange = () => {
            const h = hospFilter.value;
            const s = servFilter.value;
            
            // Visual feedback
            App.showToast(`Updating Projection: ${h} / ${s}`, 'info');
            
            // Trigger Chart Refresh
            this.updateCharts(); 
        };

        if(hospFilter) hospFilter.addEventListener('change', handleFilterChange);
        if(servFilter) servFilter.addEventListener('change', handleFilterChange);

        // 1. Horizon Selector Listener
        const horizonSelect = document.getElementById('scenario-horizon');
        if (horizonSelect) {
            horizonSelect.addEventListener('change', () => {
                App.showToast(`Forecast Horizon: ${horizonSelect.value} Years`);
                this.updateCharts();
            });
        }
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

        // --- PHASE 4: Horizon & Filter Logic ---
        
        // 1. Get Horizon Limit
        const horizonEl = document.getElementById('scenario-horizon');
        const horizonYears = horizonEl ? parseInt(horizonEl.value) : 10;
        
        // 2. Get Active Filters & Create "Seed"
        // CORRECTED IDs
        const hospFilter = document.getElementById('hospital-filter')?.value || 'all';
        const servFilter = document.getElementById('service-line-filter')?.value || 'all';
        
        // This 'filterSalt' is what drives the Engine's volumeScalar and seasonality
        const filterSalt = `${hospFilter}_${servFilter}`; 

        // 3. Calculate Date Range
        const historyLen = this.config.historyCutoff - this.config.startYear;
        const totalPoints = historyLen + 1 + horizonYears;

        let years = ForecastEngine.getYears(this.config);
        if (years.length > totalPoints) {
            years = years.slice(0, totalPoints);
        }

        const datasets = [];

        this.selectedScenarios.forEach((id, index) => {
            const scenario = ScenarioManager.scenarios.find(s => s.id === id);
            if (!scenario) return;

            const color = this.colors[index % this.colors.length];
            const d = scenario.data;

            // Combine Scenario ID with Filter Salt for unique curves per scenario + hospital combo
            const uniqueSeed = `${scenario.id}_${filterSalt}`;

            const inpatientSeries = ForecastEngine.generateSeries(
                this.baseParams.inpatient, 
                d.inpatientGrowth, 
                this.config, 
                uniqueSeed // Passing the unique seed
            );

            // Slice data to match the Horizon
            const inpatientSliced = inpatientSeries.slice(0, years.length);

            const outpatientSeries = ForecastEngine.generateSeries(
                this.baseParams.outpatient, 
                d.outpatientGrowth, 
                this.config, 
                uniqueSeed
            );
            const outpatientSliced = outpatientSeries.slice(0, years.length);
            
            // ... rest of the function remains the same (Gap calculation, datasets.push)
            const gapSeries = ForecastEngine.calculateGap(
                inpatientSliced, 
                this.baseParams.bedCapacity, 
                d.addBeds, 
                this.config
            );

            datasets.push({
                label: scenario.name,
                color: color,
                inpatientData: inpatientSliced,
                outpatientData: outpatientSliced,
                growthData: inpatientSliced,
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