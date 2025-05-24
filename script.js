class VideoCompressor {
    constructor() {
        this.ffmpeg = null;
        this.currentFile = null;
        this.isProcessing = false;
        this.targetSize = null;
        this.dragCounter = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadFFmpeg();
    }

    initializeElements() {
        // Get all DOM elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.uploadSection = document.getElementById('uploadSection');
        this.processingSection = document.getElementById('processingSection');
        this.videoInfo = document.getElementById('videoInfo');
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
    }

    setupEventListeners() {        console.log('Setting up event listeners...');                // File input        this.fileInput.addEventListener('change', (e) => {            console.log('File input changed:', e.target.files);            this.handleFileSelect(e);        });                // Upload button        this.uploadBtn.addEventListener('click', (e) => {            console.log('Upload button clicked');            e.preventDefault();            this.fileInput.click();        });                // Upload area drag and drop (local)        this.uploadArea.addEventListener('click', (e) => {            console.log('Upload area clicked');            if (e.target !== this.uploadBtn && !this.uploadBtn.contains(e.target)) {                this.fileInput.click();            }        });        this.uploadArea.addEventListener('dragover', (e) => this.handleLocalDragOver(e));        this.uploadArea.addEventListener('dragleave', (e) => this.handleLocalDragLeave(e));        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));                // Document-level drag and drop (full screen)        document.addEventListener('dragenter', (e) => this.handleDocumentDragEnter(e));        document.addEventListener('dragover', (e) => this.handleDocumentDragOver(e));        document.addEventListener('dragleave', (e) => this.handleDocumentDragLeave(e));        document.addEventListener('drop', (e) => this.handleDocumentDrop(e));                // Compression options        this.optionBtns.forEach(btn => {            btn.addEventListener('click', () => this.selectOption(btn));        });                // Control buttons        this.cancelBtn.addEventListener('click', () => this.cancelProcessing());        this.downloadBtn.addEventListener('click', () => this.downloadResult());        this.resetBtn.addEventListener('click', () => this.reset());                console.log('Event listeners set up successfully');    }

        // Document-level drag handlers (full screen)    handleDocumentDragEnter(e) {        e.preventDefault();        this.dragCounter++;        console.log('Document drag enter, counter:', this.dragCounter);                if (this.hasValidFiles(e.dataTransfer)) {            console.log('Valid files detected, showing overlay');            this.dragOverlay.classList.add('active');        }    }

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
        if (dataTransfer.items) {
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
            this.updateProgress(0, 'Loading video processor...');
            
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            this.ffmpeg = new FFmpeg();
            
            this.ffmpeg.on('log', ({ message }) => {
                console.log(message);
                if (message.includes('frame=')) {
                    this.parseProgressFromLog(message);
                }
            });

            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            console.log('FFmpeg loaded successfully');
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            this.showError('Failed to load video processor. Please refresh the page.');
        }
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
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    async processFile(file) {
        if (!this.isValidVideoFile(file)) {
            this.showError('Please select a valid video file.');
            return;
        }

        this.currentFile = file;
        await this.analyzeVideo(file);
        this.showProcessingSection();
    }

    isValidVideoFile(file) {
        const validTypes = [
            'video/mp4', 'video/avi', 'video/mov', 'video/quicktime',
            'video/mkv', 'video/webm', 'video/ogg', 'video/flv',
            'video/wmv', 'video/3gp', 'video/m4v'
        ];
        return validTypes.includes(file.type) || file.name.match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv|3gp|m4v)$/i);
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
        this.uploadSection.style.display = 'none';
        this.processingSection.style.display = 'block';
        this.processingSection.classList.add('fade-in');
    }

    selectOption(btn) {
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

        // Show result section
        this.progressSection.style.display = 'none';
        this.resultSection.style.display = 'block';
        this.resultSection.classList.add('fade-in');
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
    }

    showError(message) {
        alert(message); // You can replace this with a more elegant error display
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

// Utility function for FFmpeg
const { toBlobURL } = FFmpegUtil;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoCompressor();
}); 