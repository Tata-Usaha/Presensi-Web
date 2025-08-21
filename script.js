// === Konfigurasi Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyCDpuIMrr6OcqhzeU54PxA5ecONwck-wng",
  authDomain: "sistem-absensi-tata-usaha.firebaseapp.com",
  databaseURL: "https://sistem-absensi-tata-usaha-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sistem-absensi-tata-usaha",
  storageBucket: "sistem-absensi-tata-usaha.firebasestorage.app",
  messagingSenderId: "136085367799",
  appId: "1:136085367799:web:588762506e6c9874f95cf2",
  measurementId: "G-XT456P4P6G"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let dataCache = {}; // cache data mahasiswa
let chart; // grafik global

window.addEventListener("DOMContentLoaded", () => {

  // === Upload Excel ===
  document.getElementById("uploadExcel").addEventListener("change", handleFile);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      json.forEach(mhs => {
        if (!mhs.NIM || !mhs.Nama || !mhs.Prodi) return;
        db.ref("mahasiswa/" + mhs.NIM).set({
          nim: String(mhs.NIM),
          nama: mhs.Nama,
          prodi: mhs.Prodi,
          status: "Belum Hadir"
        });
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // === Render Tabel Mahasiswa ===
  const filterHadirCheckbox = document.getElementById("filterHadir");

  function renderTable(mahasiswaList) {
    const tbody = document.getElementById("tabelMahasiswa");
    tbody.innerHTML = "";

    const filterHadir = filterHadirCheckbox.checked;

    mahasiswaList.forEach(mhs => {
      if (filterHadir && mhs.status !== "Hadir") return;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${mhs.nim}</td>
        <td>${mhs.nama}</td>
        <td>${mhs.prodi}</td>
        <td style="font-weight:bold; color:${mhs.status === "Hadir" ? "green" : "red"}">
          ${mhs.status}
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderRekap(mahasiswaList);
  }

  // === Rekap Per Prodi + Grafik ===
  function renderRekap(mahasiswaList) {
    const rekapDiv = document.getElementById("rekapProdi");
    const rekap = {};

    mahasiswaList.forEach(mhs => {
      if (mhs.status === "Hadir") {
        if (!rekap[mhs.prodi]) rekap[mhs.prodi] = 0;
        rekap[mhs.prodi]++;
      }
    });

    let html = `<h3>Rekap Kehadiran Per Prodi</h3>`;
    for (let prodi in rekap) {
      html += `<p>${prodi}: ${rekap[prodi]} hadir</p>`;
    }
    rekapDiv.innerHTML = html + `<canvas id="rekapChart" style="max-width:600px; margin-top:20px;"></canvas>`;

    // === Buat grafik ===
    const ctx = document.getElementById("rekapChart").getContext("2d");
    if (chart) chart.destroy(); // hapus grafik lama
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(rekap),
        datasets: [{
          label: "Jumlah Hadir",
          data: Object.values(rekap),
          backgroundColor: "rgba(54, 162, 235, 0.7)"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, precision: 0 }
        }
      }
    });
  }

  // === Ambil data realtime dari Firebase ===
  db.ref("mahasiswa").on("value", snapshot => {
    dataCache = snapshot.val() || {};
    renderTable(Object.values(dataCache));
  });

  // === Filter hadir saat checkbox dicentang ===
  filterHadirCheckbox.addEventListener("change", () => {
    renderTable(Object.values(dataCache));
  });

  // === Input Scan Barcode NIM ===
  document.getElementById("scanInput").addEventListener("keypress", e => {
    if (e.key === "Enter") {
      const nim = e.target.value.trim();
      if (nim) tandaiHadir(nim);
      e.target.value = "";
    }
  });

  // === Fungsi Tandai Hadir ===
  function tandaiHadir(nim) {
    if (dataCache[nim]) {
      db.ref("mahasiswa/" + nim + "/status").set("Hadir");
      showToast(`${nim} - ${dataCache[nim].nama} sudah hadir`);
    } else {
      showToast(`NIM ${nim} tidak ditemukan`, true);
    }
  }

  // === Toast Notifikasi ===
  function showToast(msg, isError = false) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.style.background = isError ? "#dc3545" : "#28a745";
    toast.style.display = "block";
    setTimeout(() => toast.style.display = "none", 3000);
  }

  // === Download Kehadiran ===
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const ws = XLSX.utils.json_to_sheet(Object.values(dataCache));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");
    XLSX.writeFile(wb, "rekap_kehadiran.xlsx");
  });

  // === Reset Kehadiran ===
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Yakin reset kehadiran semua mahasiswa?")) return;
    Object.keys(dataCache).forEach(nim => {
      db.ref("mahasiswa/" + nim + "/status").set("Belum Hadir");
    });
    alert("✅ Semua status kehadiran berhasil direset");
  });

  // === Hapus Semua Data ===
  document.getElementById("clearBtn").addEventListener("click", () => {
    console.log("⚡ Tombol hapus diklik");
    if (!confirm("Yakin hapus semua data mahasiswa?")) return;
    db.ref("mahasiswa").remove().then(() => {
      dataCache = {};
      renderTable([]);
      if (chart) chart.destroy(); // hapus grafik juga
      document.getElementById("rekapProdi").innerHTML = "";
      alert("✅ Semua data mahasiswa berhasil dihapus");
    }).catch(err => {
      alert("❌ Gagal hapus data: " + err.message);
    });
  });

});
