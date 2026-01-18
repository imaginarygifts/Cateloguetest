import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById("productGrid");
const categoryBar = document.getElementById("categoryBar");

let allProducts = [];
let allCategories = [];
let activeCategory = "all";

async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCategoryBar();
}

function renderCategoryBar() {
  categoryBar.innerHTML = "";

  const allBtn = createCategoryBtn("All", "all");
  categoryBar.appendChild(allBtn);

  allCategories.forEach(cat => {
    const btn = createCategoryBtn(cat.name, cat.id);
    categoryBar.appendChild(btn);
  });
}

function createCategoryBtn(label, id) {
  const div = document.createElement("div");
  div.className = "category-pill" + (activeCategory === id ? " active" : "");
  div.innerText = label;

  div.onclick = () => {
    activeCategory = id;
    document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
    div.classList.add("active");
    renderProducts();
  };

  return div;
}

async function loadProducts() {
  const snap = await getDocs(collection(db, "products"));
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
}

function renderProducts() {
  grid.innerHTML = "";

  const filtered = activeCategory === "all"
    ? allProducts
    : allProducts.filter(p => p.categoryId === activeCategory);

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img src="${p.images?.[0] || ''}">
      <div class="info">
        <h4>${p.name}</h4>
        <p>₹${p.basePrice}</p>
      </div>
    `;

    card.onclick = () => {
      location.href = `product.html?id=${p.id}`;
    };

    grid.appendChild(card);
  });
}

// Init
loadCategories();
loadProducts();