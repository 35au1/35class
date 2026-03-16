// dataClean.js - Clean and validate data

const DataCleaner = {
    // Clean training data
    cleanTraining(data, featureColumns, resultColumn) {
        let cleaned = [...data];
        const stats = {
            initial: cleaned.length,
            blanks: 0,
            duplicates: 0,
            final: 0
        };

        // Add row_id if missing
        cleaned = cleaned.map((row, idx) => ({
            row_id: row.row_id || idx,
            ...row
        }));

        // Remove rows with blank values
        cleaned = cleaned.filter(row => {
            const hasBlank = [...featureColumns, resultColumn].some(col => {
                return !row[col] || row[col].toString().trim() === '';
            });
            if (hasBlank) stats.blanks++;
            return !hasBlank;
        });

        // Remove duplicates
        const seen = new Set();
        cleaned = cleaned.filter(row => {
            const key = featureColumns.map(col => row[col]).join('|');
            if (seen.has(key)) {
                stats.duplicates++;
                return false;
            }
            seen.add(key);
            return true;
        });

        stats.final = cleaned.length;
        return { data: cleaned, stats };
    },

    // Clean test data
    cleanTest(data, trainingData, cellMapping, featureColumns, resultColumn) {
        let cleaned = [...data];
        const stats = {
            initial: cleaned.length,
            blanks: 0,
            invalid: 0,
            final: 0
        };

        // Add row_id if missing
        cleaned = cleaned.map((row, idx) => ({
            row_id: row.row_id || idx,
            ...row
        }));

        // Remove rows with blank feature values (result can be empty)
        cleaned = cleaned.filter(row => {
            const hasBlank = featureColumns.some(col => {
                return !row[col] || row[col].toString().trim() === '';
            });
            if (hasBlank) stats.blanks++;
            return !hasBlank;
        });

        // Validate values against cell mapping
        cleaned = cleaned.filter(row => {
            let valid = true;
            featureColumns.forEach((col, idx) => {
                const cName = `C${idx + 1}`;
                const value = row[col];
                const mapping = cellMapping[cName];

                if (mapping.type === 'numeric') {
                    // Check if it's a valid number
                    if (isNaN(parseFloat(value))) {
                        valid = false;
                    }
                } else {
                    // Check if category exists in mapping
                    if (!mapping.hasOwnProperty(value)) {
                        valid = false;
                    }
                }
            });
            if (!valid) stats.invalid++;
            return valid;
        });

        // NO duplicate removal - user wants predictions for ALL valid rows

        stats.final = cleaned.length;
        return { data: cleaned, stats };
    }
};
