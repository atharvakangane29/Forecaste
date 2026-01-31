/* src/charts.js */

const Palette = {
    palladian: '#EEE9DF',
    oatmeal: '#C9C1B1',
    blueFantastic: '#2C3B4D',
    burningFlame: '#FFB162',
    truffleTrouble: '#A35139',
    abyssal: '#1B2632'
};

const ChartManager = {
    mainChart: null,
    donutChart: null,
    ingestionChart: null,
    capacityChart: null,
    programChart: null,

    init(data) {
        if (this.initialized) return;
        this.initialized = true;
        this.data = data;

        this.initMainChart();
        this.initDonutChart();
        this.initIngestionChart();
        this.initCapacityChart();
        this.initProgramChart();
    },

    initMainChart() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;
        if (this.mainChart instanceof Chart) this.mainChart.destroy();

        this.mainChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: this.data.dashboard.charts.patientVolume.labels,
                datasets: [
                    {
                        label: 'Outpatient Visits',
                        data: this.data.dashboard.charts.patientVolume.datasets['7days'].outpatient,
                        borderColor: Palette.blueFantastic,
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                            gradient.addColorStop(0, 'rgba(44, 59, 77, 0.2)'); // Blue Fantastic alpha
                            gradient.addColorStop(1, 'rgba(44, 59, 77, 0)');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Inpatient Admits',
                        data: this.data.dashboard.charts.patientVolume.datasets['7days'].inpatient,
                        borderColor: Palette.oatmeal, // Secondary metric
                        borderDash: [5, 5],
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', align: 'end', labels: { color: Palette.abyssal } } },
                scales: { 
                    y: { grid: { borderDash: [2, 4], color: Palette.oatmeal }, ticks: { color: Palette.abyssal } }, 
                    x: { grid: { display: false }, ticks: { color: Palette.abyssal } } 
                }
            }
        });
    },
    

    initDonutChart() {
        const ctx = document.getElementById('donutChart');
        if (!ctx) return;
        if (this.donutChart instanceof Chart) this.donutChart.destroy();

        // Use Palette for segments
        const colors = [Palette.blueFantastic, Palette.burningFlame, Palette.truffleTrouble, Palette.oatmeal];

        this.donutChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: this.data.dashboard.charts.programMix.labels,
                datasets: [{
                    data: this.data.dashboard.charts.programMix.data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false } }
            }
        });
        
        // Update Legend HTML colors manually if needed, or rely on chart
        const mixLegend = document.getElementById('program-mix-legend');
        if (mixLegend) {
             mixLegend.innerHTML = this.data.dashboard.charts.programMix.labels.map((label, i) => `
                <div class="flex justify-between text-xs items-center text-abyssal">
                    <span class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${colors[i]}"></span> ${label}
                    </span> 
                    <span class="font-bold">${this.data.dashboard.charts.programMix.data[i]}%</span>
                </div>
            `).join('');
        }
    },

    initIngestionChart() {
        const ctx = document.getElementById('ingestionChart');
        if(!ctx) return;
        
        // Destroy existing instance if it exists to prevent canvas errors
        if (this.ingestionChart instanceof Chart) {
            this.ingestionChart.destroy();
        }
        
        
        this.ingestionChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: this.data.pipeline.ingestionTrend.labels,
            datasets: [
            {
                label: 'Completeness Score (%)',
                data: this.data.pipeline.ingestionTrend.completeness,
                borderColor: '#0ea5e9',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
                    gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
                    return gradient;
                },
                fill: true, // Changed to true to match style
                tension: 0.4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#0ea5e9',
                pointBorderWidth: 2,
                pointRadius: 4
            },
            {
                label: 'Accuracy (%)',
                data: this.data.pipeline.ingestionTrend.accuracy,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#ef4444',
                pointBorderWidth: 2,
                pointRadius: 4
            }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
            legend: { display: true }, // turn on legend so both lines are distinguishable
            tooltip: { 
                callbacks: { 
                label: (context) => ` ${context.dataset.label}: ${context.raw}%`
                }
            }
            },
            scales: { 
            y: { 
                min: 80, 
                max: 100,
                grid: { borderDash: [2, 4] } 
            }, 
            x: { 
                grid: { display: false } 
            }
            }
        }
    });
},

        initCapacityChart() {
        const ctx = document.getElementById('capacityChart');
        if (!ctx) return;
        if (this.capacityChart instanceof Chart) this.capacityChart.destroy();

        this.capacityChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Bed Utilization (%)',
                        data: [70, 75, 72, 80, 85, 90],
                        backgroundColor: Palette.blueFantastic
                    },
                    {
                        label: 'Infusion Chair Utilization (%)',
                        data: [55, 60, 58, 62, 65, 68],
                        backgroundColor: Palette.burningFlame // Accent
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: Palette.abyssal } } },
                scales: {
                    y: { max: 100, ticks: { color: Palette.abyssal }, grid: { borderDash: [2, 4], color: Palette.oatmeal } },
                    x: { grid: { display: false }, ticks: { color: Palette.abyssal } }
                }
            }
        });
    },
        initProgramChart() {
        const ctx = document.getElementById('programChart');
        if (!ctx) return;

        if (this.programChart instanceof Chart) {
            this.programChart.destroy();
        }

        this.programChart = new Chart(ctx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Chemotherapy', 'Radiation', 'Immunotherapy', 'Surgery'],
                datasets: [{
                    data: [420, 310, 520, 170],
                    backgroundColor: [
                        '#3b82f6',
                        '#f59e0b',
                        '#10b981',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    updateData(period) {
        if (!this.mainChart || !this.data) return;
        
        const key = period == '30' ? '30days' : '7days';
        const dataset = this.data.dashboard.charts.patientVolume.datasets[key];

        if (dataset) {
            this.mainChart.data.datasets[0].data = dataset.outpatient;
            this.mainChart.data.datasets[1].data = dataset.inpatient;
            this.mainChart.update();
        }
    }
    
};