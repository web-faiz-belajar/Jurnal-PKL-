
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

// Ketika pengguna memilih foto
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];

  clearPreview();

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    statusText.textContent = "File harus berupa gambar.";
    statusText.style.color = "#f87171";
    fileInput.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    statusText.textContent = "Ukuran foto maksimal 5 MB.";
    statusText.style.color = "#f87171";
    fileInput.value = "";
    return;
  }

  // Tampilkan foto
  previewURL = URL.createObjectURL(file);
  previewImage.src = previewURL;

  fileName.textContent = file.name;

  previewBox.hidden = false;

  statusText.textContent = "";
});

// Tombol hapus foto
removeButton.addEventListener("click", () => {
  fileInput.value = "";
  clearPreview();
  statusText.textContent = "Foto dihapus.";
  statusText.style.color = "#94a3b8";
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
  statusText.textContent = "Sedang memproses data...";

  try {
    const file = fileInput.files[0];

    let fileData = null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        throw new Error("File harus berupa gambar.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran foto maksimal 5 MB.");
      }

      fileData = {
        name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
        type: "image/jpeg",
        data: await compressImage(file)
      };
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

    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data)
    });

    statusText.textContent =
      "Permintaan telah dikirim. Periksa Google Sheets untuk memastikan laporan tersimpan.";

    statusText.style.color = "#60a5fa";

    form.reset();
    clearPreview();

    document.getElementById("tanggal").value =
      new Date().toLocaleDateString("en-CA");

  } catch (error) {
    statusText.textContent = error.message;
    statusText.style.color = "#f87171";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim Laporan";
  }
});
