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

    // --- Logic similar to comparison.js (Projection) ---
    // calculateProjection(current, rate, years = 10) {
    //     return Math.round(current * Math.pow((1 + rate / 100), years));
    // },

    updateReportPreview(scenarioId) {
        const scenario = ScenarioManager.scenarios.find(s => s.id === scenarioId);
        if (!scenario) return;

        // DIRECT READ from JSON source-of-truth
        const m = scenario.forecast.metrics;

        const targetIn = m.terminalInpatient;
        const targetOut = m.terminalOutpatient;
        const totalDelta = m.totalPatientDelta;
        
        const pctIn = m.totalInpatientGrowthPct;
        const pctOut = m.totalOutpatientGrowthPct;
        
        const deltaIn = Math.round(targetIn - 1200); // Optional: Simple subtract is allowed for UI delta
        const deltaOut = Math.round(targetOut - 4500);

        // Update DOM
        if(this.rptName) this.rptName.innerText = scenario.name + " Scenario";
        
        // KPIs
        if(this.rptInpatientGrowth) this.rptInpatientGrowth.innerText = `+${pctIn}%`;
        if(this.rptInpatientDelta) this.rptInpatientDelta.innerText = `+${this.formatNumber(deltaIn)} patients`;
        
        if(this.rptOutpatientGrowth) this.rptOutpatientGrowth.innerText = `+${pctOut}%`;
        if(this.rptOutpatientDelta) this.rptOutpatientDelta.innerText = `+${this.formatNumber(deltaOut)} patients`;

        // Text Content
        if(this.rptTextScenario) this.rptTextScenario.innerText = scenario.name;
        if(this.rptTextInpatientVol) this.rptTextInpatientVol.innerText = this.formatNumber(targetIn);
        if(this.rptTextOutpatientVol) this.rptTextOutpatientVol.innerText = this.formatNumber(targetOut);
        if(this.rptTextTotalDelta) this.rptTextTotalDelta.innerText = this.formatNumber(totalDelta);
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