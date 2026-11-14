
const API_URL = "https://script.google.com/macros/s/AKfycbxuNLb5_ORqmr2TNxWzNYGg8qDO_wjlDqpwQG-Loc-gV45HEFHcyFZNqGMPOiYjg9z4/exec";

const form = document.getElementById("jurnalForm");
const statusText = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const fileInput = document.getElementById("dokumentasi");
const previewBox = document.getElementById("previewDokumentasi");
const previewImage = document.getElementById("previewFoto");
const fileName = document.getElementById("namaFoto");

let previewURL = null;

document.getElementById("tanggal").value =
  new Date().toLocaleDateString("en-CA");

const removeButton = document.createElement("button");
removeButton.type = "button";
removeButton.className = "preview-remove";
removeButton.textContent = "Hapus foto";
previewBox.appendChild(removeButton);

function clearPreview() {
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
  previewImage.removeAttribute("src");
  fileName.textContent = "Nama foto";
  previewBox.hidden = true;
}

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

removeButton.addEventListener("click", () => {
  fileInput.value = "";
  clearPreview();
  statusText.textContent = "Foto dihapus.";
});

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = () => image.src = reader.result;
    reader.onerror = reject;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / image.width);

      canvas.width = image.width * scale;
      canvas.height = image.height * scale;

      canvas.getContext("2d").drawImage(
        image, 0, 0, canvas.width, canvas.height
      );

      resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
    };

    image.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function checkStatus(requestId) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "jurnalCallback" + Date.now();

    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Waktu pemeriksaan habis."));
    }, 8000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = result => {
      cleanup();
      resolve(result);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Gagal memeriksa status."));
    };

    script.src =
      API_URL +
      "?callback=" + callbackName +
      "&requestId=" + encodeURIComponent(requestId);

    document.body.appendChild(script);
  });
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim laporan...";
  statusText.textContent = "Sedang mengirim laporan...";

  let iframe = null;

  try {
    const file = fileInput.files[0];
    let fileData = null;
    let photoPreview = "";

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran foto maksimal 5 MB.");
      }

      const compressed = await compressImage(file);

      fileData = {
        name: "dokumentasi.jpg",
        type: "image/jpeg",
        data: compressed
      };

      photoPreview = "data:image/jpeg;base64," + compressed;
    }

    const requestId =
      "PKL-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 9);

    const data = {
      tanggal: document.getElementById("tanggal").value,
      nama: document.getElementById("nama").value.trim(),
      kelas: document.getElementById("kelas").value,
      pembimbing: document.getElementById("pembimbing").value.trim(),
      perusahaan: document.getElementById("perusahaan").value.trim(),
      kegiatan: document.getElementById("kegiatan").value.trim(),
      requestId,
      file: fileData
    };

    sessionStorage.setItem("jurnalHasil", JSON.stringify({
      tanggal: data.tanggal,
      nama: data.nama,
      kelas: data.kelas,
      pembimbing: data.pembimbing,
      perusahaan: data.perusahaan,
      kegiatan: data.kegiatan,
      foto: photoPreview
    }));

    sessionStorage.setItem("jurnalStatus", "unknown");
    sessionStorage.setItem("jurnalPesan", "Laporan sedang diproses.");

    iframe = document.createElement("iframe");
    iframe.name = "jurnalFrame";
    iframe.hidden = true;
    document.body.appendChild(iframe);

    const hiddenForm = document.createElement("form");
    hiddenForm.method = "POST";
    hiddenForm.action = API_URL;
    hiddenForm.target = "jurnalFrame";
    hiddenForm.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify(data);

    hiddenForm.appendChild(input);
    document.body.appendChild(hiddenForm);
    hiddenForm.submit();
    hiddenForm.remove();

    let saved = false;

    for (let i = 0; i < 12; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await checkStatus(requestId);

      if (result.success) {
        saved = true;
        break;
      }
    }

    if (!saved) {
      throw new Error(
        "Penyimpanan belum dapat dipastikan. Periksa Google Sheets sebelum mengirim ulang."
      );
    }

    sessionStorage.setItem("jurnalStatus", "success");
    sessionStorage.setItem(
      "jurnalPesan",
      "Laporan berhasil disimpan."
    );

  } catch (error) {
    sessionStorage.setItem("jurnalStatus", "unknown");
    sessionStorage.setItem(
      "jurnalPesan",
      error.message
    );

  } finally {
    if (iframe) iframe.remove();

    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim Laporan";

    window.location.href = "./hasil.html";
  }
});
