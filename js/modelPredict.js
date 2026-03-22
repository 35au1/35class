// modelPredict.js - Make predictions on test data

const ModelPredictor = {
    // Predict using all models
    predictAll(testData, trainedModels, cellMapping, featureColumns, resultColumn) {
        console.log('Making predictions...');
        console.log('Test data rows:', testData.length);
        console.log('Feature columns:', featureColumns);
        
        // Validate inputs
        if (!trainedModels || !trainedModels.model1) {
            throw new Error('Trained models not found. Please train models first.');
        }
        
        if (!trainedModels.model1.weights) {
            throw new Error('Model weights not found. Please retrain models.');
        }
        
        if (!Array.isArray(featureColumns) || featureColumns.length === 0) {
            throw new Error('Feature columns not defined. Please retrain models.');
        }
        
        // Check if experimental mode (9 models with penalty, 6 models, or 3 models)
        const hasPenaltyModels = trainedModels.model7 !== undefined;
        const isExperimentalMode = trainedModels.model4 !== undefined;
        
        const uniqueValues = trainedModels.uniqueValues;
        const reverseMapping = DataEncoder.getReverseMapping(cellMapping, featureColumns);
        
        // Predict with standard models (1-3)
        const pred1 = this.predictWithModel(testData, trainedModels.model1, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
        const pred2 = this.predictWithModel(testData, trainedModels.model2, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
        const pred3 = this.predictWithModel(testData, trainedModels.model3, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
        
        // Build results object
        const results = testData.map((row, i) => ({
            ...row,
            model1_score: pred1.scores[i],
            model1_prediction: pred1.categories[i],
            model2_score: pred2.scores[i],
            model2_prediction: pred2.categories[i],
            model3_score: pred3.scores[i],
            model3_prediction: pred3.categories[i]
        }));
        
        const returnObj = {
            results,
            accuracy: pred1.accuracy,
            confusion: pred1.confusion,
            model1: pred1,
            model2: pred2,
            model3: pred3,
            reverseMapping
        };
        
        // If experimental mode, also predict with models 4-6
        if (isExperimentalMode) {
            console.log('🧪 Experimental mode: Predicting with models 4-6');
            
            const pred4 = this.predictWithModel(testData, trainedModels.model4, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
            const pred5 = this.predictWithModel(testData, trainedModels.model5, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
            const pred6 = this.predictWithModel(testData, trainedModels.model6, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
            
            // Add experimental predictions to results
            results.forEach((row, i) => {
                row.model4_score = pred4.scores[i];
                row.model4_prediction = pred4.categories[i];
                row.model5_score = pred5.scores[i];
                row.model5_prediction = pred5.categories[i];
                row.model6_score = pred6.scores[i];
                row.model6_prediction = pred6.categories[i];
            });
            
            returnObj.model4 = pred4;
            returnObj.model5 = pred5;
            returnObj.model6 = pred6;
        }
        
        // If penalty models exist, also predict with models 7-9
        if (hasPenaltyModels) {
            console.log('⚖️ Penalty mode: Predicting with models 7-9');
            
            const pred7 = this.predictWithModel(testData, trainedModels.model7, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
            const pred8 = this.predictWithModel(testData, trainedModels.model8, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
            const pred9 = this.predictWithModel(testData, trainedModels.model9, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping);
            
            // Add penalty predictions to results
            results.forEach((row, i) => {
                row.model7_score = pred7.scores[i];
                row.model7_prediction = pred7.categories[i];
                row.model8_score = pred8.scores[i];
                row.model8_prediction = pred8.categories[i];
                row.model9_score = pred9.scores[i];
                row.model9_prediction = pred9.categories[i];
            });
            
            returnObj.model7 = pred7;
            returnObj.model8 = pred8;
            returnObj.model9 = pred9;
        }
        
        return returnObj;
    },
    
    // Predict with a single model (handles exponent transformations and penalty-based transformations)
    predictWithModel(testData, model, cellMapping, featureColumns, resultColumn, uniqueValues, reverseMapping) {
        // Check if model uses exponent transformations or penalty-based transformations
        const useExponents = model.combinedExponents !== undefined;
        const usePenalty = model.penalties !== undefined;
        
        // CORRECT ORDER: Normalize FIRST, then apply transformations to normalized values
        // Step 1: Encode/normalize the raw data (0.2-2.0 range)
        const { encoded } = DataEncoder.encodeData(testData, cellMapping, featureColumns, resultColumn);
        
        // Step 2: Apply transformations to NORMALIZED values
        let transformedEncoded = encoded;
        
        if (useExponents) {
            console.log('🔬 Applying exponent transformations to normalized values:', model.combinedExponents.map(e => e.toFixed(2)));
            
            transformedEncoded = encoded.map(row => {
                const transformed = { ...row };
                featureColumns.forEach((col, i) => {
                    const normalizedValue = row[col]; // Already in 0.2-2.0 range
                    if (!isNaN(normalizedValue) && normalizedValue > 0) {
                        const exp = model.combinedExponents[i];
                        // Apply exponent to normalized value
                        transformed[col] = Math.pow(normalizedValue, exp);
                    }
                });
                return transformed;
            });
        } else if (usePenalty) {
            console.log('⚖️ Applying penalty-based reduction to normalized values');
            console.log('   Penalties:', model.penalties.map(p => p.toFixed(2)));
            console.log('   Strengths:', model.penaltyStrengths.map(s => s.toFixed(2)));
            
            transformedEncoded = encoded.map(row => {
                const transformed = { ...row };
                featureColumns.forEach((col, i) => {
                    const normalizedValue = row[col];
                    if (!isNaN(normalizedValue)) {
                        // Reduce importance: bring value closer to 1.0 based on penalty strength
                        const deviation = normalizedValue - 1.0;
                        const reductionFactor = Math.max(0, 1.0 - model.penaltyStrengths[i]);
                        transformed[col] = 1.0 + (deviation * reductionFactor);
                    }
                });
                return transformed;
            });
        }
        
        // Prepare feature matrix from transformed (or original) encoded data
        const X_features = transformedEncoded.map(row => 
            featureColumns.map(col => row[col])
        );
        const X = X_features.map(row => [1, ...row]);
        
        // Determine model type and predict
        let prediction;
        if (model.name.includes('Polynomial')) {
            prediction = this.predictPolynomial(X, model, uniqueValues, reverseMapping);
        } else if (model.name.includes('Interactions')) {
            prediction = this.predictInteractions(X, model, uniqueValues, reverseMapping);
        } else {
            prediction = this.predictSimple(X, model, uniqueValues, reverseMapping);
        }
        
        // Calculate accuracy if actual values exist
        const hasActual = testData.some(row => row[resultColumn] && row[resultColumn].trim() !== '');
        
        if (hasActual) {
            const resultCName = `C${featureColumns.length + 1}`;
            const resultMapping = cellMapping[resultCName];
            
            const yTrue = testData
                .filter(row => row[resultColumn] && row[resultColumn].trim() !== '')
                .map(row => resultMapping[row[resultColumn]]);
            
            const yPred = prediction.rounded.filter((_, i) => 
                testData[i][resultColumn] && testData[i][resultColumn].trim() !== ''
            );
            
            prediction.accuracy = LinearRegression.calculateAccuracy(yTrue, yPred);
            prediction.confusion = LinearRegression.buildConfusionMatrix(yTrue, yPred, uniqueValues);
        } else {
            prediction.accuracy = null;
            prediction.confusion = null;
        }
        
        return prediction;
    },

    // Predict with Model 1: Simple
    predictSimple(X, model, uniqueValues, reverseMapping) {
        // Ensure weights is a flat 1D array
        let weights = Array.isArray(model.weights) ? model.weights : model.weights.toArray();
        // If it's a 2D array (column vector), flatten it
        if (Array.isArray(weights[0])) {
            weights = weights.map(row => row[0]);
        }
        
        console.log('predictSimple - weights:', weights);
        console.log('predictSimple - X[0]:', X[0]);
        console.log('predictSimple - dimensions match:', weights.length === X[0].length);
        
        // Manual matrix multiplication to avoid dimension issues
        const scores = X.map(row => {
            let sum = 0;
            for (let i = 0; i < Math.min(row.length, weights.length); i++) {
                sum += row[i] * weights[i];
            }
            return sum;
        });
        
        const rounded = LinearRegression.roundPredictions(scores, uniqueValues);
        const categories = rounded.map(val => reverseMapping[val]);
        
        return { scores, rounded, categories };
    },

    // Predict with Model 2: Interactions
    predictInteractions(X, model, uniqueValues, reverseMapping) {
        const X_interactions = LinearRegression.createInteractions(X);
        
        // Ensure weights is a flat 1D array
        let weights = Array.isArray(model.weights) ? model.weights : model.weights.toArray();
        if (Array.isArray(weights[0])) {
            weights = weights.map(row => row[0]);
        }
        
        const scores = X_interactions.map(row => {
            let sum = 0;
            for (let i = 0; i < Math.min(row.length, weights.length); i++) {
                sum += row[i] * weights[i];
            }
            return sum;
        });
        
        const rounded = LinearRegression.roundPredictions(scores, uniqueValues);
        const categories = rounded.map(val => reverseMapping[val]);
        
        return { scores, rounded, categories };
    },

    // Predict with Model 3: Polynomial
    predictPolynomial(X, model, uniqueValues, reverseMapping) {
        const X_poly = LinearRegression.createPolynomial(X, 3);
        
        // Ensure weights is a flat 1D array
        let weights = Array.isArray(model.weights) ? model.weights : model.weights.toArray();
        if (Array.isArray(weights[0])) {
            weights = weights.map(row => row[0]);
        }
        
        const scores = X_poly.map(row => {
            let sum = 0;
            for (let i = 0; i < Math.min(row.length, weights.length); i++) {
                sum += row[i] * weights[i];
            }
            return sum;
        });
        
        const rounded = LinearRegression.roundPredictions(scores, uniqueValues);
        const categories = rounded.map(val => reverseMapping[val]);
        
        return { scores, rounded, categories };
    }
};
