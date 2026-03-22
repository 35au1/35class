// What-If Analysis
// Tests single-step column changes to find which would fix incorrect predictions

const WhatIfAnalysis = {
    // Generate what-if analysis for incorrect predictions
    generateAnalysis(incorrectRows, model, cellMapping, featureColumns, resultColumn, reverseMapping) {
        if (!incorrectRows || incorrectRows.length === 0) {
            return '';
        }
        
        // Get unique values and thresholds
        const uniqueValues = Object.keys(reverseMapping).map(k => parseFloat(k)).sort((a,b) => a-b);
        const thresholds = [];
        for (let i = 0; i < uniqueValues.length - 1; i++) {
            thresholds.push((uniqueValues[i] + uniqueValues[i + 1]) / 2);
        }
        
        let html = '<div style="margin-top: 30px;">';
        html += '<h4>What-If Analysis: Single Column Changes</h4>';
        html += '<p style="color: #666; font-size: 14px; margin-bottom: 20px;">Test which single column change would fix the prediction</p>';
        
        incorrectRows.forEach((row) => {
            const actualValue = row.actual || row[resultColumn];
            const actualEncoded = cellMapping[`C${featureColumns.length + 1}`][actualValue];
            
            html += '<div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #6c757d;">';
            html += `<div style="font-weight: bold; margin-bottom: 10px;">Row ${row.row_id}: ${actualValue} (predicted as ${row.predicted})</div>`;
            html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; margin-top: 15px;">';
            
            // Test each feature column
            featureColumns.forEach((col, colIdx) => {
                const currentValue = row[col];
                const colMapping = cellMapping[`C${colIdx + 1}`];
                
                // Get all possible values for this column
                const possibleValues = Object.keys(colMapping);
                const currentIdx = possibleValues.indexOf(currentValue);
                
                if (currentIdx === -1) return;
                
                // Test neighbors (one step up and down)
                const neighbors = [];
                if (currentIdx > 0) {
                    neighbors.push({ value: possibleValues[currentIdx - 1], direction: '↓' });
                }
                if (currentIdx < possibleValues.length - 1) {
                    neighbors.push({ value: possibleValues[currentIdx + 1], direction: '↑' });
                }
                
                // Test each neighbor
                const results = [];
                neighbors.forEach(neighbor => {
                    // Create modified row
                    const testRow = { ...row };
                    testRow[col] = neighbor.value;
                    
                    // Encode the test row
                    const encodedFeatures = featureColumns.map((fc, idx) => {
                        return cellMapping[`C${idx + 1}`][testRow[fc]];
                    });
                    
                    // Make prediction with the model
                    const newScore = this.predictWithModel(model, encodedFeatures);
                    
                    // Determine predicted category
                    let predictedEncoded = uniqueValues[0];
                    for (let i = 0; i < thresholds.length; i++) {
                        if (newScore >= thresholds[i]) {
                            predictedEncoded = uniqueValues[i + 1];
                        }
                    }
                    
                    const newPrediction = reverseMapping[predictedEncoded];
                    const wouldBeCorrect = Math.abs(predictedEncoded - actualEncoded) < 0.01;
                    
                    // Calculate distance to correct range boundary
                    const actualIdx = uniqueValues.findIndex(v => Math.abs(v - actualEncoded) < 0.01);
                    let distanceToCorrect = null;
                    
                    if (actualIdx !== -1) {
                        let minDist = Infinity;
                        if (actualIdx > 0) {
                            const lowerThreshold = thresholds[actualIdx - 1];
                            const dist = Math.abs(newScore - lowerThreshold);
                            if (dist < minDist) minDist = dist;
                        }
                        if (actualIdx < uniqueValues.length - 1) {
                            const upperThreshold = thresholds[actualIdx];
                            const dist = Math.abs(newScore - upperThreshold);
                            if (dist < minDist) minDist = dist;
                        }
                        distanceToCorrect = minDist;
                    }
                    
                    const scoreChange = newScore - parseFloat(row.score);
                    
                    results.push({
                        neighbor: neighbor.value,
                        direction: neighbor.direction,
                        newScore: newScore,
                        scoreChange: scoreChange,
                        newPrediction: newPrediction,
                        wouldBeCorrect: wouldBeCorrect,
                        distanceToCorrect: distanceToCorrect
                    });
                });
                
                // Display results for this column
                if (results.length > 0) {
                    html += '<div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #dee2e6;">';
                    html += `<div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #495057;">${col}</div>`;
                    html += `<div style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">Current: ${currentValue}</div>`;
                    
                    results.forEach(result => {
                        const bgColor = result.wouldBeCorrect ? '#d4edda' : '#f8d7da';
                        const borderColor = result.wouldBeCorrect ? '#28a745' : '#dc3545';
                        const textColor = result.wouldBeCorrect ? '#155724' : '#721c24';
                        const icon = result.wouldBeCorrect ? '✓' : '✗';
                        
                        html += `<div style="background: ${bgColor}; border-left: 3px solid ${borderColor}; padding: 8px; margin-bottom: 6px; border-radius: 3px;">`;
                        html += `<div style="font-size: 12px; color: ${textColor};">`;
                        html += `<strong>${icon} ${result.direction} ${result.neighbor}</strong><br>`;
                        html += `Score: ${result.newScore.toFixed(4)} (${result.scoreChange >= 0 ? '+' : ''}${result.scoreChange.toFixed(4)})<br>`;
                        html += `Predicts: ${result.newPrediction}`;
                        if (result.distanceToCorrect !== null) {
                            html += `<br>Distance: ${result.distanceToCorrect.toFixed(4)}`;
                        }
                        html += '</div></div>';
                    });
                    
                    html += '</div>';
                }
            });
            
            html += '</div>'; // Close grid
            html += '</div>'; // Close row container
        });
        
        html += '</div>';
        
        return html;
    },
    
    // Predict with a trained model
    predictWithModel(model, features) {
        if (model.type === 'simple') {
            // Simple linear: y = b0 + b1*x1 + b2*x2 + ...
            let score = model.coefficients[0]; // intercept
            for (let i = 0; i < features.length; i++) {
                score += model.coefficients[i + 1] * features[i];
            }
            return score;
        } else if (model.type === 'interactions') {
            // With interactions
            let score = model.coefficients[0]; // intercept
            let idx = 1;
            
            // Main features
            for (let i = 0; i < features.length; i++) {
                score += model.coefficients[idx++] * features[i];
            }
            
            // Interactions
            for (let i = 0; i < features.length; i++) {
                for (let j = i + 1; j < features.length; j++) {
                    score += model.coefficients[idx++] * features[i] * features[j];
                }
            }
            
            return score;
        } else if (model.type === 'polynomial') {
            // Polynomial degree 3
            let score = model.coefficients[0]; // intercept
            let idx = 1;
            
            // Linear terms
            for (let i = 0; i < features.length; i++) {
                score += model.coefficients[idx++] * features[i];
            }
            
            // Quadratic terms
            for (let i = 0; i < features.length; i++) {
                score += model.coefficients[idx++] * Math.pow(features[i], 2);
            }
            
            // Cubic terms
            for (let i = 0; i < features.length; i++) {
                score += model.coefficients[idx++] * Math.pow(features[i], 3);
            }
            
            return score;
        }
        
        return 0;
    }
};
