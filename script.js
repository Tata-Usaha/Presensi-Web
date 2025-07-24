const firebaseConfig = {
  apiKey: "AIzaSyCDpuIMrr6OcqhzeU54PxA5ecONwck-wng",
  authDomain: "sistem-absensi-tata-usaha.firebaseapp.com",
  databaseURL: "https://sistem-absensi-tata-usaha-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sistem-absensi-tata-usaha",
  storageBucket: "sistem-absensi-tata-usaha.appspot.com",
  messagingSenderId: "136085367799",
  appId: "1:136085367799:web:588762506e6c9874f95cf2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let mahasiswaList = {};

function renderTabel() {
  const tbody = document.getElementById("tabelMahasiswa");
  const filterHadir = document.getElementById("filterHadir").checked;
  tbody.innerHTML = "";

  Object.values(mahasiswaList).forEach(m => {
    if (filterHadir && !m.hadir) return;
    const row = document.createElement("tr");
    row.className = m.hadir ? "hadir" : "";
    row.innerHTML = `
      <td>${m.nim}</td>
      <td>${m.nama}</td>
      <td>${m.prodi}</td>
      <td>${m.hadir ? "Hadir" : "Belum Hadir"}</td>`;
    tbody.appendChild(row);
  });
}

// Tampilkan toast notifikasi
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 2500);
}

// Load data realtime
db.ref("mahasiswa").on("value", snapshot => {
  if (snapshot.exists()) {
    mahasiswaList = snapshot.val();
    renderTabel();
  }
});

// Filter checkbox
document.getElementById("filterHadir").addEventListener("change", renderTabel);

// Upload Excel
document.getElementById("uploadExcel").addEventListener("change", function(e) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    const updates = {};
    json.forEach(m => {
      const nim = String(m.nim);
      updates[nim] = {
        nim: nim,
        nama: m.nama,
        prodi: m.prodi || "-",
        hadir: false
      };
    });
    db.ref("mahasiswa").update(updates);
    showToast("Data mahasiswa berhasil diunggah");
  };
  reader.readAsArrayBuffer(e.target.files[0]);
});

// Scan barcode input
document.getElementById("scanInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    const scannedNIM = e.target.value.trim();
    const mahasiswa = mahasiswaList[scannedNIM];
    if (mahasiswa) {
      db.ref("mahasiswa/" + scannedNIM).update({ hadir: true });
      showToast(`${mahasiswa.nama} telah hadir`);
    } else {
      showToast(`NIM ${scannedNIM} tidak ditemukan`);
    }
    e.target.value = "";
  }
});

// Download rekap
document.getElementById("downloadBtn").addEventListener("click", function () {
  const data = Object.values(mahasiswaList).map(m => ({
    NIM: m.nim,
    Nama: m.nama,
    Prodi: m.prodi,
    Kehadiran: m.hadir ? "Hadir" : "Belum Hadir"
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Presensi");
  XLSX.writeFile(workbook, "rekap_presensi.xlsx");
});

// Reset semua ke Belum Hadir

document.getElementById("resetBtn").addEventListener("click", function () {
  if (confirm("Yakin ingin mereset semua status ke 'Belum Hadir'?")) {
    const updates = {};
    Object.keys(mahasiswaList).forEach(nim => {
      updates[nim + "/hadir"] = false;
    });
    db.ref("mahasiswa").update(updates);
    showToast("Status kehadiran telah direset");
  }
});

// Hapus semua data
document.getElementById("clearBtn").addEventListener("click", function () {
  if (confirm("Hapus semua data dari sistem ini?")) {
    db.ref("mahasiswa").remove();
    showToast("Semua data telah dihapus");
  }
});
