/* src/dataService.js */

const DataService = {
    _data: null,

    /**
     * Fetches the JSON data once.
     * @returns {Promise<Object>} The full data object
     */
    async init() {
        if (this._data) return this._data;

        try {
            const response = await fetch("data/mock-stats.json");
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
            }
            this._data = await response.json();
            console.log('DataService: Data loaded successfully', this._data);
            return this._data;
        } catch (error) {
            console.error('DataService Critical Error:', error);
            throw error; // Propagate to App for UI handling
        }
    },

    /**
     * Safe accessor for nested data properties.
     * Usage: DataService.get('dashboard.kpis')
     * @param {string} path - Dot-notation path (optional)
     */
    get(path = '') {
        if (!this._data) {
            console.warn('DataService: Data not yet loaded.');
            return null;
        }
        
        if (!path) return this._data;

        // Traverse dot notation (e.g., "dashboard.charts.patientVolume")
        return path.split('.').reduce((acc, part) => acc && acc[part], this._data);
    }
};