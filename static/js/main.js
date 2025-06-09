document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Set dark theme as default
    document.body.setAttribute('data-theme', 'dark');
    const themeToggleIcon = document.querySelector('.theme-toggle i');
    if (themeToggleIcon) {
        themeToggleIcon.className = 'fas fa-sun'; // Change icon to sun for dark theme
    }

    // DOM elements
    const themeToggle = document.querySelector('.theme-toggle');
    const fileUpload = document.getElementById('file-upload');
    const uploadContainer = document.getElementById('upload-container');
    const uploadInner = document.getElementById('upload-inner');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const changeImageBtn = document.getElementById('change-image');
    const analyzeBtn = document.getElementById('analyze-button');
    const resultsContainer = document.getElementById('results-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const modelSelect = document.getElementById('model-select');
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    // Theme toggle
    themeToggle.addEventListener('click', function() {
        document.body.setAttribute('data-theme', 
            document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        themeToggle.querySelector('i').className = 
            document.body.getAttribute('data-theme') === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
    
    // File upload handling
    fileUpload.addEventListener('change', handleFileSelect);
    
    // Drag and drop handling
    uploadContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadContainer.classList.add('drag-over');
    });
    
    uploadContainer.addEventListener('dragleave', function() {
        uploadContainer.classList.remove('drag-over');
    });
    
    uploadContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadContainer.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length) {
            // Assign the dropped files to the file input
            fileUpload.files = e.dataTransfer.files;
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // Change image button
    changeImageBtn.addEventListener('click', function() {
        previewContainer.style.display = 'none';
        uploadInner.style.display = 'flex';
        analyzeBtn.disabled = true;
        fileUpload.value = ''; // Clear the file input
    });
    
    // Analyze button
    analyzeBtn.addEventListener('click', analyzeImage);
    
    // Model selection
    modelSelect.addEventListener('change', function() {
        statusIndicator.style.backgroundColor = 'var(--warning)';
        statusText.textContent = 'Loading...';
        
        // Simulate model loading
        setTimeout(() => {
            statusIndicator.style.backgroundColor = 'var(--success)';
            statusText.textContent = 'Ready';
        }, 1000);
    });
    
    // Handle file selection
    function handleFileSelect(e) {
        handleFiles(this.files);
    }
    
    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        if (!file.type.match('image.*')) {
            alert('Please select an image file (JPG, PNG, or BMP)');
            // Clear the file input if an invalid file type is selected
            fileUpload.value = ''; 
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            uploadInner.style.display = 'none';
            previewContainer.style.display = 'block';
            analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }
    
    // Analyze image
    function analyzeImage() {
        // Show loading overlay
        loadingOverlay.classList.add('active');
        
        // Get the selected model
        const selectedModel = modelSelect.value;
        
        // Create form data
        const formData = new FormData();
        formData.append('model', selectedModel);
        
        // Get file from input
        const fileInput = document.getElementById('file-upload');
        if (fileInput.files.length === 0) {
            alert('Please select an image first');
            loadingOverlay.classList.remove('active');
            return;
        }
        
        formData.append('file', fileInput.files[0]);
        
        // Send request to backend
        fetch('/api/classify', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading overlay
            loadingOverlay.classList.remove('active');
            
            // Display results
            displayResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            loadingOverlay.classList.remove('active');
            alert('An error occurred during analysis. Please try again.');
        });
    }
    
    // Display results
    function displayResults(data) {
        // Clear previous results
        resultsContainer.innerHTML = '';
        
        if (data.error) {
            resultsContainer.innerHTML = `
                <div class="placeholder-message">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                    <p>Error: ${data.error}</p>
                </div>
            `;
            return;
        }
        
        // Add model info
        const modelInfo = document.createElement('div');
        modelInfo.className = 'model-info slide-in';
        modelInfo.innerHTML = `
            <p><strong>Model:</strong> ${data.model}</p>
            <p><strong>Time:</strong> ${data.timestamp}</p>
        `;
        resultsContainer.appendChild(modelInfo);
        
        // Add predictions
        data.predictions.forEach((prediction, index) => {
            const predictionEl = document.createElement('div');
            predictionEl.className = 'prediction-item slide-in';
            predictionEl.style.animationDelay = `${index * 0.1}s`;
            
            predictionEl.innerHTML = `
                <div class="prediction-header">
                    <div class="prediction-rank">${prediction.rank}</div>
                    <div class="prediction-confidence">${(prediction.confidence * 100).toFixed(1)}%</div>
                </div>
                <div class="prediction-name">${prediction.class_name}</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${prediction.confidence * 100}%;"></div>
                </div>
            `;
            
            resultsContainer.appendChild(predictionEl);
        });
    }
});