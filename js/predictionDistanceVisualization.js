// Prediction Distance Visualization
// Shows visual representation of prediction errors with range boundaries

const PredictionDistanceVisualization = {
    // Generate visualization for incorrect predictions
    generateVisualization(incorrectRows, reverseMapping, cellMapping, featureColumns, resultColumn) {
        if (!incorrectRows || incorrectRows.length === 0) {
            return '';
        }
        
        // Get unique values and thresholds
        const uniqueValues = Object.keys(reverseMapping).map(k => parseFloat(k)).sort((a,b) => a-b);
        const thresholds = [];
        for (let i = 0; i < uniqueValues.length - 1; i++) {
            thresholds.push((uniqueValues[i] + uniqueValues[i + 1]) / 2);
        }
        
        const minValue = 0;
        const maxValue = 2;
        const range = maxValue - minValue;
        
        let html = '<div style="margin-top: 30px;">';
        html += '<h4>Prediction Distance Visualization</h4>';
        html += '<p style="color: #666; font-size: 14px; margin-bottom: 20px;">Visual representation of how far each incorrect prediction is from the correct range</p>';
        
        incorrectRows.forEach((row, idx) => {
            const score = parseFloat(row.score);
            const actualValue = row.actual || row[resultColumn];
            
            // Find the actual encoded value
            const actualEncoded = cellMapping[`C${featureColumns.length + 1}`][actualValue];
            if (actualEncoded === undefined) return;
            
            // Find which range the score should have been in
            const actualIdx = uniqueValues.findIndex(v => Math.abs(v - actualEncoded) < 0.01);
            if (actualIdx === -1) return;
            
            // Determine correct range boundaries
            let correctRangeMin = minValue;
            let correctRangeMax = maxValue;
            
            if (actualIdx === 0) {
                correctRangeMin = minValue;
                correctRangeMax = thresholds[0];
            } else if (actualIdx === uniqueValues.length - 1) {
                correctRangeMin = thresholds[thresholds.length - 1];
                correctRangeMax = maxValue;
            } else {
                correctRangeMin = thresholds[actualIdx - 1];
                correctRangeMax = thresholds[actualIdx];
            }
            
            // Calculate distance to nearest boundary
            const distanceToMin = Math.abs(score - correctRangeMin);
            const distanceToMax = Math.abs(score - correctRangeMax);
            const minDistance = Math.min(distanceToMin, distanceToMax);
            
            // Calculate positions as percentages
            const scorePos = ((score - minValue) / range) * 100;
            const rangeMinPos = ((correctRangeMin - minValue) / range) * 100;
            const rangeMaxPos = ((correctRangeMax - minValue) / range) * 100;
            const rangeWidth = rangeMaxPos - rangeMinPos;
            
            // Determine if score is left or right of the correct range
            const isLeft = score < correctRangeMin;
            const isRight = score > correctRangeMax;
            
            html += '<div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 5px;">';
            html += `<div style="font-weight: bold; margin-bottom: 10px;">Row ${row.row_id}: ${actualValue} (predicted as ${row.predicted})</div>`;
            html += `<div style="font-size: 12px; color: #666; margin-bottom: 10px;">Score: ${score.toFixed(4)} | Distance: ${minDistance.toFixed(4)}</div>`;
            
            // Visualization bar
            html += '<div style="position: relative; height: 60px; background: #e9ecef; border-radius: 4px; margin-top: 10px;">';
            
            // Draw threshold lines
            thresholds.forEach(threshold => {
                const pos = ((threshold - minValue) / range) * 100;
                html += `<div style="position: absolute; left: ${pos}%; top: 0; bottom: 0; width: 2px; background: #adb5bd;"></div>`;
                html += `<div style="position: absolute; left: ${pos}%; top: -20px; font-size: 10px; color: #6c757d; transform: translateX(-50%);">${threshold.toFixed(2)}</div>`;
            });
            
            // Draw correct range (green background)
            html += `<div style="position: absolute; left: ${rangeMinPos}%; width: ${rangeWidth}%; top: 20px; height: 20px; background: rgba(40, 167, 69, 0.3); border: 2px solid #28a745; border-radius: 3px;"></div>`;
            html += `<div style="position: absolute; left: ${rangeMinPos}%; top: 42px; font-size: 10px; color: #28a745; font-weight: bold;">Correct Range</div>`;
            
            // Draw actual score position (red marker)
            const markerColor = isLeft || isRight ? '#dc3545' : '#ffc107';
            html += `<div style="position: absolute; left: ${scorePos}%; top: 15px; width: 4px; height: 30px; background: ${markerColor}; border-radius: 2px;"></div>`;
            html += `<div style="position: absolute; left: ${scorePos}%; top: 15px; width: 12px; height: 12px; background: ${markerColor}; border-radius: 50%; transform: translate(-4px, -6px); border: 2px solid white;"></div>`;
            html += `<div style="position: absolute; left: ${scorePos}%; top: 0px; font-size: 11px; color: ${markerColor}; font-weight: bold; transform: translateX(-50%);">▼</div>`;
            
            // Draw distance indicator (arrow)
            if (isLeft) {
                const arrowStart = scorePos;
                const arrowEnd = rangeMinPos;
                const arrowWidth = arrowEnd - arrowStart;
                html += `<div style="position: absolute; left: ${arrowStart}%; top: 50px; width: ${arrowWidth}%; height: 2px; background: #dc3545;"></div>`;
                html += `<div style="position: absolute; left: ${arrowEnd}%; top: 47px; width: 0; height: 0; border-left: 6px solid #dc3545; border-top: 3px solid transparent; border-bottom: 3px solid transparent;"></div>`;
                html += `<div style="position: absolute; left: ${(arrowStart + arrowEnd) / 2}%; top: 52px; font-size: 10px; color: #dc3545; transform: translateX(-50%);">${minDistance.toFixed(3)}</div>`;
            } else if (isRight) {
                const arrowStart = rangeMaxPos;
                const arrowEnd = scorePos;
                const arrowWidth = arrowEnd - arrowStart;
                html += `<div style="position: absolute; left: ${arrowStart}%; top: 50px; width: ${arrowWidth}%; height: 2px; background: #dc3545;"></div>`;
                html += `<div style="position: absolute; left: ${arrowEnd}%; top: 47px; width: 0; height: 0; border-right: 6px solid #dc3545; border-top: 3px solid transparent; border-bottom: 3px solid transparent;"></div>`;
                html += `<div style="position: absolute; left: ${(arrowStart + arrowEnd) / 2}%; top: 52px; font-size: 10px; color: #dc3545; transform: translateX(-50%);">${minDistance.toFixed(3)}</div>`;
            }
            
            // Scale labels
            html += `<div style="position: absolute; left: 0%; bottom: -20px; font-size: 10px; color: #6c757d;">0.00</div>`;
            html += `<div style="position: absolute; right: 0%; bottom: -20px; font-size: 10px; color: #6c757d;">2.00</div>`;
            
            html += '</div>'; // Close visualization bar
            html += '</div>'; // Close row container
        });
        
        // Legend
        html += '<div style="margin-top: 20px; padding: 15px; background: white; border: 1px solid #dee2e6; border-radius: 5px;">';
        html += '<div style="font-weight: bold; margin-bottom: 10px;">Legend:</div>';
        html += '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px;">';
        html += '<div><span style="display: inline-block; width: 20px; height: 12px; background: rgba(40, 167, 69, 0.3); border: 2px solid #28a745; vertical-align: middle;"></span> Correct Range</div>';
        html += '<div><span style="display: inline-block; width: 12px; height: 12px; background: #dc3545; border-radius: 50%; vertical-align: middle;"></span> Actual Prediction</div>';
        html += '<div><span style="display: inline-block; width: 2px; height: 20px; background: #adb5bd; vertical-align: middle;"></span> Threshold Boundaries</div>';
        html += '<div><span style="display: inline-block; width: 30px; height: 2px; background: #dc3545; vertical-align: middle;"></span> Distance</div>';
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        
        return html;
    }
};
