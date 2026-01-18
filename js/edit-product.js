import { db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Get ID
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (!id) {
  alert("Product ID missing");
}

// Inputs
const nameInput = document.getElementById("name");
const descInput = document.getElementById("desc");
const priceInput = document.getElementById("price");
const catSelect = document.getElementById("category");

const preview = document.getElementById("imagePreview");
const newImagesInput = document.getElementById("newImages");

// Variant inputs
const editColorName = document.getElementById("editColorName");
const editColorPrice = document.getElementById("editColorPrice");
const editColorList = document.getElementById("editColorList");

const editSizeName = document.getElementById("editSizeName");
const editSizePrice = document.getElementById("editSizePrice");
const editSizeList = document.getElementById("editSizeList");

// Custom options
const editCustomType = document.getElementById("editCustomType");
const editCustomLabel = document.getElementById("editCustomLabel");
const editCustomPrice = document.getElementById("editCustomPrice");
const editCustomChoices = document.getElementById("editCustomChoices");
const editCustomList = document.getElementById("editCustomList");

// Related Designs
let relatedDesigns = [];
let allProducts = [];

// State
let existingImages = [];
let newImages = [];

let colors = [];
let sizes = [];
let customOptions = [];

// Popup
function showPopup(msg) {
  const p = document.getElementById("popup");
  p.innerText = msg;
  p.classList.remove("hidden");
}

function hidePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// Accordion toggle
window.toggleSection = (id) => {
  document.getElementById(id).classList.toggle("hidden");
};

// Load categories
async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  catSelect.innerHTML = `<option value="">Select category</option>`;
  snap.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.innerText = d.data().name;
    catSelect.appendChild(opt);
  });
}

// Load product
async function loadProduct() {
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) {
    alert("Product not found");
    return;
  }

  const p = snap.data();

  nameInput.value = p.name || "";
  descInput.value = p.description || "";
  priceInput.value = p.basePrice || "";
  catSelect.value = p.categoryId || "";

  existingImages = p.images || [];

  colors = p.variants?.colors || [];
  sizes = p.variants?.sizes || [];
  customOptions = p.customOptions || [];
  relatedDesigns = p.relatedDesigns || [];

  renderImagePreview();
  renderColors();
  renderSizes();
  renderCustomOptions();
  loadDesignProducts();
}

// ========== IMAGE PREVIEW ==========
function renderImagePreview() {
  preview.innerHTML = "";

  existingImages.forEach((url, index) => {
    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = url;

    const del = document.createElement("span");
    del.innerText = "×";
    del.onclick = () => {
      existingImages.splice(index, 1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);
  });

  newImages.forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    const del = document.createElement("span");
    del.innerText = "×";
    del.onclick = () => {
      newImages.splice(index, 1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);
  });
}

newImagesInput.addEventListener("change", () => {
  const files = Array.from(newImagesInput.files);
  files.forEach(file => newImages.push(file));
  renderImagePreview();
});

// ========== COLORS ==========
window.addEditColor = () => {
  const name = editColorName.value.trim();
  const price = Number(editColorPrice.value || 0);
  if (!name) return;

  colors.push({ name, price });
  renderColors();
  editColorName.value = "";
  editColorPrice.value = "";
};

function renderColors() {
  editColorList.innerHTML = "";
  colors.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerText = `${c.name} (+₹${c.price}) ❌`;
    div.onclick = () => {
      colors.splice(i, 1);
      renderColors();
    };
    editColorList.appendChild(div);
  });
}

// ========== SIZES ==========
window.addEditSize = () => {
  const name = editSizeName.value.trim();
  const price = Number(editSizePrice.value || 0);
  if (!name) return;

  sizes.push({ name, price });
  renderSizes();
  editSizeName.value = "";
  editSizePrice.value = "";
};

function renderSizes() {
  editSizeList.innerHTML = "";
  sizes.forEach((s, i) => {
    const div = document.createElement("div");
    div.innerText = `${s.name} (+₹${s.price}) ❌`;
    div.onclick = () => {
      sizes.splice(i, 1);
      renderSizes();
    };
    editSizeList.appendChild(div);
  });
}

// ========== CUSTOM OPTIONS ==========
window.addEditCustomOption = () => {
  const type = editCustomType.value;
  const label = editCustomLabel.value.trim();
  const price = Number(editCustomPrice.value || 0);
  const choicesRaw = editCustomChoices.value;

  if (!label) return;

  const option = { type, label, price };

  if (type === "dropdown") {
    option.choices = choicesRaw
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);
  }

  customOptions.push(option);
  renderCustomOptions();

  editCustomLabel.value = "";
  editCustomPrice.value = "";
  editCustomChoices.value = "";
};

function renderCustomOptions() {
  editCustomList.innerHTML = "";
  customOptions.forEach((o, i) => {
    const div = document.createElement("div");
    div.innerText = `${o.type}: ${o.label} (+₹${o.price}) ❌`;
    div.onclick = () => {
      customOptions.splice(i, 1);
      renderCustomOptions();
    };
    editCustomList.appendChild(div);
  });
}

// ========== RELATED DESIGNS ==========
async function loadDesignProducts() {
  const snap = await getDocs(collection(db, "products"));
  allProducts = [];

  snap.forEach(d => {
    allProducts.push({ id: d.id, ...d.data() });
  });

  renderDesignList(allProducts);
}

function renderDesignList(list) {
  const box = document.getElementById("designList");
  if (!box) return;

  box.innerHTML = "";

  list.forEach(p => {
    if (p.id === id) return;

    const row = document.createElement("div");
    row.className = "design-item";

    const checked = relatedDesigns.includes(p.id);

    row.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleDesign('${p.id}')">
      <img src="${p.images?.[0] || ''}">
      <span>${p.name}</span>
    `;

    box.appendChild(row);
  });
}

window.toggleDesign = function(pid) {
  if (relatedDesigns.includes(pid)) {
    relatedDesigns = relatedDesigns.filter(x => x !== pid);
  } else {
    relatedDesigns.push(pid);
  }
};

window.filterDesigns = function() {
  const q = document.getElementById("designSearch").value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(q)
  );
  renderDesignList(filtered);
};
// ========== UPDATE PRODUCT (WITH RELATED DESIGNS) ==========
window.updateProduct = async () => {
  const name = nameInput.value.trim();
  const price = priceInput.value;
  const cat = catSelect.value;

  if (!name || !price || !cat) {
    showPopup("⚠ Fill all required fields");
    setTimeout(hidePopup, 1500);
    return;
  }

  try {
    showPopup("Uploading images...");

    const finalImages = [...existingImages];

    for (let file of newImages) {
      const r = ref(storage, `products/${Date.now()}-${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      finalImages.push(url);
    }

    showPopup("Saving changes...");

    // Update THIS product
    await updateDoc(doc(db, "products", id), {
      name,
      description: descInput.value,
      basePrice: Number(price),
      categoryId: cat,
      images: finalImages,
      variants: {
        colors,
        sizes
      },
      customOptions,
      relatedDesigns
    });

    // ========== BIDIRECTIONAL LINKING ==========
    for (const rid of relatedDesigns) {
      const refDoc = doc(db, "products", rid);
      const snap = await getDoc(refDoc);

      if (snap.exists()) {
        const data = snap.data();
        const arr = data.relatedDesigns || [];

        if (!arr.includes(id)) {
          arr.push(id);
          await updateDoc(refDoc, { relatedDesigns: arr });
        }
      }
    }

    showPopup("✅ Product updated");

    setTimeout(() => {
      hidePopup();
      location.href = "products.html";
    }, 1200);

  } catch (e) {
    showPopup("❌ " + e.message);
  }
};

// INIT
loadCategories().then(loadProduct);