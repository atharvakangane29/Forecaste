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
        
        if (this.ingestionChart instanceof Chart) {
            this.ingestionChart.destroy();
        }
        
        this.ingestionChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: this.data.pipeline.ingestionTrend.labels,
                datasets: [
                    {
                        label: 'Data Added (Records)',
                        data: this.data.pipeline.ingestionTrend.added,
                        backgroundColor: Palette.blueFantastic,
                        borderRadius: 4,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` +${new Intl.NumberFormat('en-US').format(ctx.raw)} records`
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        grid: { borderDash: [2, 4] },
                        title: { display: true, text: 'Volume Added' }
                    }, 
                    x: { grid: { display: false } }
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
                // labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                labels: this.data.dashboard.charts.capacityUtilization.labels,
                datasets: [
                    {
                        label: 'Bed Utilization (%)',
                        // data: [72, 78, 82, 88, 91, 94, 71, 76, 83, 88, 92, 72],
                        data: this.data.dashboard.charts.capacityUtilization.bedUtil,
                        backgroundColor: Palette.blueFantastic
                    },
                    {
                        label: 'Infusion Chair Utilization (%)',
                        // data: [65, 71, 76, 83, 88, 92, 72, 78, 82, 88, 91, 94],
                        data : this.data.dashboard.charts.capacityUtilization.chairUtil,
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
                        Palette.palladian,
                        Palette.oatmeal,
                        Palette.blueFantastic,
                        Palette.burningFlame
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

    // --- SIMPLE RANDOM GENERATOR ---
    // Handles both Static JSON (7days) and Random Ranges (Slider/30days)
    updateData(arg1, arg2) {
        if (!this.mainChart) return;

        // MODE 1: Static JSON Data (Requested for "7 Days" button)
        if (arg1 === '7days') {
            const dataset = this.data.dashboard.charts.patientVolume.datasets['7days'];
            if (dataset) {
                // Use the static labels from JSON (assuming the first 7 match)
                this.mainChart.data.labels = this.data.dashboard.charts.patientVolume.labels;
                this.mainChart.data.datasets[0].data = dataset.outpatient;
                this.mainChart.data.datasets[1].data = dataset.inpatient;
                this.mainChart.update();
            }
            return;
        }

        // MODE 2: Random Generator (Slider & "30 Days" button)
        const startMs = arg1;
        const endMs = arg2;

        // Calculate days
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((endMs - startMs) / oneDay);
        const days = Math.max(diffDays, 2); // Minimum 2 points

        // Generate Random Data
        const labels = [];
        const inData = [];
        const outData = [];
        
        let current = startMs;
        for (let i = 0; i <= days; i++) {
            const date = new Date(current);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            // Random values
            outData.push(Math.floor(80 + Math.random() * 70));
            inData.push(Math.floor(30 + Math.random() * 30));

            current += oneDay;
        }

        // Update Chart
        this.mainChart.data.labels = labels;
        this.mainChart.data.datasets[0].data = outData;
        this.mainChart.data.datasets[1].data = inData;
        this.mainChart.update('none'); // No animation for performance
    }
    
};