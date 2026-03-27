// csvParser.js - Parse CSV files using PapaParse

const CSVParser = {
    // Parse CSV file
    parse(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                delimiter: ';',
                transform: (value) => {
                    // Trim all string values to remove leading/trailing whitespace
                    return typeof value === 'string' ? value.trim() : value;
                },
                complete: (results) => {
                    if (results.errors.length > 0) {
                        reject(results.errors);
                    } else {
                        // Return data as-is, let user select ID column
                        resolve(results.data);
                    }
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    },

    // Convert data back to CSV string
    toCSV(data, columns) {
        return Papa.unparse(data, {
            columns: columns,
            delimiter: ';'
        });
    },

    // Download CSV file
    download(data, filename) {
        const csv = typeof data === 'string' ? data : this.toCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
};
