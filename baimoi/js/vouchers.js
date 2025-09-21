// Quản lý voucher, tip và cập nhật giá cho thanh toán

// Danh sách vouchers fake để test UI
export const fakeVouchers = [
  {
    code: 'LOVE20',
    discountValue: 20,
    expiredAt: new Date(Date.now() + 7*24*60*60*1000).toISOString(), // 7 ngày nữa
  },
  {
    code: 'GALAXY10',
    discountValue: 10,
    expiredAt: new Date(Date.now() + 3*24*60*60*1000).toISOString(), // 3 ngày nữa
  },
  {
    code: 'VIP50',
    discountValue: 50,
    expiredAt: new Date(Date.now() + 30*24*60*60*1000).toISOString(), // 30 ngày nữa
  },
];

let selectedVoucher = null;
let vouchers = [];
let finalPrice = 0;

export function updateTotalPrice(getDynamicPrice) {
  const voucherList = document.getElementById('voucherList');
  const totalPriceDiv = document.getElementById('totalPrice');
  const tipInput = document.getElementById('tipAmount');
  const tip = tipInput ? parseInt(tipInput.value, 10) || 0 : 0;
  
  // Sửa logic để lấy giá đúng
  let price = 0;
  if (typeof getDynamicPrice === 'function') {
    price = getDynamicPrice();
  } else if (typeof getDynamicPrice === 'number') {
    price = getDynamicPrice;
  }
  
  if (selectedVoucher) {
    price = price - Math.round(price * selectedVoucher.discountValue / 100);
  }
  
  finalPrice = price + tip;
  
  if (totalPriceDiv) {
    if (selectedVoucher) {
      totalPriceDiv.innerHTML = `<span style=\"color:#e53935;\">${finalPrice.toLocaleString()} VNĐ</span> <span style=\"font-size:14px;color:#888;\">(đã áp dụng voucher${tip > 0 ? `, tip ${tip.toLocaleString()} VNĐ` : ''})</span>`;
    } else {
      totalPriceDiv.innerHTML = `<span style=\"color:#6c63ff;\">${finalPrice.toLocaleString()} VNĐ</span>${tip > 0 ? ` <span style=\"font-size:14px;color:#888;\">(tip ${tip.toLocaleString()} VNĐ)</span>` : ''}`;
    }
  }
}

export async function loadUserVouchers(dynamicPrice) {
  const voucherList = document.getElementById('voucherList');
  const voucherResult = document.getElementById('voucherResult');
  if (!voucherList) return;
  voucherList.innerHTML = 'Đang tải voucher...';
  if (voucherResult) voucherResult.style.display = 'none';
  selectedVoucher = null;
  vouchers = [];
  updateTotalPrice(dynamicPrice);
  const uid = localStorage.getItem('user_uid');

  if (!uid) {
    console.log("Không đăng nhập");
    // Nếu không đăng nhập, hiển thị fake vouchers để test UI
    vouchers = fakeVouchers;
    voucherList.innerHTML = vouchers.map((v, idx) => `
      <div class=\"voucher-item\" data-idx=\"${idx}\">\n        <input class= \"checkbox\" type=\"checkbox\" name=\"voucher\" id=\"voucher_${idx}\">\n        <label for=\"voucher_${idx}\">\n          <b>${v.code}</b> - Giảm: ${v.discountValue}% | HSD: ${new Date(v.expiredAt).toLocaleDateString()}\n        </label>\n      </div>\n    `).join('');
    selectedVoucher = null;
    updateTotalPrice(dynamicPrice);
    return;
  }
  try {
    const res = await fetch(`https://dearlove-backend.onrender.com/api/vouchers/saved/${uid}`);
    const data = await res.json();
   if (!data.success) {
      voucherList.innerHTML = `<span style="color:#e53935;">${data.message}</span>`;
      return;
    }
    if (!data.data.length) {
      voucherList.innerHTML = '<span style="color:#888;">Bạn không có voucher nào cả!</span>';
      return;
    }
    vouchers = data.data; 
    // vouchers =fakeVouchers;
    voucherList.innerHTML = vouchers.map((v, idx) => `
      <div class=\"voucher-item\" data-idx=\"${idx}\">\n        <input class= \"checkbox\" type=\"checkbox\" name=\"voucher\" id=\"voucher_${idx}\">\n        <label for=\"voucher_${idx}\">\n          <b>${v.code}</b> - Giảm: ${v.discountValue}% | HSD: ${new Date(v.expiredAt).toLocaleDateString()}\n        </label>\n      </div>\n    `).join('');
    selectedVoucher = null; // Không chọn mặc định
    updateTotalPrice(dynamicPrice);
  } catch (err) {
    voucherList.innerHTML = '<span style=\"color:#e53935;\">Không thể tải voucher!</span>';
  }
}

export function setupVoucherListeners(getDynamicPrice) {
  // getDynamicPrice là hàm callback trả về tổng tiền động
  const voucherList = document.getElementById('voucherList');
  if (voucherList) {
    voucherList.addEventListener('change', (e) => {
      if (e.target.name === 'voucher') {
        const checkboxes = voucherList.querySelectorAll('input[name=\"voucher\"]');
        const idx = Array.from(checkboxes).findIndex(cb => cb === e.target);
        if (e.target.checked) {
          checkboxes.forEach((cb, i) => cb.checked = i === idx);
          selectedVoucher = vouchers[idx];
        } else {
          selectedVoucher = null;
        }
        updateTotalPrice(getDynamicPrice());
      }
    });
  }
  // Lắng nghe tip
  const tipInput = document.getElementById('tipAmount');
  if (tipInput) {
    tipInput.addEventListener('input', () => updateTotalPrice(getDynamicPrice()));
  }
}

export function getSelectedVoucherCode() {
  return selectedVoucher ? selectedVoucher.code : null;
}

export function getFinalPrice() {
  return finalPrice;
} 