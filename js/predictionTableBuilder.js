// Prediction Table Builder
// Handles building prediction result tables with consistent column structure

const PredictionTableBuilder = {
    // Build a prediction results row object with all columns
    buildPredictionRow(rowIndex, row, featureColumns, resultColumn, prediction, score, reverseMapping, cellMapping, hasActual) {
        const uniqueValues = Object.keys(reverseMapping).map(k => parseFloat(k)).sort((a,b) => a-b);
        const thresholds = [];
        for (let i = 0; i < uniqueValues.length - 1; i++) {
            thresholds.push((uniqueValues[i] + uniqueValues[i + 1]) / 2);
        }
        
        // Determine which range this score falls into (threshold boundaries)
        const scoreNum = parseFloat(score);
        let categoryIndex = 0;
        for (let i = 0; i < thresholds.length; i++) {
            if (scoreNum >= thresholds[i]) {
                categoryIndex = i + 1;
            } else {
                break;
            }
        }
        
        // Set the range based on category index
        let rangeMin = 0;
        let rangeMax = 2;
        if (categoryIndex === 0) {
            // First category: 0 to first threshold
            rangeMin = 0;
            rangeMax = parseFloat(thresholds[0].toFixed(2));
        } else if (categoryIndex === thresholds.length) {
            // Last category: last threshold to 2
            rangeMin = parseFloat(thresholds[thresholds.length - 1].toFixed(2));
            rangeMax = 2;
        } else {
            // Middle categories: between two thresholds
            rangeMin = parseFloat(thresholds[categoryIndex - 1].toFixed(2));
            rangeMax = parseFloat(thresholds[categoryIndex].toFixed(2));
        }
        
        // Build the row object
        const rowData = {
            row_id: rowIndex + 1,
            ...Object.fromEntries(featureColumns.map(col => [col, row[col]]))
        };
        
        // Add actual if available
        if (hasActual && row[resultColumn]) {
            rowData.actual = row[resultColumn];
        }
        
        // Add prediction and score
        rowData.predicted = prediction;
        rowData.score = typeof score === 'number' ? score.toFixed(4) : score;
        rowData.range_min = rangeMin.toFixed(2);
        rowData.range_max = rangeMax.toFixed(2);
        
        // Add distance if actual exists
        if (hasActual && row[resultColumn]) {
            const actualEncoded = cellMapping[`C${featureColumns.length + 1}`][row[resultColumn]];
            const predictedEncoded = Object.keys(reverseMapping).find(k => reverseMapping[k] === prediction);
            
            if (actualEncoded !== undefined && predictedEncoded !== undefined) {
                // Calculate distance to nearest correct threshold
                const sortedValues = [...uniqueValues].sort((a, b) => a - b);
                const actualIdx = sortedValues.findIndex(v => Math.abs(v - actualEncoded) < 0.01);
                let minDistanceToCorrect = null;
                
                if (actualIdx !== -1) {
                    minDistanceToCorrect = Infinity;
                    if (actualIdx > 0) {
                        const lowerThreshold = thresholds[actualIdx - 1];
                        const dist = Math.abs(scoreNum - lowerThreshold);
                        if (dist < minDistanceToCorrect) {
                            minDistanceToCorrect = dist;
                        }
                    }
                    if (actualIdx < sortedValues.length - 1) {
                        const upperThreshold = thresholds[actualIdx];
                        const dist = Math.abs(scoreNum - upperThreshold);
                        if (dist < minDistanceToCorrect) {
                            minDistanceToCorrect = dist;
                        }
                    }
                }
                
                rowData.distance = minDistanceToCorrect !== null ? minDistanceToCorrect.toFixed(4) : 'N/A';
            } else {
                rowData.distance = 'N/A';
            }
        }
        
        return rowData;
    },
    
    // Generate HTML table from prediction rows
    generateTableHTML(rows, featureColumns, hasActual) {
        let html = '<div class="preview"><table><thead><tr>';
        html += '<th>row_id</th>';
        featureColumns.forEach(col => {
            html += `<th>${col}</th>`;
        });
        
        if (hasActual) {
            html += '<th>actual</th>';
        }
        
        html += '<th>predicted</th>';
        html += '<th>score</th>';
        html += '<th>range_min</th>';
        html += '<th>range_max</th>';
        
        if (hasActual) {
            html += '<th>distance</th>';
        }
        
        html += '</tr></thead><tbody>';
        
        rows.forEach(row => {
            html += '<tr>';
            html += `<td>${row.row_id}</td>`;
            featureColumns.forEach(col => {
                html += `<td>${row[col]}</td>`;
            });
            
            if (hasActual) {
                html += `<td>${row.actual || ''}</td>`;
            }
            
            html += `<td>${row.predicted}</td>`;
            html += `<td>${row.score}</td>`;
            html += `<td>${row.range_min}</td>`;
            html += `<td>${row.range_max}</td>`;
            
            if (hasActual) {
                html += `<td>${row.distance || ''}</td>`;
            }
            
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        return html;
    }
};
