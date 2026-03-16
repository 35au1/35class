// results.js - Display training and prediction results

const ResultsDisplay = {
    // Get color based on accuracy percentage
    getAccuracyColor(accuracy) {
        if (accuracy >= 90) return '#007bff'; // Blue
        if (accuracy >= 80) return '#28a745'; // Green
        if (accuracy >= 50) return '#fd7e14'; // Orange
        return '#dc3545'; // Red
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
        
        // Check if experimental mode (6 models) or standard mode (3 models)
        const isExperimentalMode = trainedModels.model4 !== undefined;
        const modelsToDisplay = isExperimentalMode ? 
            [trainedModels.model1, trainedModels.model2, trainedModels.model3, trainedModels.model4, trainedModels.model5, trainedModels.model6] :
            [trainedModels.model1, trainedModels.model2, trainedModels.model3];
        
        let html = '';
        
        if (isExperimentalMode) {
            html += '<div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 20px; color: #856404;">';
            html += '<strong>🧪 Experimental Mode Active</strong><br>';
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
            }
            
            // Get color based on accuracy
            const accuracyColor = this.getAccuracyColor(model.accuracy);
            
            html += `
                <div class="result-card model-card${activeClass}" data-model="${modelNum}">
                    <h3>${model.name}</h3>
                    <div class="metric" style="color: ${accuracyColor};">${model.accuracy.toFixed(2)}%</div>
                    <p>${model.correct} / ${model.total} correct</p>
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
            
            // Add formulas
            html += this.generateFormulas(model, featureColumns, cellMapping, reverseMapping, categories);
            
            // Incorrect rows
            const incorrect = [];
            originalData.forEach((row, i) => {
                const actual = cellMapping[`C${featureColumns.length + 1}`][row[resultColumn]];
                const predicted = model.predictions[i];
                if (Math.abs(actual - predicted) > 0.01) {
                    incorrect.push({
                        ...row,
                        predicted: reverseMapping[predicted]
                    });
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
                
                incorrect.forEach(row => {
                    html += '<tr>';
                    Object.values(row).forEach(val => {
                        html += `<td>${val}</td>`;
                    });
                    html += '</tr>';
                });
                
                html += '</tbody></table></div>';
            } else {
                html += '<div class="success">All rows predicted correctly!</div>';
            }
            
            // Add feature ablation results at the end (Model 1 only)
            if (modelNum === 1 && model.ablation) {
                html += this.generateAblationResults(model.ablation);
            }
            
            html += '</div>'; // Close model details
        });
        
        html += '</div>'; // Close modelDetails
        
        console.log('Setting container HTML, length:', html.length);
        container.innerHTML = html;
        console.log('HTML set successfully');
        
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

    // Generate ablation test results
    generateAblationResults(ablationData) {
        let html = '<h3>Feature Ablation Test (Impact Analysis)</h3>';
        html += '<p class="section-description">Shows how much accuracy drops when each feature is neutralized (set to average value 1.0).</p>';
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

    // Display optimization engine results
    displayOptimizationResults(trainedModels, container, featureColumns, resultColumn) {
        const model = trainedModels.model1;
        const categories = trainedModels.uniqueValues;
        
        let html = '<div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107; color: #856404;">';
        html += '<strong>🧪 Optimization Engine Mode</strong><br>';
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
    generateFormulas(model, featureColumns, cellMapping, reverseMapping, categories) {
        let html = '<h3>Model Formula</h3>';
        
        // Display dual-exponent info if available
        if (model.explorationExponent !== undefined && model.combinedExponents && model.combinedExponents.length > 0) {
            html += `
                <div class="exponent-details" style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; border-radius: 5px;">
                    <h4 style="margin-top: 0; color: #856404;">🔬 Dual-Exponent Transformation</h4>
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
                            return `<li><strong>${col}:</strong> ${userExp.toFixed(2)} (user) × ${model.explorationExponent.toFixed(1)} (explore) = <strong>${combinedExp.toFixed(2)}</strong></li>`;
                        }).filter(item => item !== '').join('')}
                    </ul>
                    <p style="margin: 5px 0; font-size: 0.9em; color: #856404;">
                        <em>Formula: transformed_value = original_value ^ (user_exponent × exploration_exponent)</em>
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
            html += '<p class="section-description" style="background: #fff3cd; border-left-color: #ffc107;">🧪 Experimental feature active: Features weighted during regression (higher weight = more influence on optimization)</p>';
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
                        mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}²`;
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
                            mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}³`;
                        } else if (i === j) {
                            mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}²*C${k + 1}`;
                        } else if (j === k) {
                            mathFormula += `${sign}${weight.toFixed(4)}*C${i + 1}*C${j + 1}²`;
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
        
        // Add collapsible details button
        const detailsId = `details_${Math.random().toString(36).substr(2, 9)}`;
        html += `<button class="btn btn-secondary" onclick="document.getElementById('${detailsId}').style.display = document.getElementById('${detailsId}').style.display === 'none' ? 'block' : 'none';" style="margin: 15px 0;">Show/Hide Details</button>`;
        html += `<div id="${detailsId}" style="display: none;">`;
        
        // Normalization info
        html += '<h4>Column Normalization:</h4>';
        html += '<div class="formula-box">';
        featureColumns.forEach((col, i) => {
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            
            if (mapping.type === 'numeric') {
                html += `${col}: `;
                html += `if x ≤ ${mapping.min} → 0.2, `;
                html += `if x ≤ ${mapping.avg} → 0.2 + (x-${mapping.min})/(${mapping.avg}-${mapping.min})*0.8, `;
                html += `if x ≤ ${mapping.max} → 1.0 + (x-${mapping.avg})/(${mapping.max}-${mapping.avg})*1.0, `;
                html += `else → 2.0`;
                
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
                html += `score < ${thresholds[i].toFixed(2)} → ${cat}<br>`;
            } else if (i === categories.length - 1) {
                html += `score ≥ ${thresholds[i-1].toFixed(2)} → ${cat}<br>`;
            } else {
                html += `${thresholds[i-1].toFixed(2)} ≤ score < ${thresholds[i].toFixed(2)} → ${cat}<br>`;
            }
        });
        
        html += '</div>'; // Close Classification Rules formula-box
        
        // C# Code formula
        html += '<h4 style="color: #e74c3c;">C# Code Formula:</h4>';
        html += '<div class="formula-box">';
        html += '<pre style="margin: 0; white-space: pre-wrap; font-family: \'Courier New\', monospace;">';
        
        html += this.generateCSharpCode(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial);
        
        html += '</pre>';
        html += '</div>';
        
        html += '</div>'; // Close collapsible details div
        
        // Excel formula - OUTSIDE the collapsible div (always visible)
        html += '<h4 style="color: #e74c3c;">Excel Formula (with normalization):</h4>';
        
        // Add visual guide for Excel usage
        html += '<div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 15px; border-radius: 5px;">';
        html += '<p style="margin: 0 0 10px 0; font-weight: bold; color: #28a745;">📊 How to use this formula in Excel:</p>';
        html += '<div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; font-size: 0.9em;">';
        html += '<div style="text-align: center; font-size: 1.2em;">1️⃣</div><div>Put your data in columns A, B, C, etc. (starting from row 2)</div>';
        html += '<div style="text-align: center; font-size: 1.2em;">2️⃣</div><div>Click on the cell where you want the prediction (e.g., D2)</div>';
        html += '<div style="text-align: center; font-size: 1.2em;">3️⃣</div><div>Copy the formula below and paste it into that cell</div>';
        html += '<div style="text-align: center; font-size: 1.2em;">4️⃣</div><div>Press Enter - you should see the predicted category!</div>';
        html += '<div style="text-align: center; font-size: 1.2em;">5️⃣</div><div>Drag the formula down to predict for all rows</div>';
        html += '</div>';
        html += '<div style="margin-top: 10px; padding: 10px; background: #fff; border-radius: 3px; font-family: monospace; font-size: 0.85em;">';
        html += '<strong>Example layout:</strong><br>';
        html += '<table style="border-collapse: collapse; margin-top: 5px; font-size: 0.9em;">';
        html += '<tr style="background: #e9ecef;"><th style="border: 1px solid #dee2e6; padding: 5px;">A</th><th style="border: 1px solid #dee2e6; padding: 5px;">B</th><th style="border: 1px solid #dee2e6; padding: 5px;">C</th><th style="border: 1px solid #dee2e6; padding: 5px; background: #d4edda;">D</th></tr>';
        html += '<tr><td style="border: 1px solid #dee2e6; padding: 5px; text-align: center;">1</td><td style="border: 1px solid #dee2e6; padding: 5px;">' + (featureColumns[0] || 'Feature1') + '</td><td style="border: 1px solid #dee2e6; padding: 5px;">' + (featureColumns[1] || 'Feature2') + '</td><td style="border: 1px solid #dee2e6; padding: 5px; background: #d4edda;">Prediction</td></tr>';
        html += '<tr><td style="border: 1px solid #dee2e6; padding: 5px; text-align: center;">2</td><td style="border: 1px solid #dee2e6; padding: 5px;">10000</td><td style="border: 1px solid #dee2e6; padding: 5px;">50</td><td style="border: 1px solid #dee2e6; padding: 5px; background: #d4edda; color: #28a745; font-weight: bold;">← Paste formula here</td></tr>';
        html += '<tr><td style="border: 1px solid #dee2e6; padding: 5px; text-align: center;">3</td><td style="border: 1px solid #dee2e6; padding: 5px;">20000</td><td style="border: 1px solid #dee2e6; padding: 5px;">100</td><td style="border: 1px solid #dee2e6; padding: 5px; background: #d4edda; color: #999;">← Drag down</td></tr>';
        html += '</table>';
        html += '</div>';
        html += '</div>';
        
        html += '<div class="formula-box">';
        
        html += this.generateExcelFormula(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial);
        
        html += '</div>';
        
        return html;
    },

    // Generate C# code for prediction
    generateCSharpCode(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial) {
        let code = 'public static string PredictCategory(';
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

    // Generate Excel formula
    generateExcelFormula(model, featureColumns, cellMapping, categories, thresholds, isInteractions, isPolynomial) {
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
        
        return '=' + excelFormula;
    },

    // Display prediction results
    displayPredictions(predictions, testData, cellMapping, featureColumns, resultColumn) {
        const container = document.getElementById('predictionResults');
        const reverseMapping = DataEncoder.getReverseMapping(cellMapping, featureColumns);
        
        // Check if experimental mode (6 models)
        const isExperimentalMode = predictions.model4 !== undefined;
        
        let html = '';
        
        if (isExperimentalMode) {
            html += '<div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 20px; color: #856404;">';
            html += '<strong>🧪 Experimental Mode Active</strong><br>';
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
            
            console.log('🔍 Prediction confusion matrix debug:');
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
            } else {
                html += '<div class="success">All rows predicted correctly!</div>';
            }
        }
        
        // Preview results for this model
        html += `<h3>Prediction Results (First 10 rows - Model ${modelNum})</h3>`;
        html += '<div class="preview"><table><thead><tr>';
        
        // Show only relevant columns for this model
        const relevantColumns = ['row_id', ...featureColumns, resultColumn, `${modelKey}_score`, `${modelKey}_prediction`];
        relevantColumns.forEach(col => {
            if (predictions.results[0].hasOwnProperty(col)) {
                html += `<th>${col}</th>`;
            }
        });
        html += '</tr></thead><tbody>';
        
        predictions.results.slice(0, 10).forEach(row => {
            html += '<tr>';
            relevantColumns.forEach(col => {
                if (row.hasOwnProperty(col)) {
                    html += `<td>${row[col]}</td>`;
                }
            });
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        
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
