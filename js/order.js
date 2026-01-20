// ===== GLOBAL STATE =====
let orderData = null;
let subTotal = 0;
let discount = 0;
let finalAmount = 0;
let appliedCoupon = null;
let selectedPaymentMode = "online";

// ===== LOAD ORDER DATA =====
function loadOrder() {
  const raw = localStorage.getItem("checkoutData");
  if (!raw) {
    alert("No product selected");
    location.href = "index.html";
    return;
  }

  orderData = JSON.parse(raw);
  subTotal = orderData.finalPrice;

  renderSummary();
  setupPaymentModes();
  recalcPrice();
}

loadOrder();

// ===== RENDER SUMMARY =====
function renderSummary() {
  const box = document.getElementById("orderSummary");

  let html = `
    <div><b>${orderData.product.name}</b></div>
    <div>Base Price: ₹${orderData.product.basePrice}</div>
  `;

  if (orderData.color) html += `<div>Color: ${orderData.color.name}</div>`;
  if (orderData.size) html += `<div>Size: ${orderData.size.name}</div>`;

  if (orderData.options && Object.keys(orderData.options).length) {
    html += `<div style="margin-top:6px">Options:</div>`;
    Object.keys(orderData.options).forEach(i => {
      const label = orderData.product.customOptions[i].label;
      const value = orderData.optionValues[i] || "Selected";
      html += `<div>- ${label}: ${value}</div>`;
    });
  }

  box.innerHTML = html;
}

// ===== PAYMENT MODE FILTER =====
function setupPaymentModes() {
  const ps = orderData.product.paymentSettings || {};

  const onlineLabel = document.getElementById("onlineOption");
  const codLabel = document.getElementById("codOption");
  const advanceLabel = document.getElementById("advanceOption");

  if (!ps.online?.enabled && onlineLabel) onlineLabel.style.display = "none";
  if (!ps.cod?.enabled && codLabel) codLabel.style.display = "none";
  if (!ps.advance?.enabled && advanceLabel) advanceLabel.style.display = "none";

  if (ps.online?.enabled) selectedPaymentMode = "online";
  else if (ps.cod?.enabled) selectedPaymentMode = "cod";
  else if (ps.advance?.enabled) selectedPaymentMode = "advance";

  const firstRadio = document.querySelector(`input[value="${selectedPaymentMode}"]`);
  if (firstRadio) firstRadio.checked = true;

  document.querySelectorAll("input[name='paymode']").forEach(radio => {
    radio.addEventListener("change", () => {
      selectedPaymentMode = radio.value;
      recalcPrice();
    });
  });
}

// ===== PRICE =====
function recalcPrice() {
  finalAmount = subTotal - discount;
  if (finalAmount < 0) finalAmount = 0;

  document.getElementById("subTotal").innerText = "₹" + subTotal;
  document.getElementById("discountAmount").innerText = "-₹" + discount;
  document.getElementById("finalAmount").innerText = "₹" + finalAmount;
}

// ===== COUPON =====
window.applyCoupon = function () {
  const code = document.getElementById("couponInput").value.trim().toUpperCase();
  const msg = document.getElementById("couponMsg");

  if (!code) return;

  if (code === "WELCOME10") {
    discount = Math.round(subTotal * 0.1);
    appliedCoupon = code;
    msg.innerText = "Coupon applied: 10% OFF";
    msg.style.color = "#00ff9c";
  } else {
    discount = 0;
    appliedCoupon = null;
    msg.innerText = "Invalid coupon";
    msg.style.color = "red";
  }

  recalcPrice();
};

// ===== VALIDATION =====
function validateForm() {
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const pincode = document.getElementById("custPincode").value.trim();

  if (!name || !phone || !address || !pincode) {
    alert("Please fill all fields");
    return false;
  }

  return { name, phone, address, pincode };
}

// ===== PLACE ORDER =====
window.placeOrder = function () {
  const customer = validateForm();
  if (!customer) return;

  if (selectedPaymentMode === "cod") {
    sendWhatsApp("COD");
  } else {
    startPayment(customer);
  }
};

// ===== WHATSAPP =====
function sendWhatsApp(mode, paymentId = null) {
  let msg = `🛍 New Order — Imaginary Gifts\n\n`;

  msg += `Name: ${custName.value}\n`;
  msg += `Phone: ${custPhone.value}\n`;
  msg += `Address: ${custAddress.value}\n`;
  msg += `Pincode: ${custPincode.value}\n\n`;

  msg += `Product: ${orderData.product.name}\n`;

  if (orderData.color) msg += `Color: ${orderData.color.name}\n`;
  if (orderData.size) msg += `Size: ${orderData.size.name}\n`;

  if (orderData.options && Object.keys(orderData.options).length) {
    msg += `Options:\n`;
    Object.keys(orderData.options).forEach(i => {
      const label = orderData.product.customOptions[i].label;
      const value = orderData.optionValues[i] || "Selected";
      msg += `- ${label}: ${value}\n`;
    });
  }

  msg += `\nSubtotal: ₹${subTotal}\n`;
  msg += `Discount: ₹${discount}\n`;
  msg += `Total: ₹${finalAmount}\n`;
  msg += `Payment Mode: ${mode}\n`;

  if (paymentId) msg += `Payment ID: ${paymentId}\n`;

  const url = `https://wa.me/917030191819?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// ===== RAZORPAY =====
function startPayment(customer) {
  const options = {
    key: "rzp_live_pfVyI37GhqWTGK",
    amount: finalAmount * 100,
    currency: "INR",
    name: "Imaginary Gifts",
    description: "Order Payment",
    handler: function (response) {
      sendWhatsApp("Online", response.razorpay_payment_id);
    },
    prefill: {
      name: customer.name,
      contact: customer.phone
    },
    theme: {
      color: "#00f5ff"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}