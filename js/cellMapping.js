// cellMapping.js - Interactive UI for defining cell mappings

const CellMappingUI = {
    // Create mapping form
    createForm(data, featureColumns, resultColumn, columnTypes) {
        const container = document.getElementById('mappingForm');
        let html = '<div class="info">Define numeric ranges or categorical values for each column.</div>';
        
        // Experimental feature: Column importance weighting
        html += `
            <div class="experimental-section">
                <label class="experimental-checkbox">
                    <input type="checkbox" id="enableExponents" />
                    <span>🧪 Experimental: Optimization Engine</span>
                </label>
                <p class="experimental-description">Use iterative optimization approach (Scripts 2-15 logic) instead of linear regression. Finds optimal transformations to maximize category separation. Accuracy = retention rate (% of records kept after removing overlaps).</p>
                <div id="exponentsContainer" class="exponents-container hidden"></div>
            </div>
        `;
        
        // Feature columns
        featureColumns.forEach((col, idx) => {
            const cName = `C${idx + 1}`;
            const isNumeric = columnTypes[col] === 'numeric';
            
            html += `
                <div class="mapping-column" data-column="${col}" data-cname="${cName}">
                    <h3>${col} (${isNumeric ? 'Numeric' : 'Categorical'})</h3>
            `;
            
            if (isNumeric) {
                // Calculate min, avg, max from data
                const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
                const min = Math.min(...values);
                const max = Math.max(...values);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                
                // Numeric column - show min/avg/max inputs in one line
                html += `
                    <div class="numeric-mapping-inline">
                        <div class="numeric-input-group">
                            <label>Min (→ 0.2)</label>
                            <input type="number" 
                                   class="numeric-min" 
                                   data-column="${col}" 
                                   step="any" 
                                   placeholder="${min.toFixed(2)}" 
                                   required />
                        </div>
                        <div class="numeric-input-group">
                            <label>Avg (→ 1.0)</label>
                            <input type="number" 
                                   class="numeric-avg" 
                                   data-column="${col}" 
                                   step="any" 
                                   placeholder="${avg.toFixed(2)}" 
                                   required />
                        </div>
                        <div class="numeric-input-group">
                            <label>Max (→ 2.0)</label>
                            <input type="number" 
                                   class="numeric-max" 
                                   data-column="${col}" 
                                   step="any" 
                                   placeholder="${max.toFixed(2)}" 
                                   required />
                        </div>
                    </div>
                `;
            } else {
                // Categorical column - show unique values with sliders
                const uniqueValues = [...new Set(data.map(row => row[col]))].sort();
                html += `
                    <div class="categorical-mapping">
                        <p>Unique values: ${uniqueValues.join(', ')}</p>
                        <div class="mapping-values">
                            ${uniqueValues.map(val => `
                                <div class="mapping-value-item">
                                    <label>${val}</label>
                                    <div class="slider-container">
                                        <span class="slider-label">0.2</span>
                                        <input type="range" 
                                               class="mapping-slider" 
                                               data-column="${col}" 
                                               data-value="${val}"
                                               min="0.2" 
                                               max="2.0" 
                                               step="0.1" 
                                               value="1.0" />
                                        <span class="slider-label">2.0</span>
                                        <span class="slider-value">1.0</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
        });
        
        // Result column (always categorical) with sliders
        const resultValues = [...new Set(data.map(row => row[resultColumn]))].sort();
        const resultCName = `C${featureColumns.length + 1}`;
        
        html += `
            <div class="mapping-column" data-column="${resultColumn}" data-cname="${resultCName}">
                <h3>${resultColumn} (Result Column - Categorical)</h3>
                <p>Unique values: ${resultValues.join(', ')}</p>
                <div class="mapping-values">
                    ${resultValues.map(val => `
                        <div class="mapping-value-item">
                            <label>${val}</label>
                            <div class="slider-container">
                                <span class="slider-label">0.2</span>
                                <input type="range" 
                                       class="mapping-slider" 
                                       data-column="${resultColumn}" 
                                       data-value="${val}"
                                       min="0.2" 
                                       max="2.0" 
                                       step="0.1" 
                                       value="1.0" />
                                <span class="slider-label">2.0</span>
                                <span class="slider-value">1.0</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add event listeners for sliders
        this.attachSliderListeners();
        
        // Add event listener for experimental checkbox
        document.getElementById('enableExponents').addEventListener('change', (e) => {
            this.toggleExponents(e.target.checked, featureColumns);
        });
        
        document.getElementById('trainModels').classList.remove('hidden');
    },

    // Toggle exponents UI
    toggleExponents(enabled, featureColumns) {
        const container = document.getElementById('exponentsContainer');
        
        if (enabled) {
            let html = '<h4>Feature Importance Exponents:</h4>';
            
            // Filter out any undefined, null, or 'row_id' values
            const validFeatureColumns = featureColumns.filter(col => col && col !== 'row_id' && col !== 'undefined');
            
            validFeatureColumns.forEach((col, idx) => {
                html += `
                    <div class="exponent-item">
                        <label>${col}</label>
                        <div class="slider-container">
                            <span class="slider-label">0.2</span>
                            <input type="range" 
                                   class="exponent-slider" 
                                   data-column="${col}"
                                   min="0.2" 
                                   max="2.0" 
                                   step="0.1" 
                                   value="1.0" />
                            <span class="slider-label">2.0</span>
                            <span class="slider-value">1.0</span>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            container.classList.remove('hidden');
            
            // Attach slider listeners for exponents
            container.querySelectorAll('.exponent-slider').forEach(slider => {
                const valueDisplay = slider.parentElement.querySelector('.slider-value');
                slider.addEventListener('input', (e) => {
                    valueDisplay.textContent = parseFloat(e.target.value).toFixed(1);
                });
            });
        } else {
            container.innerHTML = '';
            container.classList.add('hidden');
        }
    },

    // Attach event listeners to sliders
    attachSliderListeners() {
        document.querySelectorAll('.mapping-slider').forEach(slider => {
            const valueDisplay = slider.parentElement.querySelector('.slider-value');
            
            // Update display when slider moves
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = parseFloat(e.target.value).toFixed(1);
            });
        });
    },

    // Extract mapping from form
    extractMapping() {
        console.log('🔍 extractMapping called');
        const mapping = {};
        
        // Check if exponents are enabled
        const exponentsCheckbox = document.getElementById('enableExponents');
        const exponentsEnabled = exponentsCheckbox ? exponentsCheckbox.checked : false;
        console.log('🔍 Exponents checkbox found:', !!exponentsCheckbox);
        console.log('🔍 Exponents enabled:', exponentsEnabled);
        
        const exponents = {};
        
        if (exponentsEnabled) {
            const sliders = document.querySelectorAll('.exponent-slider');
            console.log('🔍 Found', sliders.length, 'exponent sliders');
            
            sliders.forEach(slider => {
                const col = slider.dataset.column;
                const value = parseFloat(slider.value);
                exponents[col] = value;
                console.log(`🔍 Exponent for ${col}: ${value}`);
            });
        }
        
        const columns = document.querySelectorAll('.mapping-column');
        console.log('🔍 Found', columns.length, 'mapping columns');
        
        // Determine which is the result column (last one)
        const resultCName = `C${columns.length}`;
        
        columns.forEach(column => {
            const cName = column.dataset.cname;
            const col = column.dataset.column;
            const isResultColumn = (cName === resultCName);
            console.log(`🔍 Processing ${cName} (${col})${isResultColumn ? ' [RESULT COLUMN]' : ''}`);
            
            const numericInputs = column.querySelector('.numeric-mapping-inline');
            
            if (numericInputs) {
                // Numeric column
                const minInput = column.querySelector('.numeric-min');
                const avgInput = column.querySelector('.numeric-avg');
                const maxInput = column.querySelector('.numeric-max');
                
                const min = parseFloat(minInput.value);
                const avg = parseFloat(avgInput.value);
                const max = parseFloat(maxInput.value);
                
                console.log(`🔍 Numeric values: min=${min}, avg=${avg}, max=${max}`);
                
                if (isNaN(min) || isNaN(avg) || isNaN(max)) {
                    throw new Error(`Invalid numeric values for ${col}. Please fill all three fields (min, avg, max).`);
                }
                
                // Check if it's a reverse mapping (min > max)
                const isReverse = min > max;
                
                // Validate based on direction
                if (isReverse) {
                    // Reverse mapping: min > avg > max (higher values = worse)
                    if (!(min > avg && avg > max)) {
                        throw new Error(`For ${col} (reverse mapping): min > avg > max required. Got min=${min}, avg=${avg}, max=${max}`);
                    }
                } else {
                    // Normal mapping: min < avg < max (higher values = better)
                    if (!(min < avg && avg < max)) {
                        throw new Error(`For ${col}: min < avg < max required. Got min=${min}, avg=${avg}, max=${max}`);
                    }
                }
                
                mapping[cName] = {
                    type: 'numeric',
                    min,
                    avg,
                    max,
                    reverse: isReverse
                };
                
                // Add exponent if enabled
                // BUT NOT for the result column - exponents are only for features
                if (exponentsEnabled && exponents[col] && !isResultColumn) {
                    mapping[cName].exponent = exponents[col];
                    console.log(`🔍 Added exponent ${exponents[col]} to ${cName}`);
                } else if (isResultColumn && exponentsEnabled) {
                    console.log(`🔍 Skipping exponent for result column ${cName}`);
                }
            } else {
                // Categorical column - extract from sliders
                mapping[cName] = {};
                
                const sliders = column.querySelectorAll('.mapping-slider');
                console.log(`🔍 Found ${sliders.length} categorical sliders for ${cName}`);
                
                sliders.forEach(slider => {
                    const value = slider.dataset.value;
                    const numericValue = parseFloat(slider.value);
                    
                    if (isNaN(numericValue)) {
                        throw new Error(`Invalid mapping value for ${col}: ${value}`);
                    }
                    
                    if (numericValue < 0.2 || numericValue > 2.0) {
                        throw new Error(`Mapping values must be between 0.2 and 2.0`);
                    }
                    
                    mapping[cName][value] = numericValue;
                });
                
                // Add exponent if enabled (for categorical columns too)
                // BUT NOT for the result column - exponents are only for features
                if (exponentsEnabled && exponents[col] && !isResultColumn) {
                    mapping[cName].exponent = exponents[col];
                    console.log(`🔍 Added exponent ${exponents[col]} to ${cName}`);
                } else if (isResultColumn && exponentsEnabled) {
                    console.log(`🔍 Skipping exponent for result column ${cName}`);
                }
            }
        });
        
        // Store whether exponents are enabled
        mapping._exponentsEnabled = exponentsEnabled;
        console.log('🔍 Final mapping:', mapping);
        
        return mapping;
    },

    // Apply cached mapping to form
    applyMapping(cachedMapping) {
        console.log('applyMapping called with:', cachedMapping);
        
        // Restore exponents checkbox and values if they were enabled
        const exponentsEnabled = cachedMapping._exponentsEnabled || false;
        const enableExponentsCheckbox = document.getElementById('enableExponents');
        
        if (enableExponentsCheckbox) {
            enableExponentsCheckbox.checked = exponentsEnabled;
            console.log('Exponents enabled:', exponentsEnabled);
            
            if (exponentsEnabled) {
                // Get feature columns from the form
                const featureColumns = [];
                document.querySelectorAll('.mapping-column').forEach(column => {
                    const col = column.dataset.column;
                    const cName = column.dataset.cname;
                    // Exclude result column (last one)
                    const resultCName = `C${document.querySelectorAll('.mapping-column').length}`;
                    if (cName !== resultCName) {
                        featureColumns.push(col);
                    }
                });
                
                console.log('Feature columns for exponents:', featureColumns);
                
                // Show exponents UI
                this.toggleExponents(true, featureColumns);
                
                // Restore exponent values
                document.querySelectorAll('.exponent-slider').forEach(slider => {
                    const col = slider.dataset.column;
                    // Find the corresponding cName
                    const columnDiv = document.querySelector(`.mapping-column[data-column="${col}"]`);
                    if (columnDiv) {
                        const cName = columnDiv.dataset.cname;
                        const mappingData = cachedMapping[cName];
                        if (mappingData && mappingData.exponent !== undefined) {
                            slider.value = mappingData.exponent;
                            const valueDisplay = slider.parentElement.querySelector('.slider-value');
                            if (valueDisplay) {
                                valueDisplay.textContent = parseFloat(mappingData.exponent).toFixed(1);
                            }
                            console.log(`Restored exponent for ${col} (${cName}): ${mappingData.exponent}`);
                        } else {
                            console.warn(`No exponent found for ${col} (${cName})`);
                        }
                    }
                });
            }
        }
        
        // Restore mapping values
        document.querySelectorAll('.mapping-column').forEach(column => {
            const cName = column.dataset.cname;
            const col = column.dataset.column;
            const mappingData = cachedMapping[cName];
            
            if (!mappingData) {
                console.warn(`No mapping data found for ${col} (${cName})`);
                return;
            }
            
            console.log(`Applying mapping for ${col} (${cName}):`, mappingData);
            
            const numericInputs = column.querySelector('.numeric-mapping-inline');
            
            if (numericInputs && mappingData.type === 'numeric') {
                // Apply numeric values
                const minInput = column.querySelector('.numeric-min');
                const avgInput = column.querySelector('.numeric-avg');
                const maxInput = column.querySelector('.numeric-max');
                
                if (minInput) minInput.value = mappingData.min;
                if (avgInput) avgInput.value = mappingData.avg;
                if (maxInput) maxInput.value = mappingData.max;
                
                console.log(`Applied numeric mapping: min=${mappingData.min}, avg=${mappingData.avg}, max=${mappingData.max}`);
            } else if (!numericInputs) {
                // Apply categorical slider values
                column.querySelectorAll('.mapping-slider').forEach(slider => {
                    const value = slider.dataset.value;
                    if (mappingData[value] !== undefined) {
                        slider.value = mappingData[value];
                        const valueDisplay = slider.parentElement.querySelector('.slider-value');
                        if (valueDisplay) {
                            valueDisplay.textContent = parseFloat(mappingData[value]).toFixed(1);
                        }
                        console.log(`Applied categorical mapping: ${value}=${mappingData[value]}`);
                    }
                });
            }
        });
        
        console.log('applyMapping completed');
    }
};
