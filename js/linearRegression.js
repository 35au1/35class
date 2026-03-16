// linearRegression.js - Linear regression calculations using math.js

const LinearRegression = {
    // Calculate weights: w = (X^T X)^-1 X^T y
    // If featureWeights is provided, apply column weighting during regression
    calculateWeights(X, y, alpha = 0, featureWeights = null) {
        // Apply feature weighting to X if provided
        let X_weighted = X;
        if (featureWeights && featureWeights.length > 0) {
            X_weighted = this.applyFeatureWeights(X, featureWeights);
        }
        try {
            const Xt = math.transpose(X_weighted);
            let XtX = math.multiply(Xt, X_weighted);
            
            // Add Ridge regularization if alpha > 0
            if (alpha > 0) {
                const size = Array.isArray(XtX) ? XtX.length : math.size(XtX)[0];
                let I = math.identity(size);
                
                // Convert to array if needed
                if (!Array.isArray(I)) {
                    I = I.toArray();
                }
                
                // Don't regularize bias term
                I[0][0] = 0;
                
                // Multiply alpha with identity matrix manually
                const alphaI = I.map(row => row.map(val => val * alpha));
                
                XtX = math.add(XtX, alphaI);
            }
            
            // Try to calculate inverse
            let XtX_inv;
            try {
                XtX_inv = math.inv(XtX);
            } catch (invError) {
                console.warn('Matrix is singular, using pseudo-inverse with regularization');
                // Add small regularization to make matrix invertible
                const size = Array.isArray(XtX) ? XtX.length : math.size(XtX)[0];
                let I = math.identity(size);
                if (!Array.isArray(I)) {
                    I = I.toArray();
                }
                const regularization = I.map(row => row.map(val => val * 0.01));
                XtX = math.add(XtX, regularization);
                XtX_inv = math.inv(XtX);
            }
            
            const Xty = math.multiply(Xt, y);
            const w = math.multiply(XtX_inv, Xty);
            
            // Flatten to 1D array
            let wArray = Array.isArray(w) ? w : w.toArray();
            // If it's a 2D array (column vector), flatten it
            if (Array.isArray(wArray[0])) {
                wArray = wArray.map(row => row[0]);
            }
            
            // If we applied feature weighting, we need to unscale the coefficients
            if (featureWeights && featureWeights.length > 0) {
                wArray = this.unscaleCoefficients(wArray, featureWeights);
            }
            
            return wArray;
        } catch (error) {
            console.error('Error calculating weights:', error);
            throw new Error('Cannot calculate model weights. This may happen if:\n' +
                '1. Result column categories have identical slider values\n' +
                '2. Not enough data variation\n' +
                '3. Duplicate or constant columns\n\n' +
                'Please check your mappings and ensure categories have different values.');
        }
    },

    // Make predictions: y_pred = X * w
    predict(X, w) {
        const result = math.multiply(X, w);
        return Array.isArray(result) ? result : result.toArray();
    },

    // Round predictions to nearest unique value
    roundPredictions(predictions, uniqueValues) {
        return predictions.map(pred => {
            let minDist = Infinity;
            let closest = uniqueValues[0];
            
            uniqueValues.forEach(val => {
                const dist = Math.abs(pred - val);
                if (dist < minDist) {
                    minDist = dist;
                    closest = val;
                }
            });
            
            return closest;
        });
    },

    // Calculate accuracy
    calculateAccuracy(yTrue, yPred) {
        let correct = 0;
        for (let i = 0; i < yTrue.length; i++) {
            if (Math.abs(yTrue[i] - yPred[i]) < 0.01) {
                correct++;
            }
        }
        return (correct / yTrue.length) * 100;
    },

    // Build confusion matrix
    buildConfusionMatrix(yTrue, yPred, uniqueValues) {
        const n = uniqueValues.length;
        const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
        
        const valueToIdx = {};
        uniqueValues.forEach((val, idx) => {
            valueToIdx[val] = idx;
        });
        
        for (let i = 0; i < yTrue.length; i++) {
            const trueIdx = valueToIdx[yTrue[i]];
            const predIdx = valueToIdx[yPred[i]];
            matrix[trueIdx][predIdx]++;
        }
        
        return matrix;
    },

    // Create interaction features
    createInteractions(X) {
        const n = X.length;
        const m = X[0].length - 1; // Exclude bias column
        const interactions = [];
        
        // Add original features (excluding bias)
        for (let i = 0; i < n; i++) {
            interactions.push([...X[i].slice(1)]);
        }
        
        // Add pairwise interactions
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 1; j < m + 1; j++) {
                for (let k = j + 1; k < m + 1; k++) {
                    row.push(X[i][j] * X[i][k]);
                }
            }
            interactions[i] = interactions[i].concat(row);
        }
        
        // Add bias column back
        return interactions.map(row => [1, ...row]);
    },

    // Create polynomial features (degree 3)
    createPolynomial(X, degree = 3) {
        const n = X.length;
        const m = X[0].length - 1; // Exclude bias column
        const poly = [];
        
        for (let i = 0; i < n; i++) {
            const features = X[i].slice(1); // Original features without bias
            const row = [...features]; // Start with original features
            
            // Add degree 2 terms
            for (let j = 0; j < m; j++) {
                for (let k = j; k < m; k++) {
                    row.push(features[j] * features[k]);
                }
            }
            
            // Add degree 3 terms
            for (let j = 0; j < m; j++) {
                for (let k = j; k < m; k++) {
                    for (let l = k; l < m; l++) {
                        row.push(features[j] * features[k] * features[l]);
                    }
                }
            }
            
            poly.push([1, ...row]); // Add bias column
        }
        
        return poly;
    },

    // Apply feature weights to design matrix
    // Multiply each feature column by its weight
    applyFeatureWeights(X, weights) {
        return X.map(row => {
            const newRow = [row[0]]; // Keep bias unchanged
            for (let i = 0; i < weights.length && i < row.length - 1; i++) {
                newRow.push(row[i + 1] * weights[i]);
            }
            // Add any remaining columns unchanged (for polynomial/interaction terms)
            for (let i = weights.length + 1; i < row.length; i++) {
                newRow.push(row[i]);
            }
            return newRow;
        });
    },

    // Unscale coefficients after regression on weighted features
    // Divide each coefficient by its weight to get true coefficient
    unscaleCoefficients(coefficients, weights) {
        const newCoeffs = [coefficients[0]]; // Keep bias unchanged
        for (let i = 0; i < weights.length && i < coefficients.length - 1; i++) {
            newCoeffs.push(coefficients[i + 1] / weights[i]);
        }
        // Add any remaining coefficients unchanged
        for (let i = weights.length + 1; i < coefficients.length; i++) {
            newCoeffs.push(coefficients[i]);
        }
        return newCoeffs;
    }
};
