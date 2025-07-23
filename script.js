// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCDpuIMrr6OcqhzeU54PxA5ecONwck-wng",
  authDomain: "sistem-absensi-tata-usaha.firebaseapp.com",
    databaseURL: "https://sistem-absensi-tata-usaha-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sistem-absensi-tata-usaha",
  storageBucket: "sistem-absensi-tata-usaha.appspot.com",
  messagingSenderId: "136085367799",
  appId: "1:136085367799:web:588762506e6c9874f95cf2",
  measurementId: "G-XT456P4P6G"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let mahasiswaList = [];

function renderTabel() {
  const tbody = document.getElementById("tabelMahasiswa");
  tbody.innerHTML = "";
  mahasiswaList.forEach(m => {
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

// Load from Firebase on load
db.ref("mahasiswa").once("value", snapshot => {
  if (snapshot.exists()) {
    mahasiswaList = snapshot.val();
    renderTabel();
  }
});

document.getElementById("uploadExcel").addEventListener("change", function(e) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    mahasiswaList = json.map(m => ({
      nim: String(m.nim),
      nama: m.nama,
      prodi: m.prodi || "-",
      hadir: false
    }));
    db.ref("mahasiswa").set(mahasiswaList);
    renderTabel();
  };
  reader.readAsArrayBuffer(e.target.files[0]);
});

document.getElementById("scanInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    const scannedNIM = e.target.value.trim();
    const found = mahasiswaList.find(m => m.nim === scannedNIM);
    if (found) {
      found.hadir = true;
      db.ref("mahasiswa").set(mahasiswaList);
      renderTabel();
    }
    e.target.value = "";
  }
});

document.getElementById("downloadBtn").addEventListener("click", function () {
  const data = mahasiswaList.map(m => ({
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

document.getElementById("resetBtn").addEventListener("click", function () {
  if (confirm("Yakin ingin mereset semua status ke 'Belum Hadir'?")) {
    mahasiswaList.forEach(m => m.hadir = false);
    db.ref("mahasiswa").set(mahasiswaList);
    renderTabel();
  }
});

document.getElementById("clearBtn").addEventListener("click", function () {
  if (confirm("Hapus semua data dari sistem ini?")) {
    mahasiswaList = [];
    db.ref("mahasiswa").remove();
    renderTabel();
  }
});
