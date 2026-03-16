// modelTrain.js - Train all 3 models

const ModelTrainer = {
    // Train all models
    trainAll(data, cellMapping, featureColumns, resultColumn) {
        console.log('Starting model training...');
        
        // Always use standard regression (with or without dual-exponent exploration)
        return this.trainWithRegression(data, cellMapping, featureColumns, resultColumn);
    },

    // Train using standard regression
    trainWithRegression(data, cellMapping, featureColumns, resultColumn) {
        console.log('Starting model training...');
        
        // Check if experimental mode (feature weighting) is enabled
        const useFeatureWeighting = cellMapping._exponentsEnabled || false;
        let featureWeights = null;
        
        if (useFeatureWeighting) {
            console.log('🧪 Experimental mode: Training BOTH standard and dual-exponent models');
            
            // First, train standard models (without exponents)
            console.log('\n📊 Training standard models (baseline)...');
            const { encoded, y } = DataEncoder.encodeData(data, cellMapping, featureColumns, resultColumn);
            const X_features = encoded.map(row => featureColumns.map(col => row[col]));
            const X = X_features.map(row => [1, ...row]);
            const uniqueValues = DataEncoder.getUniqueValues(cellMapping, featureColumns);
            
            const standardModel1 = this.trainSimple(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
            const standardModel2 = this.trainInteractions(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
            const standardModel3 = this.trainPolynomial(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
            
            standardModel1.name = 'Simple Linear Regression (Standard)';
            standardModel2.name = 'Linear Regression with Interactions (Standard)';
            standardModel3.name = 'Polynomial Regression (degree 3) (Standard)';
            
            // Then, train experimental models (with dual-exponent exploration)
            console.log('\n🔬 Training experimental models (dual-exponent)...');
            featureWeights = featureColumns.map((col, i) => {
                const cName = `C${i + 1}`;
                const mapping = cellMapping[cName];
                if (!mapping) {
                    console.error(`Missing mapping for ${cName} (column: ${col})`);
                    console.error('Available mappings:', Object.keys(cellMapping));
                    throw new Error(`Missing mapping for column ${col}. Please reconfigure the mappings.`);
                }
                return mapping.exponent || 1.0;
            });
            console.log('User exponents (first):', featureWeights);
            
            const explorationExponents = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9];
            console.log('Testing exploration exponents (second):', explorationExponents);
            
            const experimentalResults = this.trainWithDualExponents(data, cellMapping, featureColumns, resultColumn, featureWeights, explorationExponents);
            
            // Rename experimental models
            experimentalResults.model1.name = 'Simple Linear Regression (Experimental)';
            experimentalResults.model2.name = 'Linear Regression with Interactions (Experimental)';
            experimentalResults.model3.name = 'Polynomial Regression (degree 3) (Experimental)';
            
            // Return both sets of models
            return {
                model1: standardModel1,
                model2: standardModel2,
                model3: standardModel3,
                model4: experimentalResults.model1,
                model5: experimentalResults.model2,
                model6: experimentalResults.model3,
                uniqueValues,
                featureColumns,
                resultColumn,
                useFeatureWeighting: true,
                explorationExponents: experimentalResults.explorationExponents,
                allModels: experimentalResults.allModels
            };
        }
        
        // Standard regression without weighting
        const { encoded, y } = DataEncoder.encodeData(data, cellMapping, featureColumns, resultColumn);
        const X_features = encoded.map(row => featureColumns.map(col => row[col]));
        const X = X_features.map(row => [1, ...row]);
        const uniqueValues = DataEncoder.getUniqueValues(cellMapping, featureColumns);
        
        console.log('Training Model 1: Simple LR...');
        const model1 = this.trainSimple(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
        
        console.log('Training Model 2: Interactions LR...');
        const model2 = this.trainInteractions(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
        
        console.log('Training Model 3: Polynomial LR...');
        const model3 = this.trainPolynomial(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
        
        return {
            model1,
            model2,
            model3,
            uniqueValues,
            featureColumns,
            resultColumn,
            useFeatureWeighting: false
        };
    },
    
    // Train with dual-exponent exploration
    trainWithDualExponents(data, cellMapping, featureColumns, resultColumn, userExponents, explorationExponents) {
        console.log('\n🔬 Testing', explorationExponents.length, 'exploration exponents...\n');
        
        const allModels = [];
        
        // Test each exploration exponent
        explorationExponents.forEach((exploreExp, idx) => {
            console.log(`\n--- Testing exploration exponent ${idx + 1}/${explorationExponents.length}: ${exploreExp} ---`);
            
            // Calculate combined exponents: user_exp × explore_exp
            const combinedExponents = userExponents.map(userExp => userExp * exploreExp);
            console.log('Combined exponents:', combinedExponents.map(e => e.toFixed(3)));
            
            // CORRECT ORDER: Normalize FIRST, then apply exponents to normalized values
            // Step 1: Encode/normalize the raw data (0.2-2.0 range)
            const { encoded, y } = DataEncoder.encodeData(data, cellMapping, featureColumns, resultColumn);
            
            // Step 2: Apply exponent transformation to NORMALIZED values
            const transformedEncoded = encoded.map(row => {
                const transformed = { ...row };
                featureColumns.forEach((col, i) => {
                    const normalizedValue = row[col]; // Already in 0.2-2.0 range
                    if (!isNaN(normalizedValue) && normalizedValue > 0) {
                        // Apply exponent to normalized value
                        transformed[col] = Math.pow(normalizedValue, combinedExponents[i]);
                    }
                });
                return transformed;
            });
            
            const X_features = transformedEncoded.map(row => featureColumns.map(col => row[col]));
            const X = X_features.map(row => [1, ...row]);
            const uniqueValues = DataEncoder.getUniqueValues(cellMapping, featureColumns);
            
            // Train all 3 models with this exploration exponent
            const model1 = this.trainSimple(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
            const model2 = this.trainInteractions(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
            const model3 = this.trainPolynomial(X, y, uniqueValues, data, resultColumn, cellMapping, featureColumns, null);
            
            // Add exploration info to models
            model1.explorationExponent = exploreExp;
            model1.combinedExponents = combinedExponents;
            model1.name = `Model 1 (exp=${exploreExp})`;
            
            model2.explorationExponent = exploreExp;
            model2.combinedExponents = combinedExponents;
            model2.name = `Model 2 (exp=${exploreExp})`;
            
            model3.explorationExponent = exploreExp;
            model3.combinedExponents = combinedExponents;
            model3.name = `Model 3 (exp=${exploreExp})`;
            
            console.log(`  Model 1: ${model1.accuracy.toFixed(2)}%`);
            console.log(`  Model 2: ${model2.accuracy.toFixed(2)}%`);
            console.log(`  Model 3: ${model3.accuracy.toFixed(2)}%`);
            
            allModels.push({ model1, model2, model3, exploreExp });
        });
        
        // Find best models
        console.log('\n🏆 Selecting best models...');
        const bestModel1 = allModels.reduce((best, curr) => 
            curr.model1.accuracy > best.model1.accuracy ? curr : best
        );
        const bestModel2 = allModels.reduce((best, curr) => 
            curr.model2.accuracy > best.model2.accuracy ? curr : best
        );
        const bestModel3 = allModels.reduce((best, curr) => 
            curr.model3.accuracy > best.model3.accuracy ? curr : best
        );
        
        console.log(`\nBest Model 1: exp=${bestModel1.exploreExp} (${bestModel1.model1.accuracy.toFixed(2)}%)`);
        console.log(`Best Model 2: exp=${bestModel2.exploreExp} (${bestModel2.model2.accuracy.toFixed(2)}%)`);
        console.log(`Best Model 3: exp=${bestModel3.exploreExp} (${bestModel3.model3.accuracy.toFixed(2)}%)`);
        
        const uniqueValues = DataEncoder.getUniqueValues(cellMapping, featureColumns);
        
        return {
            model1: bestModel1.model1,
            model2: bestModel2.model2,
            model3: bestModel3.model3,
            uniqueValues,
            featureColumns,
            resultColumn,
            useFeatureWeighting: true,
            explorationExponents,
            allModels // Include all tested models for reference
        };
    },
    
    // Transform data by raising features to combined exponents
    transformDataWithExponents(data, featureColumns, exponents) {
        return data.map(row => {
            const transformed = { ...row };
            featureColumns.forEach((col, i) => {
                const value = parseFloat(row[col]);
                if (!isNaN(value) && value > 0) {
                    transformed[col] = Math.pow(value, exponents[i]);
                }
            });
            return transformed;
        });
    },

    // Train Model 1: Simple Linear Regression
    trainSimple(X, y, uniqueValues, originalData, resultColumn, cellMapping, featureColumns, featureWeights = null) {
        const w = LinearRegression.calculateWeights(X, y, 0, featureWeights);
        const predictions = LinearRegression.predict(X, w);
        const predictionsRounded = LinearRegression.roundPredictions(predictions, uniqueValues);
        
        const accuracy = LinearRegression.calculateAccuracy(y, predictionsRounded);
        const confusion = LinearRegression.buildConfusionMatrix(y, predictionsRounded, uniqueValues);
        
        const correct = predictionsRounded.filter((pred, i) => Math.abs(pred - y[i]) < 0.01).length;
        
        // Perform feature ablation test
        console.log('Performing feature ablation test for Model 1...');
        const ablationResults = this.performAblationTest(X, y, uniqueValues, featureColumns, correct, y.length, featureWeights);
        
        return {
            name: 'Simple Linear Regression' + (featureWeights ? ' (Weighted)' : ''),
            weights: w,
            featureNames: featureColumns,
            accuracy,
            correct,
            total: y.length,
            confusion,
            predictions: predictionsRounded,
            predictionScores: predictions,
            ablation: ablationResults,
            useFeatureWeighting: !!featureWeights
        };
    },

    // Perform feature ablation test - replace each column with average value (1.0)
    performAblationTest(X, y, uniqueValues, featureColumns, baselineCorrect, total, featureWeights = null) {
        const results = [];
        
        // For each feature column
        for (let excludeIdx = 0; excludeIdx < featureColumns.length; excludeIdx++) {
            // Create X with this feature replaced by average value (1.0)
            const X_ablated = X.map(row => {
                const newRow = [...row]; // Copy the row
                newRow[excludeIdx + 1] = 1.0; // Replace feature with average (skip bias at index 0)
                return newRow;
            });
            
            // Retrain model with this feature neutralized
            const w_ablated = LinearRegression.calculateWeights(X_ablated, y, 0, featureWeights);
            const predictions_ablated = LinearRegression.predict(X_ablated, w_ablated);
            const predictionsRounded_ablated = LinearRegression.roundPredictions(predictions_ablated, uniqueValues);
            
            // Count correct predictions
            const correct_ablated = predictionsRounded_ablated.filter((pred, i) => Math.abs(pred - y[i]) < 0.01).length;
            
            // Calculate impact: how many MORE incorrect predictions
            const incorrectIncrease = baselineCorrect - correct_ablated;
            
            // Convert to percentage impact (relative to total)
            const impactPercentage = (incorrectIncrease / total) * 100;
            
            results.push({
                feature: featureColumns[excludeIdx],
                baselineCorrect: baselineCorrect,
                correctWithoutFeature: correct_ablated,
                incorrectIncrease: incorrectIncrease,
                impactPercentage: impactPercentage
            });
            
            console.log(`Ablation: ${featureColumns[excludeIdx]} - Impact: ${impactPercentage.toFixed(2)}%`);
        }
        
        // Sort by impact (highest first)
        results.sort((a, b) => b.impactPercentage - a.impactPercentage);
        
        return results;
    },

    // Train Model 2: Linear Regression with Interactions
    trainInteractions(X, y, uniqueValues, originalData, resultColumn, cellMapping, featureColumns, featureWeights = null) {
        const X_interactions = LinearRegression.createInteractions(X);
        // For interactions, only apply feature weights to original features, not interaction terms
        const w = LinearRegression.calculateWeights(X_interactions, y, 0, featureWeights);
        const predictions = LinearRegression.predict(X_interactions, w);
        const predictionsRounded = LinearRegression.roundPredictions(predictions, uniqueValues);
        
        const accuracy = LinearRegression.calculateAccuracy(y, predictionsRounded);
        const confusion = LinearRegression.buildConfusionMatrix(y, predictionsRounded, uniqueValues);
        
        const correct = predictionsRounded.filter((pred, i) => Math.abs(pred - y[i]) < 0.01).length;
        
        // Generate feature names with interactions
        const interactionNames = [...featureColumns];
        for (let i = 0; i < featureColumns.length; i++) {
            for (let j = i + 1; j < featureColumns.length; j++) {
                interactionNames.push(`${featureColumns[i]}*${featureColumns[j]}`);
            }
        }
        
        return {
            name: 'Linear Regression with Interactions' + (featureWeights ? ' (Weighted)' : ''),
            weights: w,
            featureNames: interactionNames,
            accuracy,
            correct,
            total: y.length,
            confusion,
            predictions: predictionsRounded,
            predictionScores: predictions,
            useFeatureWeighting: !!featureWeights
        };
    },

    // Train Model 3: Polynomial Regression with Ridge
    trainPolynomial(X, y, uniqueValues, originalData, resultColumn, cellMapping, featureColumns, featureWeights = null) {
        const X_poly = LinearRegression.createPolynomial(X, 3);
        
        // Find best alpha for regular regression
        const alphas = [0.001, 0.01, 0.1, 1.0, 10.0];
        let bestAlpha = alphas[0];
        let bestAccuracy = 0;
        let bestW = null;
        
        alphas.forEach(alpha => {
            const w_test = LinearRegression.calculateWeights(X_poly, y, alpha, featureWeights);
            const pred_test = LinearRegression.predict(X_poly, w_test);
            const pred_rounded = LinearRegression.roundPredictions(pred_test, uniqueValues);
            const acc = LinearRegression.calculateAccuracy(y, pred_rounded);
            
            if (acc > bestAccuracy) {
                bestAccuracy = acc;
                bestAlpha = alpha;
                bestW = w_test;
            }
        });
        
        const w = bestW;
        const predictions = LinearRegression.predict(X_poly, w);
        const predictionsRounded = LinearRegression.roundPredictions(predictions, uniqueValues);
        
        const accuracy = LinearRegression.calculateAccuracy(y, predictionsRounded);
        const confusion = LinearRegression.buildConfusionMatrix(y, predictionsRounded, uniqueValues);
        
        const correct = predictionsRounded.filter((pred, i) => Math.abs(pred - y[i]) < 0.01).length;
        
        return {
            name: 'Polynomial Regression (degree 3)' + (featureWeights ? ' (Weighted)' : ''),
            weights: w,
            featureNames: ['polynomial_features'], // Simplified
            accuracy,
            correct,
            total: y.length,
            confusion,
            predictions: predictionsRounded,
            predictionScores: predictions,
            alpha: bestAlpha,
            useFeatureWeighting: !!featureWeights
        };
    }
};
