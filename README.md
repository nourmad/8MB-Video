# Video Compressor - 8MB & 50MB

A modern, dark-themed web application that compresses videos to 8MB or 50MB using client-side processing. All video compression happens locally in your browser - your videos never leave your device!

## ✨ Features

- **🎯 Drag & Drop Interface**: Simply drag videos into the browser or click to browse
- **📱 Multi-format Support**: Works with MP4, AVI, MOV, MKV, WebM, and more
- **🎚️ Two Compression Options**: 
  - 8MB: Highly compressed for messaging apps
  - 50MB: Better quality for social media
- **🔒 Privacy First**: All processing happens locally in your browser
- **🌙 Dark Mode Design**: Modern, eye-friendly interface
- **📊 Real-time Progress**: Visual progress tracking during compression
- **📋 File Analysis**: Displays video information before compression
- **💾 Instant Download**: Download compressed videos immediately

## 🚀 How to Use

1. **Upload Video**: 
   - Drag and drop a video file into the upload area
   - Or click the upload area to browse for files

2. **Choose Compression**: 
   - Select **8MB** for maximum compression (good for messaging)
   - Select **50MB** for better quality (good for social media)

3. **Wait for Processing**: 
   - Watch the progress bar as your video is compressed
   - Processing happens entirely in your browser

4. **Download Result**: 
   - See the compression statistics
   - Download your compressed video
   - Compress another video if needed

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Video Processing**: FFmpeg.wasm (WebAssembly)
- **Design**: Modern CSS with dark theme and gradients
- **Browser APIs**: File API, Drag and Drop API

## 📋 Supported Video Formats

**Input formats:**
- MP4, AVI, MOV, QuickTime
- MKV, WebM, OGG
- FLV, WMV, 3GP, M4V

**Output format:**
- MP4 (H.264 video, AAC audio)

## 🖥️ Browser Requirements

- **Chrome**: 67+ (recommended)
- **Firefox**: 62+
- **Safari**: 13.1+
- **Edge**: 79+

⚠️ **Note**: Requires a modern browser with WebAssembly support.

## 🚀 Getting Started

### Option 1: Simple Setup (Recommended)
1. Download all files to a folder
2. Open `index.html` in a modern web browser
3. Start compressing videos!

### Option 2: Local Server (for development)
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```
Then visit `http://localhost:8000`

## 📂 Project Structure

```
video-compressor/
├── index.html          # Main HTML file
├── styles.css          # Dark theme CSS styles
├── script.js           # JavaScript application logic
├── README.md           # This file
└── .gitattributes      # Git configuration
```

## ⚙️ Compression Settings

### 8MB Compression
- **Target**: Highly compressed for messaging
- **Video Bitrate**: Adaptive (100k+ based on source)
- **Audio Bitrate**: 64k
- **Resolution**: Max 720p
- **Quality**: CRF 32 (higher compression)

### 50MB Compression
- **Target**: Better quality for social sharing
- **Video Bitrate**: Adaptive (500k+ based on source)
- **Audio Bitrate**: 128k
- **Resolution**: Max 1080p
- **Quality**: CRF 28 (balanced compression)

## 🔧 Customization

You can modify compression settings in `script.js`:

```javascript
calculateCompressionParams(originalSize, targetSize) {
    // Modify these values to change compression behavior
    if (this.targetSize === 8) {
        videoBitrate = Math.max(100, Math.floor(compressionRatio * 1000));
        audioBitrate = 64;
        crf = 32;
    }
    // ... more settings
}
```

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg won't load**
   - Ensure you have a stable internet connection
   - Try refreshing the page
   - Check browser console for errors

2. **Large files take too long**
   - Consider compressing files under 500MB for better performance
   - Close other browser tabs to free up memory

3. **Browser crashes or freezes**
   - Try with a smaller video file first
   - Ensure your browser supports WebAssembly
   - Close other applications to free up RAM

### Performance Tips

- **File Size**: Works best with files under 500MB
- **Duration**: Videos under 10 minutes compress faster
- **Browser**: Chrome typically offers the best performance
- **Memory**: Close other tabs during compression

## 🔒 Privacy & Security

- ✅ **All processing happens locally** - videos never leave your device
- ✅ **No server uploads** - no data is sent to external servers
- ✅ **No tracking** - no analytics or user tracking
- ✅ **Open source** - you can inspect all the code

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## ⭐ Acknowledgments

- Built with [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)
- Font: [Inter](https://fonts.google.com/specimen/Inter)
- Icons: Custom SVG icons

---

**Made with ❤️ for privacy-conscious video compression** 