// Simple test script to debug drag and drop issues
console.log('Script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const dragOverlay = document.getElementById('dragOverlay');
    
    console.log('Elements found:', {
        uploadBtn: !!uploadBtn,
        fileInput: !!fileInput,
        dragOverlay: !!dragOverlay
    });
    
    // Test upload button
    if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
            console.log('Upload button clicked!');
            e.preventDefault();
            e.stopPropagation();
            if (fileInput) {
                fileInput.click();
            }
        });
    }
    
    // Test file input
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            console.log('File selected:', e.target.files[0]);
            if (e.target.files[0]) {
                alert('File selected: ' + e.target.files[0].name);
            }
        });
    }
    
    // Test drag and drop
    let dragCounter = 0;
    
    document.addEventListener('dragenter', (e) => {
        console.log('Drag enter detected');
        e.preventDefault();
        dragCounter++;
        if (dragOverlay) {
            dragOverlay.classList.add('active');
        }
    });
    
    document.addEventListener('dragover', (e) => {
        console.log('Drag over');
        e.preventDefault();
    });
    
    document.addEventListener('dragleave', (e) => {
        console.log('Drag leave');
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            if (dragOverlay) {
                dragOverlay.classList.remove('active');
            }
        }
    });
    
    document.addEventListener('drop', (e) => {
        console.log('Drop detected!', e.dataTransfer.files);
        e.preventDefault();
        dragCounter = 0;
        if (dragOverlay) {
            dragOverlay.classList.remove('active');
        }
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            console.log('Dropped file:', file);
            alert('File dropped: ' + file.name);
        }
    });
}); 