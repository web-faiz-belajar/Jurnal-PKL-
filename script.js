
const API_URL = "https://script.google.com/macros/s/AKfycbxj_g35Z7osF60Ocupxd9X4Rg2fjFDEZR1TmFWbaRp1iwSCyaRWFxW6bNA3Mbounc_c/exec";

const form = document.getElementById("jurnalForm");
const statusText = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

const fileInput = document.getElementById("dokumentasi");
const previewBox = document.getElementById("previewDokumentasi");
const previewImage = document.getElementById("previewFoto");
const fileName = document.getElementById("namaFoto");

let previewURL = null;

// Tanggal otomatis
document.getElementById("tanggal").value =
  new Date().toLocaleDateString("en-CA");

// Tombol hapus foto
const removeButton = document.createElement("button");
removeButton.type = "button";
removeButton.className = "preview-remove";
removeButton.textContent = "Hapus foto";

previewBox.appendChild(removeButton);

// Hapus preview
function clearPreview() {
  if (previewURL) {
    URL.revokeObjectURL(previewURL);
    previewURL = null;
  }

  previewImage.removeAttribute("src");
  fileName.textContent = "Nama foto";
  previewBox.hidden = true;
}

// Pilih foto
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];

  clearPreview();

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    statusText.textContent = "File harus berupa gambar.";
    fileInput.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    statusText.textContent = "Ukuran foto maksimal 5 MB.";
    fileInput.value = "";
    return;
  }

  previewURL = URL.createObjectURL(file);
  previewImage.src = previewURL;
  fileName.textContent = file.name;
  previewBox.hidden = false;
  statusText.textContent = "";
});

// Hapus foto
removeButton.addEventListener("click", () => {
  fileInput.value = "";
  clearPreview();
  statusText.textContent = "Foto dihapus.";
});

// Kompres foto
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      image.src = reader.result;
    };

    reader.onerror = reject;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const maxWidth = 1280;
      const scale = Math.min(1, maxWidth / image.width);

      canvas.width = image.width * scale;
      canvas.height = image.height * scale;

      const context = canvas.getContext("2d");

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      resolve(
        canvas.toDataURL("image/jpeg", 0.7).split(",")[1]
      );
    };

    image.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Kirim laporan
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim laporan...";
  statusText.textContent = "Sedang mengirim laporan...";

  try {
    const file = fileInput.files[0];
    let fileData = null;
    let photoPreview = "";

    if (file) {
      if (!file.type.startsWith("image/")) {
        throw new Error("File harus berupa gambar.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran foto maksimal 5 MB.");
      }

      const compressed = await compressImage(file);

      fileData = {
        name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
        type: "image/jpeg",
        data: compressed
      };

      photoPreview = "data:image/jpeg;base64," + compressed;
    }

    const data = {
      tanggal: document.getElementById("tanggal").value,
      nama: document.getElementById("nama").value.trim(),
      kelas: document.getElementById("kelas").value,
      pembimbing: document.getElementById("pembimbing").value.trim(),
      perusahaan: document.getElementById("perusahaan").value.trim(),
      kegiatan: document.getElementById("kegiatan").value.trim(),
      file: fileData
    };

    // Simpan detail untuk halaman hasil
    const report = {
      tanggal: data.tanggal,
      nama: data.nama,
      kelas: data.kelas,
      pembimbing: data.pembimbing,
      perusahaan: data.perusahaan,
      kegiatan: data.kegiatan,
      foto: photoPreview
    };

    sessionStorage.setItem(
      "jurnalHasil",
      JSON.stringify(report)
    );

    // Kirim ke Google Apps Script
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      sessionStorage.setItem("jurnalStatus", "error");
      sessionStorage.setItem(
        "jurnalPesan",
        result.message || "Laporan gagal disimpan."
      );

      window.location.href = "hasil.html";
      return;
    }

    sessionStorage.setItem("jurnalStatus", "success");
    sessionStorage.setItem(
      "jurnalPesan",
      "Laporan berhasil disimpan."
    );

    window.location.href = "hasil.html";

  } catch (error) {
    // Koneksi gagal: belum tentu server gagal menyimpan.
    sessionStorage.setItem("jurnalStatus", "unknown");
    sessionStorage.setItem(
      "jurnalPesan",
      "Respons server tidak dapat dipastikan. Periksa Google Sheets sebelum mengirim ulang agar tidak terjadi laporan ganda."
    );

    window.location.href = "hasil.html";

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim Laporan";
  }
});
