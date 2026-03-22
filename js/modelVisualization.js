// modelVisualization.js - Visualize trained model transformations

const ModelVisualization = {
    // Generate visualization for a trained model
    generateVisualization(model, featureColumns, cellMapping) {
        const container = document.createElement('div');
        container.className = 'model-visualization';
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Model Transformation Visualization';
        container.appendChild(title);
        
        const description = document.createElement('p');
        description.className = 'section-description';
        description.textContent = 'Each column shows the transformation applied to that feature. Height represents the exponent/weight (1.0 is neutral, centered).';
        container.appendChild(description);
        
        // Add interactive guide/legend
        const guide = this.createVisualizationGuide();
        container.appendChild(guide);
        
        // Visualization container
        const vizContainer = document.createElement('div');
        vizContainer.className = 'viz-columns-container';
        
        // Create a column for each feature
        featureColumns.forEach((col, i) => {
            const cName = `C${i + 1}`;
            const mapping = cellMapping[cName];
            
            if (!mapping) {
                console.error(`Missing mapping for ${cName}`);
                return;
            }
            
            // Get transformation values
            const userExponent = mapping.exponent || 1.0;
            let combinedExponent = userExponent;
            let penalty = null;
            let penaltyStrength = null;
            let transformationType = 'standard';
            
            // Check if this is a dual-exponent model
            if (model.combinedExponents && model.combinedExponents[i] !== undefined) {
                combinedExponent = model.combinedExponents[i];
                transformationType = 'dual-exponent';
            }
            // Check if this is a penalty-based model
            else if (model.penalties && model.penalties[i] !== undefined) {
                penalty = model.penalties[i];
                penaltyStrength = model.penaltyStrengths[i];
                transformationType = 'penalty';
            }
            
            // Create column visualization
            const columnViz = this.createColumnVisualization(
                col, 
                userExponent, 
                combinedExponent, 
                penalty, 
                penaltyStrength,
                transformationType,
                model.weights ? model.weights[i + 1] : null // +1 to skip bias term
            );
            
            vizContainer.appendChild(columnViz);
        });
        
        container.appendChild(vizContainer);
        
        return container;
    },
    
    // Create visualization for a single column
    createColumnVisualization(columnName, userExponent, combinedExponent, penalty, penaltyStrength, transformationType, weight) {
        const column = document.createElement('div');
        column.className = 'viz-column';
        
        // Column header
        const header = document.createElement('div');
        header.className = 'viz-column-header';
        header.textContent = columnName;
        column.appendChild(header);
        
        // Bar container (holds the visual bar)
        const barContainer = document.createElement('div');
        barContainer.className = 'viz-bar-container';
        
        // Calculate bar dimensions based on exponent
        // Range: 0.2 to 2.0 (normalized values)
        // We'll stretch the bar both horizontally and vertically based on the exponent
        const exponentToUse = transformationType === 'penalty' ? 1.0 : combinedExponent;
        
        // Vertical position: 1.0 is always at the same height (middle)
        // Height represents the range 0.2 to 2.0
        const minValue = 0.2;
        const maxValue = 2.0;
        const neutralValue = 1.0;
        
        // Calculate stretching effect
        // For exponent > 1: stretches away from 1.0 (both directions)
        // For exponent < 1: compresses toward 1.0
        const stretchFactor = exponentToUse;
        
        // Create the bar with gradient showing transformation
        const bar = document.createElement('div');
        bar.className = 'viz-bar';
        
        // Calculate visual properties
        const barWidth = this.calculateBarWidth(stretchFactor);
        bar.style.width = `${barWidth}px`;
        
        // Add distribution segments showing how values are stretched/compressed
        this.addDistributionLines(bar, stretchFactor, transformationType, penalty, penaltyStrength);
        
        // Add center line (represents 1.0)
        const centerLine = document.createElement('div');
        centerLine.className = 'viz-center-line';
        bar.appendChild(centerLine);
        
        // Add value markers
        const topMarker = document.createElement('div');
        topMarker.className = 'viz-value-marker viz-top';
        topMarker.textContent = this.calculateTransformedValue(maxValue, stretchFactor, transformationType, penalty, penaltyStrength).toFixed(2);
        bar.appendChild(topMarker);
        
        const middleMarker = document.createElement('div');
        middleMarker.className = 'viz-value-marker viz-middle';
        middleMarker.textContent = '1.00';
        bar.appendChild(middleMarker);
        
        const bottomMarker = document.createElement('div');
        bottomMarker.className = 'viz-value-marker viz-bottom';
        bottomMarker.textContent = this.calculateTransformedValue(minValue, stretchFactor, transformationType, penalty, penaltyStrength).toFixed(2);
        bar.appendChild(bottomMarker);
        
        barContainer.appendChild(bar);
        column.appendChild(barContainer);
        
        // Info section
        const info = document.createElement('div');
        info.className = 'viz-column-info';
        
        if (transformationType === 'dual-exponent') {
            info.innerHTML = `
                <div class="viz-info-line"><strong>User:</strong> ${userExponent.toFixed(2)}</div>
                <div class="viz-info-line"><strong>Explore:</strong> ${(combinedExponent / userExponent).toFixed(2)}</div>
                <div class="viz-info-line"><strong>Combined:</strong> ${combinedExponent.toFixed(2)}</div>
            `;
        } else if (transformationType === 'penalty') {
            info.innerHTML = `
                <div class="viz-info-line"><strong>Weight:</strong> ${userExponent.toFixed(2)}</div>
                <div class="viz-info-line"><strong>Penalty:</strong> ${penalty.toFixed(2)}</div>
                <div class="viz-info-line"><strong>Strength:</strong> ${penaltyStrength.toFixed(2)}</div>
            `;
        } else {
            info.innerHTML = `
                <div class="viz-info-line"><strong>Exponent:</strong> ${userExponent.toFixed(2)}</div>
            `;
        }
        
        if (weight !== null && weight !== undefined) {
            info.innerHTML += `<div class="viz-info-line"><strong>Coef:</strong> ${weight.toFixed(3)}</div>`;
        }
        
        column.appendChild(info);
        
        return column;
    },
    
    // Create interactive guide/legend
    createVisualizationGuide() {
        const guide = document.createElement('div');
        guide.className = 'viz-guide';
        
        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'viz-guide-toggle';
        toggleBtn.innerHTML = '? How to Read';
        guide.appendChild(toggleBtn);
        
        // Guide content (hidden by default)
        const content = document.createElement('div');
        content.className = 'viz-guide-content';
        content.style.display = 'none';
        
        content.innerHTML = `
            <div class="viz-guide-section">
                <h4>📊 Bar Width (Horizontal)</h4>
                <div class="viz-guide-example">
                    <div class="viz-guide-bars">
                        <div class="viz-guide-bar" style="width: 40px; background: rgba(76, 175, 80, 0.3);">
                            <span>Narrow</span>
                        </div>
                        <div class="viz-guide-bar" style="width: 60px; background: rgba(158, 158, 158, 0.3);">
                            <span>Normal</span>
                        </div>
                        <div class="viz-guide-bar" style="width: 100px; background: rgba(255, 152, 0, 0.3);">
                            <span>Wide</span>
                        </div>
                    </div>
                    <p><strong>Narrow bar</strong> = Weak transformation (exponent &lt; 1.0) - feature compressed toward neutral</p>
                    <p><strong>Normal bar</strong> = No transformation (exponent = 1.0) - feature unchanged</p>
                    <p><strong>Wide bar</strong> = Strong transformation (exponent &gt; 1.0) - feature stretched away from neutral</p>
                </div>
            </div>
            
            <div class="viz-guide-section">
                <h4>🎨 Colored Segments (Inside Bar)</h4>
                <div class="viz-guide-example">
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <div style="flex: 1;">
                            <div style="height: 100px; background: linear-gradient(to bottom, rgba(255, 152, 0, 0.6) 0%, rgba(255, 152, 0, 0.2) 50%, rgba(255, 152, 0, 0.6) 100%); border-radius: 4px; position: relative;">
                                <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-size: 0.8em;">Wide</div>
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.8em; background: white; padding: 2px 4px; border-radius: 2px;">1.0</div>
                                <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-size: 0.8em;">Wide</div>
                            </div>
                            <p style="text-align: center; margin-top: 5px; font-size: 0.85em;"><strong>Stretching</strong><br>Orange, spread apart</p>
                        </div>
                        <div style="flex: 1;">
                            <div style="height: 100px; background: linear-gradient(to bottom, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.6) 50%, rgba(76, 175, 80, 0.2) 100%); border-radius: 4px; position: relative;">
                                <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-size: 0.8em;">Narrow</div>
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.8em; background: white; padding: 2px 4px; border-radius: 2px;">1.0</div>
                                <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-size: 0.8em;">Narrow</div>
                            </div>
                            <p style="text-align: center; margin-top: 5px; font-size: 0.85em;"><strong>Compressing</strong><br>Green, bunched together</p>
                        </div>
                    </div>
                    <p style="margin-top: 10px;"><strong>Segments show how input values are distributed after transformation:</strong></p>
                    <ul style="margin: 5px 0; padding-left: 20px; font-size: 0.9em;">
                        <li><strong>Spread apart</strong> = Values pushed away from 1.0 (stretching)</li>
                        <li><strong>Bunched together</strong> = Values pulled toward 1.0 (compressing)</li>
                        <li><strong>Darker color</strong> = More transformation happening in that region</li>
                    </ul>
                </div>
            </div>
            
            <div class="viz-guide-section">
                <h4>📏 Reference Lines (Thin Gray Lines)</h4>
                <div class="viz-guide-example">
                    <div style="position: relative; height: 80px; background: #f8f9fa; border-radius: 4px; padding: 10px;">
                        <div style="position: absolute; top: 20%; left: 10%; right: 10%; height: 1px; background: rgba(44, 62, 80, 0.4);"></div>
                        <div style="position: absolute; top: 20%; left: 5%; font-size: 0.75em; background: white; padding: 1px 3px; border-radius: 2px;">1.5</div>
                        <div style="position: absolute; top: 50%; left: 10%; right: 10%; height: 2px; background: #2c3e50;"></div>
                        <div style="position: absolute; top: 50%; right: 5%; font-size: 0.75em; background: rgba(44, 62, 80, 0.9); color: white; padding: 1px 3px; border-radius: 2px;">1.0</div>
                        <div style="position: absolute; top: 80%; left: 10%; right: 10%; height: 1px; background: rgba(44, 62, 80, 0.4);"></div>
                        <div style="position: absolute; top: 80%; left: 5%; font-size: 0.75em; background: white; padding: 1px 3px; border-radius: 2px;">0.5</div>
                    </div>
                    <p style="margin-top: 10px;"><strong>Thin gray lines</strong> at 0.5 and 1.5 = Reference markers showing input values</p>
                    <p><strong>Thick black line</strong> at 1.0 = Neutral point (always at same height across all columns)</p>
                    <p>These help you see where specific input values end up after transformation</p>
                </div>
            </div>
            
            <div class="viz-guide-section">
                <h4>🔢 Numbers Inside Bar</h4>
                <div class="viz-guide-example">
                    <p><strong>Top number</strong> (e.g., 3.25) = Transformed value when input is at maximum (2.0)</p>
                    <p><strong>Middle number</strong> (always 1.00) = Neutral point, no transformation</p>
                    <p><strong>Bottom number</strong> (e.g., 0.06) = Transformed value when input is at minimum (0.2)</p>
                    <p style="margin-top: 10px; padding: 10px; background: #e8f4f8; border-radius: 4px;">
                        <strong>Example:</strong> If top shows 3.25 and bottom shows 0.06, this means the transformation 
                        stretches high values higher (2.0 → 3.25) and low values lower (0.2 → 0.06)
                    </p>
                </div>
            </div>
            
            <div class="viz-guide-section">
                <h4>↕️ Animated Arrows</h4>
                <div class="viz-guide-example">
                    <div style="display: flex; gap: 20px; justify-content: center; margin: 10px 0;">
                        <div style="text-align: center;">
                            <div style="font-size: 2em; color: rgba(255, 152, 0, 0.8);">↑<br>↓</div>
                            <p style="font-size: 0.85em;"><strong>Outward arrows</strong><br>Stretching effect</p>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2em; color: rgba(76, 175, 80, 0.8);">↓<br>↑</div>
                            <p style="font-size: 0.85em;"><strong>Inward arrows</strong><br>Compressing effect</p>
                        </div>
                    </div>
                    <p>Arrows pulse to show the direction values are being pushed or pulled</p>
                </div>
            </div>
        `;
        
        guide.appendChild(content);
        
        // Toggle functionality
        toggleBtn.addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            toggleBtn.innerHTML = isHidden ? '✕ Hide Guide' : '? How to Read';
        });
        
        return guide;
    },
    
    // Calculate bar width based on stretch factor
    calculateBarWidth(stretchFactor) {
        // Base width: 60px
        // Stretch: multiply by factor (capped at 3x for visual clarity)
        const baseWidth = 60;
        const cappedFactor = Math.min(Math.max(stretchFactor, 0.3), 3.0);
        return baseWidth * cappedFactor;
    },
    
    // Calculate transformed value
    calculateTransformedValue(originalValue, exponent, transformationType, penalty, penaltyStrength) {
        if (transformationType === 'penalty') {
            // Penalty formula: reduced_value = 1.0 + (normalized_value - 1.0) * (1.0 - penalty_strength)
            const deviation = originalValue - 1.0;
            const reductionFactor = Math.max(0, 1.0 - penaltyStrength);
            return 1.0 + (deviation * reductionFactor);
        } else {
            // Standard or dual-exponent: value^exponent
            return Math.pow(originalValue, exponent);
        }
    },
    
    // Add distribution lines showing value stretching
    addDistributionLines(bar, exponent, transformationType, penalty, penaltyStrength) {
        // Create evenly spaced input values from 0.2 to 2.0
        const inputValues = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
        
        // Calculate transformed values
        const transformedValues = inputValues.map(val => 
            this.calculateTransformedValue(val, exponent, transformationType, penalty, penaltyStrength)
        );
        
        // Find min and max transformed values for scaling
        const minTransformed = Math.min(...transformedValues);
        const maxTransformed = Math.max(...transformedValues);
        const range = maxTransformed - minTransformed;
        
        // Create colored segments between each pair of lines
        for (let i = 0; i < inputValues.length - 1; i++) {
            const transformedVal1 = transformedValues[i];
            const transformedVal2 = transformedValues[i + 1];
            
            // Calculate positions (0 = bottom, 100 = top)
            const position1 = ((transformedVal1 - minTransformed) / range) * 100;
            const position2 = ((transformedVal2 - minTransformed) / range) * 100;
            
            // Create segment element
            const segment = document.createElement('div');
            segment.className = 'viz-segment';
            
            // Position and size
            segment.style.bottom = `${position1}%`;
            segment.style.height = `${position2 - position1}%`;
            
            // Color based on position relative to center (1.0)
            const midInput = (inputValues[i] + inputValues[i + 1]) / 2;
            const color = this.getSegmentColor(midInput, exponent, transformationType, penalty, penaltyStrength);
            segment.style.background = color;
            
            bar.appendChild(segment);
        }
        
        // Add thin separator lines at key positions for reference
        const keyPositions = [0.5, 1.0, 1.5];
        keyPositions.forEach(inputVal => {
            const transformedVal = this.calculateTransformedValue(inputVal, exponent, transformationType, penalty, penaltyStrength);
            const position = ((transformedVal - minTransformed) / range) * 100;
            
            const line = document.createElement('div');
            line.className = 'viz-separator-line';
            line.style.bottom = `${position}%`;
            
            // Special styling for 1.0 (center line is handled separately)
            if (Math.abs(inputVal - 1.0) < 0.01) {
                return; // Skip, center line handles this
            }
            
            // Add label
            const label = document.createElement('span');
            label.className = 'viz-line-label';
            label.textContent = inputVal.toFixed(1);
            line.appendChild(label);
            
            bar.appendChild(line);
        });
        
        // Add visual indicators showing stretching direction
        if (transformationType !== 'penalty') {
            if (exponent > 1.0) {
                // Stretching: add arrows pointing outward from center
                this.addStretchIndicator(bar, 'up');
                this.addStretchIndicator(bar, 'down');
            } else if (exponent < 1.0) {
                // Compressing: add arrows pointing inward to center
                this.addCompressIndicator(bar, 'up');
                this.addCompressIndicator(bar, 'down');
            }
        } else if (penaltyStrength > 0.1) {
            // Penalty: add compression indicators
            this.addCompressIndicator(bar, 'up');
            this.addCompressIndicator(bar, 'down');
        }
    },
    
    // Get color for a segment based on its position
    getSegmentColor(inputValue, exponent, transformationType, penalty, penaltyStrength) {
        // Distance from neutral (1.0)
        const distanceFromNeutral = Math.abs(inputValue - 1.0);
        
        if (transformationType === 'penalty') {
            // Penalty: blue gradient, darker near center
            const intensity = Math.max(0.2, 1.0 - distanceFromNeutral);
            const alpha = 0.3 + (intensity * 0.4);
            return `rgba(33, 150, 243, ${alpha})`;
        } else if (exponent > 1.0) {
            // Stretching: orange gradient, darker at extremes
            const intensity = distanceFromNeutral;
            const alpha = 0.2 + (intensity * 0.5);
            return `rgba(255, 152, 0, ${alpha})`;
        } else if (exponent < 1.0) {
            // Compressing: green gradient, darker near center
            const intensity = Math.max(0.2, 1.0 - distanceFromNeutral);
            const alpha = 0.2 + (intensity * 0.4);
            return `rgba(76, 175, 80, ${alpha})`;
        } else {
            // Neutral: gray gradient
            return `rgba(158, 158, 158, 0.25)`;
        }
    },
    
    // Add stretch indicator (arrow pointing away from center)
    addStretchIndicator(bar, direction) {
        const indicator = document.createElement('div');
        indicator.className = `viz-stretch-indicator viz-${direction}`;
        indicator.innerHTML = direction === 'up' ? '↑' : '↓';
        bar.appendChild(indicator);
    },
    
    // Add compress indicator (arrow pointing toward center)
    addCompressIndicator(bar, direction) {
        const indicator = document.createElement('div');
        indicator.className = `viz-compress-indicator viz-${direction}`;
        indicator.innerHTML = direction === 'up' ? '↓' : '↑';
        bar.appendChild(indicator);
    },
    
};
