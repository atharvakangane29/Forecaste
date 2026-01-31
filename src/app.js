/* src/app.js */

window.AuthFlow = {
    init() {
        // Ensure Intro is visible, others hidden on fresh load
        document.getElementById('view-intro').classList.remove('hidden');
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-wizard').classList.add('hidden');
    },

    goToLogin() {
        const intro = document.getElementById('view-intro');
        const login = document.getElementById('view-login');

        // Transition
        intro.classList.add('opacity-0');
        setTimeout(() => {
            intro.classList.add('hidden');
            login.classList.remove('hidden');
            // Animate login entrance
            login.classList.add('animate-fade-in');
        }, 500);
    },

    handleLogin() {
        const login = document.getElementById('view-login');
        const btn = login.querySelector('button');
        
        // Simulate loading
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-5 animate-spin"></i>`;
        
        setTimeout(() => {
            // Success transition
            login.classList.add('opacity-0');
            setTimeout(() => {
                login.classList.add('hidden');
                this.startWizard();
            }, 500);
        }, 1000);
    },

    startWizard() {
        const wizard = document.getElementById('view-wizard');
        wizard.classList.remove('hidden');
        wizard.classList.add('animate-fade-in');
        
        // Ensure Lucide icons render in the newly visible wizard
        if (window.lucide) lucide.createIcons();
    }
};

const App = {
    state: {
        view: 'dashboard',
        ignoreSliderUpdate: false
    },

    async init() {
        try {
            // 1. Fetch Data First (Single Source of Truth)
            const data = await DataService.init();

            // 2. Bind UI events
            this.bindEvents();
            this.initDateSlider();

            // 3. Render Static Data (KPIs, Tables, Insights)
            this.renderStaticData(data);

            // 4. Init icons
            if (window.lucide) {
                lucide.createIcons();
            }

            // 5. Show main app shell
            this.showAppShell();

            // 6. Render initial view
            this.switchView(this.state.view);

            // 7. Init modules safely, passing data where needed
            // Note: We will refactor these modules to accept 'data' in the next steps
            this.safeInit('ChartManager', () => ChartManager.init(data));
            this.safeInit('SchemaBuilder', () => SchemaBuilder.init());
            this.safeInit('ScenarioManager', () => ScenarioManager.init(data));
            this.safeInit('ForecastManager', () => ForecastManager.init(data));
            this.safeInit('ComparisonManager', () => ComparisonManager.init(data));
            this.safeInit('ReportManager', () => ReportManager.init(data));

        } catch (error) {
            console.error("App Init Failed:", error);
            document.body.innerHTML = `<div class="p-10 text-red-600 font-bold">Critical Error: Failed to load application data.</div>`;
        }
    },

    // Helper to prevent one module crash from breaking the whole app
    safeInit(name, initFn) {
        if (typeof window[name] !== 'undefined' || typeof eval(name) !== 'undefined') {
            try {
                initFn();
            } catch (error) {
                console.warn(`Failed to initialize ${name}. Check console for details.`, error);
            }
        }
    },

    renderStaticData(data) {
        // --- 1. Dashboard KPIs ---
        const kpiContainer = document.getElementById('dashboard-kpi-container');
        if (kpiContainer && data.dashboard.kpis) {
            kpiContainer.innerHTML = data.dashboard.kpis.map(kpi => {
                // Logic: Up = Blue Fantastic, Warning = Burning Flame, Down/Alert = Truffle Trouble
                let iconColor, trendColor;

                if (kpi.trendDirection === 'up') {
                    iconColor = 'bg-palladian text-green-600';
                    trendColor = 'text-green-700 bg-palladian border border-oatmeal';
                } else if (kpi.trendDirection === 'warning') {
                    iconColor = 'bg-palladian text-burning-flame';
                    trendColor = 'text-burning-flame bg-palladian border border-oatmeal';
                } else {
                    iconColor = 'bg-palladian text-red-600';
                    trendColor = 'text-red-700 bg-palladian border border-oatmeal';
                }
                
                return `
                <div class="bg-white p-6 rounded-xl border border-oatmeal shadow-sm">
                    <div class="flex justify-between items-start mb-4">
                        <div class="p-2 ${iconColor} rounded-lg"><i data-lucide="${kpi.icon}" class="w-5 h-5"></i></div>
                        <span class="text-xs font-bold ${trendColor} px-2 py-1 rounded">${kpi.trend}</span>
                    </div>
                    <h4 class="text-abyssal opacity-60 text-xs font-bold uppercase tracking-wide">${kpi.label}</h4>
                    <p class="text-3xl font-bold text-abyssal mt-2">${kpi.value}</p>
                </div>`;
            }).join('');
        }

        // --- 2. Program Mix ---
        const mixTotal = document.getElementById('program-mix-total');
        if (mixTotal) mixTotal.innerText = data.dashboard.charts.programMix.totalPatients;

        const mixLegend = document.getElementById('program-mix-legend');
        if (mixLegend) {
            const { labels, data: values, colors } = data.dashboard.charts.programMix;
            mixLegend.innerHTML = labels.map((label, i) => `
                <div class="flex justify-between text-xs items-center">
                    <span class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${colors[i]}"></span> ${label}
                    </span> 
                    <span class="font-bold">${values[i]}%</span>
                </div>
            `).join('');
        }

        // --- 3. Insights ---
        const insightsContainer = document.getElementById('dashboard-insights-container');
        if (insightsContainer && data.dashboard.insights) {
            insightsContainer.innerHTML = data.dashboard.insights.map(insight => {
                const color = insight.type === 'positive' ? 'text-blue-fantastic' :
                              insight.type === 'warning' ? 'text-burning-flame' : 'text-abyssal';
                const symbol = insight.type === 'positive' ? '▲' :
                               insight.type === 'warning' ? '●' : '■';
                return `
                <li class="flex items-start gap-3">
                    <span class="mt-1 ${color}">${symbol}</span>
                    <p class="text-abyssal text-sm">${insight.text}</p>
                </li>`;
            }).join('');
        }

        // --- 4. Pipeline KPIs ---
        const pipelineKpiContainer = document.getElementById('pipeline-kpi-container');
        if (pipelineKpiContainer && data.pipeline.kpis) {
            pipelineKpiContainer.innerHTML = data.pipeline.kpis.map(kpi => {
                const trendClass = kpi.trendColor === 'red' ? 'bg-red-50 text-red-600 border-red-700' : 'bg-green-50 text-green-600 border-green-700';
                return `
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">${kpi.label}</p>
                        <h3 class="text-3xl font-bold text-slate-800 mt-1">${kpi.value}</h3>
                    </div>
                    <span class="${trendClass} text-xs font-bold px-2 py-1 rounded border">${kpi.trend}</span>
                </div>`;
            }).join('');
        }

        // --- 5. Pipeline Data Sources ---
        const sourcesBody = document.getElementById('pipeline-sources-body');
        if (sourcesBody && data.pipeline.dataSources) {
            sourcesBody.innerHTML = data.pipeline.dataSources.map(source => `
                <tr class="hover:bg-slate-50">
                    <td class="px-6 py-4 font-medium text-slate-900">${source.system}</td>
                    <td class="px-6 py-4 text-slate-500">${source.type}</td>
                    <td class="px-6 py-4"><span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">${source.status}</span></td>
                    <td class="px-6 py-4 text-slate-500">${source.lastSync}</td>
                    <td class="px-6 py-4 text-right font-mono">${source.records}</td>
                </tr>
            `).join('');
        }
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
        // Filter Buttons Logic
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 1. Highlight Button
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.className = 'px-4 py-1.5 text-xs font-bold rounded bg-slate-100 text-slate-500 hover:bg-slate-200 filter-btn';
                });
                e.currentTarget.className = 'px-4 py-1.5 text-xs font-bold rounded bg-blue-100 text-blue-700 filter-btn';

                const days = parseInt(e.currentTarget.dataset.period);
                
                if (this.dateSlider) {
                    const end = new Date().getTime();
                    const start = end - (days * 24 * 60 * 60 * 1000); 

                    // LOGIC SPLIT:
                    if (days === 7) {
                        // For 7 Days: Use JSON Data
                        this.state.ignoreSliderUpdate = true; // Prevent slider from generating random data
                        this.dateSlider.noUiSlider.set([start, end]); // Move handles visually
                        
                        if (typeof ChartManager !== 'undefined') {
                            ChartManager.updateData('7days'); // Call static JSON mode
                        }
                        
                        // Re-enable slider logic after a moment
                        setTimeout(() => { this.state.ignoreSliderUpdate = false; }, 200);

                    } else {
                        // For 30 Days (or others): Use Random Data
                        this.state.ignoreSliderUpdate = false;
                        this.dateSlider.noUiSlider.set([start, end]); // This triggers 'update' event below
                    }
                    
                    this.showToast(`Showing last ${days} days`);
                }
            });
        });
    },

    initDateSlider() {
        const slider = document.getElementById('date-slider');
        if (!slider) return;

        // Configuration: Extended Range (Jan 2023 - Dec 2025)
        const timestamp = (str) => new Date(str).getTime();
        const minDate = timestamp('2023-01-01');
        const maxDate = timestamp('2025-12-31');
        
        // Default: Last 30 days
        const endDefault = new Date().getTime(); // Today
        const startDefault = endDefault - (30 * 24 * 60 * 60 * 1000); 

        // Create Slider
        noUiSlider.create(slider, {
            range: { min: minDate, max: maxDate },
            start: [startDefault, endDefault],
            connect: true,
            step: 24 * 60 * 60 * 1000, // 1 day step
            format: {
                to: (val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                from: (val) => val
            }
        });

        this.dateSlider = slider; // Save reference for button access

        // Event: Update Text Labels while dragging
        const dateStart = document.getElementById('slider-date-start');
        const dateEnd = document.getElementById('slider-date-end');

        // Event: 'update' fires continuously while dragging
        slider.noUiSlider.on('update', (values, handle) => {
            // 1. Update HTML Labels (The dates below the slider)
            // We use generic indices [0] and [1] to handle both handles
            if (dateStart) dateStart.innerText = values[0];
            if (dateEnd) dateEnd.innerText = values[1];

            // 2. Real-Time Chart Update (Random)
            // Only run if we aren't ignoring updates (e.g. during 7-day button click)
            if (!this.state.ignoreSliderUpdate) {
                const startTs = new Date(values[0]).getTime();
                const endTs = new Date(values[1]).getTime();

                if (typeof ChartManager !== 'undefined') {
                    ChartManager.updateData(startTs, endTs);
                }
            }
        });

        // Event: 'change' fires only when you drop the handle
        slider.noUiSlider.on('change', (values) => {
            const startTs = new Date(values[0]).getTime();
            const endTs = new Date(values[1]).getTime();
            const days = Math.round((endTs - startTs) / (24 * 60 * 60 * 1000));
            
            // Show notification on drop
            this.showToast(`Range Selected: ${days} days`);
        });
    },

    switchView(viewName) {
        const views = [
            'dashboard',
            'pipeline',
            'scenario-builder',
            'forecasting',
            'scenario-comparison',
            'Export-&-Reports'
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
            'scenario-comparison': 'Scenario Comparison',
            'Export-&-Reports': 'Export & Strategic Reporting'
        };

        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.textContent = titles[viewName] || 'Platform A';
        }

        // --- FIX: Refresh Forecast Charts when tab is opened ---
        // if (viewName === 'forecasting' && typeof ForecastManager !== 'undefined') {
        //     // Small delay ensures the div is fully visible/sized before drawing
        //     setTimeout(() => {
        //         ForecastManager.updateCharts();
        //     }, 50);
        // }

        if (viewName === 'forecasting') {
        setTimeout(() => {
            if (typeof ForecastManager !== 'undefined') {
                ForecastManager.updateCharts();
            }
            if (typeof ChartManager !== 'undefined') {
                ChartManager.init();
            }
        }, 100);
    }

        if (viewName === 'scenario-comparison') {
             setTimeout(() => {
                if (typeof ComparisonManager !== 'undefined') {
                    // Refresh in case scenarios changed
                    ComparisonManager.populateDropdowns(); 
                    ComparisonManager.updateComparison();
                }
            }, 100);
        }

        if (viewName === 'Export-&-Reports') {
             setTimeout(() => {
                if (typeof ReportManager !== 'undefined') {
                    ReportManager.populateDropdown(); 
                    ReportManager.updateReportPreview(ScenarioManager.activeScenarioId);
                    ReportManager.updateExportPreview();
                }
            }, 100);
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

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Authentication Flow (Intro -> Login -> Wizard)
    AuthFlow.init();
    
    // 2. Initialize Main App (Background loading)
    App.init(); 
});