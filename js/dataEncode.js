// dataEncode.js - Encode and normalize data

const DataEncoder = {
    // Normalize numeric value using 3-point piecewise linear scale
    normalizeNumeric(value, min, avg, max, reverse = false) {
        const x = parseFloat(value);
        
        // If reverse is true, swap min and max to invert the mapping
        if (reverse) {
            const temp = min;
            min = max;
            max = temp;
        }
        
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

            if (!mapping) {
                console.error(`Missing mapping for column ${col} (${cName})`);
                console.error('Available mappings:', Object.keys(cellMapping));
                console.error('Feature columns:', featureColumns);
                throw new Error(`Missing mapping for column: ${col}. Please reconfigure your mappings.`);
            }

            let encodedValue;
            
            if (mapping.type === 'numeric') {
                // Normalize numeric column
                encodedValue = this.normalizeNumeric(
                    value,
                    mapping.min,
                    mapping.avg,
                    mapping.max,
                    mapping.reverse || false
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
        
        console.log('🔍 Result column name:', resultColumn);
        console.log('🔍 Result column cName:', resultCName);
        console.log('🔍 Result column mapping:', resultMapping);
        console.log('🔍 Result column mapping keys:', Object.keys(resultMapping));
        console.log('🔍 Sample result values from data:', data.slice(0, 5).map(row => `"${row[resultColumn]}"`));
        
        const y = data.map((row, idx) => {
            const rawValue = row[resultColumn];
            const value = resultMapping[rawValue];
            if (value === undefined) {
                console.error(`Row ${idx}: Missing mapping for result value: "${rawValue}" (type: ${typeof rawValue})`);
                console.error(`Available keys:`, Object.keys(resultMapping).map(k => `"${k}" (type: ${typeof k})`));
            }
            return value;
        });
        
        console.log('🔍 Encoded y values:', y);
        console.log('🔍 Unique y values:', [...new Set(y)]);
        
        return { encoded, y };
    },

    // Get unique encoded values for result column
    getUniqueValues(cellMapping, featureColumns) {
        const resultCName = `C${featureColumns.length + 1}`;
        const resultMapping = cellMapping[resultCName];
        // Filter out non-numeric properties like 'exponent' and 'type'
        return Object.entries(resultMapping)
            .filter(([key]) => key !== 'exponent' && key !== 'type')
            .map(([, val]) => val)
            .sort((a, b) => a - b);
    },

    // Get reverse mapping for result column
    getReverseMapping(cellMapping, featureColumns) {
        const resultCName = `C${featureColumns.length + 1}`;
        const resultMapping = cellMapping[resultCName];
        const reverse = {};
        Object.entries(resultMapping).forEach(([key, val]) => {
            // Skip non-category properties
            if (key !== 'exponent' && key !== 'type') {
                reverse[val] = key;
            }
        });
        return reverse;
    }
};
