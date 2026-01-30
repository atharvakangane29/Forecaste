/* src/scenario.js */

const ScenarioManager = {
    // Default Data
    scenarios: [
        // {
        //     id: 'conservative',
        //     name: 'Conservative',
        //     data: {
        //         inpatientGrowth: 2.0,
        //         outpatientGrowth: 3.0,
        //         newPatientGrowth: 2.5,
        //         marketShare: 35,
        //         referralGrowth: 15,
        //         applyCapacityLimits: false,
        //         addBeds: 0,
        //         addChairs: 0,
        //         programs: []
        //     }
        // },
        // {
        //     id: 'base-case',
        //     name: 'Base Case',
        //     data: {
        //         inpatientGrowth: 4.5,
        //         outpatientGrowth: 6.0,
        //         newPatientGrowth: 5.0,
        //         marketShare: 45,
        //         referralGrowth: 25,
        //         applyCapacityLimits: true,
        //         addBeds: 10,
        //         addChairs: 5,
        //         programs: ['Cardiology']
        //     }
        // },
        // {
        //     id: 'aggressive',
        //     name: 'Aggressive',
        //     data: {
        //         inpatientGrowth: 8.0,
        //         outpatientGrowth: 12.0,
        //         newPatientGrowth: 10.0,
        //         marketShare: 60,
        //         referralGrowth: 40,
        //         applyCapacityLimits: true,
        //         addBeds: 25,
        //         addChairs: 15,
        //         programs: ['Cardiology', 'Neurology']
        //     }
        // }
    ],

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

        // New Scenario Button
        document.getElementById('btn-new-scenario')?.addEventListener('click', () => {
            this.createNewScenario();
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
        document.getElementById('config-title').innerText = `Configure: ${scenario.name}`;

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
            // Default to 'deterministic' if key doesn't exist
            modelSelect.value = d.selectedModel || 'deterministic'; 
        }

        // Boolean/Counters
        const capCheck = document.getElementById('applyCapacityLimits');
        if(capCheck) capCheck.checked = d.applyCapacityLimits;

        document.getElementById('addBeds').value = d.addBeds;
        document.getElementById('addChairs').value = d.addChairs;
        
        // Program Dropdown (Simplified for UI)
        const progSelect = document.getElementById('addPrograms');
        if(progSelect) progSelect.value = d.programs.length > 0 ? d.programs[0] : "";
    },

    saveCurrentScenario() {
        const scenarioIndex = this.scenarios.findIndex(s => s.id === this.activeScenarioId);
        if (scenarioIndex === -1) return;

        // Gather Data from DOM
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

        this.scenarios[scenarioIndex].data = newData;
        
        App.showToast(`Scenario "${this.scenarios[scenarioIndex].name}" saved successfully`, 'success');
    },

    createNewScenario() {
        const name = prompt("Enter scenario name:", "New Scenario");
        if (!name) return;

        const id = name.toLowerCase().replace(/\s+/g, '-');
        
        // Clone Base Case data
        const baseData = JSON.parse(JSON.stringify(this.scenarios[1].data)); 
        
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
    }
};