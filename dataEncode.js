// dataEncode.js - Encode and normalize data

const DataEncoder = {
    // Normalize numeric value using 3-point piecewise linear scale
    normalizeNumeric(value, min, avg, max) {
        const x = parseFloat(value);
        
        if (x <= min) {
            return 0.2;
        } else if (x <= avg) {
            // Linear interpolation: [min, avg] → [0.2, 1.0]
            return 0.2 + (x - min) / (avg - min) * 0.8;
        } else if (x <= max) {
            // Linear interpolation: [avg, max] → [1.0, 2.0]
            return 1.0 + (x - avg) / (max - avg) * 1.0;
        } else {
            return 2.0;
        }
    },

    // Encode single row
    encodeRow(row, cellMapping, featureColumns) {
        const encoded = { ...row };
        
        featureColumns.forEach((col, idx) => {
            const cName = `C${idx + 1}`;
            const mapping = cellMapping[cName];
            const value = row[col];

            let encodedValue;
            
            if (mapping.type === 'numeric') {
                // Normalize numeric column
                encodedValue = this.normalizeNumeric(
                    value,
                    mapping.min,
                    mapping.avg,
                    mapping.max
                );
            } else {
                // Encode categorical column
                encodedValue = mapping[value];
            }
            
            // Don't apply exponent here - it will be used for coefficient scaling instead
            
            encoded[col] = encodedValue;
        });

        return encoded;
    },

    // Encode dataset
    encodeData(data, cellMapping, featureColumns, resultColumn) {
        const encoded = data.map(row => this.encodeRow(row, cellMapping, featureColumns));
        
        // Encode result column
        const resultCName = `C${featureColumns.length + 1}`;
        const resultMapping = cellMapping[resultCName];
        
        const y = data.map(row => resultMapping[row[resultColumn]]);
        
        return { encoded, y };
    },

    // Get unique encoded values for result column
    getUniqueValues(cellMapping, featureColumns) {
        const resultCName = `C${featureColumns.length + 1}`;
        const resultMapping = cellMapping[resultCName];
        return Object.values(resultMapping).sort((a, b) => a - b);
    },

    // Get reverse mapping for result column
    getReverseMapping(cellMapping, featureColumns) {
        const resultCName = `C${featureColumns.length + 1}`;
        const resultMapping = cellMapping[resultCName];
        const reverse = {};
        Object.entries(resultMapping).forEach(([key, val]) => {
            reverse[val] = key;
        });
        return reverse;
    }
};
