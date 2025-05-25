// Utility function for FFmpeg
let toBlobURL;

// Initialize toBlobURL when FFmpegUtil is available
function initializeFFmpegUtil() {
    if (typeof FFmpegUtil !== 'undefined' && FFmpegUtil.toBlobURL) {
        toBlobURL = FFmpegUtil.toBlobURL;
        console.log('FFmpeg utilities initialized successfully');
        return true;
    }
    return false;
}

// Try to initialize immediately
if (!initializeFFmpegUtil()) {
    // If not available, wait for it to load
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = setInterval(() => {
        attempts++;
        if (initializeFFmpegUtil()) {
            clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('FFmpeg utilities failed to load after multiple attempts');
        }
    }, 500);
}

class VideoCompressor {
    constructor() {
        this.ffmpeg = null;
        this.currentFile = null;
        this.isProcessing = false;
        this.targetSize = null;
        this.dragCounter = 0;
        this.videoUrl = null;
        this.compressedVideoUrl = null;
        this.offlineMode = false;
        
        console.log('VideoCompressor constructor called');
        
        try {
            this.initializeElements();
            this.setupEventListeners();
            this.loadFFmpeg();
            console.log('VideoCompressor initialization completed');
        } catch (error) {
            console.error('Error during VideoCompressor initialization:', error);
            this.showError('Failed to initialize the video compressor. Please refresh the page.');
        }
    }

    initializeElements() {
        // Get all DOM elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.uploadSection = document.getElementById('uploadSection');
        this.processingSection = document.getElementById('processingSection');
        this.videoInfo = document.getElementById('videoInfo');
        this.videoPreview = document.getElementById('videoPreview');
        this.compressedVideoPreview = document.getElementById('compressedVideoPreview');
        this.compressedPreviewContainer = document.getElementById('compressedPreviewContainer');
        this.videoComparison = document.querySelector('.video-comparison');
        this.originalStats = document.getElementById('originalStats');
        this.compressedStats = document.getElementById('compressedStats');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.resultSection = document.getElementById('resultSection');
        this.originalSize = document.getElementById('originalSize');
        this.compressedSize = document.getElementById('compressedSize');
        this.reduction = document.getElementById('reduction');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.optionBtns = document.querySelectorAll('.option-btn');
        this.dragOverlay = document.getElementById('dragOverlay');
        
        console.log('Elements initialized:', {
            uploadBtn: !!this.uploadBtn,
            fileInput: !!this.fileInput,
            videoPreview: !!this.videoPreview,
            compressedVideoPreview: !!this.compressedVideoPreview,
            dragOverlay: !!this.dragOverlay,
            processingSection: !!this.processingSection
        });
    }

    setupEventListeners() {        
        console.log('Setting up event listeners...');
        
        // File input
        this.fileInput.addEventListener('change', (e) => {
            console.log('File input changed:', e.target.files);
            this.handleFileSelect(e);
        });
        
        // Upload button
        this.uploadBtn.addEventListener('click', (e) => {
            console.log('Upload button clicked');
            e.preventDefault();
            this.fileInput.click();
        });
        
        // Upload area drag and drop (local)
        this.uploadArea.addEventListener('click', (e) => {
            console.log('Upload area clicked');
            if (e.target !== this.uploadBtn && !this.uploadBtn.contains(e.target)) {
                this.fileInput.click();
            }
        });
        this.uploadArea.addEventListener('dragover', (e) => this.handleLocalDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleLocalDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Document-level drag and drop (full screen)
        document.addEventListener('dragenter', (e) => this.handleDocumentDragEnter(e));
        document.addEventListener('dragover', (e) => this.handleDocumentDragOver(e));
        document.addEventListener('dragleave', (e) => this.handleDocumentDragLeave(e));
        document.addEventListener('drop', (e) => this.handleDocumentDrop(e));
        
        // Compression options
        this.optionBtns.forEach(btn => {
            btn.addEventListener('click', () => this.selectOption(btn));
        });
        
        // Control buttons
        this.cancelBtn.addEventListener('click', () => this.cancelProcessing());
        this.downloadBtn.addEventListener('click', () => this.downloadResult());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        console.log('Event listeners set up successfully');
    }

    // Document-level drag handlers (full screen)
    handleDocumentDragEnter(e) {
        e.preventDefault();
        this.dragCounter++;
        console.log('Document drag enter, counter:', this.dragCounter);
        
        if (this.hasValidFiles(e.dataTransfer)) {
            console.log('Valid files detected, showing overlay');
            this.dragOverlay.classList.add('active');
        }
    }

    handleDocumentDragOver(e) {
        e.preventDefault();
        if (this.hasValidFiles(e.dataTransfer)) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }

    handleDocumentDragLeave(e) {
        e.preventDefault();
        this.dragCounter--;
        
        if (this.dragCounter <= 0) {
            this.dragCounter = 0;
            this.dragOverlay.classList.remove('active');
        }
    }

    handleDocumentDrop(e) {
        e.preventDefault();
        this.dragCounter = 0;
        this.dragOverlay.classList.remove('active');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    // Local upload area drag handlers
    handleLocalDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleLocalDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    // Check if dragged items contain valid video files
    hasValidFiles(dataTransfer) {
        if (dataTransfer && dataTransfer.items) {
            for (let item of dataTransfer.items) {
                if (item.kind === 'file' && item.type.startsWith('video/')) {
                    return true;
                }
            }
        }
        return false;
    }

    async loadFFmpeg() {
        try {
            console.log('Loading FFmpeg...');
            
            // Check if FFmpeg is available
            if (typeof FFmpeg === 'undefined') {
                throw new Error('FFmpeg library not loaded - please check your internet connection');
            }
            
            // Check if toBlobURL is available
            if (!toBlobURL) {
                // Try to initialize it again
                if (!initializeFFmpegUtil()) {
                    throw new Error('FFmpeg utilities not available - please refresh the page');
                }
            }
            
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            this.ffmpeg = new FFmpeg();
            
            this.ffmpeg.on('log', ({ message }) => {
                console.log(message);
                if (message.includes('frame=')) {
                    this.parseProgressFromLog(message);
                }
            });

            console.log('Loading FFmpeg core files...');
            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            console.log('FFmpeg loaded successfully');
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            
            // Try alternative CDN for core files
            try {
                console.log('Attempting to load FFmpeg from alternative CDN...');
                const altBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
                
                await this.ffmpeg.load({
                    coreURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
                
                console.log('FFmpeg loaded successfully from alternative CDN');
            } catch (altError) {
                console.error('Failed to load FFmpeg from alternative CDN:', altError);
                this.showFFmpegLoadError();
            }
        }
    }

    showFFmpegLoadError() {
        this.offlineMode = true;
        
        const errorMessage = `
            <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h3>⚠️ Compression Engine Unavailable</h3>
                <p>Video compression is temporarily unavailable, but you can still:</p>
                <ul style="text-align: left; max-width: 400px; margin: 10px auto;">
                    <li>✅ Upload and preview videos</li>
                    <li>✅ View video information</li>
                    <li>❌ Compress videos (requires internet)</li>
                </ul>
                <p><strong>To enable compression:</strong></p>
                <ul style="text-align: left; max-width: 400px; margin: 10px auto;">
                    <li>Check your internet connection</li>
                    <li>Refresh the page</li>
                    <li>Try using a different browser</li>
                </ul>
                <div style="margin-top: 15px;">
                    <button onclick="location.reload()" style="background: white; color: #f59e0b; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; margin: 5px;">
                        Try Again
                    </button>
                    <button onclick="this.parentElement.remove(); window.videoCompressor.enableOfflineMode()" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; margin: 5px;">
                        Continue in Preview Mode
                    </button>
                </div>
            </div>
        `;
        
        // Show error in the main container
        const main = document.querySelector('.main');
        if (main) {
            main.innerHTML = errorMessage;
        }
    }

    enableOfflineMode() {
        console.log('Enabling offline preview mode');
        this.offlineMode = true;
        
        // Restore the original UI
        const main = document.querySelector('.main');
        if (main) {
            main.innerHTML = `
                <!-- Upload Section -->
                <div class="upload-section" id="uploadSection">
                    <div class="upload-area" id="uploadArea">
                        <div class="upload-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </div>
                        <h3>Drop your video anywhere or click to browse</h3>
                        <p>Preview Mode: Compression disabled - upload for video preview only</p>
                        <button class="upload-btn" id="uploadBtn" onclick="document.getElementById('fileInput').click(); return false;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Choose Video File (Preview Only)
                        </button>
                        <input type="file" id="fileInput" accept="video/*" style="opacity:0; position:absolute; z-index:-1;">
                    </div>
                </div>

                <!-- Processing Section -->
                <div class="processing-section" id="processingSection" style="display: none;">
                    <div class="video-info" id="videoInfo"></div>
                    
                    <!-- Video Preview Section -->
                    <div class="video-preview-container">
                        <h3>Video Preview</h3>
                        <div class="video-comparison">
                            <div class="video-preview original">
                                <h4>Original Video</h4>
                                <video id="videoPreview" controls></video>
                                <div class="video-stats" id="originalStats"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: #f59e0b; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h4>Preview Mode Active</h4>
                        <p>Video compression is disabled. Refresh the page to retry compression features.</p>
                        <button onclick="location.reload()" style="background: white; color: #f59e0b; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 5px;">
                            Retry Compression
                        </button>
                    </div>

                    <div class="download-actions" style="justify-content: center; margin-top: 20px;">
                        <button class="reset-btn" id="resetBtn">Upload Another Video</button>
                    </div>
                </div>
            `;
        }
        
        // Re-initialize elements and event listeners
        this.initializeElements();
        this.setupEventListeners();
        
        console.log('Offline mode enabled - compression disabled, preview available');
    }

    parseProgressFromLog(message) {
        const match = message.match(/frame=\s*(\d+)/);
        if (match && this.totalFrames) {
            const currentFrame = parseInt(match[1]);
            const progress = Math.min((currentFrame / this.totalFrames) * 100, 95);
            this.updateProgress(progress, `Compressing video... ${Math.round(progress)}%`);
        }
    }

    handleFileSelect(e) {
        console.log('handleFileSelect called');
        const files = e.target.files;
        console.log('Files selected:', files);
        if (files.length > 0) {
            console.log('File selected:', files[0]);
            this.processFile(files[0]);
        } else {
            console.log('No files selected');
        }
    }

    async processFile(file) {
        console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        if (!this.isValidVideoFile(file)) {
            this.showError('Please select a valid video file (MP4, AVI, MOV, MKV, WebM, etc.).');
            return;
        }

        this.currentFile = file;
        
        // Create a preview URL for the video
        if (this.videoUrl) {
            URL.revokeObjectURL(this.videoUrl);
        }
        this.videoUrl = URL.createObjectURL(file);
        
        try {
            await this.analyzeVideo(file);
            this.showProcessingSection();
        } catch (error) {
            console.error('Error processing file:', error);
            this.showError('Failed to process the video file. Please try again.');
        }
    }

    isValidVideoFile(file) {
        const validTypes = [
            'video/mp4', 'video/avi', 'video/mov', 'video/quicktime',
            'video/mkv', 'video/webm', 'video/ogg', 'video/flv',
            'video/wmv', 'video/3gp', 'video/m4v'
        ];
        
        const isValidType = validTypes.includes(file.type);
        const isValidExtension = file.name.match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv|3gp|m4v)$/i);
        
        console.log('File validation:', {
            name: file.name,
            type: file.type,
            isValidType,
            isValidExtension
        });
        
        return isValidType || isValidExtension;
    }

    async analyzeVideo(file) {
        try {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    const duration = video.duration;
                    const fileSize = file.size;
                    
                    // Estimate frames (assuming 30fps average)
                    this.totalFrames = Math.floor(duration * 30);
                    
                    this.displayVideoInfo({
                        name: file.name,
                        size: this.formatFileSize(fileSize),
                        duration: this.formatDuration(duration),
                        dimensions: `${video.videoWidth}x${video.videoHeight}`,
                        type: file.type || 'Unknown'
                    });
                    
                    resolve();
                };
                
                video.onerror = () => {
                    console.error('Failed to load video metadata');
                    this.displayVideoInfo({
                        name: file.name,
                        size: this.formatFileSize(file.size),
                        duration: 'Unknown',
                        dimensions: 'Unknown',
                        type: file.type || 'Unknown'
                    });
                    resolve();
                };
                
                video.src = URL.createObjectURL(file);
            });
        } catch (error) {
            console.error('Failed to analyze video:', error);
            this.displayVideoInfo({
                name: file.name,
                size: this.formatFileSize(file.size),
                duration: 'Unknown',
                dimensions: 'Unknown',
                type: file.type || 'Unknown'
            });
        }
    }

    displayVideoInfo(info) {
        this.videoInfo.innerHTML = `
            <h3>Video Information</h3>
            <div class="video-details">
                <div class="video-detail">
                    <span class="label">File name:</span>
                    <span class="value">${info.name}</span>
                </div>
                <div class="video-detail">
                    <span class="label">File size:</span>
                    <span class="value">${info.size}</span>
                </div>
                <div class="video-detail">
                    <span class="label">Duration:</span>
                    <span class="value">${info.duration}</span>
                </div>
                <div class="video-detail">
                    <span class="label">Resolution:</span>
                    <span class="value">${info.dimensions}</span>
                </div>
                <div class="video-detail">
                    <span class="label">Type:</span>
                    <span class="value">${info.type}</span>
                </div>
            </div>
        `;
    }

    showProcessingSection() {
        console.log('Showing processing section...');
        this.uploadSection.style.display = 'none';
        this.processingSection.style.display = 'block';
        this.processingSection.classList.add('fade-in');
        
        // Set up video preview
        if (this.videoUrl && this.videoPreview) {
            console.log('Setting up video preview with URL:', this.videoUrl);
            this.videoPreview.src = this.videoUrl;
            this.videoPreview.load();
            
            // Update original video stats
            this.updateOriginalStats();
            
            // Auto-play with error handling
            this.videoPreview.play().catch(err => {
                console.log('Auto-play prevented or failed:', err);
            });
        } else {
            console.error('Video URL or preview element not available:', {
                videoUrl: this.videoUrl,
                videoPreview: !!this.videoPreview
            });
        }
    }

    updateOriginalStats() {
        if (!this.currentFile) return;
        
        this.originalStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">File Size:</span>
                <span class="stat-value">${this.formatFileSize(this.currentFile.size)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Format:</span>
                <span class="stat-value">${this.currentFile.type || 'Unknown'}</span>
            </div>
        `;
    }

    selectOption(btn) {
        if (this.offlineMode) {
            alert('Compression is disabled in preview mode. Please refresh the page to retry loading compression features.');
            return;
        }
        
        // Remove selected class from all buttons
        this.optionBtns.forEach(b => b.classList.remove('selected'));
        
        // Add selected class to clicked button
        btn.classList.add('selected');
        
        // Get target size
        this.targetSize = parseInt(btn.getAttribute('data-size'));
        
        // Start compression
        setTimeout(() => this.startCompression(), 500);
    }

    async startCompression() {
        if (!this.ffmpeg || !this.currentFile || !this.targetSize) {
            this.showError('Missing requirements for compression.');
            return;
        }

        console.log('Starting compression...');
        this.isProcessing = true;
        this.showProgressSection();

        try {
            // Load file into FFmpeg
            this.updateProgress(5, 'Loading video file...');
            const arrayBuffer = await this.currentFile.arrayBuffer();
            const inputFileName = 'input.' + this.getFileExtension(this.currentFile.name);
            await this.ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));

            // Calculate compression parameters
            this.updateProgress(10, 'Calculating compression parameters...');
            const compressionParams = this.calculateCompressionParams(
                this.currentFile.size, 
                this.targetSize * 1024 * 1024
            );

            // Build FFmpeg command
            const outputFileName = `compressed_${this.targetSize}MB.mp4`;
            const command = this.buildFFmpegCommand(inputFileName, outputFileName, compressionParams);

            this.updateProgress(15, 'Starting compression...');
            
            // Execute compression
            await this.ffmpeg.exec(command);

            this.updateProgress(90, 'Finalizing...');

            // Get output file
            const outputData = await this.ffmpeg.readFile(outputFileName);
            const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });

            this.updateProgress(100, 'Compression complete!');

            // Show results
            this.showResults(outputBlob);

        } catch (error) {
            console.error('Compression failed:', error);
            this.showError('Compression failed. Please try again with a different video or settings.');
        } finally {
            this.isProcessing = false;
        }
    }

    calculateCompressionParams(originalSize, targetSize) {
        const compressionRatio = targetSize / originalSize;
        
        // Base parameters for different compression levels
        let videoBitrate, audioBitrate, crf;
        
        if (this.targetSize === 8) {
            // Aggressive compression for 8MB
            videoBitrate = Math.max(100, Math.floor(compressionRatio * 1000));
            audioBitrate = 64;
            crf = 32;
        } else {
            // Better quality for 50MB
            videoBitrate = Math.max(500, Math.floor(compressionRatio * 2000));
            audioBitrate = 128;
            crf = 28;
        }

        return {
            videoBitrate: `${videoBitrate}k`,
            audioBitrate: `${audioBitrate}k`,
            crf,
            scale: this.targetSize === 8 ? '720:-2' : '1080:-2'
        };
    }

    buildFFmpegCommand(inputFile, outputFile, params) {
        return [
            '-i', inputFile,
            '-c:v', 'libx264',
            '-crf', params.crf.toString(),
            '-b:v', params.videoBitrate,
            '-c:a', 'aac',
            '-b:a', params.audioBitrate,
            '-vf', `scale=${params.scale}`,
            '-preset', 'fast',
            '-movflags', '+faststart',
            outputFile
        ];
    }

    showProgressSection() {
        const compressionOptions = document.querySelector('.compression-options');
        compressionOptions.style.display = 'none';
        this.progressSection.style.display = 'block';
    }

    updateProgress(percentage, message) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = message;
    }

    showResults(compressedBlob) {
        this.compressedBlob = compressedBlob;
        
        // Calculate file sizes and reduction
        const originalSizeBytes = this.currentFile.size;
        const compressedSizeBytes = compressedBlob.size;
        const reductionPercentage = Math.round((1 - compressedSizeBytes / originalSizeBytes) * 100);

        // Update UI
        this.originalSize.textContent = this.formatFileSize(originalSizeBytes);
        this.compressedSize.textContent = this.formatFileSize(compressedSizeBytes);
        this.reduction.textContent = `${reductionPercentage}% smaller`;

        // Set up compressed video preview
        this.setupCompressedVideoPreview(compressedBlob);
        
        // Update compressed video stats
        this.updateCompressedStats(compressedBlob);

        // Show result section
        this.progressSection.style.display = 'none';
        this.resultSection.style.display = 'block';
        this.resultSection.classList.add('fade-in');
    }

    setupCompressedVideoPreview(compressedBlob) {
        // Create URL for compressed video
        if (this.compressedVideoUrl) {
            URL.revokeObjectURL(this.compressedVideoUrl);
        }
        this.compressedVideoUrl = URL.createObjectURL(compressedBlob);
        
        // Show compressed video container
        this.compressedPreviewContainer.style.display = 'block';
        
        // Enable two-video layout
        this.videoComparison.classList.add('two-videos');
        
        // Set up compressed video element
        if (this.compressedVideoPreview) {
            this.compressedVideoPreview.src = this.compressedVideoUrl;
            this.compressedVideoPreview.load();
            
            console.log('Compressed video preview set up');
        }
    }

    updateCompressedStats(compressedBlob) {
        this.compressedStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">File Size:</span>
                <span class="stat-value">${this.formatFileSize(compressedBlob.size)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Target Size:</span>
                <span class="stat-value">${this.targetSize}MB</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Reduction:</span>
                <span class="stat-value">${Math.round((1 - compressedBlob.size / this.currentFile.size) * 100)}%</span>
            </div>
        `;
    }

    downloadResult() {
        if (!this.compressedBlob) return;

        const url = URL.createObjectURL(this.compressedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed_${this.targetSize}MB_${this.currentFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    cancelProcessing() {
        if (this.isProcessing && this.ffmpeg) {
            this.ffmpeg.terminate();
            this.loadFFmpeg(); // Reload FFmpeg for next use
        }
        this.reset();
    }

    reset() {
        // Clean up video preview URLs
        if (this.videoUrl) {
            URL.revokeObjectURL(this.videoUrl);
            this.videoUrl = null;
        }
        
        if (this.compressedVideoUrl) {
            URL.revokeObjectURL(this.compressedVideoUrl);
            this.compressedVideoUrl = null;
        }
        
        // Reset video previews
        if (this.videoPreview) {
            this.videoPreview.src = '';
            this.videoPreview.load();
        }
        
        if (this.compressedVideoPreview) {
            this.compressedVideoPreview.src = '';
            this.compressedVideoPreview.load();
        }
        
        // Reset video comparison layout
        if (this.videoComparison) {
            this.videoComparison.classList.remove('two-videos');
        }
        
        if (this.compressedPreviewContainer) {
            this.compressedPreviewContainer.style.display = 'none';
        }
        
        // Clear stats
        if (this.originalStats) {
            this.originalStats.innerHTML = '';
        }
        
        if (this.compressedStats) {
            this.compressedStats.innerHTML = '';
        }
        
        this.currentFile = null;
        this.targetSize = null;
        this.compressedBlob = null;
        this.isProcessing = false;
        this.dragCounter = 0;
        
        // Hide drag overlay
        this.dragOverlay.classList.remove('active');
        
        // Reset UI
        this.processingSection.style.display = 'none';
        this.uploadSection.style.display = 'block';
        this.progressSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        
        // Reset form
        this.fileInput.value = '';
        this.optionBtns.forEach(btn => btn.classList.remove('selected'));
        this.updateProgress(0, '');
        
        console.log('Application reset completed');
    }

    showError(message) {
        alert(message);
        console.error(message);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        if (isNaN(seconds)) return 'Unknown';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase() || 'mp4';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing VideoCompressor...');
    try {
        const compressor = new VideoCompressor();
        console.log('VideoCompressor initialized successfully');
        
        // Global reference for debugging
        window.videoCompressor = compressor;
    } catch (error) {
        console.error('Failed to initialize VideoCompressor:', error);
        alert('Failed to initialize video compressor. Please refresh the page.');
    }
}); 