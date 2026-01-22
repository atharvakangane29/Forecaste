/* src/charts.js */

const ChartManager = {
    mainChart: null,
    donutChart: null,
    ingestionChart: null,

    init() {
        this.initMainChart();
        this.initDonutChart();
        this.initIngestionChart();
    },

    initMainChart() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;

        this.mainChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Outpatient Visits',
                        data: [65, 59, 80, 81, 56, 55, 40],
                        borderColor: '#2563eb', 
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                            gradient.addColorStop(0, 'rgba(37, 99, 235, 0.2)');
                            gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Inpatient Admits',
                        data: [28, 48, 40, 19, 26, 27, 30],
                        borderColor: '#94a3b8',
                        borderDash: [5, 5],
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', align: 'end' } },
                scales: { 
                    y: { grid: { borderDash: [2, 4] } }, 
                    x: { grid: { display: false } } 
                }
            }
        });
    },

    initDonutChart() {
        const ctx = document.getElementById('donutChart');
        if (!ctx) return;

        this.donutChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['MedOnc', 'SurgOnc', 'RadOnc'],
                datasets: [{
                    data: [55, 25, 20],
                    backgroundColor: ['#2563eb', '#9333ea', '#06b6d4'],
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
            labels: ['2024-02-01', '2024-02-08', '2024-02-15', '2024-02-22'],
            datasets: [
            {
                label: 'Completeness Score (%)',
                data: [92.5, 94.2, 93.8, 98.5],
                borderColor: '#0ea5e9',
                backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
                gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
                return gradient;
                },
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#0ea5e9',
                pointBorderWidth: 2,
                pointRadius: 4
            },
            // 🔴 NEW: Accuracy line (red)
            {
                label: 'Accuracy (%)',
                data: [88.3, 91.7, 89.5, 95.2], // 4 sample % values
                borderColor: '#ef4444',          // Tailwind red-500
                // backgroundColor: 'rgba(239, 68, 68, 0.15)',
                // fill: false,                     // keep it as a line only
                backgroundColor: 'transparent', // ⬅ remove gradient
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

    updateData(period) {
        if (!this.mainChart) return;
        const newData = period == '7' ? [65, 59, 80, 81, 56, 55, 40] : [120, 190, 300, 50, 20, 30, 45];
        this.mainChart.data.datasets[0].data = newData;
        this.mainChart.update();
    }
};