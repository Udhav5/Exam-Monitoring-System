let video = document.getElementById('video');
let statusMsg = document.getElementById('statusMsg');
let warningMsg = document.getElementById('warningMsg');
let cancelScreen = document.getElementById('cancel-screen');
let examSection = document.getElementById('exam-section');
let warningCount = 0;
let examCancelled = false;

// --- Initialize camera ---
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = stream;
    statusMsg.textContent = 'Camera initialized.';
  } catch (err) {
    statusMsg.textContent = 'Error accessing camera or mic!';
  }
}

// --- Load face detection models ---
async function loadModels() {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  statusMsg.textContent = 'Model loaded, starting monitoring...';
  monitorExam();
}

// --- Add warning ---
function addWarning(reason) {
  if (examCancelled) return;

  warningCount++;
  warningMsg.textContent = `Warnings: ${warningCount} / 3`;
  statusMsg.textContent = `⚠️ Warning: ${reason}`;

  if (warningCount >= 3) {
    cancelExam();
  }
}

// --- Cancel exam ---
function cancelExam() {
  examCancelled = true;
  examSection.classList.add('hidden');
  cancelScreen.classList.remove('hidden');
  statusMsg.textContent = '❌ Exam Cancelled';
}

// --- Monitor tab switch ---
document.addEventListener('visibilitychange', () => {
  if (document.hidden) addWarning('Tab switched!');
});

// --- Monitor background noise ---
function detectNoise() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);

      function analyze() {
        analyser.getByteFrequencyData(dataArray);
        let avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (avg > 180) addWarning('Unusual background noise!');
        if (!examCancelled) requestAnimationFrame(analyze);
      }
      analyze();
    })
    .catch(() => console.log('Mic access denied'));
}

// --- Monitor faces in video ---
async function monitorExam() {
  detectNoise();

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
    if (detections.length === 0) addWarning('No face detected!');
    else if (detections.length > 1) addWarning('Multiple faces detected!');
  }, 3000);
}

// Start system
initCamera().then(loadModels);
