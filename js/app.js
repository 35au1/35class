// app.js - Main application logic

let appState = {
    trainingData: null,
    testData: null,
    cellMapping: null,
    trainedModels: null,
    featureColumns: null,
    resultColumn: null,
    columnTypes: null  // Store which columns are numeric/categorical
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Load saved data from localStorage
    const savedTraining = Storage.load(Storage.KEYS.TRAINING_DATA);
    const savedMapping = Storage.load(Storage.KEYS.CELL_MAPPING);
    const savedModels = Storage.load(Storage.KEYS.TRAINED_MODELS);
    const savedFeatures = Storage.load(Storage.KEYS.FEATURE_COLUMNS);
    const savedResult = Storage.load(Storage.KEYS.RESULT_COLUMN);
    
    console.log('Loading from localStorage:');
    console.log('- Training data:', savedTraining ? `${savedTraining.length} rows` : 'none');
    console.log('- Cell mapping:', savedMapping ? 'found' : 'none');
    console.log('- Trained models:', savedModels ? Object.keys(savedModels) : 'none');
    console.log('- Feature columns:', savedFeatures);
    console.log('- Result column:', savedResult);
    
    // Always start at Step 1 on page load
    // User can use "Load Saved Configuration" button if they want to restore previous session
    showStep(1);
    
    if (savedTraining && savedMapping && savedModels && savedFeatures && savedResult) {
        appState.trainingData = savedTraining;
        appState.cellMapping = savedMapping;
        appState.trainedModels = savedModels;
        appState.featureColumns = savedFeatures;
        appState.resultColumn = savedResult;
        
        console.log('Previous session data available in localStorage (use "Load Saved Configuration" to restore)');
    } else {
        console.log('No complete session found in localStorage');
    }
}

function setupEventListeners() {
    // Step 1: Upload training data
    document.getElementById('trainingFile').addEventListener('change', handleTrainingUpload);
    document.getElementById('nextToColumnSelect').addEventListener('click', () => {
        showColumnSelection();
        showStep(2);
    });
    
    // Step 2: Select result column
    document.getElementById('nextToColumnTypes').addEventListener('click', () => {
        if (selectResultColumn()) {
            showColumnTypes();
            showStep(3);
        }
    });
    
    // Step 3: Define column types
    document.getElementById('nextToMapping').addEventListener('click', () => {
        if (extractColumnTypes()) {
            showStep(4);
        }
    });
    
    // Step 4: Define mappings
    document.getElementById('trainModels').addEventListener('click', handleTrainModels);
    
    // Step 5: View results
    document.getElementById('nextToPredict').addEventListener('click', () => {
        // Hide the animated borders when moving to prediction step
        document.querySelectorAll('.emphasized-section').forEach(el => {
            el.style.display = 'none';
        });
        showStep(6);
    });
    
    // Step 6: Upload test data and predict
    document.getElementById('testFile').addEventListener('change', handleTestUpload);
    document.getElementById('makePredictions').addEventListener('click', handleMakePredictions);
    
    // Configuration caching
    document.getElementById('saveConfig').addEventListener('click', handleSaveConfig);
    document.getElementById('loadConfig').addEventListener('click', handleLoadConfig);
    
    // Clear cache
    document.getElementById('clearCache').addEventListener('click', handleClearCache);
    
    // Download sample data
    document.getElementById('downloadSampleData').addEventListener('click', handleDownloadSampleData);
}

// Handle training data upload
async function handleTrainingUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        displayInfo('Parsing CSV file...');
        const data = await CSVParser.parse(file);
        
        if (data.length === 0) {
            throw new Error('CSV file is empty');
        }
        
        // Show preview
        displayDataPreview(data, 'trainingPreview');
        
        // Save to state
        appState.trainingData = data;
        
        document.getElementById('nextToColumnSelect').classList.remove('hidden');
        
    } catch (error) {
        displayError('Error loading training data: ' + error.message);
    }
}

// Show column selection UI
function showColumnSelection() {
    const container = document.getElementById('columnSelection');
    const allColumns = Object.keys(appState.trainingData[0]);
    
    let html = '<div class="info">Configure your columns:</div>';
    
    // Section 1: Select ID column with exclusion checkboxes on same row
    html += '<div class="mapping-column">';
    html += '<h3>Step 2a: Select ID column and mark columns to exclude</h3>';
    html += '<p style="color: #666; margin-bottom: 15px;">Select ONE column as ID (or create new), and check any columns to exclude from analysis</p>';
    html += '<div class="column-type-options">';
    
    // Option to create new ID
    html += `
        <label class="radio-option" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center;">
                <input type="radio" name="id_column" value="_create_new_" checked style="margin-right: 10px;" />
                <span><strong>Create new ID column</strong> (recommended if no ID exists)</span>
            </div>
            <span style="color: #999; font-size: 0.9em;">N/A</span>
        </label>
    `;
    
    // Options for existing columns with exclude checkbox
    allColumns.forEach(col => {
        html += `
            <label class="radio-option" style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                    <input type="radio" name="id_column" value="${col}" style="margin-right: 10px;" />
                    <span>${col}</span>
                </div>
                <label style="margin: 0; display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" class="exclude-column" value="${col}" style="margin-right: 5px;" />
                    <span style="font-size: 0.9em;">Exclude</span>
                </label>
            </label>
        `;
    });
    
    html += '</div></div>';
    
    // Section 2: Select result column
    html += '<div class="mapping-column">';
    html += '<h3>Step 2b: Select the RESULT column (what you want to predict)</h3>';
    html += '<p style="color: #666; margin-bottom: 15px;">This is the target/output column</p>';
    html += '<select id="resultColumnSelect" class="column-type" style="width: 100%; max-width: 400px;">';
    html += '<option value="">-- Select Result Column --</option>';
    
    allColumns.forEach(col => {
        html += `<option value="${col}">${col}</option>`;
    });
    
    html += '</select></div>';
    
    container.innerHTML = html;
    
    // Always show "Load Saved Configuration" button
    const loadConfigBtn = document.getElementById('loadConfig');
    loadConfigBtn.classList.remove('hidden');
    
    // If config exists, highlight the button with blue background
    if (Storage.hasConfigCache()) {
        loadConfigBtn.style.backgroundColor = '#6f42c1';
        loadConfigBtn.style.color = '#ffffff';
    } else {
        loadConfigBtn.style.backgroundColor = '';
        loadConfigBtn.style.color = '';
    }
    
    document.getElementById('nextToColumnTypes').classList.remove('hidden');
}

// Select result column
function selectResultColumn() {
    const select = document.getElementById('resultColumnSelect');
    if (!select || !select.value) {
        alert('Please select a result column');
        return false;
    }
    
    const resultColumn = select.value;
    const allColumns = Object.keys(appState.trainingData[0]);
    
    // Get selected ID column
    const idColumnRadio = document.querySelector('input[name="id_column"]:checked');
    if (!idColumnRadio) {
        alert('Please select an ID column option');
        return false;
    }
    
    const idColumnValue = idColumnRadio.value;
    
    // Get excluded columns
    const excludedColumns = [];
    document.querySelectorAll('.exclude-column:checked').forEach(checkbox => {
        excludedColumns.push(checkbox.value);
    });
    
    console.log('ID column:', idColumnValue);
    console.log('Excluded columns:', excludedColumns);
    console.log('Result column:', resultColumn);
    
    // Validation: Check if result column is selected as ID
    if (idColumnValue === resultColumn) {
        alert('The result column cannot be used as the ID column. Please select a different ID column.');
        return false;
    }
    
    // Validation: Check if result column is excluded
    if (excludedColumns.includes(resultColumn)) {
        alert('The result column cannot be excluded. Please uncheck it from the exclusion list.');
        return false;
    }
    
    // Validation: Check if ID column is excluded
    if (idColumnValue !== '_create_new_' && excludedColumns.includes(idColumnValue)) {
        alert(`The ID column "${idColumnValue}" cannot also be excluded. Please uncheck it from the exclusion list.`);
        return false;
    }
    
    // Handle ID column
    if (idColumnValue === '_create_new_') {
        // Create new row_id
        console.log('Creating new row_id column');
        appState.trainingData = appState.trainingData.map((row, index) => ({
            row_id: index + 1,
            ...row
        }));
    } else {
        // Use selected column as row_id
        console.log(`Using "${idColumnValue}" as row_id`);
        appState.trainingData = appState.trainingData.map(row => {
            const newRow = { row_id: row[idColumnValue] };
            Object.keys(row).forEach(key => {
                if (key !== idColumnValue) {
                    newRow[key] = row[key];
                }
            });
            return newRow;
        });
    }
    
    // Feature columns = all columns except result, ID column, and excluded columns
    const columnsToRemove = [resultColumn];
    if (idColumnValue !== '_create_new_') {
        columnsToRemove.push(idColumnValue);
    }
    excludedColumns.forEach(col => {
        if (!columnsToRemove.includes(col)) {
            columnsToRemove.push(col);
        }
    });
    
    const featureColumns = allColumns.filter(col => !columnsToRemove.includes(col));
    
    if (featureColumns.length === 0) {
        alert('No feature columns available. You need at least one column for features.\n\nCurrent configuration removes all columns:\n- Result: ' + resultColumn + '\n- ID: ' + idColumnValue + '\n- Excluded: ' + excludedColumns.join(', '));
        return false;
    }
    
    appState.resultColumn = resultColumn;
    appState.featureColumns = featureColumns;
    appState.originalIdColumn = idColumnValue;
    appState.excludedColumns = excludedColumns;
    
    console.log('Final feature columns:', featureColumns);
    
    return true;
}

// Show column types UI
function showColumnTypes() {
    const container = document.getElementById('columnTypes');
    
    let html = '<div class="info">For each FEATURE column, specify if it contains numbers or categories:</div>';
    
    appState.featureColumns.forEach(col => {
        html += `
            <div class="mapping-column">
                <h3>${col}</h3>
                <div class="column-type-options">
                    <label class="radio-option">
                        <input type="radio" name="type_${col}" value="categorical" class="column-type-radio" data-column="${col}" checked>
                        <span>Categorical (categories like low/medium/high)</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="type_${col}" value="numeric" class="column-type-radio" data-column="${col}">
                        <span>Numeric (numbers like age, weight, count)</span>
                    </label>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById('nextToMapping').classList.remove('hidden');
}

// Extract column types
function extractColumnTypes() {
    const columnTypes = {};
    
    appState.featureColumns.forEach(col => {
        const selected = document.querySelector(`input[name="type_${col}"]:checked`);
        if (selected) {
            columnTypes[col] = selected.value;
        }
    });
    
    appState.columnTypes = columnTypes;
    
    // Now create the mapping form with proper types
    CellMappingUI.createForm(
        appState.trainingData,
        appState.featureColumns,
        appState.resultColumn,
        appState.columnTypes
    );
    
    return true;
}

// Handle model training
async function handleTrainModels() {
    try {
        displayInfo('Extracting cell mapping...');
        
        // If we have cellMapping in appState (from loaded config), use it directly
        // Otherwise extract from form
        let cellMapping;
        if (appState.cellMapping && Object.keys(appState.cellMapping).length > 1) {
            console.log('📊 Using cellMapping from appState (loaded config)');
            cellMapping = appState.cellMapping;
        } else {
            console.log('📊 Extracting cellMapping from form');
            cellMapping = CellMappingUI.extractMapping();
        }
        
        console.log('📊 CellMapping for training:', cellMapping);
        console.log('📊 Feature columns:', appState.featureColumns);
        console.log('📊 Checking cellMapping structure:');
        appState.featureColumns.forEach((col, i) => {
            const cName = `C${i + 1}`;
            console.log(`  ${cName} (${col}):`, cellMapping[cName]);
        });
        
        // Clean data before training
        displayInfo('Cleaning data...');
        const { data: cleanedData, stats } = DataCleaner.cleanTraining(
            appState.trainingData,
            appState.featureColumns,
            appState.resultColumn
        );
        
        displaySuccess(`Data cleaned: ${stats.initial} → ${stats.final} rows (removed ${stats.blanks} blanks, ${stats.duplicates} duplicates)`);
        
        // Save cleaned data
        appState.trainingData = cleanedData;
        Storage.save(Storage.KEYS.TRAINING_DATA, cleanedData);
        Storage.save(Storage.KEYS.FEATURE_COLUMNS, appState.featureColumns);
        Storage.save(Storage.KEYS.RESULT_COLUMN, appState.resultColumn);
        Storage.save(Storage.KEYS.COLUMN_TYPES, appState.columnTypes);
        
        displayInfo('Training models... This may take a moment.');
        
        // Train models (use setTimeout to allow UI to update)
        setTimeout(() => {
            try {
                const trainedModels = ModelTrainer.trainAll(
                    cleanedData,
                    cellMapping,
                    appState.featureColumns,
                    appState.resultColumn
                );
                
                // Save to state and storage
                appState.cellMapping = cellMapping;
                appState.trainedModels = trainedModels;
                
                Storage.save(Storage.KEYS.CELL_MAPPING, cellMapping);
                Storage.save(Storage.KEYS.TRAINED_MODELS, trainedModels);
                
                displaySuccess('Models trained successfully!');
                
                // Display results
                ResultsDisplay.displayTraining(
                    trainedModels,
                    cleanedData,
                    cellMapping,
                    appState.featureColumns,
                    appState.resultColumn
                );
                
                showStep(5);
                
            } catch (error) {
                displayError('Error training models: ' + error.message);
                console.error(error);
            }
        }, 100);
        
    } catch (error) {
        displayError('Error with cell mapping: ' + error.message);
    }
}

// Handle test data upload
async function handleTestUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        displayInfo('Parsing test CSV file...');
        const data = await CSVParser.parse(file);
        
        if (data.length === 0) {
            throw new Error('CSV file is empty');
        }
        
        // Show preview
        displayDataPreview(data, 'testPreview');
        
        // Clean test data
        displayInfo('Cleaning test data...');
        const { data: cleanedData, stats } = DataCleaner.cleanTest(
            data,
            appState.trainingData,
            appState.cellMapping,
            appState.featureColumns,
            appState.resultColumn
        );
        
        displaySuccess(`Test data cleaned: ${stats.initial} → ${stats.final} rows`);
        
        appState.testData = cleanedData;
        document.getElementById('makePredictions').classList.remove('hidden');
        
    } catch (error) {
        displayError('Error loading test data: ' + error.message);
    }
}

// Handle making predictions
async function handleMakePredictions() {
    try {
        displayInfo('Making predictions...');
        
        // Validate that we have all required data
        if (!appState.testData) {
            throw new Error('No test data loaded');
        }
        
        if (!appState.trainedModels) {
            throw new Error('No trained models found. Please train models first.');
        }
        
        if (!appState.cellMapping) {
            throw new Error('No cell mapping found. Please train models first.');
        }
        
        if (!appState.featureColumns || !appState.resultColumn) {
            throw new Error('Column configuration missing. Please train models first.');
        }
        
        console.log('Prediction inputs:');
        console.log('- Test data rows:', appState.testData.length);
        console.log('- Feature columns:', appState.featureColumns);
        console.log('- Result column:', appState.resultColumn);
        console.log('- Models available:', Object.keys(appState.trainedModels));
        
        setTimeout(() => {
            try {
                const predictions = ModelPredictor.predictAll(
                    appState.testData,
                    appState.trainedModels,
                    appState.cellMapping,
                    appState.featureColumns,
                    appState.resultColumn
                );
                
                displaySuccess('Predictions complete!');
                
                ResultsDisplay.displayPredictions(
                    predictions,
                    appState.testData,
                    appState.cellMapping,
                    appState.featureColumns,
                    appState.resultColumn
                );
                
            } catch (error) {
                displayError('Error making predictions: ' + error.message);
                console.error(error);
            }
        }, 100);
        
    } catch (error) {
        displayError('Error: ' + error.message);
    }
}

// Utility functions
function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'));
    document.getElementById(`step${stepNumber}`).classList.remove('hidden');
    
    // Special handling for Step 6: Keep Step 5 visible but collapsed
    if (stepNumber === 6) {
        const step5 = document.getElementById('step5');
        step5.classList.remove('hidden');
        
        // Add collapse functionality if not already added
        if (!document.getElementById('toggleTrainingResults')) {
            const trainingResults = document.getElementById('trainingResults');
            const nextButton = document.getElementById('nextToPredict');
            
            // Create toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'toggleTrainingResults';
            toggleBtn.className = 'btn btn-secondary';
            toggleBtn.textContent = 'Hide Previous Training Results';
            toggleBtn.style.marginBottom = '15px';
            
            // Insert button before training results
            trainingResults.parentNode.insertBefore(toggleBtn, trainingResults);
            
            // Hide training results by default
            trainingResults.style.display = 'none';
            nextButton.style.display = 'none';
            toggleBtn.textContent = 'Show Previous Training Results';
            
            // Add click handler
            toggleBtn.addEventListener('click', () => {
                if (trainingResults.style.display === 'none') {
                    trainingResults.style.display = 'block';
                    nextButton.style.display = 'block';
                    toggleBtn.textContent = 'Hide Previous Training Results';
                } else {
                    trainingResults.style.display = 'none';
                    nextButton.style.display = 'none';
                    toggleBtn.textContent = 'Show Previous Training Results';
                }
            });
        } else {
            // Button already exists, just make sure Step 5 is visible
            const trainingResults = document.getElementById('trainingResults');
            const nextButton = document.getElementById('nextToPredict');
            trainingResults.style.display = 'none';
            nextButton.style.display = 'none';
            document.getElementById('toggleTrainingResults').textContent = 'Show Previous Training Results';
        }
    }
}

function displayDataPreview(data, containerId) {
    const container = document.getElementById(containerId);
    const preview = data.slice(0, 5);
    const columns = Object.keys(preview[0]);
    
    let html = `<p>Showing first 5 of ${data.length} rows</p>`;
    html += '<table><thead><tr>';
    columns.forEach(col => html += `<th>${col}</th>`);
    html += '</tr></thead><tbody>';
    
    preview.forEach(row => {
        html += '<tr>';
        columns.forEach(col => html += `<td>${row[col]}</td>`);
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    container.classList.remove('hidden');
}

function displayInfo(message) {
    console.log('INFO:', message);
}

function displaySuccess(message) {
    console.log('SUCCESS:', message);
}

function displayError(message) {
    console.error('ERROR:', message);
    alert('Error: ' + message);
}

function handleClearCache() {
    if (confirm('Clear training data and models? (Configuration will be preserved)')) {
        // Clear everything except config cache
        Storage.save(Storage.KEYS.TRAINING_DATA, null);
        Storage.save(Storage.KEYS.CELL_MAPPING, null);
        Storage.save(Storage.KEYS.TRAINED_MODELS, null);
        Storage.save(Storage.KEYS.FEATURE_COLUMNS, null);
        Storage.save(Storage.KEYS.RESULT_COLUMN, null);
        Storage.save(Storage.KEYS.COLUMN_TYPES, null);
        // Note: CONFIG_CACHE is preserved
        location.reload();
    }
}

// Handle save configuration
function handleSaveConfig() {
    try {
        // Check if we have the necessary data from steps 2-3
        if (!appState.resultColumn || !appState.featureColumns || !appState.columnTypes) {
            alert('Please complete steps 2-3 (select columns and define types) before saving configuration.');
            return;
        }

        // Extract cell mapping from the current form
        let cellMapping;
        try {
            cellMapping = CellMappingUI.extractMapping();
            console.log('📝 Extracted cellMapping:', JSON.stringify(cellMapping, null, 2));
            
            // Validate that all feature columns have mappings
            const missingMappings = [];
            appState.featureColumns.forEach((col, i) => {
                const cName = `C${i + 1}`;
                if (!cellMapping[cName]) {
                    missingMappings.push(`${cName} (${col})`);
                }
            });
            
            // Also check result column
            const resultCName = `C${appState.featureColumns.length + 1}`;
            if (!cellMapping[resultCName]) {
                missingMappings.push(`${resultCName} (${appState.resultColumn})`);
            }
            
            if (missingMappings.length > 0) {
                throw new Error(`Missing mappings for: ${missingMappings.join(', ')}`);
            }
            
            console.log('✅ All mappings present');
        } catch (error) {
            alert('Please complete all mapping fields in Step 4 before saving.\n\nError: ' + error.message);
            console.error('❌ Extract mapping error:', error);
            return;
        }

        const config = {
            resultColumn: appState.resultColumn,
            featureColumns: appState.featureColumns,
            columnTypes: appState.columnTypes,
            cellMapping: cellMapping
        };

        console.log('💾 Saving config:', JSON.stringify(config, null, 2));
        const success = Storage.saveConfigCache(config);
        
        if (success) {
            console.log('✅ Config saved successfully to localStorage');
            
            // Verify what was saved
            const saved = Storage.loadConfigCache();
            console.log('🔍 Verification - loaded back:', JSON.stringify(saved, null, 2));
            
            alert('✅ Configuration saved successfully!\n\nYou can now load it when working with CSV files that have the same column structure.');
        } else {
            console.error('❌ Failed to save config');
            alert('Failed to save configuration. Please try again.');
        }
    } catch (error) {
        console.error('❌ Error in handleSaveConfig:', error);
        alert('Error saving configuration: ' + error.message);
        console.error(error);
    }
}

// Handle load cached configuration
function handleLoadConfig() {
    try {
        // Check if we have training data loaded
        if (!appState.trainingData) {
            alert('Please upload a CSV file first (Step 1).');
            return;
        }

        // Load cached config
        const cachedConfig = Storage.loadConfigCache();
        console.log('📂 Loaded config from localStorage:', cachedConfig);
        
        if (!cachedConfig) {
            alert('No saved configuration found.\n\nTo save a configuration:\n1. Complete Steps 2-4 (define columns and mappings)\n2. Click "Save Configuration" button in Step 4\n\nThe saved configuration can then be loaded for future CSV files with the same structure.');
            return;
        }

        console.log('📂 Config cellMapping:', cachedConfig.cellMapping);
        console.log('📂 Exponents enabled:', cachedConfig.cellMapping._exponentsEnabled);

        // Validate cached config against current CSV
        const validation = Storage.validateConfigCache(appState.trainingData, cachedConfig);
        console.log('✔️ Validation result:', validation);
        
        if (!validation.valid) {
            alert(`Cannot load saved configuration:\n\n${validation.reason}\n\nThe saved configuration does not match your CSV file structure.\n\nSaved configuration expects:\n- Result column: ${cachedConfig.resultColumn}\n- Feature columns: ${cachedConfig.featureColumns.join(', ')}\n\nYour CSV has columns: ${Object.keys(appState.trainingData[0]).filter(c => c !== 'row_id').join(', ')}\n\nPlease configure manually or use a CSV with matching columns.`);
            return;
        }

        // Apply cached configuration
        appState.resultColumn = cachedConfig.resultColumn;
        appState.featureColumns = cachedConfig.featureColumns;
        appState.columnTypes = cachedConfig.columnTypes;
        appState.cellMapping = cachedConfig.cellMapping;

        console.log('📥 Applied to appState:', {
            resultColumn: appState.resultColumn,
            featureColumns: appState.featureColumns,
            columnTypes: appState.columnTypes,
            cellMapping: appState.cellMapping
        });

        // Save to storage
        Storage.save(Storage.KEYS.FEATURE_COLUMNS, appState.featureColumns);
        Storage.save(Storage.KEYS.RESULT_COLUMN, appState.resultColumn);
        Storage.save(Storage.KEYS.COLUMN_TYPES, appState.columnTypes);
        Storage.save(Storage.KEYS.CELL_MAPPING, appState.cellMapping);

        alert(`✅ Configuration loaded successfully!\n\nResult column: ${cachedConfig.resultColumn}\nFeature columns: ${cachedConfig.featureColumns.join(', ')}\n\nYou can now skip to Step 4 and click "Train Models".`);

        // Show step 4 with the loaded configuration
        console.log('🎨 Creating form...');
        CellMappingUI.createForm(
            appState.trainingData,
            appState.featureColumns,
            appState.resultColumn,
            appState.columnTypes
        );
        
        // Pre-fill the mapping form with cached values (use setTimeout to ensure form is rendered)
        console.log('⏱️ Scheduling applyMapping...');
        setTimeout(() => {
            console.log('🎨 Applying mapping to form...');
            CellMappingUI.applyMapping(appState.cellMapping);
            console.log('✅ Mapping applied');
        }, 100);
        
        showStep(4);

    } catch (error) {
        console.error('❌ Error in handleLoadConfig:', error);
        displayError('Error loading configuration: ' + error.message);
        console.error(error);
    }
}


// Handle download sample data
async function handleDownloadSampleData() {
    // Embedded sample data
    const sampleData = {
        'cat_num_data.csv': `row_id;odżywianie;spanie;stres;relacje;praca;nadwaga
0;mało;dużo;mało;dużo;średnio;chudy
1;mało;średnio;mało;mało;mało;chudy
2;średnio;średnio;mało;średnio;średnio;chudy
3;mało;średnio;mało;średnio;dużo;chudy
4;mało;mało;średnio;mało;mało;chudy
5;mało;dużo;mało;mało;mało;chudy
6;mało;mało;średnio;średnio;dużo;chudy
7;średnio;dużo;średnio;dużo;mało;chudy
8;mało;mało;dużo;mało;dużo;przeciętny
9;średnio;mało;dużo;mało;średnio;przeciętny
10;dużo;dużo;dużo;mało;średnio;gruby
11;średnio;mało;średnio;mało;średnio;przeciętny
12;mało;dużo;mało;dużo;mało;chudy
13;dużo;mało;średnio;średnio;mało;przeciętny
14;mało;średnio;średnio;mało;mało;chudy
15;dużo;mało;średnio;dużo;mało;przeciętny
16;średnio;średnio;średnio;mało;średnio;przeciętny
17;dużo;mało;dużo;dużo;dużo;gruby
18;średnio;mało;mało;mało;mało;chudy
19;średnio;dużo;mało;dużo;średnio;chudy
20;dużo;dużo;dużo;dużo;dużo;przeciętny
21;średnio;średnio;mało;dużo;średnio;przeciętny
22;średnio;dużo;mało;dużo;mało;chudy
23;średnio;średnio;dużo;średnio;dużo;przeciętny
24;średnio;mało;średnio;dużo;dużo;przeciętny
25;średnio;mało;średnio;dużo;średnio;przeciętny
26;mało;dużo;mało;średnio;mało;chudy
27;dużo;średnio;mało;średnio;średnio;przeciętny
28;dużo;mało;mało;średnio;dużo;przeciętny
29;średnio;mało;dużo;mało;dużo;przeciętny
30;średnio;dużo;mało;średnio;mało;chudy
31;dużo;dużo;mało;dużo;mało;chudy
32;mało;średnio;mało;dużo;dużo;chudy
33;mało;dużo;mało;dużo;dużo;chudy
34;średnio;mało;dużo;średnio;średnio;przeciętny
35;średnio;dużo;mało;średnio;dużo;przeciętny
36;dużo;mało;dużo;średnio;dużo;gruby
37;dużo;średnio;mało;dużo;dużo;przeciętny
38;mało;średnio;mało;dużo;średnio;chudy
39;mało;dużo;mało;średnio;średnio;chudy
40;dużo;mało;dużo;dużo;średnio;przeciętny
41;średnio;średnio;średnio;średnio;mało;przeciętny
42;średnio;dużo;średnio;dużo;średnio;przeciętny
43;dużo;mało;dużo;mało;dużo;gruby
44;dużo;mało;średnio;średnio;średnio;przeciętny
45;średnio;dużo;dużo;średnio;dużo;przeciętny`,
        
        'cat_test_data.csv': `row_id;odżywianie;spanie;stres;relacje;praca;nadwaga
0;dużo;średnio;dużo;mało;dużo;gruby
1;dużo;mało;średnio;średnio;dużo;przeciętny
2;średnio;mało;mało;dużo;dużo;chudy
3;dużo;mało;dużo;dużo;dużo;gruby
4;średnio;mało;dużo;mało;dużo;gruby
5;dużo;mało;dużo;mało;dużo;gruby
6;dużo;mało;średnio;mało;dużo;gruby
7;średnio;średnio;mało;dużo;średnio;przeciętny
8;średnio;dużo;mało;dużo;mało;chudy
9;średnio;średnio;dużo;średnio;dużo;przeciętny`,
        
        'num_raw_data.csv': `row_id;budżet;zrealizowanezadania;liczbaeskalacji;wyniki
0;50000;120;2;słabe
1;60000;240;2;przeciętne
2;55000;290;2;dobre
3;58000;160;3;słabe
4;55000;180;2;przeciętne
5;70000;200;3;słabe
6;80000;400;2;dobre
7;33000;300;1;dobre
8;60000;100;1;słabe
9;40000;180;1;dobre
10;40000;100;2;słabe
11;40000;90;3;słabe
12;40000;200;1;dobre
13;40000;320;1;dobre
14;80000;320;2;przeciętne
15;60000;100;3;słabe
16;80000;300;2;przeciętne
17;20000;320;1;dobre
18;80000;400;1;dobre`,
        
        'num_test_data.csv': `row_id;budżet;zrealizowanezadania;liczbaeskalacji;wyniki
0;48000;140;2;słabe
1;57000;230;2;przeciętne
2;53000;280;2;dobre
3;56000;220;1;przeciętne
4;57000;360;2;dobre`
    };
    
    const files = [
        { name: 'cat_num_data.csv', desc: 'Classification dataset (categorical + numeric) - Training' },
        { name: 'cat_test_data.csv', desc: 'Classification dataset - Test data' },
        { name: 'num_raw_data.csv', desc: 'Numeric dataset - Training' },
        { name: 'num_test_data.csv', desc: 'Numeric dataset - Test data' }
    ];
    
    // Create instructions modal
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background: white; padding: 30px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;';
    
    let html = '<h2 style="margin-top: 0;">📥 Sample Data</h2>';
    html += '<p>Copy CSV data to clipboard, then paste into a text editor and save as .csv file:</p>';
    html += '<div style="margin: 20px 0;">';
    
    files.forEach(file => {
        html += `
            <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                <strong>${file.name}</strong><br>
                <small style="color: #666;">${file.desc}</small><br>
                <button class="btn btn-primary" style="margin-top: 10px; font-size: 0.9em;" onclick="copyToClipboard('${file.name}')">📋 Copy to Clipboard</button>
            </div>
        `;
    });
    
    html += '</div>';
    html += '<h3>📖 Quick Start:</h3>';
    html += '<ol style="line-height: 1.8; font-size: 0.9em;">';
    html += '<li>Click "Copy to Clipboard" for a training file</li>';
    html += '<li>Paste into text editor and save as .csv</li>';
    html += '<li>Upload the file in Step 1</li>';
    html += '<li>Repeat for test data in Step 6</li>';
    html += '</ol>';
    html += '<button class="btn btn-secondary" style="margin-top: 20px;" onclick="this.closest(\'div[style*=fixed]\').remove()">Close</button>';
    
    content.innerHTML = html;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Make sample data available globally for copy function
    window.sampleData = sampleData;
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Copy to clipboard helper
window.copyToClipboard = async function(filename) {
    const button = event.target;
    const originalText = button.textContent;
    const originalColor = button.style.backgroundColor;
    
    try {
        const data = window.sampleData[filename];
        await navigator.clipboard.writeText(data);
        
        // Visual feedback
        button.textContent = '✓ Copied!';
        button.style.backgroundColor = '#28a745';
        displaySuccess(`Copied ${filename} to clipboard! Paste into a text editor and save as .csv`);
        
        // Reset button after 2 seconds
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = originalColor;
        }, 2000);
    } catch (error) {
        button.textContent = '✗ Failed';
        button.style.backgroundColor = '#dc3545';
        displayError(`Failed to copy: ${error.message}`);
        
        // Reset button after 2 seconds
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = originalColor;
        }, 2000);
    }
};