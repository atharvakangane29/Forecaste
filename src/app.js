/* src/app.js */

const App = {
    state: {
        view: 'dashboard'
    },

    init() {
        // Init icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Init modules safely
        if (typeof SchemaBuilder !== 'undefined') {
            SchemaBuilder.init();
        }

        if (typeof ScenarioManager !== 'undefined') {
            ScenarioManager.init();
        }

        // Show main app shell
        this.showAppShell();

        // Render initial view
        this.switchView(this.state.view);

        // Bind UI events
        this.bindEvents();
    },

    showAppShell() {
        const shell = document.getElementById('app-shell');
        if (!shell) return;

        shell.classList.remove('hidden');
        requestAnimationFrame(() => {
            shell.classList.remove('opacity-0');
        });
    },

    bindEvents() {
        // Sidebar Navigation
        document.querySelectorAll('[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                const targetView = e.currentTarget.dataset.view;
                if (!targetView) return;

                this.switchView(targetView);

                // Active nav state
                document.querySelectorAll('[data-view]').forEach(l => {
                    l.classList.remove('active-nav', 'bg-slate-800', 'text-white');
                });

                e.currentTarget.classList.add(
                    'active-nav',
                    'bg-slate-800',
                    'text-white'
                );
            });
        });

        // Dashboard filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.className =
                        'px-4 py-1.5 text-xs font-bold rounded bg-slate-100 text-slate-500 hover:bg-slate-200 filter-btn';
                });

                e.currentTarget.className =
                    'px-4 py-1.5 text-xs font-bold rounded bg-blue-100 text-blue-700 filter-btn';

                if (typeof ChartManager !== 'undefined') {
                    ChartManager.updateData(e.currentTarget.dataset.period);
                }

                this.showToast(
                    `Showing data for ${e.currentTarget.dataset.period} days`
                );
            });
        });
    },

    switchView(viewName) {
        const views = [
            'dashboard',
            'pipeline',
            'scenario-builder',
            'forecasting',
            'scenario-comparison'
        ];

        // Hide all views
        views.forEach(v => {
            const el = document.getElementById(`view-${v}`);
            if (el) el.classList.add('hidden');
        });

        // Show target view
        const target = document.getElementById(`view-${viewName}`);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('animate-fade-in');
        }

        // Update page title
        const titles = {
            dashboard: 'Clinical Command Center',
            pipeline: 'Data Pipeline Configuration',
            'scenario-builder': 'Scenario Builder',
            forecasting: 'Forecasting',
            'scenario-comparison': 'Scenario Comparison'
        };

        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.textContent = titles[viewName] || 'Platform A';
        }

        // Persist state
        this.state.view = viewName;
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `
            mb-3 p-4 rounded-lg shadow-lg text-white text-sm font-medium
            flex items-center gap-2 transition-opacity duration-300
            ${type === 'success' ? 'bg-slate-800' : 'bg-blue-600'}
        `;

        toast.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : 'info'}"
               class="w-4 h-4"></i>
            ${message}
        `;

        container.appendChild(toast);

        if (window.lucide) {
            lucide.createIcons();
        }

        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
