/* src/scenario.js */

const ScenarioManager = {
    // Default Data Placeholder
    scenarios: [],

    activeScenarioId: 'conservative',

    init(data) {
        // Load deep copy to allow editing without mutating source
        if (data && data.scenarios) {
            this.scenarios = JSON.parse(JSON.stringify(data.scenarios.defaults));
        }

        this.renderScenarioList();
        this.loadScenario(this.activeScenarioId);
        this.bindEvents();
    },

    bindEvents() {
        // Dropdown Change
        const selector = document.getElementById('scenario-selector');
        if(selector) {
            selector.addEventListener('change', (e) => {
                this.loadScenario(e.target.value);
            });
        }

        // New Scenario Button (Opens Modal)
        document.getElementById('btn-new-scenario')?.addEventListener('click', () => {
            // Reset input and error state
            const input = document.getElementById('new-scenario-name');
            const error = document.getElementById('new-scenario-error');
            if(input) input.value = '';
            if(error) error.classList.add('hidden');
            
            App.toggleModal('new-scenario-modal', true);
            setTimeout(() => input?.focus(), 100); // Focus input for UX
        });

        // Modal: Cancel
        document.getElementById('btn-cancel-scenario')?.addEventListener('click', () => {
            App.toggleModal('new-scenario-modal', false);
        });

        // Modal: Confirm
        document.getElementById('btn-confirm-scenario')?.addEventListener('click', () => {
            this.handleModalCreation();
        });

        // Modal: Enter Key Support
        document.getElementById('new-scenario-name')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleModalCreation();
        });
        
        // Horizon Selector
        document.getElementById('scenario-horizon')?.addEventListener('change', (e) => {
            const years = parseInt(e.target.value);
            // In a real app, this would update the forecast configuration state
            App.showToast(`Forecast horizon updated to ${years} years`, 'info');
        });

        // Delete Scenario Button
        document.getElementById('btn-delete-scenario')?.addEventListener('click', () => {
            this.deleteScenario();
        });

        // Save Button
        document.getElementById('btn-save-scenario')?.addEventListener('click', () => {
            this.saveCurrentScenario();
        });

        // Bind Sliders to Value Displays
        const sliders = [
            'inpatientGrowth', 'outpatientGrowth', 'newPatientGrowth', 
            'marketShare', 'referralGrowth'
        ];
        
        sliders.forEach(id => {
            const range = document.getElementById(id);
            const display = document.getElementById(`${id}-val`);
            if(range && display) {
                range.addEventListener('input', (e) => {
                    display.innerText = e.target.value;
                });
            }
        });

        // Counter Buttons (Beds/Chairs)
        document.querySelectorAll('.counter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.target;
                const action = e.currentTarget.dataset.action;
                const input = document.getElementById(targetId);
                let val = parseInt(input.value) || 0;
                
                if (action === 'increment') val++;
                if (action === 'decrement' && val > 0) val--;
                
                input.value = val;
            });
        });
    },

    renderScenarioList() {
        const selector = document.getElementById('scenario-selector');
        if(!selector) return;

        selector.innerHTML = '';
        this.scenarios.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.text = s.name;
            option.selected = s.id === this.activeScenarioId;
            selector.appendChild(option);
        });
    },

    loadScenario(id) {
        this.activeScenarioId = id;
        const scenario = this.scenarios.find(s => s.id === id);
        if (!scenario) return;

        // Update Title
        const titleEl = document.getElementById('config-title');
        if(titleEl) titleEl.innerText = `Configure: ${scenario.name}`;

        // Set Values
        const d = scenario.data;
        
        // Helper to set slider and text
        const setSlider = (key, val) => {
            const el = document.getElementById(key);
            const display = document.getElementById(`${key}-val`);
            if(el) el.value = val;
            if(display) display.innerText = val;
        };

        setSlider('inpatientGrowth', d.inpatientGrowth);
        setSlider('outpatientGrowth', d.outpatientGrowth);
        setSlider('newPatientGrowth', d.newPatientGrowth);
        setSlider('marketShare', d.marketShare);
        setSlider('referralGrowth', d.referralGrowth);

        // Set Model Dropdown
        const modelSelect = document.getElementById('model-selector');
        if (modelSelect) {
            modelSelect.value = d.selectedModel || 'deterministic'; 
        }

        // Boolean/Counters
        const capCheck = document.getElementById('applyCapacityLimits');
        if(capCheck) capCheck.checked = d.applyCapacityLimits;

        document.getElementById('addBeds').value = d.addBeds;
        document.getElementById('addChairs').value = d.addChairs;
        
        // Program Dropdown
        const progSelect = document.getElementById('addPrograms');
        if(progSelect) progSelect.value = d.programs.length > 0 ? d.programs[0] : "";
    },

    saveCurrentScenario() {
        const scenarioIndex = this.scenarios.findIndex(s => s.id === this.activeScenarioId);
        if (scenarioIndex === -1) return;

        // 1. Show Training Animation
        const overlay = document.getElementById('model-training-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            // Force browser reflow to trigger transition
            void overlay.offsetWidth; 
            overlay.classList.remove('opacity-0');
        }

        // 2. Simulate Training Delay (Wait-time)
        setTimeout(() => {
            
            // Gather Data from DOM (Existing Logic)
            const getData = (id) => parseFloat(document.getElementById(id).value);
            
            const newData = {
                selectedModel: document.getElementById('model-selector').value,
                inpatientGrowth: getData('inpatientGrowth'),
                outpatientGrowth: getData('outpatientGrowth'),
                newPatientGrowth: getData('newPatientGrowth'),
                marketShare: getData('marketShare'),
                referralGrowth: getData('referralGrowth'),
                applyCapacityLimits: document.getElementById('applyCapacityLimits').checked,
                addBeds: parseInt(document.getElementById('addBeds').value),
                addChairs: parseInt(document.getElementById('addChairs').value),
                programs: [document.getElementById('addPrograms').value].filter(Boolean)
            };

            // Update Data
            this.scenarios[scenarioIndex].data = newData;

            // 3. Hide Animation
            if (overlay) {
                overlay.classList.add('opacity-0');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    
                    // 4. Show Confirmation (Requirement 2)
                    App.showToast('Model is trained', 'success');
                    
                    // Update Forecast UI
                    if (typeof ForecastManager !== 'undefined') {
                        ForecastManager.updateCharts();
                    }
                }, 300); // Wait for fade out transition
            }

        }, 2500); // 2.5 seconds wait time
    },

    handleModalCreation() {
        const input = document.getElementById('new-scenario-name');
        const error = document.getElementById('new-scenario-error');
        const name = input.value.trim();

        // Validation 1: Empty
        if (!name) {
            this.showError(input, error, "Scenario name cannot be empty");
            return;
        }

        // Validation 2: Duplicate
        if (this.scenarios.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            this.showError(input, error, "A scenario with this name already exists");
            return;
        }

        // Success
        this.createNewScenario(name); // Pass name explicitly
        App.toggleModal('new-scenario-modal', false);
    },

    showError(input, errorMsgEl, msg) {
        input.classList.add('input-error');
        errorMsgEl.querySelector('span').innerText = msg;
        errorMsgEl.classList.remove('hidden');
        
        // Remove error style on next input
        input.addEventListener('input', () => {
            input.classList.remove('input-error');
            errorMsgEl.classList.add('hidden');
        }, { once: true });
    },

    createNewScenario(nameProvided) {
        const name = nameProvided;
        if (!name) return;

        const id = name.toLowerCase().replace(/\s+/g, '-');
        
        // Clone Base Case data (or current scenario)
        const baseData = JSON.parse(JSON.stringify(this.scenarios[0].data)); 
        
        const newScenario = {
            id: id,
            name: name,
            data: baseData
        };

        this.scenarios.push(newScenario);
        this.renderScenarioList();
        this.loadScenario(id);
        
        // Select the new option in dropdown
        document.getElementById('scenario-selector').value = id;
        App.showToast(`Created scenario: ${name}`, 'success');

        // Select the new option in dropdown
        document.getElementById('scenario-selector').value = id;
        App.showToast(`Created scenario: ${name}`, 'success');

        // --- PHASE 4: Global Module Refresh ---
        // When a new scenario is added, all modules need to know about it.
        
        // 1. Forecast Module: Update dropdowns
        if (typeof ForecastManager !== 'undefined') {
            ForecastManager.renderDropdownOptions();
        }

        // 2. Comparison Module: Update Selectors A & B
        if (typeof ComparisonManager !== 'undefined') {
            ComparisonManager.populateDropdowns();
        }

        // 3. Reports Module: Update selector
        if (typeof ReportManager !== 'undefined') {
            ReportManager.populateDropdown();
        }
    },

    deleteScenario() {
        if (this.scenarios.length <= 1) {
            App.showToast('Cannot delete the last scenario.', 'info');
            return;
        }

        const current = this.scenarios.find(s => s.id === this.activeScenarioId);
        if (!confirm(`Are you sure you want to delete "${current.name}"?`)) return;

        this.scenarios = this.scenarios.filter(s => s.id !== this.activeScenarioId);
        
        // Fallback to first available
        this.activeScenarioId = this.scenarios[0].id;
        this.renderScenarioList();
        this.loadScenario(this.activeScenarioId);
        
        App.showToast('Scenario deleted.', 'info');

        // --- INTEGRATION: Update Forecast UI ---
        if (typeof ForecastManager !== 'undefined') {
            // Remove from selection if active
            ForecastManager.removeScenario(current.id); 
            ForecastManager.renderDropdownOptions();
            ForecastManager.updateCharts();
        }
    }
};