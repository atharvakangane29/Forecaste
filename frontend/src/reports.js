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


        // Data Export Button
        if (this.downloadBtn) {
            // Remove old mock listener if present, replace with real handler
            this.downloadBtn.replaceWith(this.downloadBtn.cloneNode(true)); 
            this.downloadBtn = document.getElementById('btn-download-data'); // Re-select
            
            this.downloadBtn.addEventListener('click', () => {
                this.handleDataDownload();
            });
        }

        // Report Export Buttons
        document.getElementById('btn-export-pdf')?.addEventListener('click', () => window.print());
        document.getElementById('btn-export-word')?.addEventListener('click', () => this.handleDocDownload('word'));
        document.getElementById('btn-export-html')?.addEventListener('click', () => this.handleDocDownload('html'));

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

    // 1. Core Download Helper
    triggerDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // 2. Handle Data Export (CSV/JSON/Excel)
    handleDataDownload() {
        const activeBtn = document.querySelector('.export-fmt-btn.active-format');
        const format = activeBtn ? activeBtn.dataset.format : 'csv';
        const scenarioId = ScenarioManager.activeScenarioId;
        const scenario = ScenarioManager.scenarios.find(s => s.id === scenarioId);
        
        if (!scenario) return;

        App.showToast(`Generating ${format.toUpperCase()} file...`, 'info');

        // Generate Data Series
        // Note: Re-using the calculation logic to get array data
        const config = ForecastManager.config;
        const base = ForecastManager.baseParams;
        const seed = `${scenarioId}_export`; // Unique seed
        
        // Use full range based on checkbox
        const includeHistory = document.getElementById('export-include-history').checked;
        const startYear = includeHistory ? config.startYear : 2026;
        const years = ForecastEngine.getYears(config).filter(y => y >= startYear);
        
        // Generate full series then slice to match years
        const fullInpatient = ForecastEngine.generateSeries(base.inpatient, scenario.data.inpatientGrowth, config, seed);
        const fullOutpatient = ForecastEngine.generateSeries(base.outpatient, scenario.data.outpatientGrowth, config, seed);
        
        // Offset to find where to start slicing
        const offset = startYear - config.startYear;
        const dataIn = fullInpatient.slice(offset);
        const dataOut = fullOutpatient.slice(offset);

        if (format === 'json') {
            const exportObj = {
                scenario: scenario.name,
                generated: new Date().toISOString(),
                data: years.map((yr, i) => ({
                    year: yr,
                    inpatient: dataIn[i],
                    outpatient: dataOut[i]
                }))
            };
            this.triggerDownload(JSON.stringify(exportObj, null, 2), `forecast_${scenarioId}.json`, 'application/json');
        } 
        else {
            // CSV / Excel (CSV)
            let csvContent = "Year,Scenario,Inpatient Volume,Outpatient Volume\n";
            years.forEach((yr, i) => {
                csvContent += `${yr},${scenario.name},${dataIn[i]},${dataOut[i]}\n`;
            });
            
            const ext = format === 'xlsx' ? 'csv' : 'csv'; // Using CSV for Excel compatibility
            this.triggerDownload(csvContent, `forecast_${scenarioId}.${ext}`, 'text/csv');
        }
        
        setTimeout(() => App.showToast('Download complete', 'success'), 800);
    },

    // 3. Handle Report Document Export
    handleDocDownload(type) {
        const paper = document.getElementById('report-paper');
        if (!paper) return;

        const scenarioName = ScenarioManager.scenarios.find(s => s.id === ScenarioManager.activeScenarioId)?.name || 'Report';

        if (type === 'html') {
            // Wrap in basic HTML structure for standalone viewing
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${scenarioName}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; background: #f8fafc; }
                        #report-wrapper { background: white; padding: 40px; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
                    <div id="report-wrapper">
                        ${paper.innerHTML}
                    </div>
                </body>
                </html>
            `;
            this.triggerDownload(htmlContent, `${scenarioName}_Report.html`, 'text/html');
        } 
        else if (type === 'word') {
            // Word handles HTML with a specific Mime header
            const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
            const footer = "</body></html>";
            const sourceHTML = header + paper.innerHTML + footer;
            
            this.triggerDownload(sourceHTML, `${scenarioName}_Report.doc`, 'application/msword');
        }
        
        App.showToast(`Report downloaded as ${type.toUpperCase()}`, 'success');
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