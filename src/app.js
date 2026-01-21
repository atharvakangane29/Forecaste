/* src/app.js */

const App = {
    state: {
        view: 'dashboard' 
    },

    init() {
        // 1. Initialize Icon Library
        lucide.createIcons();

        // 2. Initialize Sub-Modules
        // Note: ChartManager is lazy-loaded in Wizard.finishWizard() 
        // to prevent canvas errors while hidden.
        SchemaBuilder.init();

        // 3. Bind Global Event Listeners
        this.bindEvents();
    },

    bindEvents() {
        // Sidebar Navigation
        document.querySelectorAll('[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetView = e.currentTarget.dataset.view;
                this.switchView(targetView);
                
                // Active Class Toggling
                document.querySelectorAll('[data-view]').forEach(l => 
                    l.classList.remove('active-nav', 'bg-slate-800', 'text-white'));
                e.currentTarget.classList.add('active-nav', 'bg-slate-800', 'text-white');
            });
        });

        // Dashboard Filter Buttons (7 Days / 30 Days)
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // UI Reset
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.className = 'px-3 py-1 text-xs font-bold rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 filter-btn';
                });
                // UI Active
                e.target.className = 'px-3 py-1 text-xs font-bold rounded-md bg-blue-100 text-blue-700 filter-btn';
                
                // Logic Trigger
                ChartManager.updateData(e.target.dataset.period);
                this.showToast(`Showing data for ${e.target.dataset.period} days`);
            });
        });
    },

    // --- View Switcher Logic ---
    switchView(viewName) {
        // Hide all views
        document.getElementById('view-dashboard').classList.add('hidden');
        document.getElementById('view-pipeline').classList.add('hidden');
        
        // Show target view
        const target = document.getElementById(`view-${viewName}`);
        target.classList.remove('hidden');
        target.classList.add('animate-fade-in');

        // Update Header Title
        const titles = {
            'dashboard': 'Clinical Command Center',
            'pipeline': 'Data Pipeline Configuration'
        };
        document.getElementById('page-title').innerText = titles[viewName];
    },

    // --- Global Toast Notification Utility ---
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        
        // Create Element
        const toast = document.createElement('div');
        toast.className = `toast mb-3 p-4 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-slate-800' : 'bg-blue-600'}`;
        toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'info'}" class="w-4 h-4"></i> ${message}`;
        
        // Append to DOM
        container.appendChild(toast);
        lucide.createIcons(); // Render icon in new element

        // Animation Sequence
        requestAnimationFrame(() => toast.classList.add('show'));
        
        // Auto Dismiss
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300); // Wait for transition out
        }, 3000);
    }
};

// --- Bootstrapper ---
document.addEventListener('DOMContentLoaded', () => App.init());