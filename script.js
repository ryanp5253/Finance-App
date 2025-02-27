document.addEventListener('DOMContentLoaded', () => {
  // ===== Variabel & Elemen DOM Utama =====
  const formTransaksi = document.getElementById('form-transaksi');
  const listTransaksi = document.getElementById('list-transaksi');
  const balanceCard = document.querySelector('.balance-card');
  const balanceAmountEl = balanceCard.querySelector('.balance-amount');
  const dashboardAmounts = document.querySelectorAll('.card-balance .amount');
  const aiForecastEl = document.querySelector('.ai-forecast');
  const canvasChart = document.getElementById('grafik-keuangan');
  const ctxChart = canvasChart.getContext('2d');
  const mainElement = document.querySelector('main');
  const collapseToggles = document.querySelectorAll('.collapse-toggle');
  const fab = document.querySelector('.fab');
  
  let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  
  // Variabel untuk gesture navigation
  let startX = 0, endX = 0;
  const sections = document.querySelectorAll('main > section');
  let currentSectionIndex = 0;
  
  // Variabel untuk hold-to-delete pada transaksi
  let holdTimer = null;
  const holdThreshold = 1000; // ms
  
  // ===== Fungsi Update Data & Tampilan =====
  
  // Simpan data transaksi ke localStorage
  function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }
  
  // Perbarui daftar transaksi (setiap item diberi event untuk hold-to-delete)
  function updateTransactionList() {
    listTransaksi.innerHTML = '';
    transactions.forEach((transaksi, index) => {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.textContent = `${transaksi.tanggal} - ${transaksi.jenis} - Rp ${transaksi.jumlah} - ${transaksi.kategori}`;
      li.dataset.index = index;
      
      // Event untuk hold-to-delete
      li.addEventListener('mousedown', startHoldDelete);
      li.addEventListener('touchstart', startHoldDelete);
      li.addEventListener('mouseup', cancelHoldDelete);
      li.addEventListener('mouseleave', cancelHoldDelete);
      li.addEventListener('touchend', cancelHoldDelete);
      
      // Event untuk swipe-to-edit (contoh sederhana: klik ganda untuk edit)
      li.addEventListener('dblclick', () => editTransaction(index));
      
      listTransaksi.appendChild(li);
    });
  }
  
  // Perbarui ringkasan keuangan dan kartu saldo
  function updateSummary() {
    let saldo = 0, pendapatan = 0, pengeluaran = 0;
    transactions.forEach(transaksi => {
      const jumlah = parseFloat(transaksi.jumlah);
      if (transaksi.jenis === 'pendapatan') {
        pendapatan += jumlah;
        saldo += jumlah;
      } else if (transaksi.jenis === 'pengeluaran') {
        pengeluaran += jumlah;
        saldo -= jumlah;
      }
    });
    
    // Update tampilan di dashboard
    const [saldoEl, pendapatanEl, pengeluaranEl] = dashboardAmounts;
    saldoEl.textContent = `Rp ${saldo}`;
    pendapatanEl.textContent = `Rp ${pendapatan}`;
    pengeluaranEl.textContent = `Rp ${pengeluaran}`;
    
    // Simpan nilai asli saldo untuk fitur shake-to-reveal
    balanceCard.dataset.actualBalance = saldo;
  }
  
  // Gambar chart animasi real-time sederhana menggunakan Canvas API
  function updateChart() {
    const width = canvasChart.width = canvasChart.offsetWidth;
    const height = canvasChart.height = 200;
    ctxChart.clearRect(0, 0, width, height);
    
    // Contoh: gambarkan bar untuk pendapatan dan pengeluaran
    let totalPendapatan = 0, totalPengeluaran = 0;
    transactions.forEach(transaksi => {
      const jumlah = parseFloat(transaksi.jumlah);
      if (transaksi.jenis === 'pendapatan') totalPendapatan += jumlah;
      else if (transaksi.jenis === 'pengeluaran') totalPengeluaran += jumlah;
    });
    
    const maxVal = Math.max(totalPendapatan, totalPengeluaran, 1);
    const barWidth = width / 4;
    
    // Bar Pendapatan (hijau)
    const pendapatanHeight = (totalPendapatan / maxVal) * height;
    ctxChart.fillStyle = 'green';
    ctxChart.fillRect(width/4 - barWidth/2, height - pendapatanHeight, barWidth, pendapatanHeight);
    
    // Bar Pengeluaran (merah)
    const pengeluaranHeight = (totalPengeluaran / maxVal) * height;
    ctxChart.fillStyle = 'red';
    ctxChart.fillRect(3*width/4 - barWidth/2, height - pengeluaranHeight, barWidth, pengeluaranHeight);
    
    // Teks total transaksi
    ctxChart.fillStyle = '#000';
    ctxChart.font = '16px Montserrat';
    ctxChart.fillText(`Transaksi: ${transactions.length}`, 10, 30);
  }
  
  // Generate insight AI sederhana berdasarkan data transaksi
  function generateForecast() {
    let pendapatan = 0, pengeluaran = 0;
    transactions.forEach(transaksi => {
      const jumlah = parseFloat(transaksi.jumlah);
      if (transaksi.jenis === 'pendapatan') pendapatan += jumlah;
      else if (transaksi.jenis === 'pengeluaran') pengeluaran += jumlah;
    });
    let forecast = (pendapatan >= pengeluaran) ?
      'Keuangan Anda sehat dan stabil.' :
      'Waspada! Pengeluaran melebihi pendapatan.';
    aiForecastEl.innerHTML = `<p><strong>Prediksi AI:</strong> ${forecast}</p>`;
  }
  
  // ===== Event Handler Transaksi =====
  
  formTransaksi.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const jenis = document.getElementById('jenis-transaksi').value;
    const jumlah = document.getElementById('jumlah').value;
    const kategori = document.getElementById('kategori').value;
    const tanggal = document.getElementById('tanggal').value;
    const deskripsi = document.getElementById('deskripsi').value;
    
    if (!jenis || !jumlah || !kategori || !tanggal || !deskripsi) {
      alert('Mohon lengkapi semua field!');
      return;
    }
    
    const transaksiBaru = { jenis, jumlah, kategori, tanggal, deskripsi };
    transactions.push(transaksiBaru);
    updateLocalStorage();
    updateTransactionList();
    updateSummary();
    updateChart();
    generateForecast();
    formTransaksi.reset();
    
    // Notifikasi transaksi berhasil
    if (Notification.permission === 'granted') {
      new Notification('Finance Tracker Premium', { body: 'Transaksi berhasil ditambahkan!' });
    }
  });
  
  // Fungsi edit transaksi (contoh sederhana menggunakan prompt)
  function editTransaction(index) {
    const transaksi = transactions[index];
    const newJumlah = prompt('Edit jumlah transaksi:', transaksi.jumlah);
    if (newJumlah !== null && newJumlah !== '') {
      transaksi.jumlah = newJumlah;
      transactions[index] = transaksi;
      updateLocalStorage();
      updateTransactionList();
      updateSummary();
      updateChart();
      generateForecast();
    }
  }
  
  // ===== Collapsible Section Handling =====
  collapseToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const cardBody = toggle.closest('.card').querySelector('.collapsible');
      if (cardBody.style.maxHeight && cardBody.style.maxHeight !== '0px') {
        cardBody.style.maxHeight = '0px';
        toggle.textContent = '+';
      } else {
        cardBody.style.maxHeight = cardBody.scrollHeight + 'px';
        toggle.textContent = '–';
      }
    });
  });
  
  // ===== Gesture-based Navigation: Swipe Antar Section =====
  mainElement.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });
  mainElement.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].clientX;
    if (startX - endX > 50) {
      // Swipe kiri: ke section berikutnya
      currentSectionIndex = (currentSectionIndex + 1) % sections.length;
      showSection(currentSectionIndex);
    } else if (endX - startX > 50) {
      // Swipe kanan: ke section sebelumnya
      currentSectionIndex = (currentSectionIndex - 1 + sections.length) % sections.length;
      showSection(currentSectionIndex);
    }
  });
  
  function showSection(index) {
    sections.forEach((section, i) => {
      section.style.display = (i === index) ? 'block' : 'none';
    });
  }
  // Tampilkan section awal
  showSection(currentSectionIndex);
  
  // ===== Floating Action Button (FAB) =====
  fab.addEventListener('click', () => {
    document.getElementById('transaksi').scrollIntoView({ behavior: 'smooth' });
  });
  
  // ===== Voice Input untuk Deskripsi Transaksi =====
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    const voiceBtn = document.querySelector('.voice-input');
    const deskripsiInput = document.getElementById('deskripsi');
    
    voiceBtn.addEventListener('click', () => {
      recognition.start();
    });
    recognition.addEventListener('result', (event) => {
      const transcript = event.results[0][0].transcript;
      deskripsiInput.value = transcript;
    });
    recognition.addEventListener('error', (e) => {
      console.error('Error pada input suara: ', e);
    });
  } else {
    console.log('Web Speech API tidak didukung oleh browser ini.');
  }
  
  // ===== Hold-to-Delete Transaksi =====
  function startHoldDelete(e) {
    const li = e.currentTarget;
    holdTimer = setTimeout(() => {
      if (confirm('Hapus transaksi ini?')) {
        const index = parseInt(li.dataset.index);
        transactions.splice(index, 1);
        updateLocalStorage();
        updateTransactionList();
        updateSummary();
        updateChart();
        generateForecast();
      }
    }, holdThreshold);
  }
  
  function cancelHoldDelete() {
    clearTimeout(holdTimer);
  }
  
  // ===== Shake-to-Reveal Balance =====
  let shakeThreshold = 15; // Sesuaikan ambang guncangan
  let lastX = null, lastY = null, lastZ = null;
  
  window.addEventListener('devicemotion', (event) => {
    const acc = event.accelerationIncludingGravity;
    if (lastX === null) {
      lastX = acc.x;
      lastY = acc.y;
      lastZ = acc.z;
      return;
    }
    const deltaX = Math.abs(acc.x - lastX);
    const deltaY = Math.abs(acc.y - lastY);
    const deltaZ = Math.abs(acc.z - lastZ);
    if (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) {
      // Tampilkan saldo asli
      const actualBalance = balanceCard.dataset.actualBalance || '0';
      balanceAmountEl.textContent = `Rp ${actualBalance}`;
      balanceCard.classList.add('shake-reveal');
      setTimeout(() => {
        balanceCard.classList.remove('shake-reveal');
      }, 1000);
    }
    lastX = acc.x;
    lastY = acc.y;
    lastZ = acc.z;
  });
  
  // ===== Permintaan Izin Notifikasi =====
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  
  // ===== Inisialisasi Tampilan Awal =====
  updateTransactionList();
  updateSummary();
  updateChart();
  generateForecast();
});

// ===== Registrasi Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => {
        console.log('Service Worker terdaftar:', reg);
      })
      .catch((err) => {
        console.error('Pendaftaran Service Worker gagal:', err);
      });
  });
}