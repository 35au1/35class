// Summary Report Generator
// Generates structured data reports for AI analysis

const SummaryReport = {
    // Generate training summary report
    generateTrainingReport(model, modelNum, featureColumns, originalData, resultColumn, cellMapping, reverseMapping, trainedModels) {
        const report = [];
        
        report.push('=== GUIDE FOR LLM ===');
        report.push('Focus on data analysis, not on modelling implementation. Treat attached CSV and this report as a dataset to find and extract real patterns, dependencies, and hidden structure. Focus on columns relations analysis, what causes possibly the incorrect prediction of rows, general data patterns. Do not suggest model improvements and/or other models usage. Do not mention other related features outside of the dataset. Focus on writing report as sentences, not bullet points.');
        report.push('');
        report.push('=== MODEL TRAINING REPORT ===');
        report.push('');
        report.push(`Model: ${model.name}`);
        report.push(`Model Number: ${modelNum}`);
        report.push('');
        
        // Performance Metrics
        report.push('--- PERFORMANCE METRICS ---');
        report.push(`Accuracy: ${model.accuracy.toFixed(4)} (${model.correct}/${model.total} correct)`);
        if (model.weightedAccuracy !== undefined) {
            report.push(`Weighted Score: ${model.weightedAccuracy.toFixed(4)} (lower is better)`);
        }
        report.push('');
        
        // Model Configuration
        report.push('--- MODEL CONFIGURATION ---');
        report.push(`Features: ${featureColumns.join(', ')}`);
        report.push(`Result Column: ${resultColumn}`);
        report.push(`Categories: ${Object.values(reverseMapping).join(', ')}`);
        if (model.alpha !== undefined) {
            report.push(`Regularization Alpha: ${model.alpha}`);
        }
        if (model.exploreExp !== undefined) {
            report.push(`Exploration Exponent: ${model.exploreExp}`);
        }
        if (model.weightExp !== undefined) {
            report.push(`Weight Exponent: ${model.weightExp}`);
        }
        if (model.explorationExponent !== undefined) {
            report.push(`Exploration Exponent: ${model.explorationExponent}`);
        }
        if (model.combinedExponents && model.combinedExponents.length > 0) {
            report.push(`Combined Exponents: ${model.combinedExponents.map(e => e.toFixed(2)).join(', ')}`);
        }
        if (model.penalties && model.penalties.length > 0) {
            report.push(`Penalties: ${model.penalties.map(p => p.toFixed(2)).join(', ')}`);
        }
        if (model.penaltyStrengths && model.penaltyStrengths.length > 0) {
            report.push(`Penalty Strengths: ${model.penaltyStrengths.map(s => s.toFixed(2)).join(', ')}`);
        }
        report.push('');
        
        // Column Classification and Normalization Rules
        report.push('--- COLUMN CLASSIFICATION & NORMALIZATION ---');
        featureColumns.forEach((col, i) => {
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            if (mapping) {
                report.push(`${col} (${cName}):`);
                if (mapping.type === 'numeric') {
                    report.push(`  Type: Numeric`);
                    report.push(`  Min: ${mapping.min}, Avg: ${mapping.avg}, Max: ${mapping.max}`);
                    report.push(`  Normalization: value <= min ? 0.2 : value <= avg ? 0.2 + (value - min) / (avg - min) * 0.8 : value <= max ? 1.0 + (value - avg) / (max - avg) * 1.0 : 2.0`);
                } else {
                    report.push(`  Type: Categorical`);
                    const categories = Object.entries(mapping).filter(([k]) => k !== 'exponent' && k !== 'type');
                    categories.forEach(([text, value]) => {
                        report.push(`    "${text}" => ${value}`);
                    });
                }
                if (mapping.exponent !== undefined && mapping.exponent !== 1.0) {
                    report.push(`  Exponent: ${mapping.exponent}`);
                }
            }
        });
        report.push('');
        
        // General Math Formula
        report.push('--- GENERAL MATH FORMULA ---');
        const weights = Array.isArray(model.weights) ? model.weights : model.weights.toArray();
        const flatWeights = Array.isArray(weights[0]) ? weights.map(w => w[0]) : weights;
        
        let formula = `score = ${flatWeights[0].toFixed(4)}`;
        
        if (model.name.includes('Interactions')) {
            // Main features
            for (let i = 0; i < featureColumns.length && i + 1 < flatWeights.length; i++) {
                formula += ` + ${flatWeights[i + 1].toFixed(4)} * ${featureColumns[i]}`;
            }
            // Interactions
            let idx = featureColumns.length + 1;
            for (let i = 0; i < featureColumns.length; i++) {
                for (let j = i + 1; j < featureColumns.length; j++) {
                    if (idx < flatWeights.length) {
                        formula += ` + ${flatWeights[idx].toFixed(4)} * ${featureColumns[i]} * ${featureColumns[j]}`;
                        idx++;
                    }
                }
            }
        } else if (model.name.includes('Polynomial')) {
            formula += ' + [polynomial terms with degree 2]';
            report.push(`Note: Polynomial model uses ${flatWeights.length} coefficients for complex transformations`);
        } else {
            // Simple linear
            for (let i = 0; i < featureColumns.length && i + 1 < flatWeights.length; i++) {
                formula += ` + ${flatWeights[i + 1].toFixed(4)} * ${featureColumns[i]}`;
            }
        }
        
        report.push(formula);
        report.push('');
        report.push('Classification: score is compared to thresholds between category values to determine predicted category');
        report.push('');
        
        // Confusion Matrix
        if (model.confusion) {
            report.push('--- CONFUSION MATRIX ---');
            const categories = Object.values(reverseMapping);
            report.push('Actual \\ Predicted: ' + categories.join(' | '));
            model.confusion.forEach((row, i) => {
                report.push(`${categories[i]}: ${row.join(' | ')}`);
            });
            report.push('');
        }
        
        // Model Evaluation
        report.push('--- MODEL EVALUATION ---');
        
        // Low impact columns
        if (model.ablation) {
            const lowImpact = [];
            const ablationEntries = Array.isArray(model.ablation) 
                ? model.ablation 
                : Object.entries(model.ablation).map(([feature, impactPercentage]) => ({ feature, impactPercentage }));
            
            ablationEntries.forEach(item => {
                const impactValue = typeof item.impactPercentage === 'number' 
                    ? item.impactPercentage 
                    : item.impactPercentage * 100;
                
                if (impactValue < 2.0) {
                    lowImpact.push(`${item.feature}: ${impactValue.toFixed(2)}%`);
                }
            });
            
            if (lowImpact.length > 0) {
                report.push('Low Impact Columns (< 2%):');
                lowImpact.forEach(item => report.push(`  - ${item}`));
            }
        }
        
        // Weighted score evaluation
        if (model.weightedAccuracy !== undefined) {
            const avgWeighted = model.weightedAccuracy;
            if (avgWeighted < 0.1) {
                report.push(`Weighted Score Status: GOOD (${avgWeighted.toFixed(4)} < 0.1 threshold)`);
            } else {
                report.push(`Weighted Score Status: NEEDS IMPROVEMENT (${avgWeighted.toFixed(4)} >= 0.1 threshold)`);
            }
        }
        
        // Exploration exponent evaluation
        if (model.exploreExp !== undefined) {
            if (model.exploreExp < 0.7) {
                report.push(`Exploration Pattern: DISTRIBUTED (exponent ${model.exploreExp.toFixed(2)} < 0.7)`);
                report.push('  Indicates more distributed column relations and less impactful features');
            } else if (model.exploreExp > 1.4) {
                report.push(`Exploration Pattern: CONCENTRATED (exponent ${model.exploreExp.toFixed(2)} > 1.4)`);
                report.push('  Indicates at least one feature or relation is highly impactful');
            }
        }
        
        // High distance predictions
        if (model.highDistanceCount !== undefined && model.highDistanceCount > 0) {
            report.push(`High Distance Predictions: ${model.highDistanceCount} rows with distance > 0.18`);
            if (model.maxHighDistance) {
                report.push(`  Maximum distance: ${model.maxHighDistance.toFixed(4)}`);
            }
            if (model.highDistanceCount > 0) {
                report.push('  RECOMMENDATION: Consider removing these records due to extreme deviation');
            }
        }
        report.push('');
        
        // Incorrect Predictions Summary
        const incorrectCount = model.total - model.correct;
        if (incorrectCount > 0) {
            report.push('--- INCORRECT PREDICTIONS (EXTENDED) ---');
            report.push(`Total Incorrect: ${incorrectCount}`);
            
            // Get incorrect predictions details with extended information
            const incorrect = [];
            const uniqueValues = trainedModels.uniqueValues;
            const sortedValues = [...uniqueValues].sort((a, b) => a - b);
            const thresholds = [];
            for (let j = 0; j < sortedValues.length - 1; j++) {
                thresholds.push((sortedValues[j] + sortedValues[j + 1]) / 2);
            }
            
            originalData.forEach((row, i) => {
                const actual = cellMapping[`C${featureColumns.length + 1}`][row[resultColumn]];
                const predicted = model.predictions[i];
                if (Math.abs(actual - predicted) > 0.01) {
                    const score = model.predictionScores[i];
                    const actualIdx = sortedValues.findIndex(v => Math.abs(v - actual) < 0.01);
                    
                    // Calculate range boundaries
                    let rangeMin = 0;
                    let rangeMax = 2;
                    let categoryIndex = 0;
                    for (let k = 0; k < thresholds.length; k++) {
                        if (score >= thresholds[k]) {
                            categoryIndex = k + 1;
                        } else {
                            break;
                        }
                    }
                    
                    if (categoryIndex === 0) {
                        rangeMin = 0;
                        rangeMax = thresholds[0];
                    } else if (categoryIndex === thresholds.length) {
                        rangeMin = thresholds[thresholds.length - 1];
                        rangeMax = 2;
                    } else {
                        rangeMin = thresholds[categoryIndex - 1];
                        rangeMax = thresholds[categoryIndex];
                    }
                    
                    // Calculate distance to correct threshold
                    let minDistanceToCorrect = null;
                    let closestThreshold = null;
                    
                    if (actualIdx !== -1) {
                        minDistanceToCorrect = Infinity;
                        if (actualIdx > 0) {
                            const lowerThreshold = thresholds[actualIdx - 1];
                            const dist = Math.abs(score - lowerThreshold);
                            if (dist < minDistanceToCorrect) {
                                minDistanceToCorrect = dist;
                                closestThreshold = lowerThreshold;
                            }
                        }
                        if (actualIdx < sortedValues.length - 1) {
                            const upperThreshold = thresholds[actualIdx];
                            const dist = Math.abs(score - upperThreshold);
                            if (dist < minDistanceToCorrect) {
                                minDistanceToCorrect = dist;
                                closestThreshold = upperThreshold;
                            }
                        }
                    }
                    
                    incorrect.push({
                        row: i + 1,
                        actual: reverseMapping[actual],
                        predicted: reverseMapping[predicted],
                        score: score.toFixed(4),
                        rangeMin: rangeMin.toFixed(4),
                        rangeMax: rangeMax.toFixed(4),
                        threshold: closestThreshold !== null ? closestThreshold.toFixed(4) : 'N/A',
                        distance: minDistanceToCorrect !== null ? minDistanceToCorrect.toFixed(4) : 'N/A',
                        features: featureColumns.map(col => `${col}=${row[col]}`).join(', ')
                    });
                }
            });
            
            // Show all incorrect predictions with extended details
            report.push(`Showing all ${incorrect.length} incorrect predictions:`);
            incorrect.forEach(item => {
                report.push(`Row ${item.row}:`);
                report.push(`  Features: ${item.features}`);
                report.push(`  Actual: ${item.actual}, Predicted: ${item.predicted}`);
                report.push(`  Score: ${item.score}, Range: [${item.rangeMin}, ${item.rangeMax}]`);
                report.push(`  Closest Threshold: ${item.threshold}, Distance: ${item.distance}`);
            });
        } else {
            report.push('--- PREDICTIONS ---');
            report.push('All predictions correct!');
        }
        report.push('');
        
        // Ablation Test Results
        if (model.ablation) {
            report.push('--- ABLATION TEST (Column Impact) ---');
            const ablationEntries = Array.isArray(model.ablation) 
                ? model.ablation 
                : Object.entries(model.ablation).map(([feature, impactPercentage]) => ({ feature, impactPercentage }));
            
            ablationEntries.forEach(item => {
                const impactPercent = typeof item.impactPercentage === 'number' 
                    ? item.impactPercentage.toFixed(2) 
                    : (item.impactPercentage * 100).toFixed(2);
                report.push(`${item.feature}: ${impactPercent}% impact`);
            });
            report.push('');
        }
        
        // Model Coefficients
        if (model.weights) {
            report.push('--- MODEL COEFFICIENTS ---');
            const weights = Array.isArray(model.weights) ? model.weights : model.weights.toArray();
            const flatWeights = Array.isArray(weights[0]) ? weights.map(w => w[0]) : weights;
            
            report.push(`Intercept: ${flatWeights[0].toFixed(6)}`);
            
            if (model.name.includes('Interactions')) {
                // Show main features
                report.push('Main Features:');
                for (let i = 0; i < featureColumns.length && i + 1 < flatWeights.length; i++) {
                    report.push(`  ${featureColumns[i]}: ${flatWeights[i + 1].toFixed(6)}`);
                }
                // Show interactions
                report.push('Interactions:');
                let idx = featureColumns.length + 1;
                for (let i = 0; i < featureColumns.length; i++) {
                    for (let j = i + 1; j < featureColumns.length; j++) {
                        if (idx < flatWeights.length) {
                            report.push(`  ${featureColumns[i]} × ${featureColumns[j]}: ${flatWeights[idx].toFixed(6)}`);
                            idx++;
                        }
                    }
                }
            } else if (model.name.includes('Polynomial')) {
                report.push('Note: Polynomial model uses complex feature transformations');
                report.push(`Total coefficients: ${flatWeights.length}`);
            } else {
                // Simple linear
                for (let i = 0; i < featureColumns.length && i + 1 < flatWeights.length; i++) {
                    report.push(`  ${featureColumns[i]}: ${flatWeights[i + 1].toFixed(6)}`);
                }
            }
            report.push('');
        }
        
        report.push('=== END OF TRAINING REPORT ===');
        
        return report.join('\n');
    },
    
    // Generate prediction summary report
    generatePredictionReport(predictions, testData, modelNum, modelKey, featureColumns, resultColumn, cellMapping, reverseMapping) {
        const report = [];
        
        report.push('=== GUIDE FOR LLM ===');
        report.push('Focus on data analysis, not on modelling implementation. Treat attached CSV and this report as a dataset to find and extract real patterns, dependencies, and hidden structure. Focus on columns relations analysis, what causes possibly the incorrect prediction of rows, general data patterns. Do not suggest model improvements and/or other models usage. Do not mention other related features outside of the dataset. Focus on writing report as sentences, not bullet points.');
        report.push('');
        report.push('=== PREDICTION REPORT ===');
        report.push('');
        report.push(`Model: Model ${modelNum}`);
        report.push(`Total Predictions: ${predictions.results.length}`);
        report.push('');
        
        // Check if we have actual results to compare
        const hasActual = testData.some(row => row[resultColumn] && row[resultColumn].trim() !== '');
        
        if (hasActual) {
            // Calculate accuracy
            const modelData = predictions[modelKey];
            let correct = 0;
            let total = 0;
            
            testData.forEach((row, i) => {
                if (row[resultColumn] && row[resultColumn].trim() !== '') {
                    const resultMapping = cellMapping[`C${featureColumns.length + 1}`];
                    const actualEncoded = resultMapping[row[resultColumn]];
                    const predictedEncoded = modelData.rounded[i];
                    if (Math.abs(actualEncoded - predictedEncoded) < 0.01) {
                        correct++;
                    }
                    total++;
                }
            });
            
            const accuracy = total > 0 ? (correct / total * 100) : 0;
            
            report.push('--- PREDICTION ACCURACY ---');
            report.push(`Accuracy: ${accuracy.toFixed(2)}% (${correct}/${total} correct)`);
            report.push('');
            
            // Incorrect predictions
            if (correct < total) {
                report.push('--- INCORRECT PREDICTIONS ---');
                const incorrect = [];
                testData.forEach((row, i) => {
                    if (row[resultColumn] && row[resultColumn].trim() !== '') {
                        const resultMapping = cellMapping[`C${featureColumns.length + 1}`];
                        const actualEncoded = resultMapping[row[resultColumn]];
                        const predictedEncoded = modelData.rounded[i];
                        if (Math.abs(actualEncoded - predictedEncoded) > 0.01) {
                            incorrect.push({
                                row: i + 1,
                                actual: row[resultColumn],
                                predicted: reverseMapping[predictedEncoded],
                                score: modelData.scores[i].toFixed(4),
                                features: featureColumns.map(col => `${col}=${row[col]}`).join(', ')
                            });
                        }
                    }
                });
                
                report.push(`Total Incorrect: ${incorrect.length}`);
                const showCount = Math.min(10, incorrect.length);
                report.push(`Showing first ${showCount}:`);
                incorrect.slice(0, showCount).forEach(item => {
                    report.push(`  Row ${item.row}: ${item.features}`);
                    report.push(`    Actual: ${item.actual}, Predicted: ${item.predicted}, Score: ${item.score}`);
                });
                if (incorrect.length > 10) {
                    report.push(`  ... and ${incorrect.length - 10} more`);
                }
                report.push('');
            }
        } else {
            report.push('--- PREDICTION STATUS ---');
            report.push('No actual results provided - predictions only');
            report.push('');
        }
        
        // Prediction Distribution
        report.push('--- PREDICTION DISTRIBUTION ---');
        const distribution = {};
        predictions.results.forEach(row => {
            const pred = row[`${modelKey}_prediction`];
            distribution[pred] = (distribution[pred] || 0) + 1;
        });
        Object.entries(distribution).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
            const percentage = (count / predictions.results.length * 100).toFixed(2);
            report.push(`${category}: ${count} (${percentage}%)`);
        });
        report.push('');
        
        // Sample Predictions
        report.push('--- SAMPLE PREDICTIONS (First 20) ---');
        predictions.results.slice(0, 20).forEach(row => {
            const features = featureColumns.map(col => `${col}=${row[col]}`).join(', ');
            const pred = row[`${modelKey}_prediction`];
            const score = row[`${modelKey}_score`];
            const actual = hasActual && row[resultColumn] ? `, Actual=${row[resultColumn]}` : '';
            report.push(`Row ${row.row_id}: ${features} => Predicted=${pred}, Score=${typeof score === 'number' ? score.toFixed(4) : score}${actual}`);
        });
        if (predictions.results.length > 20) {
            report.push(`... and ${predictions.results.length - 20} more predictions`);
        }
        report.push('');
        
        report.push('=== END OF PREDICTION REPORT ===');
        
        return report.join('\n');
    },
    
    // Display report in a copyable text area
    displayReport(reportText, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '<div style="margin-top: 20px;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        html += '<h4 style="margin: 0;">Summary Report</h4>';
        html += `<button onclick="SummaryReport.copyReport('${containerId}_textarea')" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy to Clipboard</button>`;
        html += '</div>';
        html += `<textarea id="${containerId}_textarea" readonly style="width: 100%; height: 400px; font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; background: #f8f9fa; resize: vertical;">${reportText}</textarea>`;
        html += '</div>';
        
        container.innerHTML = html;
    },
    
    // Copy report to clipboard
    copyReport(textareaId) {
        const textarea = document.getElementById(textareaId);
        if (textarea) {
            textarea.select();
            document.execCommand('copy');
            alert('Report copied to clipboard!');
        }
    }
};
