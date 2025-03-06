document.addEventListener('DOMContentLoaded', () => {
    const transcriptEl = document.getElementById('transcript');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const retryBtn = document.getElementById('retryBtn');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const contentEl = document.getElementById('content');
    
    function showLoading() {
        loadingEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
        contentEl.classList.add('hidden');
    }
    
    function showError(message) {
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        contentEl.classList.add('hidden');
        errorEl.querySelector('.error-message').textContent = message;
    }
    
    function showContent() {
        loadingEl.classList.add('hidden');
        errorEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
    }
    
    // Hàm lấy transcript
    async function getTranscript() {
        showLoading();
        
        try {
            // Lấy tab hiện tại
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('youtube.com/watch')) {
                throw new Error('Vui lòng mở một video YouTube');
            }
            
            // Gửi message đến content script
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTranscript' });
            
            if (!response || !response.success) {
                throw new Error(response?.error || 'Không thể lấy transcript');
            }
            
            if (!response.data || response.data.length === 0) {
                throw new Error('Video này không có transcript');
            }
            
            // Hiển thị transcript
            transcriptEl.textContent = response.data;
            showContent();
            
        } catch (error) {
            console.error(error);
            showError(error.message);
        }
    }
    
    // Copy transcript
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(transcriptEl.textContent);
        copyBtn.textContent = 'Đã copy!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    });
    
    // Tải transcript
    downloadBtn.addEventListener('click', () => {
        // Lấy tiêu đề video từ tab hiện tại
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            let filename = 'transcript.txt';
            
            // Cố gắng lấy tiêu đề video từ tiêu đề tab
            if (tab.title) {
                const title = tab.title.replace(' - YouTube', '').trim();
                if (title) {
                    filename = `${title} - Transcript.txt`;
                }
            }
            
            // Tạo và tải file
            const blob = new Blob([transcriptEl.textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        });
    });
    
    // Thử lại khi có lỗi
    retryBtn.addEventListener('click', getTranscript);
    
    // Tự động lấy transcript khi mở popup
    getTranscript();
});