/* src/comparison.js */

const ComparisonManager = {
    init(data) {
        this.baseParams = data.forecasting.baseParams; // Store base params
        this.cacheDOM();
        this.bindEvents();
        
        // Wait for ScenarioManager to exist
        if (typeof ScenarioManager !== 'undefined') {
            this.populateDropdowns();
            // Default selections
            if (ScenarioManager.scenarios.length >= 2) {
                this.selectA.value = ScenarioManager.scenarios[0].id;
                this.selectB.value = ScenarioManager.scenarios[1].id;
            } else if (ScenarioManager.scenarios.length === 1) {
                this.selectA.value = ScenarioManager.scenarios[0].id;
                this.selectB.value = ScenarioManager.scenarios[0].id;
            }
            this.updateComparison();
        }
    },

    cacheDOM() {
        this.selectA = document.getElementById('compare-select-a');
        this.selectB = document.getElementById('compare-select-b');
        
        // Labels
        this.labelA = document.getElementById('label-scenario-a');
        this.labelB = document.getElementById('label-scenario-b');
        this.tableHeadA = document.getElementById('table-head-a');
        this.tableHeadB = document.getElementById('table-head-b');

        // Values
        this.valAInpatient = document.getElementById('val-a-inpatient');
        this.valAOutpatient = document.getElementById('val-a-outpatient');
        this.valBInpatient = document.getElementById('val-b-inpatient');
        this.valBOutpatient = document.getElementById('val-b-outpatient');

        // Differences
        this.diffInpatient = document.getElementById('diff-inpatient');
        this.pctInpatient = document.getElementById('pct-inpatient');
        this.diffOutpatient = document.getElementById('diff-outpatient');
        this.pctOutpatient = document.getElementById('pct-outpatient');

        this.tableBody = document.getElementById('comparison-table-body');
    },

    bindEvents() {
        if(this.selectA) {
            this.selectA.addEventListener('change', () => this.updateComparison());
        }
        if(this.selectB) {
            this.selectB.addEventListener('change', () => this.updateComparison());
        }
    },

    populateDropdowns() {
        const createOptions = () => {
            return ScenarioManager.scenarios.map(s => 
                `<option value="${s.id}">${s.name}</option>`
            ).join('');
        };

        if(this.selectA) this.selectA.innerHTML = createOptions();
        if(this.selectB) this.selectB.innerHTML = createOptions();
    },

    // Calculate projection for 10 years out (2034)
    // Formula: Current * (1 + rate)^10
    calculateProjection(current, rate) {
        return Math.round(current * Math.pow((1 + rate / 100), 10));
    },

    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    },

    updateComparison() {
        if (!this.selectA || !this.selectB) return;

        const scenarioA = ScenarioManager.scenarios.find(s => s.id === this.selectA.value);
        const scenarioB = ScenarioManager.scenarios.find(s => s.id === this.selectB.value);

        if (!scenarioA || !scenarioB) return;

        // 1. Update Headers
        this.labelA.innerText = scenarioA.name;
        this.labelB.innerText = scenarioB.name;
        this.tableHeadA.innerText = scenarioA.name;
        this.tableHeadB.innerText = scenarioB.name;

        // 2. Calculate Projections (Base: Inpatient=1200, Outpatient=4500)
        // Note: Using 1200/4500 as base from forecast.js to match 2024 data
        const baseInpatient = this.baseParams.baseInpatientVolume;
        const baseOutpatient = this.baseParams.baseOutpatientVolume;

        const projA_In = this.calculateProjection(baseInpatient, scenarioA.data.inpatientGrowth);
        const projA_Out = this.calculateProjection(baseOutpatient, scenarioA.data.outpatientGrowth);

        const projB_In = this.calculateProjection(baseInpatient, scenarioB.data.inpatientGrowth);
        const projB_Out = this.calculateProjection(baseOutpatient, scenarioB.data.outpatientGrowth);

        // 3. Update DOM Values
        this.valAInpatient.innerText = this.formatNumber(projA_In);
        this.valAOutpatient.innerText = this.formatNumber(projA_Out);
        this.valBInpatient.innerText = this.formatNumber(projB_In);
        this.valBOutpatient.innerText = this.formatNumber(projB_Out);

        // 4. Calculate Differences
        this.updateDiff(this.diffInpatient, this.pctInpatient, projA_In, projB_In);
        this.updateDiff(this.diffOutpatient, this.pctOutpatient, projA_Out, projB_Out);

        // 5. Update Table
        this.renderTable(scenarioA, scenarioB);

        // 6. Update Dynamic Insight
        const insightEl = document.getElementById('insight-dynamic-1');
        if(insightEl) {
            const diff = projB_In - projA_In;
            const text = diff > 0 
                ? `${scenarioB.name} projects +${this.formatNumber(diff)} more inpatient volume by 2034.`
                : `${scenarioB.name} projects ${this.formatNumber(Math.abs(diff))} less inpatient volume by 2034.`;
            insightEl.innerText = text;
        }
    },

    updateDiff(valEl, pctEl, valA, valB) {
        const diff = valB - valA; // Target - Baseline
        const pct = valA !== 0 ? ((diff / valA) * 100).toFixed(1) : 0;

        valEl.innerText = (diff > 0 ? "+" : "") + this.formatNumber(diff);
        pctEl.innerText = (diff > 0 ? "+" : "") + pct + "%";

        // Color coding (Green if B > A, Red if B < A - assuming Growth is good)
        if (diff >= 0) {
            valEl.classList.remove('text-rose-400');
            valEl.classList.add('text-emerald-400');
            pctEl.classList.remove('text-rose-400', 'bg-rose-500/10');
            pctEl.classList.add('text-emerald-400', 'bg-emerald-500/10');
        } else {
            valEl.classList.remove('text-emerald-400');
            valEl.classList.add('text-rose-400');
            pctEl.classList.remove('text-emerald-400', 'bg-emerald-500/10');
            pctEl.classList.add('text-rose-400', 'bg-rose-500/10');
        }
    },

    renderTable(sA, sB) {
        // Rows: Parameter, A value, B value
        const rows = [
            { label: 'Outpatient Growth Rate', valA: sA.data.outpatientGrowth + '%', valB: sB.data.outpatientGrowth + '%' },
            { label: 'New Patient Growth', valA: sA.data.newPatientGrowth + '%', valB: sB.data.newPatientGrowth + '%' },
            { label: 'Inpatient Growth Rate', valA: sA.data.inpatientGrowth + '%', valB: sB.data.inpatientGrowth + '%' },
            { label: 'Capacity Constraints', valA: sA.data.applyCapacityLimits ? 'Active' : 'None', valB: sB.data.applyCapacityLimits ? 'Active' : 'None' }
        ];

        this.tableBody.innerHTML = rows.map(r => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-medium text-slate-700">${r.label}</td>
                <td class="px-6 py-4 text-slate-500 font-mono">${r.valA}</td>
                <td class="px-6 py-4 text-blue-600 font-mono font-bold bg-blue-50/30">${r.valB}</td>
            </tr>
        `).join('');
    }
};