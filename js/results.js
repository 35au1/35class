// results.js - Display training and prediction results

const ResultsDisplay = {
    // Get color based on accuracy percentage
    getAccuracyColor(accuracy) {
        if (accuracy >= 90) return '#007bff'; // Blue
        if (accuracy >= 80) return '#28a745'; // Green
        if (accuracy >= 50) return '#fd7e14'; // Orange
        return '#dc3545'; // Red
    },
    
    // Generate model evaluation for a specific model
    generateModelEvaluationForModel(model, modelNum, trainedModels, featureColumns) {
        let html = '<div class="model-evaluation-section" style="margin: 20px 0;">';
        html += '<h3 style="margin-bottom: 15px; color: #2c3e50;">Model Evaluation & Recommendations</h3>';
        
        const recommendations = [];
        
        // 1. Check for low-impact columns (ablation test < 2%) - only for models with ablation
        if (model.ablation) {
            const lowImpactFeatures = model.ablation.filter(item => item.impactPercentage < 2.0);
            
            if (lowImpactFeatures.length > 0) {
                lowImpactFeatures.forEach(feature => {
                    recommendations.push({
                        type: 'warning',
                        title: 'Low Impact Column Detected',
                        message: `Column "${feature.feature}" has very low impact on classification (${feature.impactPercentage.toFixed(2)}%). Consider removing this column from your dataset to simplify the model.`,
                        color: '#fff3cd',
                        borderColor: '#ffc107',
                        textColor: '#856404'
                    });
                });
            }
        }
        
        // 2. Check weighted score (< 0.1 = good, low abbreviation)
        if (model.weightedAccuracy !== undefined && model.weightedAccuracy < 0.1) {
            recommendations.push({
                type: 'success',
                title: 'Good Weighted Score',
                message: `Weighted score is ${model.weightedAccuracy.toFixed(4)} (below 0.1 threshold). This indicates low abbreviation and good model performance.`,
                color: '#d4edda',
                borderColor: '#28a745',
                textColor: '#155724'
            });
        }
        
        // 3. Check exploration exponent (< 0.7 or > 1.4)
        if (model.explorationExponent !== undefined) {
            if (model.explorationExponent < 0.7) {
                recommendations.push({
                    type: 'info',
                    title: 'Low Exploration Exponent',
                    message: `Exploration exponent is ${model.explorationExponent.toFixed(2)} (below 0.7). This suggests more distributed column relations and less impactful features.`,
                    color: '#d1ecf1',
                    borderColor: '#17a2b8',
                    textColor: '#0c5460'
                });
            } else if (model.explorationExponent > 1.4) {
                recommendations.push({
                    type: 'warning',
                    title: 'High Exploration Exponent',
                    message: `Exploration exponent is ${model.explorationExponent.toFixed(2)} (above 1.4). This suggests at least one feature or relation is highly impactful, indicating stronger weight marking requirement.`,
                    color: '#fff3cd',
                    borderColor: '#ffc107',
                    textColor: '#856404'
                });
            }
        }
        
        // 4. Check for high weighted distance features (> 0.18) - extreme threshold warning
        const highDistanceCount = this.countHighDistancePredictions(model, trainedModels.uniqueValues);
        
        if (highDistanceCount.count > 0) {
            recommendations.push({
                type: 'danger',
                title: 'Impactful Distance Detected',
                message: `Found ${highDistanceCount.count} prediction(s) with weighted distance above 0.18 (max: ${highDistanceCount.maxDistance.toFixed(4)}). This indicates significant misclassification. Recommendation: Remove these records from dataset due to extreme abbreviation or investigate the underlying causes.`,
                color: '#f8d7da',
                borderColor: '#dc3545',
                textColor: '#721c24'
            });
        }
        
        // Display all recommendations
        if (recommendations.length > 0) {
            recommendations.forEach(rec => {
                html += `<div class="evaluation-card" style="background: ${rec.color}; border-left: 4px solid ${rec.borderColor}; color: ${rec.textColor}; padding: 15px; margin: 10px 0; border-radius: 5px;">`;
                html += `<strong style="font-size: 1.05em;">${rec.title}</strong><br>`;
                html += `<span style="margin-top: 5px; display: block; font-size: 0.95em;">${rec.message}</span>`;
                html += '</div>';
            });
        }
        
        html += '</div>';
        
        return html;
    },
    
    // Count predictions with high weighted distance
    countHighDistancePredictions(model, uniqueValues) {
        // Use pre-calculated values stored in the model
        if (model.highDistanceCount !== undefined) {
            return {
                count: model.highDistanceCount,
                maxDistance: model.maxHighDistance || 0
            };
        }
        
        return { count: 0, maxDistance: 0 };
    },

    // Generate model evaluation and recommendations
    generateModelEvaluation(trainedModels, featureColumns) {
        let html = '<div class="model-evaluation-section">';
        html += '<h2 style="margin-bottom: 20px; color: #2c3e50;">Model Evaluation & Recommendations</h2>';
        
        const recommendations = [];
        
        // Get the best linear model (Model 1 or 2)
        const model1 = trainedModels.model1;
        const model2 = trainedModels.model2;
        const bestLinearModel = model2.accuracy > model1.accuracy ? model2 : model1;
        const bestLinearAccuracy = Math.max(model1.accuracy, model2.accuracy);
        
        // 1. Check for low-impact columns (ablation test < 2%)
        if (model2.ablation) {
            const lowImpactFeatures = model2.ablation.filter(item => item.impactPercentage < 2.0);
            
            if (lowImpactFeatures.length > 0) {
                lowImpactFeatures.forEach(feature => {
                    recommendations.push({
                        type: 'warning',
                        title: 'Low Impact Column Detected',
                        message: `Column "${feature.feature}" has very low impact on classification (${feature.impactPercentage.toFixed(2)}%). Consider removing this column from your dataset to simplify the model.`,
                        color: '#fff3cd',
                        borderColor: '#ffc107',
                        textColor: '#856404'
                    });
                });
            }
        }
        
        // 2. Check for high accuracy (>90%)
        if (bestLinearAccuracy >= 90) {
            recommendations.push({
                type: 'success',
                title: 'Excellent Predictability',
                message: `Linear model achieves ${bestLinearAccuracy.toFixed(2)}% accuracy. This indicates good predictability regardless of detailed model selection. The ${model2.accuracy > model1.accuracy ? 'interaction model (Model 2)' : 'simple model (Model 1)'} is recommended as the most reliable with proper BIAS exclusion.`,
                color: '#d4edda',
                borderColor: '#28a745',
                textColor: '#155724'
            });
        }
        
        // 3. Check weighted score (< 0.12 = too low, suggests random factors)
        if (bestLinearModel.weightedAccuracy < 0.12) {
            recommendations.push({
                type: 'danger',
                title: 'Invalid Results - Low Weighted Score',
                message: `Weighted score is ${bestLinearModel.weightedAccuracy.toFixed(4)} (below 0.12 threshold). This suggests only gentle abbreviation and may be caused by random factors. Recommendation: Exclude this model from consideration or collect more data.`,
                color: '#f8d7da',
                borderColor: '#dc3545',
                textColor: '#721c24'
            });
        }
        
        // 4. Check for high weighted distance features (> 0.18)
        const incorrectRows = [];
        if (model2.predictionScores && trainedModels.uniqueValues) {
            const uniqueValues = trainedModels.uniqueValues;
            const sortedValues = [...uniqueValues].sort((a, b) => a - b);
            const thresholds = [];
            for (let i = 0; i < sortedValues.length - 1; i++) {
                thresholds.push((sortedValues[i] + sortedValues[i + 1]) / 2);
            }
            
            // Calculate distances for incorrect predictions
            model2.predictions.forEach((pred, i) => {
                const actual = model2.predictionScores[i]; // This should be the actual y value
                if (Math.abs(pred - actual) > 0.01) {
                    const score = model2.predictionScores[i];
                    const actualIdx = sortedValues.findIndex(v => Math.abs(v - actual) < 0.01);
                    
                    if (actualIdx !== -1) {
                        let minDistance = Infinity;
                        if (actualIdx > 0) {
                            const dist = Math.abs(score - thresholds[actualIdx - 1]);
                            minDistance = Math.min(minDistance, dist);
                        }
                        if (actualIdx < sortedValues.length - 1) {
                            const dist = Math.abs(score - thresholds[actualIdx]);
                            minDistance = Math.min(minDistance, dist);
                        }
                        
                        // Normalize distance
                        const range = sortedValues[sortedValues.length - 1] - sortedValues[0];
                        const normalizedDistance = minDistance / range;
                        
                        if (normalizedDistance > 0.18) {
                            incorrectRows.push({
                                index: i,
                                distance: normalizedDistance
                            });
                        }
                    }
                }
            });
        }
        
        if (incorrectRows.length > 0) {
            const maxDistance = Math.max(...incorrectRows.map(r => r.distance));
            recommendations.push({
                type: 'danger',
                title: 'Impactful Distance Detected',
                message: `Found ${incorrectRows.length} prediction(s) with weighted distance above 0.18 (max: ${maxDistance.toFixed(4)}). This indicates significant misclassification. Recommendation: Investigate these cases or consider full exclusion of problematic data points.`,
                color: '#f8d7da',
                borderColor: '#dc3545',
                textColor: '#721c24'
            });
        } else {
            recommendations.push({
                type: 'info',
                title: 'No High-Distance Features',
                message: 'No features with weighted distance above 0.18 were discovered. All predictions are within acceptable thresholds.',
                color: '#d1ecf1',
                borderColor: '#17a2b8',
                textColor: '#0c5460'
            });
        }
        
        // Display all recommendations
        recommendations.forEach(rec => {
            html += `<div class="evaluation-card" style="background: ${rec.color}; border-left: 4px solid ${rec.borderColor}; color: ${rec.textColor}; padding: 15px; margin: 10px 0; border-radius: 5px;">`;
            html += `<strong style="font-size: 1.1em;">${rec.title}</strong><br>`;
            html += `<span style="margin-top: 5px; display: block;">${rec.message}</span>`;
            html += '</div>';
        });
        
        html += '</div>';
        
        return html;
    },

    // Display training results
    displayTraining(trainedModels, originalData, cellMapping, featureColumns, resultColumn) {
        console.log('displayTraining called');
        console.log('trainedModels:', trainedModels);
        
        const container = document.getElementById('trainingResults');
        
        // Check if using optimization engine
        if (trainedModels.useOptimizationEngine) {
            this.displayOptimizationResults(trainedModels, container, featureColumns, resultColumn);
            return;
        }
        
        // Standard regression display
        const reverseMapping = DataEncoder.getReverseMapping(cellMapping, featureColumns);
        const categories = trainedModels.uniqueValues.map(val => reverseMapping[val]);
        
        console.log('categories:', categories);
        
        // Check if experimental mode (9 models) or standard mode (3 models)
        const hasPenaltyModels = trainedModels.model7 !== undefined;
        const isExperimentalMode = trainedModels.model4 !== undefined;
        const modelsToDisplay = hasPenaltyModels ? 
            [trainedModels.model1, trainedModels.model2, trainedModels.model3, 
             trainedModels.model4, trainedModels.model5, trainedModels.model6,
             trainedModels.model7, trainedModels.model8, trainedModels.model9] :
            (isExperimentalMode ? 
                [trainedModels.model1, trainedModels.model2, trainedModels.model3, trainedModels.model4, trainedModels.model5, trainedModels.model6] :
                [trainedModels.model1, trainedModels.model2, trainedModels.model3]);
        
        let html = '';
        
        if (hasPenaltyModels) {
            html += '<div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 20px; color: #856404;">';
            html += '<strong>Experimental Mode Active (3 Approaches)</strong><br>';
            html += 'Row 1: Standard models (baseline)<br>';
            html += 'Row 2: Dual-exponent models (weight x exploration)<br>';
            html += 'Row 3: Penalty-based models (penalty = 2.0 - weight, strength controlled by exploration exponent)';
            html += '</div>';
        } else if (isExperimentalMode) {
            html += '<div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 20px; color: #856404;">';
            html += '<strong>Experimental Mode Active</strong><br>';
            html += 'Showing both standard models (top row) and experimental dual-exponent models (bottom row) for comparison.';
            html += '</div>';
        }
        
        html += '<div class="results-grid">';
        
        // Model cards with data attributes for click handlers
        modelsToDisplay.forEach((model, idx) => {
            const modelNum = idx + 1;
            const activeClass = modelNum === 1 ? ' active' : '';
            
            // Build exponent info display
            let exponentInfo = '';
            if (model.explorationExponent !== undefined && model.combinedExponents && model.combinedExponents.length > 0) {
                exponentInfo = `
                    <div class="exponent-info">
                        <small><strong>Exploration exp:</strong> ${model.explorationExponent.toFixed(1)}</small><br>
                        <small><strong>Combined exp:</strong> ${model.combinedExponents.map(e => e.toFixed(2)).join(', ')}</small>
                    </div>
                `;
            } else if (model.explorationExponent !== undefined && model.penalties && model.penalties.length > 0) {
                // Penalty-based model
                exponentInfo = `
                    <div class="exponent-info">
                        <small><strong>Penalty exp:</strong> ${model.explorationExponent.toFixed(1)}</small><br>
                        <small><strong>Penalties:</strong> ${model.penalties.map(p => p.toFixed(2)).join(', ')}</small><br>
                        <small><strong>Strengths:</strong> ${model.penaltyStrengths.map(s => s.toFixed(2)).join(', ')}</small>
                    </div>
                `;
            }
            
            // Get color based on accuracy
            const accuracyColor = this.getAccuracyColor(model.accuracy);
            
            html += `
                <div class="result-card model-card${activeClass}" data-model="${modelNum}">
                    <h3>${model.name}</h3>
                    <div class="metric" style="color: ${accuracyColor};">${model.accuracy.toFixed(2)}%</div>
                    <p>${model.correct} / ${model.total} correct</p>
                    ${model.weightedAccuracy !== undefined ? `<p style="font-size: 0.9em; color: #7f8c8d;">Weighted: ${model.weightedAccuracy.toFixed(4)} (lower=better)</p>` : ''}
                    ${exponentInfo}
                </div>
            `;
        });
        
        html += '</div>';
        
        // Model details sections (hidden by default except model 1)
        html += '<div id="modelDetails">';
        
        modelsToDisplay.forEach((model, idx) => {
            const modelNum = idx + 1;
            const displayStyle = modelNum === 1 ? 'block' : 'none';
            
            html += `<div id="model${modelNum}Details" class="model-details" style="display:${displayStyle};">`;
            
            // Confusion Matrix
            html += `<h3>Confusion Matrix (Model ${modelNum})</h3>`;
            html += '<p class="section-description">Rows=Actual</p>';
            html += '<div class="confusion-matrix">';
            html += '<table><thead>';
            
            // First header row: "Predicted as:" spanning all category columns
            html += '<tr><th></th><th colspan="' + categories.length + '">Predicted as:</th></tr>';
            
            // Second header row: category names
            html += '<tr><th></th>';
            categories.forEach(cat => {
                html += `<th>${cat}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            model.confusion.forEach((row, i) => {
                html += `<tr><th>${categories[i]}</th>`;
                row.forEach((val, j) => {
                    const isDiagonal = i === j;
                    if (isDiagonal) {
                        html += `<td class="diagonal-cell">${val}</td>`;
                    } else if (val > 0) {
                        html += `<td class="incorrect-cell">${val}</td>`;
                    } else {
                        html += `<td>${val}</td>`;
                    }
                });
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            
            // Add Model Evaluation Section for this specific model
            html += this.generateModelEvaluationForModel(model, modelNum, trainedModels, featureColumns);
            
            // Add formulas (pass model number and trainedModels for the button)
            html += this.generateFormulas(model, featureColumns, cellMapping, reverseMapping, categories, modelNum, trainedModels, originalData, resultColumn);
            
            // Add visualization
            const vizElement = ModelVisualization.generateVisualization(model, featureColumns, cellMapping);
            const vizId = `viz_model${idx + 1}`;
            html += `<div id="${vizId}"></div>`;
            
            // Incorrect rows
            const incorrect = [];
            const highDistanceRows = []; // Track rows with distance > 0.18
            const uniqueValues = trainedModels.uniqueValues; // Get uniqueValues from trainedModels
            originalData.forEach((row, i) => {
                const actual = cellMapping[`C${featureColumns.length + 1}`][row[resultColumn]];
                const predicted = model.predictions[i];
                if (Math.abs(actual - predicted) > 0.01) {
                    // Calculate distance details for this incorrect prediction
                    const score = model.predictionScores[i];
                    const sortedValues = [...uniqueValues].sort((a, b) => a - b);
                    const thresholds = [];
                    for (let j = 0; j < sortedValues.length - 1; j++) {
                        thresholds.push((sortedValues[j] + sortedValues[j + 1]) / 2);
                    }
                    
                    const actualIdx = sortedValues.findIndex(v => Math.abs(v - actual) < 0.01);
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
                        
                        // Check if normalized distance > 0.18
                        const range = sortedValues[sortedValues.length - 1] - sortedValues[0];
                        const normalizedDistance = minDistanceToCorrect / range;
                        if (normalizedDistance > 0.18) {
                            highDistanceRows.push(normalizedDistance);
                        }
                    }
                    
                    incorrect.push({
                        ...row,
                        predicted: reverseMapping[predicted],
                        score: score.toFixed(4),
                        threshold: closestThreshold !== null ? closestThreshold.toFixed(4) : 'N/A',
                        distance: minDistanceToCorrect !== null ? minDistanceToCorrect.toFixed(4) : 'N/A'
                    });
                }
            });
            
            // Store high distance count in model for evaluation
            model.highDistanceCount = highDistanceRows.length;
            model.maxHighDistance = highDistanceRows.length > 0 ? Math.max(...highDistanceRows) : 0;
            
            if (incorrect.length > 0) {
                html += `<h3>Incorrectly Predicted Rows (Model ${modelNum})</h3>`;
                html += `<p class="section-description">Total incorrect: ${incorrect.length}</p>`;
                
                // Add weighted score details if available
                if (model.weightedAccuracy !== undefined && model.predictionScores) {
                    html += '<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px;">';
                    html += `<strong>Weighted Score: ${model.weightedAccuracy.toFixed(4)}</strong> (lower is better)<br>`;
                    html += '<small>This measures the average normalized distance from incorrect predictions to the nearest correct threshold.</small>';
                    html += '</div>';
                }
                
                html += '<div class="preview"><table><thead><tr>';
                
                Object.keys(incorrect[0]).forEach(key => {
                    html += `<th>${key}</th>`;
                });
                html += '</tr></thead><tbody>';
                
                incorrect.forEach(row => {
                    html += '<tr>';
                    Object.values(row).forEach(val => {
                        html += `<td>${val}</td>`;
                    });
                    html += '</tr>';
                });
                
                html += '</tbody></table></div>';
                
                // Add toggle button for extended details
                html += '<div style="margin-top: 15px;">';
                html += `<button class="formula-toggle-btn" onclick="document.getElementById('trainModel${modelNum}Extended').style.display = document.getElementById('trainModel${modelNum}Extended').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">Extended Analysis</button>`;
                html += '</div>';
                
                // Extended details container (hidden by default)
                html += `<div id="trainModel${modelNum}Extended" style="display: none;">`;
                
                // Extended view with range and distance columns
                html += '<h4 style="margin-top: 20px;">Extended Details</h4>';
                const displayRows = incorrect.map((row) => {
                    // Extract row_id if it exists, otherwise use index
                    const rowId = row.row_id ? parseInt(row.row_id) - 1 : 0;
                    
                    return PredictionTableBuilder.buildPredictionRow(
                        rowId,
                        row,
                        featureColumns,
                        resultColumn,
                        row.predicted,
                        parseFloat(row.score),
                        reverseMapping,
                        cellMapping,
                        true
                    );
                });
                
                html += PredictionTableBuilder.generateTableHTML(displayRows, featureColumns, true);
                
                // Add distance visualization
                html += PredictionDistanceVisualization.generateVisualization(displayRows, reverseMapping, cellMapping, featureColumns, resultColumn);
                
                html += '</div>'; // Close extended details container
            } else {
                html += '<div class="success">All rows predicted correctly!</div>';
            }
            
            html += '</div>'; // Close model details
        });
        
        html += '</div>'; // Close modelDetails
        
        console.log('Setting container HTML, length:', html.length);
        container.innerHTML = html;
        console.log('HTML set successfully');
        
        // Insert visualizations for each model
        modelsToDisplay.forEach((model, idx) => {
            const modelNum = idx + 1;
            const vizId = `viz_model${modelNum}`;
            const vizContainer = document.getElementById(vizId);
            if (vizContainer) {
                const vizElement = ModelVisualization.generateVisualization(model, featureColumns, cellMapping);
                vizContainer.appendChild(vizElement);
            }
        });
        
        // Add click event listeners to model cards
        document.querySelectorAll('.model-card').forEach(card => {
            card.addEventListener('click', () => {
                const modelNum = parseInt(card.dataset.model);
                console.log('Card clicked, model:', modelNum);
                this.switchModel(modelNum);
            });
        });
        
        console.log('Event listeners attached');
    },

    // Generate exploration exponent comparison table
    generateExplorationComparison(allModels, modelType, approachName) {
        // modelType: 1=Simple, 2=Interactions, 3=Polynomial
        const modelKey = `model${modelType}`;
        
        // Extract all exploration results for this model type
        const explorationResults = allModels.map(item => ({
            exploreExp: item.exploreExp,
            accuracy: item[modelKey].accuracy,
            weightedAccuracy: item[modelKey].weightedAccuracy
        }));
        
        // Sort by simple accuracy first (descending), then weighted accuracy as tiebreaker (LOWER is better), then closest to 1.0
        explorationResults.sort((a, b) => {
            // Primary: Higher simple accuracy first
            if (Math.abs(a.accuracy - b.accuracy) > 0.001) {
                return b.accuracy - a.accuracy;
            }
            // Tiebreaker 1: LOWER weighted score is better
            if (Math.abs(a.weightedAccuracy - b.weightedAccuracy) > 0.0001) {
                return a.weightedAccuracy - b.weightedAccuracy;
            }
            // Tiebreaker 2: Exploration exponent closer to 1.0 (simpler transformation)
            return Math.abs(a.exploreExp - 1.0) - Math.abs(b.exploreExp - 1.0);
        });
        
        let html = '<h3>Exploration Exponent Comparison</h3>';
        html += `<p class="section-description">All tested exploration exponents for this ${approachName} model, sorted by simple accuracy (then weighted accuracy as tiebreaker).</p>`;
        html += '<div class="exploration-comparison">';
        html += '<table style="width: 100%; border-collapse: collapse;"><thead>';
        html += '<tr>';
        html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6; background: #e9ecef;">Rank</th>';
        html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6; background: #e9ecef;">Exploration Exp</th>';
        html += '<th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6; background: #e9ecef;">Simple Accuracy</th>';
        html += '<th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6; background: #e9ecef;">Weighted Score (lower=better)</th>';
        html += '</tr></thead><tbody>';
        
        explorationResults.forEach((result, idx) => {
            const isSelected = idx === 0; // Top one is selected
            const rowStyle = isSelected ? 'background: #d4edda; font-weight: 600;' : '';
            const badge = isSelected ? ' <span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em;">SELECTED</span>' : '';
            
            html += `<tr style="${rowStyle}">`;
            html += `<td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${idx + 1}</td>`;
            html += `<td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${result.exploreExp.toFixed(1)}${badge}</td>`;
            html += `<td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${result.accuracy.toFixed(2)}%</td>`;
            html += `<td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${result.weightedAccuracy.toFixed(4)}</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        
        return html;
    },

    // Generate ablation test results
    generateAblationResults(ablationData) {
        let html = '<h3>Feature Ablation Test (Impact Analysis)</h3>';
        html += '<p class="section-description">Shows how much accuracy drops when each feature is neutralized (set to average value 1.0). Features shown in original column order.</p>';
        html += '<div class="ablation-section">';
        
        ablationData.forEach(item => {
            const percentage = item.impactPercentage;
            const barWidth = Math.min(percentage, 100); // Cap at 100%
            
            html += '<div class="ablation-item">';
            html += `<div class="ablation-feature-name">${item.feature}</div>`;
            html += '<div class="ablation-bar-container">';
            html += `<div class="ablation-bar" style="width: ${barWidth}%">`;
            html += `<span class="ablation-bar-label">${item.incorrectIncrease} more incorrect</span>`;
            html += '</div>';
            html += `<span class="ablation-percentage">${percentage.toFixed(2)}%</span>`;
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        
        return html;
    },
    
    // Generate coefficient visualization
    generateCoefficientVisualization(model, featureColumns) {
        let html = '<h3 style="margin-top: 30px;">Model Coefficients (Mathematical Weights)</h3>';
        
        // Get coefficients based on model type
        const coefficients = [];
        
        // Check if this is an interaction model
        const isInteractionModel = model.featureNames && model.featureNames.some(name => name.includes('*'));
        
        if (isInteractionModel) {
            // For interaction models, show ALL terms (single features + interactions)
            html += '<p class="section-description">Shows the absolute value of all coefficients including single features and their interactions. Higher bars = stronger mathematical influence.</p>';
            
            model.featureNames.forEach((feature, i) => {
                const coef = model.weights[i + 1]; // +1 to skip bias
                coefficients.push({
                    feature: feature,
                    absValue: Math.abs(coef),
                    isInteraction: feature.includes('*')
                });
            });
        } else {
            // For simple models, show only original features
            html += '<p class="section-description">Shows the absolute value of each feature\'s coefficient. Higher bars = stronger mathematical influence.</p>';
            
            featureColumns.forEach((feature, i) => {
                const coef = model.weights[i + 1]; // +1 to skip bias
                coefficients.push({
                    feature: feature,
                    absValue: Math.abs(coef)
                });
            });
        }
        
        // Add note about contradictory signs
        html += '<div style="margin: 15px 0; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">';
        html += '<strong>Note:</strong> If results show contradictory +/- signs compared to expectations, this indicates a <strong>mirrored model</strong> has been trained. ';
        html += 'The model emphasizes low impact in that dimension rather than high impact. The absolute values shown here represent the strength of influence regardless of direction.';
        html += '</div>';
        
        // Find max absolute value for scaling
        const maxAbs = Math.max(...coefficients.map(c => c.absValue));
        
        // Create bar chart with scroll
        html += '<div class="coefficient-chart-wrapper">';
        html += '<div class="coefficient-chart">';
        
        coefficients.forEach(coef => {
            const barHeight = maxAbs > 0 ? (coef.absValue / maxAbs) * 100 : 0;
            const barColor = coef.isInteraction ? '#3498db' : '#27ae60'; // Blue for interactions, green for single features
            
            html += '<div class="coef-column">';
            html += `<div class="coef-bar-container">`;
            html += `<div class="coef-bar" style="height: ${barHeight}%; background: ${barColor};">`;
            html += `<span class="coef-value-vertical">${coef.absValue.toFixed(4)}</span>`;
            html += '</div>';
            html += '</div>';
            html += `<div class="coef-label-vertical">${coef.feature}</div>`;
            html += '</div>';
        });
        
        html += '</div>'; // Close coefficient-chart
        html += '</div>'; // Close coefficient-chart-wrapper
        
        // Add legend for interaction models
        if (isInteractionModel) {
            html += '<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 0.9em;">';
            html += '<strong>Legend:</strong> ';
            html += '<span style="color: #27ae60;">?</span> Single feature | ';
            html += '<span style="color: #3498db;">?</span> Interaction (feature combination)';
            html += '</div>';
        }
        
        return html;
    },

    // Display optimization engine results
    displayOptimizationResults(trainedModels, container, featureColumns, resultColumn) {
        const model = trainedModels.model1;
        const categories = trainedModels.uniqueValues;
        
        let html = '<div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107; color: #856404;">';
        html += '<strong>Optimization Engine Mode</strong><br>';
        html += 'Using iterative optimization approach (Scripts 2-15 logic) instead of linear regression.<br>';
        html += 'Accuracy = Retention Rate (percentage of records kept after removing overlaps)';
        html += '</div>';
        
        html += '<div class="results-grid">';
        html += `
            <div class="result-card">
                <h3>${model.name}</h3>
                <div class="metric">${model.accuracy.toFixed(2)}%</div>
                <p>${model.correct} / ${model.total} records retained</p>
            </div>
        `;
        html += '</div>';
        
        // Optimization metrics
        html += '<h3>Optimization Metrics</h3>';
        html += '<div class="formula-box">';
        html += `<strong>Records Removed:</strong> ${model.removedCount} (${(100 - model.retentionRate).toFixed(2)}%)<br>`;
        html += `<strong>Records Retained:</strong> ${model.retainedCount} (${model.retentionRate.toFixed(2)}%)<br>`;
        html += `<strong>Final Interferences:</strong> ${model.interferences}<br>`;
        html += '</div>';
        
        // Exponent adjustments
        html += '<h3>Optimized Column Exponents</h3>';
        html += '<p class="section-description">Final exponent adjustments found through iterative optimization</p>';
        html += '<div class="formula-box">';
        featureColumns.forEach(col => {
            const adjustment = model.adjustments[col] || 0;
            const sign = adjustment >= 0 ? '+' : '';
            html += `${col}: ${sign}${adjustment.toFixed(2)}<br>`;
        });
        html += '</div>';
        
        // Confusion Matrix (all on diagonal since removed records are excluded)
        html += '<h3>Category Distribution (Retained Records)</h3>';
        html += '<p class="section-description">All retained records are correctly separated by category</p>';
        html += '<div class="confusion-matrix">';
        html += '<table><thead>';
        html += '<tr><th></th>';
        categories.forEach(cat => {
            html += `<th>${cat}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        model.confusion.forEach((row, i) => {
            html += `<tr><th>${categories[i]}</th>`;
            row.forEach((val, j) => {
                const isDiagonal = i === j;
                if (isDiagonal) {
                    html += `<td class="diagonal-cell">${val}</td>`;
                } else {
                    html += `<td>${val}</td>`;
                }
            });
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        
        // Explanation
        html += '<h3>How This Works</h3>';
        html += '<div class="info">';
        html += '<p><strong>Optimization Approach:</strong></p>';
        html += '<ol>';
        html += '<li>Convert values to impact scores (0.2-2.0 range)</li>';
        html += '<li>Test transformation strategies to separate categories</li>';
        html += '<li>Iteratively optimize column exponents to minimize overlaps</li>';
        html += '<li>Remove records in overlap regions (minority records)</li>';
        html += '<li>Retention rate = model accuracy</li>';
        html += '</ol>';
        html += '<p><strong>Accuracy Metric:</strong> Higher retention rate = better category separation = better model</p>';
        html += '</div>';
        
        container.innerHTML = html;
    },
    switchModel(modelNum) {
        console.log('switchModel called with:', modelNum);
        
        // Hide all model details
        const allDetails = document.querySelectorAll('.model-details');
        console.log('Found model-details elements:', allDetails.length);
        allDetails.forEach(el => {
            console.log('Hiding element:', el.id);
            el.style.display = 'none';
        });
        
        // Show selected model
        const selectedModel = document.getElementById(`model${modelNum}Details`);
        console.log('Selected model element:', selectedModel);
        if (selectedModel) {
            selectedModel.style.display = 'block';
            console.log('Set display to block for model', modelNum);
        } else {
            console.error('Could not find element: model' + modelNum + 'Details');
        }
        
        // Update card highlighting
        document.querySelectorAll('.model-card').forEach(card => {
            card.classList.remove('active');
        });
        const selectedCard = document.querySelector(`.model-card[data-model="${modelNum}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            console.log('Added active class to card', modelNum);
        }
    },

    // Generate formulas with normalization
    generateFormulas(model, featureColumns, cellMapping, reverseMapping, categories, modelNum, trainedModels, originalData, resultColumn) {
        let html = '';
        
        // Create unique IDs for collapsible sections
        const mathId = `math_${Math.random().toString(36).substr(2, 9)}`;
        const csharpId = `csharp_${Math.random().toString(36).substr(2, 9)}`;
        const excelId = `excel_${Math.random().toString(36).substr(2, 9)}`;
        const ablationId = `ablation_${Math.random().toString(36).substr(2, 9)}`;
        const exponentId = `exponent_${Math.random().toString(36).substr(2, 9)}`;
        const reportId = `report_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if this model has ablation data
        const hasAblation = model.ablation && (modelNum === 1 || modelNum === 2 || modelNum === 4 || modelNum === 5 || modelNum === 7 || modelNum === 8);
        
        // Check if this model has exponent exploration data
        const hasExponentExploration = modelNum >= 4 && modelNum <= 9 && 
            ((modelNum >= 4 && modelNum <= 6 && trainedModels.allModels) || 
             (modelNum >= 7 && modelNum <= 9 && trainedModels.penaltyAllModels));
        
        // Add toggle buttons
        html += '<div class="emphasized-section"><div class="emphasized-section-inner">';
        html += '<div style="display: flex; gap: 10px; margin: 0; flex-wrap: wrap;">';
        html += `<button class="formula-toggle-btn" onclick="document.getElementById('${mathId}').style.display = document.getElementById('${mathId}').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">Mathematical Formula</button>`;
        html += `<button class="formula-toggle-btn" onclick="document.getElementById('${csharpId}').style.display = document.getElementById('${csharpId}').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">C# Code</button>`;
        html += `<button class="formula-toggle-btn" onclick="document.getElementById('${excelId}').style.display = document.getElementById('${excelId}').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">Excel Formula</button>`;
        if (hasAblation) {
            html += `<button class="formula-toggle-btn" onclick="document.getElementById('${ablationId}').style.display = document.getElementById('${ablationId}').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">Column Impact</button>`;
        }
        if (hasExponentExploration) {
            html += `<button class="formula-toggle-btn" onclick="document.getElementById('${exponentId}').style.display = document.getElementById('${exponentId}').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">Exponent Exploration</button>`;
        }
        html += `<button class="formula-toggle-btn" onclick="document.getElementById('${reportId}').style.display = document.getElementById('${reportId}').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">Summary Report</button>`;
        html += '</div>';
        html += '</div></div>';
        
        // Mathematical Formula Section (hidden by default)
        html += `<div id="${mathId}" style="display: none;">`;
        html += '<h3>Model Formula</h3>';
        
        // Display dual-exponent info if available
        if (model.explorationExponent !== undefined && model.combinedExponents && model.combinedExponents.length > 0) {
            html += `
                <div class="exponent-details" style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; border-radius: 5px;">
                    <h4 style="margin-top: 0; color: #856404;">Dual-Exponent Transformation</h4>
                    <p style="margin: 5px 0; color: #856404;"><strong>Exploration Exponent (2nd):</strong> ${model.explorationExponent.toFixed(1)}</p>
                    <p style="margin: 5px 0; color: #856404;"><strong>Combined Exponents:</strong></p>
                    <ul style="margin: 5px 0; padding-left: 20px; color: #856404;">
                        ${featureColumns.map((col, i) => {
                            const cName = `C${i + 1}`;
                            const mapping = cellMapping[cName];
                            if (!mapping) {
                                console.error(`Missing mapping for ${cName} in generateFormulas`);
                                return '';
                            }
                            const userExp = mapping.exponent || 1.0;
                            const combinedExp = model.combinedExponents[i];
                            if (combinedExp === undefined) {
                                console.error(`Missing combinedExponent at index ${i} for ${col}`);
                                return '';
                            }
                            return `<li><strong>${col}:</strong> ${userExp.toFixed(2)} (user) ? ${model.explorationExponent.toFixed(1)} (explore) = <strong>${combinedExp.toFixed(2)}</strong></li>`;
                        }).filter(item => item !== '').join('')}
                    </ul>
                    <p style="margin: 5px 0; font-size: 0.9em; color: #856404;">
                        <em>Formula: transformed_value = original_value ^ (user_exponent ? exploration_exponent)</em>
                    </p>
                </div>
            `;
        } else if (model.explorationExponent !== undefined && model.penalties && model.penalties.length > 0) {
            // Penalty-based model
            html += `
                <div class="exponent-details" style="background: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3; margin-bottom: 20px; border-radius: 5px;">
                    <h4 style="margin-top: 0; color: #1565C0;">Penalty-Based Transformation</h4>
                    <p style="margin: 5px 0; color: #1565C0;"><strong>Exploration Exponent:</strong> ${model.explorationExponent.toFixed(1)}</p>
                    <p style="margin: 5px 0; color: #1565C0;"><strong>Penalty Calculation:</strong></p>
                    <ul style="margin: 5px 0; padding-left: 20px; color: #1565C0;">
                        ${featureColumns.map((col, i) => {
                            const cName = `C${i + 1}`;
                            const mapping = cellMapping[cName];
                            if (!mapping) {
                                console.error(`Missing mapping for ${cName} in generateFormulas`);
                                return '';
                            }
                            const userWeight = mapping.exponent || 1.0;
                            const penalty = model.penalties[i];
                            const strength = model.penaltyStrengths[i];
                            return `<li><strong>${col}:</strong> penalty = 2.0 - ${userWeight.toFixed(2)} = <strong>${penalty.toFixed(2)}</strong>, strength = ${penalty.toFixed(2)} ? ${model.explorationExponent.toFixed(1)} = <strong>${strength.toFixed(2)}</strong></li>`;
                        }).filter(item => item !== '').join('')}
                    </ul>
                    <p style="margin: 5px 0; font-size: 0.9em; color: #1565C0;">
                        <em>Formula: reduced_value = 1.0 + (normalized_value - 1.0) ? (1.0 - penalty_strength)</em><br>
                        <em>Effect: Higher penalty strength ? value closer to 1.0 (neutral) ? less influence on prediction</em>
                    </p>
                </div>
            `;
        }
        
        // Check if exponents are enabled
        const exponentsEnabled = cellMapping._exponentsEnabled || false;
        const hasAnyExponent = featureColumns.some((col, i) => {
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            return mapping.exponent && mapping.exponent !== 1.0;
        });
        
        if (exponentsEnabled && hasAnyExponent && !model.explorationExponent) {
            html += '<p class="section-description" style="background: #fff3cd; border-left-color: #ffc107;">Experimental feature active: Features weighted during regression (higher weight = more influence on optimization)</p>';
        }
        
        // Determine model type based on feature names
        const isInteractions = model.featureNames && model.featureNames.some(name => name.includes('*'));
        const isPolynomial = model.name.includes('Polynomial');
        
        // Math formula
        html += '<h4>Mathematical Formula:</h4>';
        
        // Check if any exponents are used
        const hasExponents = featureColumns.some((col, i) => {
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            return mapping && mapping.exponent && mapping.exponent !== 1.0;
        });
        
        if (hasExponents) {
            html += '<p style="color: #ffc107; font-size: 0.9em; margin-bottom: 10px;">Note: C variables represent normalized values raised to their importance exponents (see Column Normalization below)</p>';
        }
        
        html += '<div class="formula-box">';
        
        let mathFormula = `y = ${model.weights[0].toFixed(4)}`;
        
        if (isPolynomial) {
            // Polynomial: show all terms explicitly
            const m = featureColumns.length;
            let weightIdx = 1;
            
            // Original features
            for (let i = 0; i < m; i++) {
                const weight = model.weights[weightIdx];
                const sign = weight >= 0 ? ' + ' : ' ';
                mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}`;
                weightIdx++;
            }
            
            // Degree 2 terms
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    const weight = model.weights[weightIdx];
                    const sign = weight >= 0 ? ' + ' : ' ';
                    if (i === j) {
                        mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}2`;
                    } else {
                        mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}*C${j + 1}`;
                    }
                    weightIdx++;
                }
            }
            
            // Degree 3 terms
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    for (let k = j; k < m; k++) {
                        const weight = model.weights[weightIdx];
                        const sign = weight >= 0 ? ' + ' : ' ';
                        if (i === j && j === k) {
                            mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}3`;
                        } else if (i === j) {
                            mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}2*C${k + 1}`;
                        } else if (j === k) {
                            mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}*C${j + 1}2`;
                        } else {
                            mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}*C${j + 1}*C${k + 1}`;
                        }
                        weightIdx++;
                    }
                }
            }
        } else if (model.featureNames) {
            // Use feature names if available (for interactions)
            model.featureNames.forEach((name, i) => {
                const weight = model.weights[i + 1];
                const sign = weight >= 0 ? ' + ' : ' ';
                // Convert feature names to C notation
                let cName = name;
                featureColumns.forEach((col, j) => {
                    cName = cName.replace(col, `C${j + 1}`);
                });
                mathFormula += `${sign}${weight.toFixed(4)}*${cName}`;
            });
        } else {
            // Simple model
            featureColumns.forEach((col, i) => {
                const weight = model.weights[i + 1];
                const sign = weight >= 0 ? ' + ' : ' ';
                mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}`;
            });
        }
        
        html += mathFormula;
        html += '</div>';
        
        // Normalization info
        html += '<h4>Column Normalization:</h4>';
        html += '<div class="formula-box">';
        featureColumns.forEach((col, i) => {
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            
            if (mapping.type === 'numeric') {
                html += `${col}: `;
                html += `if x ? ${mapping.min} ? 0.2, `;
                html += `if x ? ${mapping.avg} ? 0.2 + (x-${mapping.min})/(${mapping.avg}-${mapping.min})*0.8, `;
                html += `if x ? ${mapping.max} ? 1.0 + (x-${mapping.avg})/(${mapping.max}-${mapping.avg})*1.0, `;
                html += `else ? 2.0`;
                
                // Add exponent transformation if applicable
                if (model.combinedExponents) {
                    const exp = model.combinedExponents[i];
                    html += `<br>&nbsp;&nbsp;&nbsp;&nbsp;Then: C${i + 1} = normalized_value ^ ${exp.toFixed(4)}`;
                }
                html += `<br>`;
            } else {
                const entries = Object.entries(mapping).filter(([k]) => k !== 'exponent');
                html += `${col}: ${entries.map(([k,v]) => `${k}=${v}`).join(', ')}`;
                
                // Add exponent transformation if applicable
                if (model.combinedExponents) {
                    const exp = model.combinedExponents[i];
                    html += `<br>&nbsp;&nbsp;&nbsp;&nbsp;Then: C${i + 1} = encoded_value ^ ${exp.toFixed(4)}`;
                }
                html += `<br>`;
            }
        });
        
        // Show coefficient weighting ratios if experimental mode is on
        if (exponentsEnabled && hasAnyExponent) {
            html += '<br><strong style="color: #ffc107;">Feature Weights (applied during regression):</strong><br>';
            featureColumns.forEach((col, i) => {
                const cName = `C${i + 1}`;
                const mapping = cellMapping[cName];
                const weight = mapping.exponent || 1.0;
                html += `${col}: ${weight.toFixed(1)}x weight<br>`;
            });
        }
        
        html += '</div>';
        
        // Classification thresholds
        const uniqueValues = Object.keys(reverseMapping).map(k => parseFloat(k)).sort((a,b) => a-b);
        
        html += '<h4>Classification Rules:</h4>';
        html += '<div class="formula-box">';
        html += `Encoded values: [${uniqueValues.join(', ')}]<br>`;
        html += `Categories: [${categories.join(', ')}]<br><br>`;
        
        // Calculate thresholds
        const thresholds = [];
        for (let i = 0; i < uniqueValues.length - 1; i++) {
            thresholds.push((uniqueValues[i] + uniqueValues[i + 1]) / 2);
        }
        
        html += 'Thresholds:<br>';
        categories.forEach((cat, i) => {
            if (i === 0) {
                html += `score < ${thresholds[i].toFixed(2)} ? ${cat}<br>`;
            } else if (i === categories.length - 1) {
                html += `score ? ${thresholds[i-1].toFixed(2)} ? ${cat}<br>`;
            } else {
                html += `${thresholds[i-1].toFixed(2)} ? score < ${thresholds[i].toFixed(2)} ? ${cat}<br>`;
            }
        });
        
        html += '</div>'; // Close Classification Rules formula-box
        
        html += '</div>'; // Close Mathematical Formula section
        
        // C# Code Section (hidden by default)
        html += `<div id="${csharpId}" style="display: none;">`;
        // C# Code formula
        html += '<h3>C# Code Formula</h3>';
        html += '<div class="formula-box">';
        html += '<pre style="margin: 0; white-space: pre-wrap; font-family: \'Courier New\', monospace;">';
        
        html += this.generateCSharpCode(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial);
        
        html += '</pre>';
        html += '</div>';
        
        html += '</div>'; // Close C# Code section
        
        // Excel Formula Section (hidden by default)
        html += `<div id="${excelId}" style="display: none;">`;
        // Excel formula
        html += '<h3>Excel Formula (with normalization)</h3>';
        
        // Add visual guide for Excel usage
        html += '<div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 15px; border-radius: 5px;">';
        html += '<p style="margin: 0 0 10px 0; font-weight: bold; color: #28a745;">How to use this formula in Excel:</p>';
        html += '<div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; font-size: 0.9em;">';
        html += '<div style="text-align: center; font-size: 1.2em;">1.</div><div>Put your data in columns A, B, C, etc. (starting from row 2)</div>';
        html += '<div style="text-align: center; font-size: 1.2em;">2.</div><div>Click on the cell where you want the prediction (e.g., D2)</div>';
        html += '<div style="text-align: center; font-size: 1.2em;">3.</div><div>Copy the formula below and paste it into that cell</div>';
        html += '<div style="text-align: center; font-size: 1.2em;">4.</div><div>Press Enter - you should see the predicted category!</div>';
        html += '<div style="text-align: center; font-size: 1.2em;">5.</div><div>Drag the formula down to predict for all rows</div>';
        html += '</div>';
        html += '<div style="margin-top: 10px; padding: 10px; background: #fff; border-radius: 3px; font-family: monospace; font-size: 0.85em;">';
        html += '<strong>Example layout:</strong><br>';
        html += '<table style="border-collapse: collapse; margin-top: 5px; font-size: 0.9em;">';
        html += '<tr style="background: #e9ecef;"><th style="border: 1px solid #dee2e6; padding: 5px;">A</th><th style="border: 1px solid #dee2e6; padding: 5px;">B</th><th style="border: 1px solid #dee2e6; padding: 5px;">C</th><th style="border: 1px solid #dee2e6; padding: 5px; background: #d4edda;">D</th></tr>';
        html += '<tr><td style="border: 1px solid #dee2e6; padding: 5px; text-align: center;">1</td><td style="border: 1px solid #dee2e6; padding: 5px;">' + (featureColumns[0] || 'Feature1') + '</td><td style="border: 1px solid #dee2e6; padding: 5px;">' + (featureColumns[1] || 'Feature2') + '</td><td style="border: 1px solid #dee2e6; padding: 5px; background: #d4edda;">Prediction</td></tr>';
        html += '<tr><td style="border: 1px solid #dee2e6; padding: 5px; text-align: center;">2</td><td style="border: 1px solid #dee2e6; padding: 5px;">10000</td><td style="border: 1px solid #dee2e6; padding: 5px;">50</td><td style="border: 1px solid #dee2e6; padding: 5px; background: #d4edda; color: #28a745; font-weight: bold;">? Paste formula here</td></tr>';
        html += '<tr><td style="border: 1px solid #dee2e6; padding: 5px; text-align: center;">3</td><td style="border: 1px solid #dee2e6; padding: 5px;">20000</td><td style="border: 1px solid #dee2e6; padding: 5px;">100</td><td style="border: 1px solid #dee2e6; padding: 5px; background: #d4edda; color: #999;">? Drag down</td></tr>';
        html += '</table>';
        html += '</div>';
        html += '</div>';
        
        html += this.generateExcelFormulaStructured(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial);
        html += this.generateExcelFormulaCompact(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial);
        
        html += '</div>'; // Close Excel Formula section
        
        // Column Impact Section (hidden by default, only if ablation data exists)
        if (hasAblation) {
            html += `<div id="${ablationId}" style="display: none;">`;
            html += this.generateAblationResults(model.ablation);
            html += this.generateCoefficientVisualization(model, featureColumns);
            html += '</div>';
        }
        
        // Exponent Exploration Section (hidden by default, only for models 4-9)
        if (hasExponentExploration) {
            html += `<div id="${exponentId}" style="display: none;">`;
            
            const isExperimental = modelNum >= 4 && modelNum <= 6;
            const isPenalty = modelNum >= 7 && modelNum <= 9;
            
            if (isExperimental && trainedModels.allModels) {
                html += this.generateExplorationComparison(trainedModels.allModels, modelNum - 3, 'Dual-Exponent');
            } else if (isPenalty && trainedModels.penaltyAllModels) {
                html += this.generateExplorationComparison(trainedModels.penaltyAllModels, modelNum - 6, 'Penalty');
            }
            
            html += '</div>';
        }
        
        
        // Summary Report Section (hidden by default)
        html += `<div id="${reportId}" style="display: none;">`;
        const reportText = SummaryReport.generateTrainingReport(model, modelNum, featureColumns, originalData, resultColumn, cellMapping, reverseMapping, trainedModels);
        html += '<div style="margin-top: 20px;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        html += '<h3 style="margin: 0;">Summary Report</h3>';
        html += `<button onclick="SummaryReport.copyReport('report_${reportId}_textarea')" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy to Clipboard</button>`;
        html += '</div>';
        html += `<textarea id="report_${reportId}_textarea" readonly style="width: 100%; height: 400px; font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; background: #f8f9fa; resize: vertical;">${reportText}</textarea>`;
        html += '</div>';
        html += '</div>';
        return html;
    },

    // Generate C# code for prediction
    generateCSharpCode(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial) {
        let code = '';
        
        // Generate object-based version first
        code += '// Object-based approach (recommended for database entities)\n';
        code += 'public class DataEntity\n{\n';
        featureColumns.forEach((col, i) => {
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            const propType = mapping.type === 'numeric' ? 'double' : 'string';
            code += `    public ${propType} ${col.replace(/[^a-zA-Z0-9]/g, '_')} { get; set; }\n`;
        });
        code += '}\n\n';
        
        code += 'public static string PredictCategory(DataEntity entity)\n{\n';
        
        // Normalize/encode each feature using object properties
        featureColumns.forEach((col, i) => {
            const propName = col.replace(/[^a-zA-Z0-9]/g, '_');
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            
            if (mapping.type === 'numeric') {
                code += `    double c${i + 1}_normalized = entity.${propName} <= ${mapping.min} ? 0.2 :\n`;
                code += `                                  entity.${propName} <= ${mapping.avg} ? 0.2 + (entity.${propName} - ${mapping.min}) / (${mapping.avg} - ${mapping.min}) * 0.8 :\n`;
                code += `                                  entity.${propName} <= ${mapping.max} ? 1.0 + (entity.${propName} - ${mapping.avg}) / (${mapping.max} - ${mapping.avg}) * 1.0 :\n`;
                code += `                                  2.0;\n`;
            } else {
                code += `    double c${i + 1}_normalized = entity.${propName} switch\n    {\n`;
                Object.entries(mapping).filter(([k]) => k !== 'exponent').forEach(([text, value]) => {
                    code += `        "${text}" => ${value},\n`;
                });
                code += `        _ => 0.0\n    };\n`;
            }
        });
        
        // Apply exponent transformations if using dual-exponent mode
        if (model.combinedExponents) {
            code += '\n    // Apply exponent transformations (dual-exponent mode)\n';
            featureColumns.forEach((col, i) => {
                const exp = model.combinedExponents[i];
                code += `    double c${i + 1} = Math.Pow(c${i + 1}_normalized, ${exp.toFixed(4)});\n`;
            });
        } else {
            // No exponents, just use normalized values
            featureColumns.forEach((col, i) => {
                code += `    double c${i + 1} = c${i + 1}_normalized;\n`;
            });
        }
        
        // Calculate score based on model type
        code += '\n    // Calculate score\n';
        code += `    double score = ${model.weights[0].toFixed(4)}`;
        
        if (isPolynomial) {
            // Polynomial: add all polynomial terms
            const m = featureColumns.length;
            let weightIdx = 1;
            
            // Original features
            for (let i = 0; i < m; i++) {
                code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1}`;
                weightIdx++;
            }
            
            // Degree 2 terms
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1} * c${j + 1}`;
                    weightIdx++;
                }
            }
            
            // Degree 3 terms
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    for (let k = j; k < m; k++) {
                        code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1} * c${j + 1} * c${k + 1}`;
                        weightIdx++;
                    }
                }
            }
        } else if (isInteractions) {
            // Interactions: original features + pairwise interactions
            const m = featureColumns.length;
            let weightIdx = 1;
            
            // Original features
            for (let i = 0; i < m; i++) {
                code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1}`;
                weightIdx++;
            }
            
            // Pairwise interactions
            for (let i = 0; i < m; i++) {
                for (let j = i + 1; j < m; j++) {
                    code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1} * c${j + 1}`;
                    weightIdx++;
                }
            }
        } else {
            // Simple: just original features
            featureColumns.forEach((col, i) => {
                code += ` + ${model.weights[i + 1].toFixed(4)} * c${i + 1}`;
            });
        }
        
        code += ';\n\n';
        
        // Classification
        code += '    // Classify based on thresholds\n';
        categories.forEach((cat, i) => {
            if (i === 0) {
                code += `    if (score < ${thresholds[i].toFixed(2)}) return "${cat}";\n`;
            } else if (i === categories.length - 1) {
                code += `    return "${cat}";\n`;
            } else {
                code += `    if (score < ${thresholds[i].toFixed(2)}) return "${cat}";\n`;
            }
        });
        
        code += '}\n\n';
        
        // Add separator
        code += '// ============================================\n';
        code += '// Alternative: Direct parameters approach\n';
        code += '// ============================================\n\n';
        
        // Generate direct parameters version
        code += 'public static string PredictCategory(';
        const paramList = featureColumns.map((col, i) => {
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            const paramType = mapping.type === 'numeric' ? 'double' : 'string';
            return `${paramType} ${col.replace(/[^a-zA-Z0-9]/g, '_')}`;
        });
        code += paramList.join(', ');
        code += ')\n{\n';
        
        // Normalize/encode each feature
        featureColumns.forEach((col, i) => {
            const varName = col.replace(/[^a-zA-Z0-9]/g, '_');
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            
            if (mapping.type === 'numeric') {
                code += `    double c${i + 1}_normalized = ${varName} <= ${mapping.min} ? 0.2 :\n`;
                code += `                                  ${varName} <= ${mapping.avg} ? 0.2 + (${varName} - ${mapping.min}) / (${mapping.avg} - ${mapping.min}) * 0.8 :\n`;
                code += `                                  ${varName} <= ${mapping.max} ? 1.0 + (${varName} - ${mapping.avg}) / (${mapping.max} - ${mapping.avg}) * 1.0 :\n`;
                code += `                                  2.0;\n`;
            } else {
                code += `    double c${i + 1}_normalized = ${varName} switch\n    {\n`;
                Object.entries(mapping).filter(([k]) => k !== 'exponent').forEach(([text, value]) => {
                    code += `        "${text}" => ${value},\n`;
                });
                code += `        _ => 0.0\n    };\n`;
            }
        });
        
        // Apply exponent transformations if using dual-exponent mode
        if (model.combinedExponents) {
            code += '\n    // Apply exponent transformations (dual-exponent mode)\n';
            featureColumns.forEach((col, i) => {
                const exp = model.combinedExponents[i];
                code += `    double c${i + 1} = Math.Pow(c${i + 1}_normalized, ${exp.toFixed(4)});\n`;
            });
        } else {
            // No exponents, just use normalized values
            featureColumns.forEach((col, i) => {
                code += `    double c${i + 1} = c${i + 1}_normalized;\n`;
            });
        }
        
        // Calculate score based on model type
        code += '\n    // Calculate score\n';
        code += `    double score = ${model.weights[0].toFixed(4)}`;
        
        if (isPolynomial) {
            // Polynomial: add all polynomial terms
            const m = featureColumns.length;
            let weightIdx = 1;
            
            // Original features
            for (let i = 0; i < m; i++) {
                code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1}`;
                weightIdx++;
            }
            
            // Degree 2 terms
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1} * c${j + 1}`;
                    weightIdx++;
                }
            }
            
            // Degree 3 terms
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    for (let k = j; k < m; k++) {
                        code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1} * c${j + 1} * c${k + 1}`;
                        weightIdx++;
                    }
                }
            }
        } else if (isInteractions) {
            // Interactions: original features + pairwise interactions
            const m = featureColumns.length;
            let weightIdx = 1;
            
            // Original features
            for (let i = 0; i < m; i++) {
                code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1}`;
                weightIdx++;
            }
            
            // Pairwise interactions
            for (let i = 0; i < m; i++) {
                for (let j = i + 1; j < m; j++) {
                    code += ` + ${model.weights[weightIdx].toFixed(4)} * c${i + 1} * c${j + 1}`;
                    weightIdx++;
                }
            }
        } else {
            // Simple: just original features
            featureColumns.forEach((col, i) => {
                code += ` + ${model.weights[i + 1].toFixed(4)} * c${i + 1}`;
            });
        }
        
        code += ';\n\n';
        
        // Classification
        code += '    // Classify based on thresholds\n';
        categories.forEach((cat, i) => {
            if (i === 0) {
                code += `    if (score < ${thresholds[i].toFixed(2)}) return "${cat}";\n`;
            } else if (i === categories.length - 1) {
                code += `    return "${cat}";\n`;
            } else {
                code += `    if (score < ${thresholds[i].toFixed(2)}) return "${cat}";\n`;
            }
        });
        
        code += '}\n';
        return code;
    },

    // Generate Excel formula - Structured Approach
    generateExcelFormulaStructured(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial) {
        let output = '';
        
        output += '<h4>Structured Approach (Recommended)</h4>';
        output += '<p style="color: #666; font-size: 0.9em; margin-bottom: 10px;">Break down the calculation into separate cells for clarity and easier debugging</p>';
        
        output += '<div class="formula-box">';
        output += '<table style="border-collapse: collapse; margin: 0; font-size: 0.9em; width: 100%;">';
        output += '<tr style="background: #34495e;"><th style="border: 1px solid #555; padding: 8px; color: white;">Cell</th><th style="border: 1px solid #555; padding: 8px; color: white;">Purpose</th><th style="border: 1px solid #555; padding: 8px; color: white;">Formula</th></tr>';
        
        // Normalized values in separate cells
        const normStartCol = featureColumns.length + 2;
        featureColumns.forEach((col, i) => {
            const inputCell = String.fromCharCode(65 + i) + '2';
            const normCell = String.fromCharCode(65 + normStartCol + i) + '2';
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            
            let formula;
            if (mapping.type === 'numeric') {
                formula = `=IF(${inputCell}<=${mapping.min},0.2,IF(${inputCell}<=${mapping.avg},0.2+(${inputCell}-${mapping.min})/(${mapping.avg}-${mapping.min})*0.8,IF(${inputCell}<=${mapping.max},1+(${inputCell}-${mapping.avg})/(${mapping.max}-${mapping.avg}),2)))`;
            } else {
                const mappingEntries = Object.entries(mapping).filter(([k]) => k !== 'exponent');
                formula = '=';
                mappingEntries.forEach(([text, value], idx) => {
                    if (idx === 0) {
                        formula += `IF(${inputCell}="${text}",${value}`;
                    } else if (idx === mappingEntries.length - 1) {
                        formula += `,IF(${inputCell}="${text}",${value},0` + ')'.repeat(mappingEntries.length);
                    } else {
                        formula += `,IF(${inputCell}="${text}",${value}`;
                    }
                });
            }
            
            output += `<tr><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;"><code style="color: #3498db;">${normCell}</code></td><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;">${col}</td><td style="border: 1px solid #555; padding: 8px; font-family: monospace; font-size: 0.85em; color: #ecf0f1;">${formula}</td></tr>`;
        });
        
        // Transformed values (if exponents used)
        const transStartCol = normStartCol + featureColumns.length;
        if (model.combinedExponents) {
            featureColumns.forEach((col, i) => {
                const normCell = String.fromCharCode(65 + normStartCol + i) + '2';
                const transCell = String.fromCharCode(65 + transStartCol + i) + '2';
                const exp = model.combinedExponents[i];
                const formula = `=POWER(${normCell},${exp.toFixed(4)})`;
                output += `<tr><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;"><code style="color: #3498db;">${transCell}</code></td><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;">Transform ${col}</td><td style="border: 1px solid #555; padding: 8px; font-family: monospace; font-size: 0.85em; color: #ecf0f1;">${formula}</td></tr>`;
            });
        }
        
        // Score calculation
        const scoreCol = model.combinedExponents ? transStartCol + featureColumns.length : transStartCol;
        const scoreCell = String.fromCharCode(65 + scoreCol) + '2';
        let scoreFormula = `=${model.weights[0].toFixed(4)}`;
        
        const valueRefs = featureColumns.map((col, i) => {
            if (model.combinedExponents) {
                return String.fromCharCode(65 + transStartCol + i) + '2';
            } else {
                return String.fromCharCode(65 + normStartCol + i) + '2';
            }
        });
        
        if (isPolynomial) {
            const m = featureColumns.length;
            let weightIdx = 1;
            for (let i = 0; i < m; i++) {
                scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}`;
                weightIdx++;
            }
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}*${valueRefs[j]}`;
                    weightIdx++;
                }
            }
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    for (let k = j; k < m; k++) {
                        scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}*${valueRefs[j]}*${valueRefs[k]}`;
                        weightIdx++;
                    }
                }
            }
        } else if (isInteractions) {
            const m = featureColumns.length;
            let weightIdx = 1;
            for (let i = 0; i < m; i++) {
                scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}`;
                weightIdx++;
            }
            for (let i = 0; i < m; i++) {
                for (let j = i + 1; j < m; j++) {
                    scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}*${valueRefs[j]}`;
                    weightIdx++;
                }
            }
        } else {
            featureColumns.forEach((col, i) => {
                scoreFormula += `+${model.weights[i + 1].toFixed(4)}*${valueRefs[i]}`;
            });
        }
        
        output += `<tr><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;"><code style="color: #3498db;">${scoreCell}</code></td><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;">Score</td><td style="border: 1px solid #555; padding: 8px; font-family: monospace; font-size: 0.85em; color: #ecf0f1;">${scoreFormula}</td></tr>`;
        
        // Final prediction
        const predCell = String.fromCharCode(65 + scoreCol + 1) + '2';
        let predFormula = '=';
        categories.forEach((cat, i) => {
            if (i === 0) {
                predFormula += `IF(${scoreCell}<${thresholds[i].toFixed(2)},"${cat}"`;
            } else if (i === categories.length - 1) {
                predFormula += `,"${cat}"` + ')'.repeat(categories.length - 1);
            } else {
                predFormula += `,IF(${scoreCell}<${thresholds[i].toFixed(2)},"${cat}"`;
            }
        });
        
        output += `<tr style="background: #27ae60;"><td style="border: 1px solid #555; padding: 8px;"><code style="color: white; font-weight: bold;">${predCell}</code></td><td style="border: 1px solid #555; padding: 8px; color: white;"><strong>Prediction</strong></td><td style="border: 1px solid #555; padding: 8px; font-family: monospace; font-size: 0.85em; color: white;">${predFormula}</td></tr>`;
        
        output += '</table>';
        output += '</div>';
        
        return output;
    },
    
    // Generate Excel formula - Compact Single-Cell
    generateExcelFormulaCompact(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial) {
        let output = '';
        
        output += '<h4 style="margin-top: 20px;">Single-Cell Formula (Compact)</h4>';
        output += '<p style="color: #666; font-size: 0.9em; margin-bottom: 10px;">All-in-one formula - paste directly into prediction cell</p>';
        
        output += '<div class="formula-box">';
        
        // Normalized values in separate cells
        const normStartCol = featureColumns.length + 2; // Start after input columns + 1
        featureColumns.forEach((col, i) => {
            const inputCell = String.fromCharCode(65 + i) + '2';
            const normCell = String.fromCharCode(65 + normStartCol + i) + '2';
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            
            let formula;
            if (mapping.type === 'numeric') {
                formula = `=IF(${inputCell}<=${mapping.min},0.2,IF(${inputCell}<=${mapping.avg},0.2+(${inputCell}-${mapping.min})/(${mapping.avg}-${mapping.min})*0.8,IF(${inputCell}<=${mapping.max},1+(${inputCell}-${mapping.avg})/(${mapping.max}-${mapping.avg}),2)))`;
            } else {
                const mappingEntries = Object.entries(mapping).filter(([k]) => k !== 'exponent');
                formula = '=';
                mappingEntries.forEach(([text, value], idx) => {
                    if (idx === 0) {
                        formula += `IF(${inputCell}="${text}",${value}`;
                    } else if (idx === mappingEntries.length - 1) {
                        formula += `,IF(${inputCell}="${text}",${value},0` + ')'.repeat(mappingEntries.length);
                    } else {
                        formula += `,IF(${inputCell}="${text}",${value}`;
                    }
                });
            }
            
            output += `<tr><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;"><code style="color: #3498db;">${normCell}</code></td><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;">${col}</td><td style="border: 1px solid #555; padding: 8px; font-family: monospace; font-size: 0.85em; color: #ecf0f1;">${formula}</td></tr>`;
        });
        
        // Transformed values (if exponents used)
        const transStartCol = normStartCol + featureColumns.length;
        if (model.combinedExponents) {
            featureColumns.forEach((col, i) => {
                const normCell = String.fromCharCode(65 + normStartCol + i) + '2';
                const transCell = String.fromCharCode(65 + transStartCol + i) + '2';
                const exp = model.combinedExponents[i];
                const formula = `=POWER(${normCell},${exp.toFixed(4)})`;
                output += `<tr><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;"><code style="color: #3498db;">${transCell}</code></td><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;">Transform ${col}</td><td style="border: 1px solid #555; padding: 8px; font-family: monospace; font-size: 0.85em; color: #ecf0f1;">${formula}</td></tr>`;
            });
        }
        
        // Score calculation
        const scoreCol = model.combinedExponents ? transStartCol + featureColumns.length : transStartCol;
        const scoreCell = String.fromCharCode(65 + scoreCol) + '2';
        let scoreFormula = `=${model.weights[0].toFixed(4)}`;
        
        const valueRefs = featureColumns.map((col, i) => {
            if (model.combinedExponents) {
                return String.fromCharCode(65 + transStartCol + i) + '2';
            } else {
                return String.fromCharCode(65 + normStartCol + i) + '2';
            }
        });
        
        if (isPolynomial) {
            const m = featureColumns.length;
            let weightIdx = 1;
            for (let i = 0; i < m; i++) {
                scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}`;
                weightIdx++;
            }
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}*${valueRefs[j]}`;
                    weightIdx++;
                }
            }
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    for (let k = j; k < m; k++) {
                        scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}*${valueRefs[j]}*${valueRefs[k]}`;
                        weightIdx++;
                    }
                }
            }
        } else if (isInteractions) {
            const m = featureColumns.length;
            let weightIdx = 1;
            for (let i = 0; i < m; i++) {
                scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}`;
                weightIdx++;
            }
            for (let i = 0; i < m; i++) {
                for (let j = i + 1; j < m; j++) {
                    scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${valueRefs[i]}*${valueRefs[j]}`;
                    weightIdx++;
                }
            }
        } else {
            featureColumns.forEach((col, i) => {
                scoreFormula += `+${model.weights[i + 1].toFixed(4)}*${valueRefs[i]}`;
            });
        }
        
        output += `<tr><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;"><code style="color: #3498db;">${scoreCell}</code></td><td style="border: 1px solid #555; padding: 8px; color: #ecf0f1;">Score</td><td style="border: 1px solid #555; padding: 8px; font-family: monospace; font-size: 0.85em; color: #ecf0f1;">${scoreFormula}</td></tr>`;
        
        // Final prediction
        const predCell = String.fromCharCode(65 + scoreCol + 1) + '2';
        let predFormula = '=';
        categories.forEach((cat, i) => {
            if (i === 0) {
                predFormula += `IF(${scoreCell}<${thresholds[i].toFixed(2)},"${cat}"`;
            } else if (i === categories.length - 1) {
                predFormula += `,"${cat}"` + ')'.repeat(categories.length - 1);
            } else {
                predFormula += `,IF(${scoreCell}<${thresholds[i].toFixed(2)},"${cat}"`;
            }
        });
        
        output += `<tr style="background: #27ae60;"><td style="border: 1px solid #555; padding: 8px;"><code style="color: white; font-weight: bold;">${predCell}</code></td><td style="border: 1px solid #555; padding: 8px; color: white;"><strong>Prediction</strong></td><td style="border: 1px solid #555; padding: 8px; font-family: monospace; font-size: 0.85em; color: white;">${predFormula}</td></tr>`;
        
        output += '</table>';
        output += '</div>';
        
        return output;
    },
    
    // Generate Excel formula - Compact Single-Cell
    generateExcelFormulaCompact(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial) {
        let output = '';
        
        output += '<h4 style="margin-top: 20px;">Single-Cell Formula (Compact)</h4>';
        output += '<p style="color: #666; font-size: 0.9em; margin-bottom: 10px;">All-in-one formula - paste directly into prediction cell</p>';
        
        output += '<div class="formula-box">';
        
        // First normalize/encode all features
        const normalizedRefs = featureColumns.map((col, i) => {
            const cellRef = String.fromCharCode(65 + i) + '2';
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            
            let formula;
            
            if (mapping.type === 'numeric') {
                formula = `IF(${cellRef}<=${mapping.min},0.2,IF(${cellRef}<=${mapping.avg},0.2+(${cellRef}-${mapping.min})/(${mapping.avg}-${mapping.min})*0.8,IF(${cellRef}<=${mapping.max},1.0+(${cellRef}-${mapping.avg})/(${mapping.max}-${mapping.avg})*1.0,2.0)))`;
            } else {
                const mappingEntries = Object.entries(mapping).filter(([k]) => k !== 'exponent');
                formula = '';
                mappingEntries.forEach(([text, value], idx) => {
                    if (idx === 0) {
                        formula = `IF(${cellRef}="${text}",${value}`;
                    } else if (idx === mappingEntries.length - 1) {
                        formula += `,IF(${cellRef}="${text}",${value},0` + ')'.repeat(mappingEntries.length);
                    } else {
                        formula += `,IF(${cellRef}="${text}",${value}`;
                    }
                });
            }
            
            return formula;
        });
        
        // Apply exponent transformations if using dual-exponent mode
        const transformedRefs = normalizedRefs.map((normRef, i) => {
            if (model.combinedExponents) {
                const exp = model.combinedExponents[i];
                return `POWER((${normRef}),${exp.toFixed(4)})`;
            } else {
                return `(${normRef})`;
            }
        });
        
        // Build score formula based on model type
        let scoreFormula = `${model.weights[0].toFixed(4)}`;
        
        if (isPolynomial) {
            const m = featureColumns.length;
            let weightIdx = 1;
            
            // Original features
            for (let i = 0; i < m; i++) {
                scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${transformedRefs[i]}`;
                weightIdx++;
            }
            
            // Degree 2 terms
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${transformedRefs[i]}*${transformedRefs[j]}`;
                    weightIdx++;
                }
            }
            
            // Degree 3 terms
            for (let i = 0; i < m; i++) {
                for (let j = i; j < m; j++) {
                    for (let k = j; k < m; k++) {
                        scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${transformedRefs[i]}*${transformedRefs[j]}*${transformedRefs[k]}`;
                        weightIdx++;
                    }
                }
            }
        } else if (isInteractions) {
            const m = featureColumns.length;
            let weightIdx = 1;
            
            // Original features
            for (let i = 0; i < m; i++) {
                scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${transformedRefs[i]}`;
                weightIdx++;
            }
            
            // Pairwise interactions
            for (let i = 0; i < m; i++) {
                for (let j = i + 1; j < m; j++) {
                    scoreFormula += `+${model.weights[weightIdx].toFixed(4)}*${transformedRefs[i]}*${transformedRefs[j]}`;
                    weightIdx++;
                }
            }
        } else {
            // Simple model
            featureColumns.forEach((col, i) => {
                const weight = model.weights[i + 1];
                scoreFormula += `+${weight.toFixed(4)}*${transformedRefs[i]}`;
            });
        }
        
        // Wrap in classification logic
        let excelFormula = '';
        categories.forEach((cat, i) => {
            if (i === 0) {
                excelFormula = `IF((${scoreFormula})<${thresholds[i].toFixed(2)},"${cat}"`;
            } else if (i === categories.length - 1) {
                excelFormula += `,"${cat}"` + ')'.repeat(categories.length - 1);
            } else {
                excelFormula += `,IF((${scoreFormula})<${thresholds[i].toFixed(2)},"${cat}"`;
            }
        });
        
        output += '=' + excelFormula;
        output += '</div>';
        
        return output;
    },

    // Display prediction results
    displayPredictions(predictions, testData, cellMapping, featureColumns, resultColumn) {
        const container = document.getElementById('predictionResults');
        const reverseMapping = DataEncoder.getReverseMapping(cellMapping, featureColumns);
        
        // Check if experimental mode (9 models, 6 models, or 3 models)
        const hasPenaltyModels = predictions.model7 !== undefined;
        const isExperimentalMode = predictions.model4 !== undefined;
        
        let html = '';
        
        if (hasPenaltyModels) {
            html += '<div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 20px; color: #856404;">';
            html += '<strong>Experimental Mode Active (3 Approaches)</strong><br>';
            html += 'Row 1: Standard models, Row 2: Dual-exponent models, Row 3: Penalty-based models';
            html += '</div>';
        } else if (isExperimentalMode) {
            html += '<div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 20px; color: #856404;">';
            html += '<strong>Experimental Mode Active</strong><br>';
            html += 'Showing predictions from both standard models (top row) and experimental dual-exponent models (bottom row).';
            html += '</div>';
        }
        
        // Show accuracy cards if available
        if (predictions.accuracy !== null) {
            html += '<div class="results-grid">';
            
            // Standard models (1-3)
            const model1Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model1');
            const model1Color = this.getAccuracyColor(model1Accuracy);
            html += `
                <div class="result-card model-card active" data-model="1">
                    <h3>Simple Linear Regression${isExperimentalMode ? ' (Standard)' : ''}</h3>
                    <div class="metric" style="color: ${model1Color};">${model1Accuracy.toFixed(2)}%</div>
                    <p>Model 1 Predictions</p>
                </div>
            `;
            
            const model2Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model2');
            const model2Color = this.getAccuracyColor(model2Accuracy);
            html += `
                <div class="result-card model-card" data-model="2">
                    <h3>Linear Regression with Interactions${isExperimentalMode ? ' (Standard)' : ''}</h3>
                    <div class="metric" style="color: ${model2Color};">${model2Accuracy.toFixed(2)}%</div>
                    <p>Model 2 Predictions</p>
                </div>
            `;
            
            const model3Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model3');
            const model3Color = this.getAccuracyColor(model3Accuracy);
            html += `
                <div class="result-card model-card" data-model="3">
                    <h3>Polynomial Regression (degree 3)${isExperimentalMode ? ' (Standard)' : ''}</h3>
                    <div class="metric" style="color: ${model3Color};">${model3Accuracy.toFixed(2)}%</div>
                    <p>Model 3 Predictions</p>
                </div>
            `;
            
            // Experimental models (4-6) if available
            if (isExperimentalMode) {
                const model4Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model4');
                const model4Color = this.getAccuracyColor(model4Accuracy);
                html += `
                    <div class="result-card model-card" data-model="4">
                        <h3>Simple Linear Regression (Experimental)</h3>
                        <div class="metric" style="color: ${model4Color};">${model4Accuracy.toFixed(2)}%</div>
                        <p>Model 4 Predictions</p>
                    </div>
                `;
                
                const model5Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model5');
                const model5Color = this.getAccuracyColor(model5Accuracy);
                html += `
                    <div class="result-card model-card" data-model="5">
                        <h3>Linear Regression with Interactions (Experimental)</h3>
                        <div class="metric" style="color: ${model5Color};">${model5Accuracy.toFixed(2)}%</div>
                        <p>Model 5 Predictions</p>
                    </div>
                `;
                
                const model6Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model6');
                const model6Color = this.getAccuracyColor(model6Accuracy);
                html += `
                    <div class="result-card model-card" data-model="6">
                        <h3>Polynomial Regression (degree 3) (Experimental)</h3>
                        <div class="metric" style="color: ${model6Color};">${model6Accuracy.toFixed(2)}%</div>
                        <p>Model 6 Predictions</p>
                    </div>
                `;
            }
            
            // Penalty-based models (7-9) if available
            if (hasPenaltyModels) {
                const model7Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model7');
                const model7Color = this.getAccuracyColor(model7Accuracy);
                html += `
                    <div class="result-card model-card" data-model="7">
                        <h3>Simple Linear Regression (Penalty)</h3>
                        <div class="metric" style="color: ${model7Color};">${model7Accuracy.toFixed(2)}%</div>
                        <p>Model 7 Predictions</p>
                    </div>
                `;
                
                const model8Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model8');
                const model8Color = this.getAccuracyColor(model8Accuracy);
                html += `
                    <div class="result-card model-card" data-model="8">
                        <h3>Linear Regression with Interactions (Penalty)</h3>
                        <div class="metric" style="color: ${model8Color};">${model8Accuracy.toFixed(2)}%</div>
                        <p>Model 8 Predictions</p>
                    </div>
                `;
                
                const model9Accuracy = this.calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, 'model9');
                const model9Color = this.getAccuracyColor(model9Accuracy);
                html += `
                    <div class="result-card model-card" data-model="9">
                        <h3>Polynomial Regression (degree 3) (Penalty)</h3>
                        <div class="metric" style="color: ${model9Color};">${model9Accuracy.toFixed(2)}%</div>
                        <p>Model 9 Predictions</p>
                    </div>
                `;
            }
            
            html += '</div>';
        }
        
        // Model details sections
        html += '<div id="predictionModelDetails">';
        
        // Standard models (1-3)
        html += '<div id="predModel1Details" class="model-details" style="display:block;">';
        html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 1, 'model1');
        html += '</div>';
        
        html += '<div id="predModel2Details" class="model-details" style="display:none;">';
        html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 2, 'model2');
        html += '</div>';
        
        html += '<div id="predModel3Details" class="model-details" style="display:none;">';
        html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 3, 'model3');
        html += '</div>';
        
        // Experimental models (4-6) if available
        if (isExperimentalMode) {
            html += '<div id="predModel4Details" class="model-details" style="display:none;">';
            html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 4, 'model4');
            html += '</div>';
            
            html += '<div id="predModel5Details" class="model-details" style="display:none;">';
            html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 5, 'model5');
            html += '</div>';
            
            html += '<div id="predModel6Details" class="model-details" style="display:none;">';
            html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 6, 'model6');
            html += '</div>';
        }
        
        // Penalty-based models (7-9) if available
        if (hasPenaltyModels) {
            html += '<div id="predModel7Details" class="model-details" style="display:none;">';
            html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 7, 'model7');
            html += '</div>';
            
            html += '<div id="predModel8Details" class="model-details" style="display:none;">';
            html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 8, 'model8');
            html += '</div>';
            
            html += '<div id="predModel9Details" class="model-details" style="display:none;">';
            html += this.generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, 9, 'model9');
            html += '</div>';
        }
        
        html += '</div>';
        
        // Download button
        html += '<button id="downloadResults" class="btn btn-primary">Download Full Results CSV</button>';
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        
        // Add click event listeners to model cards
        document.querySelectorAll('#predictionResults .model-card').forEach(card => {
            card.addEventListener('click', () => {
                const modelNum = parseInt(card.dataset.model);
                this.switchPredictionModel(modelNum);
            });
        });
        
        // Add download handler
        document.getElementById('downloadResults').addEventListener('click', () => {
            CSVParser.download(predictions.results, 'predictions.csv');
        });
    },

    // Calculate accuracy for a specific model
    calculatePredictionAccuracy(predictions, testData, resultColumn, cellMapping, featureColumns, modelKey) {
        const hasActual = testData.some(row => row[resultColumn] && row[resultColumn].trim() !== '');
        if (!hasActual) return 0;
        
        const resultCName = `C${featureColumns.length + 1}`;
        const resultMapping = cellMapping[resultCName];
        
        // Get the model-specific predictions
        const modelData = predictions[modelKey]; // model2 or model3
        if (!modelData) return 0;
        
        let correct = 0;
        let total = 0;
        
        testData.forEach((row, i) => {
            if (row[resultColumn] && row[resultColumn].trim() !== '') {
                total++;
                const actualEncoded = resultMapping[row[resultColumn]];
                const predictedEncoded = modelData.rounded[i];
                if (Math.abs(actualEncoded - predictedEncoded) < 0.01) {
                    correct++;
                }
            }
        });
        
        return total > 0 ? (correct / total) * 100 : 0;
    },

    // Generate prediction details for a specific model
    generatePredictionDetails(predictions, testData, cellMapping, featureColumns, resultColumn, reverseMapping, modelNum, modelKey) {
        let html = '';
        
        const hasActual = testData.some(row => row[resultColumn] && row[resultColumn].trim() !== '');
        
        if (hasActual) {
            // Build confusion matrix for this model
            const resultCName = `C${featureColumns.length + 1}`;
            const resultMapping = cellMapping[resultCName];
            const categories = Object.values(reverseMapping);
            
            // Get model-specific predictions
            const modelData = predictions[modelKey];
            
            const yTrue = [];
            const yPred = [];
            
            testData.forEach((row, i) => {
                if (row[resultColumn] && row[resultColumn].trim() !== '') {
                    yTrue.push(resultMapping[row[resultColumn]]);
                    yPred.push(modelData.rounded[i]);
                }
            });
            
            console.log('Prediction confusion matrix debug:');
            console.log('  Total test rows:', testData.length);
            console.log('  Rows with actual values:', yTrue.length);
            console.log('  yTrue:', yTrue);
            console.log('  yPred:', yPred);
            
            const uniqueValues = Object.keys(reverseMapping).map(k => parseFloat(k)).sort((a,b) => a-b);
            const confusion = this.buildConfusionMatrix(yTrue, yPred, uniqueValues, reverseMapping);
            
            // Display confusion matrix
            html += `<h3>Confusion Matrix (Model ${modelNum})</h3>`;
            html += '<p class="section-description">Rows=Actual</p>';
            html += '<div class="confusion-matrix">';
            html += '<table><thead>';
            html += '<tr><th></th><th colspan="' + categories.length + '">Predicted as:</th></tr>';
            html += '<tr><th></th>';
            categories.forEach(cat => {
                html += `<th>${cat}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            confusion.forEach((row, i) => {
                html += `<tr><th>${categories[i]}</th>`;
                row.forEach((val, j) => {
                    const isDiagonal = i === j;
                    if (isDiagonal) {
                        html += `<td class="diagonal-cell">${val}</td>`;
                    } else if (val > 0) {
                        html += `<td class="incorrect-cell">${val}</td>`;
                    } else {
                        html += `<td>${val}</td>`;
                    }
                });
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            
            // Show incorrect predictions
            const incorrect = [];
            testData.forEach((row, i) => {
                if (row[resultColumn] && row[resultColumn].trim() !== '') {
                    const actualEncoded = resultMapping[row[resultColumn]];
                    const predictedEncoded = modelData.rounded[i];
                    if (Math.abs(actualEncoded - predictedEncoded) > 0.01) {
                        incorrect.push({
                            ...row,
                            predicted: reverseMapping[predictedEncoded],
                            score: modelData.scores[i].toFixed(4)
                        });
                    }
                }
            });
            
            if (incorrect.length > 0) {
                html += `<h3>Incorrectly Predicted Rows (Model ${modelNum})</h3>`;
                html += `<p class="section-description">Total incorrect: ${incorrect.length}</p>`;
                html += '<div class="preview"><table><thead><tr>';
                
                Object.keys(incorrect[0]).forEach(key => {
                    html += `<th>${key}</th>`;
                });
                html += '</tr></thead><tbody>';
                
                incorrect.slice(0, 10).forEach(row => {
                    html += '<tr>';
                    Object.values(row).forEach(val => {
                        html += `<td>${val}</td>`;
                    });
                    html += '</tr>';
                });
                
                if (incorrect.length > 10) {
                    html += `<tr><td colspan="${Object.keys(incorrect[0]).length}">... and ${incorrect.length - 10} more</td></tr>`;
                }
                
                html += '</tbody></table></div>';
                
                // Add toggle button for extended details
                html += '<div style="margin-top: 15px;">';
                html += `<button class="formula-toggle-btn" onclick="document.getElementById('predModel${modelNum}Extended').style.display = document.getElementById('predModel${modelNum}Extended').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">Extended Analysis</button>`;
                html += '</div>';
                
                // Extended details container (hidden by default)
                html += `<div id="predModel${modelNum}Extended" style="display: none;">`;
                
                // Extended view with range and distance columns
                html += '<h4 style="margin-top: 20px;">Extended Details</h4>';
                const displayRows = incorrect.map((row) => {
                    // Extract row_id if it exists, otherwise use index
                    const rowId = row.row_id ? parseInt(row.row_id) - 1 : 0;
                    
                    return PredictionTableBuilder.buildPredictionRow(
                        rowId,
                        row,
                        featureColumns,
                        resultColumn,
                        row.predicted,
                        parseFloat(row.score),
                        reverseMapping,
                        cellMapping,
                        true
                    );
                });
                
                html += PredictionTableBuilder.generateTableHTML(displayRows, featureColumns, true);
                
                // Add distance visualization
                html += PredictionDistanceVisualization.generateVisualization(displayRows, reverseMapping, cellMapping, featureColumns, resultColumn);
                
                html += WhatIfAnalysis.generateAnalysis(incorrect, modelData, cellMapping, featureColumns, resultColumn, reverseMapping);
                html += '</div>'; // Close extended details container
            } else {
                html += '<div class="success">All rows predicted correctly!</div>';
            }
        }
        
        // Preview results for this model
        html += `<h3>Prediction Results (First 20 rows - Model ${modelNum})</h3>`;
        
        // Add Summary Report button
        const reportId = `pred_report_${Math.random().toString(36).substr(2, 9)}`;
        html += '<div style="margin: 15px 0;">';
        html += `<button class="formula-toggle-btn" onclick="document.getElementById('${reportId}').style.display = document.getElementById('${reportId}').style.display === 'none' ? 'block' : 'none'; this.classList.toggle('active');">Summary Report</button>`;
        html += '</div>';
        
        html += '<div class="preview"><table><thead><tr>';
        
        // Define columns to show
        html += '<th>row_id</th>';
        featureColumns.forEach(col => {
            html += `<th>${col}</th>`;
        });
        
        // Check if result column exists in test data
        const hasActualResult = predictions.results[0].hasOwnProperty(resultColumn);
        if (hasActualResult) {
            html += `<th>actual</th>`;
        }
        
        html += '<th>prediction</th>';
        html += '<th>score</th>';
        html += '<th>range_min</th>';
        html += '<th>range_max</th>';
        
        html += '</tr></thead><tbody>';
        
        // Get unique values and thresholds for range calculation
        const uniqueValues = Object.keys(reverseMapping).map(k => parseFloat(k)).sort((a,b) => a-b);
        const thresholds = [];
        for (let i = 0; i < uniqueValues.length - 1; i++) {
            thresholds.push((uniqueValues[i] + uniqueValues[i + 1]) / 2);
        }
        
        predictions.results.slice(0, 20).forEach(row => {
            html += '<tr>';
            
            // row_id
            html += `<td>${row.row_id}</td>`;
            
            // Feature columns
            featureColumns.forEach(col => {
                html += `<td>${row[col]}</td>`;
            });
            
            // Actual result (if exists)
            if (hasActualResult) {
                html += `<td>${row[resultColumn]}</td>`;
            }
            
            // Prediction
            const prediction = row[`${modelKey}_prediction`];
            html += `<td>${prediction}</td>`;
            
            // Score
            const score = row[`${modelKey}_score`];
            html += `<td>${typeof score === 'number' ? score.toFixed(4) : score}</td>`;
            
            // Find which range this score falls into (threshold boundaries)
            const scoreNum = parseFloat(score);
            let rangeMin = 0;
            let rangeMax = 2;
            
            // Determine which category this score falls into based on thresholds
            let categoryIndex = 0;
            for (let i = 0; i < thresholds.length; i++) {
                if (scoreNum >= thresholds[i]) {
                    categoryIndex = i + 1;
                } else {
                    break;
                }
            }
            
            // Set the range based on category index
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
            
            html += `<td>${rangeMin.toFixed(2)}</td>`;
            html += `<td>${rangeMax.toFixed(2)}</td>`;
            
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        
        // Summary Report Section (hidden by default)
        html += `<div id="${reportId}" style="display: none;">`;
        const reportText = SummaryReport.generatePredictionReport(predictions, testData, modelNum, modelKey, featureColumns, resultColumn, cellMapping, reverseMapping);
        html += '<div style="margin-top: 20px;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        html += '<h3 style="margin: 0;">Summary Report</h3>';
        html += `<button onclick="SummaryReport.copyReport('report_${reportId}_textarea')" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy to Clipboard</button>`;
        html += '</div>';
        html += `<textarea id="report_${reportId}_textarea" readonly style="width: 100%; height: 400px; font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; background: #f8f9fa; resize: vertical;">${reportText}</textarea>`;
        html += '</div>';
        html += '</div>';
        
        return html;
    },

    // Build confusion matrix from predictions
    buildConfusionMatrix(yTrue, yPred, uniqueValues, reverseMapping) {
        const n = uniqueValues.length;
        const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
        
        const valueToIdx = {};
        uniqueValues.forEach((val, idx) => {
            valueToIdx[val] = idx;
        });
        
        for (let i = 0; i < yTrue.length; i++) {
            const trueIdx = valueToIdx[yTrue[i]];
            const predIdx = valueToIdx[yPred[i]];
            if (trueIdx !== undefined && predIdx !== undefined) {
                matrix[trueIdx][predIdx]++;
            }
        }
        
        return matrix;
    },

    // Switch between prediction models
    switchPredictionModel(modelNum) {
        console.log('switchPredictionModel called with:', modelNum);
        
        // Hide all model details
        document.querySelectorAll('#predictionModelDetails .model-details').forEach(el => {
            el.style.display = 'none';
        });
        
        // Show selected model
        const selectedModel = document.getElementById(`predModel${modelNum}Details`);
        if (selectedModel) {
            selectedModel.style.display = 'block';
        }
        
        // Update card highlighting
        document.querySelectorAll('#predictionResults .model-card').forEach(card => {
            card.classList.remove('active');
        });
        const selectedCard = document.querySelector(`#predictionResults .model-card[data-model="${modelNum}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
    }
};

