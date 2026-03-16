# KAPA Data Classification Engine

A browser-based machine learning application for training and predicting classification models.

## Features

- **Client-Side Processing**: All data processing happens in your browser - no server required
- **Multiple Models**: Train 3 regression models (Simple, Interactions, Polynomial)
- **Experimental Mode**: Dual-exponent exploration with 19 exploration values
- **Feature Importance**: Exponent-based feature weighting and ablation testing
- **Export Options**: Download predictions as CSV, generate Excel formulas and C# code
- **Sample Data**: Built-in sample datasets for testing

## Quick Start

1. Open `index.html` in a web browser
2. Click "📥 Download Sample Data" to get example CSV files
3. Upload training data in Step 1
4. Configure column mappings in Steps 2-4
5. Train models in Step 5
6. Upload test data and make predictions in Step 6

## Deployment

### GitHub Pages
1. Push this folder to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Select the branch and root folder
4. Access at `https://username.github.io/repository-name/`

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in this directory
3. Follow the prompts
4. Access at the provided URL

### Local Server
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000`

## Browser Requirements

- Modern browser with ES6 support
- JavaScript enabled
- Clipboard API support (for sample data copy)

## Technology Stack

- Pure JavaScript (no frameworks)
- PapaParse for CSV parsing
- Math.js for matrix operations
- Client-side only - no backend required

## License

Owner: piotrpeciak@o2.pl

All rights reserved.
