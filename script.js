import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDisFo00PlO8R3bTS7QUWuLugo6GjfKXV8",
  authDomain: "tata-usaha-upb.firebaseapp.com",
  databaseURL: "https://tata-usaha-upb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tata-usaha-upb",
  storageBucket: "tata-usaha-upb.appspot.com",
  messagingSenderId: "471854433398",
  appId: "1:471854433398:web:dedad6ae4ffe21f2888b57"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let mahasiswaDB = {};
const tabel = document.getElementById("tabelPresensi");
const input = document.getElementById("scanInput");

function renderRow(nim, data) {
  const row = document.createElement("tr");
  row.classList.add("hadir");
  row.innerHTML = `
    <td>${nim}</td>
    <td>${data.nama}</td>
    <td>${data.prodi}</td>
  `;
  tabel.appendChild(row);
}

function loadPresensi() {
  const presensiRef = ref(db, "presensi");
  onValue(presensiRef, (snapshot) => {
    tabel.innerHTML = "";
    snapshot.forEach(child => {
      renderRow(child.key, child.val());
    });
  });
}

input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    const nim = input.value.trim();
    const mhs = mahasiswaDB[nim];
    if (mhs) {
      const waktu = new Date().toISOString();
      set(ref(db, "presensi/" + nim), {
        nim: nim,
        nama: mhs.nama,
        prodi: mhs.prodi || "-",
      });
    }
    input.value = "";
  }
});

document.getElementById("uploadExcel").addEventListener("change", function (e) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    mahasiswaDB = {};
    json.forEach(m => {
      mahasiswaDB[String(m.nim)] = {
        nama: m.nama,
        prodi: m.prodi || "-"
      };
    });
  };
  document.getElementById("uploadExcel").addEventListener("change", function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function(event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    
    mahasiswaDB = {};
    json.forEach(m => {
      mahasiswaDB[String(m.nim)] = {
        nama: m.nama,
        prodi: m.prodi || "-"
      };
    });

    alert("Data berhasil dimuat dari Excel!");
  };

  reader.readAsArrayBuffer(file);
});
  reader.readAsArrayBuffer(e.target.files[0]);
});

document.getElementById("downloadBtn").addEventListener("click", function () {
  get(ref(db, "presensi")).then(snapshot => {
    const data = [];
    snapshot.forEach(child => data.push(child.val()));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presensi");
    XLSX.writeFile(workbook, "rekap_presensi.xlsx");
  });
});

document.getElementById("resetBtn").addEventListener("click", function () {
  if (confirm("Yakin ingin mereset semua data presensi?")) {
    remove(ref(db, "presensi"));
  }
});

document.getElementById("searchInput").addEventListener("input", function (e) {
  const keyword = e.target.value.toLowerCase();
  const rows = tabel.querySelectorAll("tr");
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(keyword) ? "" : "none";
  });
});

loadPresensi();
