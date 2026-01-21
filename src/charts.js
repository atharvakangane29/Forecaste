/* src/charts.js */

const ChartManager = {
    mainChart: null,
    donutChart: null,

    init() {
        this.initMainChart();
        this.initDonutChart();
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
                        borderColor: '#2563eb', // Blue-600
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
                        borderColor: '#94a3b8', // Slate-400
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

    // Called by main App when filters change
    updateData(period) {
        if (!this.mainChart) return;
        
        // Mock Data Simulation
        const newData = period == '7' 
            ? [65, 59, 80, 81, 56, 55, 40] 
            : [120, 190, 300, 50, 20, 30, 45];
        
        this.mainChart.data.datasets[0].data = newData;
        this.mainChart.update();
    }
};