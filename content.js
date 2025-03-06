// Hàm lấy video ID từ URL
function getVideoId(url) {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('v');
}

// Hàm chính để lấy transcript
async function getTranscript() {
    try {
        // 1. Lấy video ID
        const videoId = getVideoId(window.location.href);
        if (!videoId) {
            throw new Error('Không tìm thấy video ID');
        }
        
        console.log('Đang cố gắng lấy transcript cho video', videoId);
        
        // 2. Thử phương pháp API trước (ưu tiên cao nhất)
        try {
            console.log('Đang thử lấy transcript bằng API...');
            const apiTranscript = await getTranscriptWithCaptionsAPI(videoId);
            if (apiTranscript && apiTranscript.length > 0) {
                console.log('Lấy transcript thành công qua API');
                return apiTranscript;
            }
        } catch (apiError) {
            console.log('Lỗi khi lấy transcript bằng API:', apiError);
        }
        
        // 3. Thử phương pháp timedtext API
        try {
            console.log('Đang thử lấy transcript bằng timedtext API...');
            const timedTextTranscript = await getTranscriptUsingApi(videoId);
            if (timedTextTranscript && timedTextTranscript.length > 0) {
                console.log('Lấy transcript thành công qua timedtext API');
                return timedTextTranscript.map(item => {
                    const time = formatTime(item.timestamp);
                    return `[${time}] ${item.text}`;
                }).join('\n');
            }
        } catch (timedTextError) {
            console.log('Lỗi khi lấy transcript bằng timedtext API:', timedTextError);
        }
        
        // 4. Cuối cùng thử lấy từ UI (phức tạp nhất, dễ bị lỗi nhất)
        console.log('Đang thử lấy transcript từ UI...');
        return await getTranscriptFromUI();
        
    } catch (error) {
        console.error('Lỗi chung:', error);
        throw error;
    }
}

// Phương pháp mới: Sử dụng Captions API trực tiếp
async function getTranscriptWithCaptionsAPI(videoId) {
    try {
        // Yêu cầu captions trực tiếp từ inner API của YouTube
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
            method: 'GET',
            headers: {
                'Accept': 'text/html'
            }
        });
        
        if (!response.ok) return null;
        
        const html = await response.text();
        
        // Tìm dữ liệu caption trong HTML
        const captionDataMatch = html.match(/"captionTracks":\[(.*?)\]/);
        if (!captionDataMatch || !captionDataMatch[1]) return null;
        
        const captionData = JSON.parse(`{"captionTracks":[${captionDataMatch[1]}]}`);
        
        if (!captionData.captionTracks || captionData.captionTracks.length === 0) {
            return null;
        }
        
        // Lấy caption có sẵn đầu tiên
        const firstCaption = captionData.captionTracks[0];
        const baseUrl = firstCaption.baseUrl;
        
        // Lấy nội dung caption
        const captionResponse = await fetch(baseUrl);
        if (!captionResponse.ok) return null;
        
        const captionXml = await captionResponse.text();
        
        // Parse XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(captionXml, "text/xml");
        const textElements = xmlDoc.getElementsByTagName("text");
        
        if (!textElements || textElements.length === 0) return null;
        
        // Format transcript
        let transcriptText = "";
        for (let i = 0; i < textElements.length; i++) {
            const start = parseFloat(textElements[i].getAttribute("start"));
            const timeStr = formatTime(start);
            const text = textElements[i].textContent.trim();
            if (text) {
                transcriptText += `[${timeStr}] ${text}\n`;
            }
        }
        
        return transcriptText.trim();
    } catch (error) {
        console.error("Lỗi khi lấy transcript từ Captions API:", error);
        return null;
    }
}

// Phương pháp 1: Lấy transcript bằng API
async function getTranscriptUsingApi(videoId) {
    try {
        // Lấy dữ liệu transcript từ timedtext API
        const languages = ['en', 'vi', 'auto', 'en-US', 'vi-VN', ''];
        
        for (const lang of languages) {
            try {
                const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}`;
                console.log('Đang thử URL:', url);
                
                const response = await fetch(url);
                if (!response.ok) continue;
                
                const xml = await response.text();
                if (!xml || xml.length < 100) continue;
                
                // Parse XML để lấy transcript
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xml, "text/xml");
                const textElements = xmlDoc.getElementsByTagName("text");
                
                if (!textElements || textElements.length === 0) continue;
                
                const transcript = [];
                for (let i = 0; i < textElements.length; i++) {
                    const start = parseFloat(textElements[i].getAttribute("start"));
                    const text = textElements[i].textContent.trim();
                    if (text) {
                        transcript.push({
                            timestamp: start,
                            text: text
                        });
                    }
                }
                
                if (transcript.length > 0) {
                    return transcript;
                }
            } catch (e) {
                console.error(`Lỗi khi thử ngôn ngữ ${lang}:`, e);
            }
        }
        
        return null;
    } catch (error) {
        console.error("Lỗi khi lấy transcript từ API:", error);
        return null;
    }
}

// Phương pháp 2: Lấy transcript từ UI
async function getTranscriptFromUI() {
    try {
        console.log('Bắt đầu lấy transcript từ UI...');
        
        // Kiểm tra xem transcript panel đã mở chưa
        let transcriptPanel = findTranscriptPanel();
        
        // Nếu chưa mở, thử mở transcript panel
        if (!transcriptPanel) {
            console.log('Không tìm thấy transcript panel, đang thử mở...');
            
            // Thử tất cả các phương pháp mở transcript
            let methodSuccess = false;
            
            // Phương pháp 1: Menu điều khiển video
            if (!methodSuccess) {
                try {
                    await openTranscriptFromVideoMenu();
                    await new Promise(r => setTimeout(r, 2000));
                    transcriptPanel = findTranscriptPanel();
                    methodSuccess = !!transcriptPanel;
                    console.log('Phương pháp 1 ' + (methodSuccess ? 'thành công' : 'thất bại'));
                } catch (e) {
                    console.log('Phương pháp 1 thất bại:', e);
                }
            }
            
            // Phương pháp 2: Nút More Actions
            if (!methodSuccess) {
                try {
                    await openTranscriptFromMoreActions();
                    await new Promise(r => setTimeout(r, 2000));
                    transcriptPanel = findTranscriptPanel();
                    methodSuccess = !!transcriptPanel;
                    console.log('Phương pháp 2 ' + (methodSuccess ? 'thành công' : 'thất bại'));
                } catch (e) {
                    console.log('Phương pháp 2 thất bại:', e);
                }
            }
            
            // Phương pháp 3: Nút transcript trực tiếp
            if (!methodSuccess) {
                try {
                    await openTranscriptDirect();
                    await new Promise(r => setTimeout(r, 2000));
                    transcriptPanel = findTranscriptPanel();
                    methodSuccess = !!transcriptPanel;
                    console.log('Phương pháp 3 ' + (methodSuccess ? 'thành công' : 'thất bại'));
                } catch (e) {
                    console.log('Phương pháp 3 thất bại:', e);
                }
            }
            
            if (!transcriptPanel) {
                throw new Error('Không thể mở transcript panel');
            }
        }
        
        console.log('Tìm thấy transcript panel, đang lấy nội dung...');
        
        // Lấy tất cả các segment
        const segments = getTranscriptSegments(transcriptPanel);
        
        if (!segments || segments.length === 0) {
            throw new Error('Không tìm thấy nội dung transcript');
        }
        
        // Parse transcript
        const transcript = parseTranscriptSegments(segments);
        
        if (!transcript) {
            throw new Error('Không thể trích xuất transcript');
        }
        
        console.log('Lấy transcript thành công từ UI');
        
        return transcript;
    } catch (error) {
        console.error("Lỗi khi lấy transcript từ UI:", error);
        throw error;
    }
}

// Tìm transcript panel
function findTranscriptPanel() {
    const selectors = [
        'ytd-transcript-search-panel-renderer',
        'ytd-transcript-body-renderer',
        '[class*="transcript-panel"]',
        '#panels [panel-id*="transcript"]',
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]'
    ];
    
    for (const selector of selectors) {
        const panel = document.querySelector(selector);
        if (panel) return panel;
    }
    
    return null;
}

// Lấy các segment từ transcript panel
function getTranscriptSegments(panel) {
    const segmentSelectors = [
        'ytd-transcript-segment-renderer',
        '.ytd-transcript-segment-renderer',
        '[class*="segment"]',
        '[data-purpose="transcript-segment"]',
        'div.segment-content',
        '.transcript-cue'
    ];
    
    for (const selector of segmentSelectors) {
        const segments = panel.querySelectorAll(selector);
        if (segments && segments.length > 0) return segments;
    }
    
    return [];
}

// Parse các segment để lấy transcript
function parseTranscriptSegments(segments) {
    return Array.from(segments)
        .map(segment => {
            // Tìm timestamp
            const timestampSelectors = ['#timestamp', '[class*="time"]', '[class*="timestamp"]', 'span.timestamp'];
            let timestamp = null;
            for (const selector of timestampSelectors) {
                const el = segment.querySelector(selector);
                if (el && el.textContent.trim()) {
                    timestamp = el.textContent.trim();
                    break;
                }
            }
            
            // Nếu không tìm thấy timestamp bằng selector, thử lấy từ thuộc tính data
            if (!timestamp) {
                const dataTime = segment.getAttribute('data-time') || 
                                segment.getAttribute('data-timestamp') || 
                                segment.getAttribute('start-time');
                if (dataTime) {
                    const time = parseFloat(dataTime);
                    timestamp = formatTime(time);
                }
            }
            
            // Tìm text
            const textSelectors = ['#text', '[class*="segment-text"]', '[class*="content"]', 'span.text'];
            let text = null;
            for (const selector of textSelectors) {
                const el = segment.querySelector(selector);
                if (el && el.textContent.trim()) {
                    text = el.textContent.trim();
                    break;
                }
            }
            
            // Nếu không tìm thấy text từ selector, thử lấy nội dung text trực tiếp từ segment
            if (!text) {
                const segmentText = segment.textContent.trim();
                if (segmentText && timestamp) {
                    text = segmentText.replace(timestamp, '').trim();
                } else {
                    text = segmentText;
                }
            }
            
            return timestamp && text ? `[${timestamp}] ${text}` : null;
        })
        .filter(Boolean)
        .join('\n');
}

// Phương pháp 1: Mở transcript từ menu điều khiển video
async function openTranscriptFromVideoMenu() {
    // Tìm các nút điều khiển video
    const settingsButton = document.querySelector('button.ytp-settings-button');
    if (!settingsButton) {
        throw new Error('Không tìm thấy nút settings');
    }
    
    // Click vào nút settings
    settingsButton.click();
    await new Promise(r => setTimeout(r, 1000));
    
    // Tìm menu transcript trong settings
    const menuItems = document.querySelectorAll('.ytp-panel-menu .ytp-menuitem');
    let transcriptItem = null;
    
    for (const item of menuItems) {
        const text = item.textContent.toLowerCase();
        if (text.includes('transcript') || text.includes('phụ đề') || text.includes('bản ghi')) {
            transcriptItem = item;
            break;
        }
    }
    
    if (!transcriptItem) {
        // Đóng menu settings nếu không tìm thấy
        settingsButton.click();
        throw new Error('Không tìm thấy tùy chọn transcript trong menu');
    }
    
    // Click vào mục transcript
    transcriptItem.click();
}

// Phương pháp 2: Mở transcript từ nút More Actions
async function openTranscriptFromMoreActions() {
    // Tìm nút "..." dưới video
    const moreActionsSelectors = [
        'button[aria-label*="More actions"]',
        'button[aria-label*="thêm hành động"]',
        'ytd-button-renderer#button-shape button',
        '#top-level-buttons-computed > ytd-button-renderer:last-child button',
        '#menu-container button'
    ];
    
    let moreButton = null;
    for (const selector of moreActionsSelectors) {
        moreButton = document.querySelector(selector);
        if (moreButton) break;
    }
    
    if (!moreButton) {
        throw new Error('Không tìm thấy nút More actions');
    }
    
    // Click vào nút "..."
    moreButton.click();
    await new Promise(r => setTimeout(r, 1000));
    
    // Tìm mục transcript trong menu
    const menuSelectors = [
        'ytd-menu-service-item-renderer',
        'tp-yt-paper-item',
        '.ytd-menu-popup-renderer yt-formatted-string',
        'ytd-menu-navigation-item-renderer',
        '[role="menuitem"]'
    ];
    
    for (const selector of menuSelectors) {
        const items = document.querySelectorAll(selector);
        const transcriptItem = Array.from(items).find(item => {
            const text = item.textContent?.toLowerCase() || '';
            return text.includes('transcript') || text.includes('phụ đề') || text.includes('bản ghi');
        });
        
        if (transcriptItem) {
            transcriptItem.click();
            return;
        }
    }
    
    throw new Error('Không tìm thấy tùy chọn transcript trong menu');
}

// Phương pháp 3: Tìm và click nút transcript trực tiếp
async function openTranscriptDirect() {
    const directSelectors = [
        'button[aria-label*="transcript"]',
        'button[aria-label*="phụ đề"]',
        'button[aria-label*="bản ghi"]',
        '#primary-button ytd-button-renderer button'
    ];
    
    for (const selector of directSelectors) {
        const button = document.querySelector(selector);
        if (button) {
            button.click();
            return;
        }
    }
    
    throw new Error('Không tìm thấy nút transcript trực tiếp');
}

// Format timestamp từ seconds sang MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Lắng nghe message từ popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTranscript') {
        getTranscript()
            .then(transcript => sendResponse({ success: true, data: transcript }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});