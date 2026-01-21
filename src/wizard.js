/* src/wizard.js */

const Wizard = {
    currentStep: 1,
    
    // --- Step Navigation ---
    goToStep(step, type = null) {
        // Hide all steps first
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        
        // Determine target ID based on selection (Cloud vs File)
        let targetId = `wizard-step-${step}`;
        if(step === 2) {
            targetId = type === 'file' ? 'wizard-step-file' : 'wizard-step-cloud';
        }
        
        // Show target
        const targetEl = document.getElementById(targetId);
        if(targetEl) targetEl.classList.add('active');
        
        // Update Progress Bar UI
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

    // --- Interaction Simulation ---
    simulateConnection() {
        const btn = document.querySelector('#cloud-form button');
        const originalText = btn.innerHTML;
        
        // 1. Loading State
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 animate-spin"></i> Connecting...`;
        btn.disabled = true;
        lucide.createIcons(); // Re-render icons for the loader

        // 2. Mock API Call Delay
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            // Hide Form, Show Success Selection
            document.getElementById('cloud-form').classList.add('hidden');
            document.getElementById('cloud-selection').classList.remove('hidden');
            
            App.showToast('Connected to Databricks Lakehouse', 'success');
            
            // Update Progress
            document.getElementById('wizard-progress').style.width = '100%'; 
            document.getElementById('wizard-step-text').innerText = 'Step 3 of 3';
        }, 1500);
    },

    // --- Completion Handoff ---
    finishWizard() {
        const wizardOverlay = document.getElementById('view-wizard');
        const mainApp = document.getElementById('app-shell');
        
        // Visual transition
        wizardOverlay.style.opacity = '0';
        wizardOverlay.style.transform = 'scale(0.95)';
        wizardOverlay.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            // Remove Wizard from DOM flow
            wizardOverlay.classList.add('hidden');
            
            // Reveal Main App
            mainApp.classList.remove('hidden');
            // Force reflow to enable transition
            void mainApp.offsetWidth; 
            mainApp.style.opacity = '1';
            
            App.showToast('Pipeline Configured Successfully', 'success');
            
            // Start charts now that they are visible
            ChartManager.init();
        }, 500);
    }
};