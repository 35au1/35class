// storage.js - Handle localStorage for session persistence

const Storage = {
    // Keys
    KEYS: {
        TRAINING_DATA: 'training_data',
        CELL_MAPPING: 'cell_mapping',
        TRAINED_MODELS: 'trained_models',
        FEATURE_COLUMNS: 'feature_columns',
        RESULT_COLUMN: 'result_column',
        COLUMN_TYPES: 'column_types',
        CONFIG_CACHE: 'config_cache' // New: stores user configuration
    },

    // Save data
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },

    // Load data
    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage error:', e);
            return null;
        }
    },

    // Clear all data
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    },

    // Check if training data exists
    hasTrainingData() {
        return this.load(this.KEYS.TRAINING_DATA) !== null;
    },

    // Check if models are trained
    hasTrainedModels() {
        return this.load(this.KEYS.TRAINED_MODELS) !== null;
    },

    // Save configuration cache (column types and mappings)
    saveConfigCache(config) {
        const cacheData = {
            timestamp: new Date().toISOString(),
            resultColumn: config.resultColumn,
            featureColumns: config.featureColumns,
            columnTypes: config.columnTypes,
            cellMapping: config.cellMapping,
            columnNames: [...config.featureColumns, config.resultColumn].sort() // For validation
        };
        return this.save(this.KEYS.CONFIG_CACHE, cacheData);
    },

    // Load configuration cache
    loadConfigCache() {
        return this.load(this.KEYS.CONFIG_CACHE);
    },

    // Validate if cached config matches current CSV
    validateConfigCache(csvData, cachedConfig) {
        if (!csvData || !cachedConfig) {
            return { valid: false, reason: 'Missing data' };
        }

        // Get column names from CSV (excluding row_id)
        const csvColumns = Object.keys(csvData[0]).filter(col => col !== 'row_id').sort();
        const cachedColumns = cachedConfig.columnNames;

        // Check if column names match
        if (csvColumns.length !== cachedColumns.length) {
            return { 
                valid: false, 
                reason: `Column count mismatch: CSV has ${csvColumns.length} columns, cached config has ${cachedColumns.length}` 
            };
        }

        for (let i = 0; i < csvColumns.length; i++) {
            if (csvColumns[i] !== cachedColumns[i]) {
                return { 
                    valid: false, 
                    reason: `Column name mismatch: CSV has "${csvColumns[i]}", cached config expects "${cachedColumns[i]}"` 
                };
            }
        }

        // Validate that result column exists
        if (!csvColumns.includes(cachedConfig.resultColumn)) {
            return { 
                valid: false, 
                reason: `Result column "${cachedConfig.resultColumn}" not found in CSV` 
            };
        }

        // Validate that all feature columns exist
        for (const col of cachedConfig.featureColumns) {
            if (!csvColumns.includes(col)) {
                return { 
                    valid: false, 
                    reason: `Feature column "${col}" not found in CSV` 
                };
            }
        }

        return { valid: true, reason: 'Configuration matches CSV structure' };
    },

    // Check if config cache exists
    hasConfigCache() {
        return this.loadConfigCache() !== null;
    },

    // Clear only config cache
    clearConfigCache() {
        localStorage.removeItem(this.KEYS.CONFIG_CACHE);
    }
};
