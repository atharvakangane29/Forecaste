/* src/wizard.js */

const Wizard = {
    currentStep: 1,
    
    // --- Step Navigation ---
    goToStep(step, type = null) {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        
        let targetId = `wizard-step-${step}`;
        if(step === 2) {
            targetId = type === 'file' ? 'wizard-step-file' : 'wizard-step-cloud';
        }
        
        const targetEl = document.getElementById(targetId);
        if(targetEl) targetEl.classList.add('active');
        
        // Progress UI
        const prog = document.getElementById('wizard-progress');
        const text = document.getElementById('wizard-step-text');
        
        if(step === 1) { 
            prog.style.width = '33%'; 
            text.innerText = 'Step 1 of 3'; 
        } else if(step === 2) { 
            prog.style.width = '66%'; 
            text.innerText = 'Step 2 of 3'; 
        }
    },

    // --- File Upload Logic ---
    handleFileBrowse() {
        App.showToast('Uploading: oncology_data_v2.xlsx...', 'info');
        
        // Simulate upload delay then move to finish
        setTimeout(() => {
            App.showToast('File Uploaded Successfully', 'success');
            
            document.getElementById('wizard-progress').style.width = '100%';
            document.getElementById('wizard-step-text').innerText = 'Step 3 of 3';
            
            setTimeout(() => this.finishWizard(), 500);
        }, 1500);
    },

    // --- Cloud Connection Simulation ---
    simulateConnection() {
        const btn = document.querySelector('#cloud-form button');
        const originalText = btn.innerHTML;
        
        // Loading State
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 animate-spin"></i> Connecting...`;
        btn.disabled = true;
        lucide.createIcons();

        // Mock Delay
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            document.getElementById('cloud-form').classList.add('hidden');
            document.getElementById('cloud-selection').classList.remove('hidden');
            
            App.showToast('Connected to Databricks Lakehouse', 'success');
            
            document.getElementById('wizard-progress').style.width = '100%'; 
            document.getElementById('wizard-step-text').innerText = 'Step 3 of 3';
        }, 1500);
    },

    // --- Completion Handoff ---
    finishWizard() {
        const wizardOverlay = document.getElementById('view-wizard');
        const mainApp = document.getElementById('app-shell');
        
        wizardOverlay.style.opacity = '0';
        wizardOverlay.style.transform = 'scale(0.95)';
        wizardOverlay.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            wizardOverlay.classList.add('hidden');
            mainApp.classList.remove('hidden');
            void mainApp.offsetWidth; 
            mainApp.style.opacity = '1';
            
            App.showToast('Pipeline Configured Successfully', 'success');
            // Requirement 1: Data Loaded Notification
            setTimeout(() => {
                App.showToast("Data loaded successfully. Please look at the data KPI's and schema.", 'info');
            }, 1000);
            
            // Initialize Charts
            ChartManager.init();

            // CHANGE: Force switch to Pipeline view immediately
            App.switchView('pipeline'); 
            
            // Update the sidebar navigation styling manually if needed
            document.querySelectorAll('[data-view]').forEach(l => l.classList.remove('active-nav', 'bg-slate-800', 'text-white'));
            const pipelineNav = document.querySelector('[data-view="pipeline"]');
            if(pipelineNav) pipelineNav.classList.add('active-nav', 'bg-slate-800', 'text-white');

        }, 500);
    }
};