/* src/reports.js */

const ReportManager = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        
        // Wait for ScenarioManager
        if (typeof ScenarioManager !== 'undefined') {
            this.populateDropdown();
            // Default selection
            if (ScenarioManager.scenarios.length > 0) {
                this.updateReportPreview(ScenarioManager.scenarios[0].id);
                this.updateExportPreview();
            }
        }
        this.updateDate();
    },

    cacheDOM() {
        // Export Section
        this.exportFmtBtns = document.querySelectorAll('.export-fmt-btn');
        this.exportPreviewBody = document.getElementById('export-preview-body');
        this.downloadBtn = document.getElementById('btn-download-data');
        this.includeHistoryCheckbox = document.getElementById('export-include-history');

        // Report Section
        this.reportSelect = document.getElementById('report-scenario-select');
        
        // Report Paper Elements
        this.rptName = document.getElementById('rpt-scenario-name');
        this.rptDate = document.getElementById('rpt-date');
        this.rptInpatientGrowth = document.getElementById('rpt-inpatient-growth');
        this.rptInpatientDelta = document.getElementById('rpt-inpatient-delta');
        this.rptOutpatientGrowth = document.getElementById('rpt-outpatient-growth');
        this.rptOutpatientDelta = document.getElementById('rpt-outpatient-delta');
        
        // Text inserts
        this.rptTextScenario = document.getElementById('rpt-text-scenario');
        this.rptTextInpatientVol = document.getElementById('rpt-text-inpatient-vol');
        this.rptTextOutpatientVol = document.getElementById('rpt-text-outpatient-vol');
        this.rptTextTotalDelta = document.getElementById('rpt-text-total-delta');
    },

    bindEvents() {
        // Export Format Toggles
        this.exportFmtBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.exportFmtBtns.forEach(b => {
                    b.classList.remove('active-format', 'border-blue-500', 'bg-blue-50', 'text-blue-700', 'ring-2', 'ring-blue-100');
                    b.classList.add('border-slate-200', 'text-slate-600');
                });
                const t = e.currentTarget;
                t.classList.remove('border-slate-200', 'text-slate-600');
                t.classList.add('active-format', 'border-blue-500', 'bg-blue-50', 'text-blue-700', 'ring-2', 'ring-blue-100');
            });
        });

        // Report Dropdown
        if (this.reportSelect) {
            this.reportSelect.addEventListener('change', (e) => {
                this.updateReportPreview(e.target.value);
            });
        }

        // Mock Download
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => {
                App.showToast('Generating file...', 'info');
                setTimeout(() => App.showToast('Download started successfully', 'success'), 1500);
            });
        }

        // Update preview on checkbox change
        if (this.includeHistoryCheckbox) {
            this.includeHistoryCheckbox.addEventListener('change', () => this.updateExportPreview());
        }
    },

    updateDate() {
        if(this.rptDate) {
            const date = new Date();
            this.rptDate.innerText = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
    },

    populateDropdown() {
        if (!this.reportSelect) return;
        this.reportSelect.innerHTML = ScenarioManager.scenarios.map(s => 
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
    },

    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    },

    // Helper: Calculate metrics dynamically if they don't exist (for custom scenarios)
    calculateMetrics(scenario) {
        // 1. If static metrics exist (Default Scenarios), use them
        if (scenario.forecast && scenario.forecast.metrics) {
            return scenario.forecast.metrics;
        }

        // 2. Otherwise, calculate on the fly (Custom Scenarios)
        if (typeof ForecastEngine === 'undefined' || typeof ForecastManager === 'undefined') {
            console.warn("ReportManager: Forecast Engine not available for calculation.");
            return null;
        }

        const config = ForecastManager.config;
        const base = ForecastManager.baseParams;
        const d = scenario.data;
        
        // Use a report-specific seed
        const seed = `${scenario.id}_report`; 

        // Generate the full series using the Engine
        const inpatientSeries = ForecastEngine.generateSeries(base.inpatient, d.inpatientGrowth, config, seed);
        const outpatientSeries = ForecastEngine.generateSeries(base.outpatient, d.outpatientGrowth, config, seed);

        // Get Terminal Values (The last year in the series)
        const termIn = inpatientSeries[inpatientSeries.length - 1];
        const termOut = outpatientSeries[outpatientSeries.length - 1];

        // Calculate Growth %
        const pctIn = ((termIn - base.inpatient) / base.inpatient * 100).toFixed(1);
        const pctOut = ((termOut - base.outpatient) / base.outpatient * 100).toFixed(1);

        // Calculate Deltas
        const deltaIn = termIn - base.inpatient;
        const deltaOut = termOut - base.outpatient;

        // Return object matching the mock-stats.json structure
        return {
            terminalInpatient: termIn,
            terminalOutpatient: termOut,
            totalInpatientGrowthPct: pctIn,
            totalOutpatientGrowthPct: pctOut,
            totalPatientDelta: deltaIn + deltaOut
        };
    },

    // --- Logic similar to comparison.js (Projection) ---
    // calculateProjection(current, rate, years = 10) {
    //     return Math.round(current * Math.pow((1 + rate / 100), years));
    // },

    updateReportPreview(scenarioId) {
        const scenario = ScenarioManager.scenarios.find(s => s.id === scenarioId);
        if (!scenario) return;

        // --- FIX: Use the helper to get metrics (Static or Calculated) ---
        const m = this.calculateMetrics(scenario);
        if (!m) {
            console.error("Could not calculate metrics for scenario:", scenarioId);
            return;
        }

        // Visual feedback (Fade out/in)
        const paper = document.getElementById('report-paper');
        if (paper) {
            paper.style.opacity = '0.7';
            setTimeout(() => paper.style.opacity = '1', 200);
        }

        // Update DOM elements using 'm' (metrics object)
        if(this.rptName) this.rptName.innerText = scenario.name + " Scenario";
        
        // KPIs
        if(this.rptInpatientGrowth) this.rptInpatientGrowth.innerText = `+${m.totalInpatientGrowthPct}%`;
        if(this.rptInpatientDelta) this.rptInpatientDelta.innerText = `+${this.formatNumber(m.terminalInpatient - ForecastManager.baseParams.inpatient)} patients`;
        
        if(this.rptOutpatientGrowth) this.rptOutpatientGrowth.innerText = `+${m.totalOutpatientGrowthPct}%`;
        if(this.rptOutpatientDelta) this.rptOutpatientDelta.innerText = `+${this.formatNumber(m.terminalOutpatient - ForecastManager.baseParams.outpatient)} patients`;

        // Text Content
        if(this.rptTextScenario) this.rptTextScenario.innerText = scenario.name;
        if(this.rptTextInpatientVol) this.rptTextInpatientVol.innerText = this.formatNumber(m.terminalInpatient);
        if(this.rptTextOutpatientVol) this.rptTextOutpatientVol.innerText = this.formatNumber(m.terminalOutpatient);
        if(this.rptTextTotalDelta) this.rptTextTotalDelta.innerText = this.formatNumber(m.totalPatientDelta);
    },

    updateExportPreview() {
        if (!this.exportPreviewBody) return;
        
        // Determine start year based on checkbox
        const includeHistory = this.includeHistoryCheckbox ? this.includeHistoryCheckbox.checked : true;
        const startYear = includeHistory ? 2020 : 2025;
        
        // Mock data generation for preview (just 5 rows)
        let html = '';
        const scenarios = ScenarioManager.scenarios;
        
        // Generate a few rows of sample data
        for (let i = 0; i < 5; i++) {
            const year = startYear + i;
            // Cycle through scenarios for demo purposes
            const scenario = scenarios[i % scenarios.length]; 
            
            // Mock value calculation
            const factor = 1 + (i * 0.05);
            const valIn = Math.round(1200 * factor);
            const valOut = Math.round(4500 * factor);

            html += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3 font-mono text-slate-500">${year}</td>
                    <td class="px-4 py-3 font-medium text-slate-800">${scenario ? scenario.name : 'Baseline'}</td>
                    <td class="px-4 py-3 font-mono">${this.formatNumber(valIn)}</td>
                    <td class="px-4 py-3 font-mono">${this.formatNumber(valOut)}</td>
                </tr>
            `;
        }

        this.exportPreviewBody.innerHTML = html;
    }
};