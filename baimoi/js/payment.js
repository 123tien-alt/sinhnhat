// js/payment.js - Logic xử lý thanh toán

/**
 * Hàm xử lý thanh toán
 * @param {number} finalPrice - Giá tiền cần thanh toán
 * @param {Function} showToast - Hàm hiển thị thông báo
 * @param {HTMLElement} loading - Element loading (nếu có)
 * @returns {Promise<boolean>} - Trả về true nếu thanh toán thành công, false nếu thất bại
 */
export async function processPayment(finalPrice, showToast, loading = null) {
  // --- BẮT ĐẦU: Thanh toán trước ---
  try {
    showToast('Đang chuyển đến trang thanh toán...', 'info');
    
    // Chuẩn bị dữ liệu thanh toán
    const paymentData = {
      amount: finalPrice,
      description: "Thiên hà advanced",
      orderCode: Math.floor(100000 + Math.random() * 900000),      
      uid:localStorage.getItem('user_uid') ,
    };
    console.log(">> Gửi yêu cầu thanh toán...");
    const res = await fetch('https://dearlove-backend.onrender.com/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });

    const resultData = await res.json();
    console.log(">> Kết quả từ server:", resultData);

    if (resultData.data && resultData.data.checkoutUrl) {
      // Hiển thị modal thanh toán
      const paymentModal = document.getElementById('paymentModal');
      const paymentIframe = document.getElementById('paymentIframe');
      
      if (paymentModal && paymentIframe) {
        paymentIframe.src = resultData.data.checkoutUrl;
        paymentModal.style.display = 'block';

        // Lắng nghe message từ iframe
        await new Promise((resolve, reject) => {
          function handlePaymentMessage(event) {
            // Có thể kiểm tra event.origin nếu cần bảo mật hơn
            if (event.data && event.data.type === 'paymentSuccess') {
              console.log('Thanh toán thành công:', event.data);
              paymentModal.style.display = 'none';
              if (loading) loading.style.display = 'block';
              window.removeEventListener('message', handlePaymentMessage);
              resolve();
            }
            if (event.data && event.data.type === 'paymentCancel') {
              console.log('Thanh toán bị hủy:', event.data);
              paymentModal.style.display = 'none';
              window.removeEventListener('message', handlePaymentMessage);
              reject(new Error('Thanh toán bị hủy!'));
            }
          }
          window.addEventListener('message', handlePaymentMessage);
        });
        
        showToast('Thanh toán thành công! Đang tạo thiên hà...', 'success');
        return true;
      } else {
        console.error('Không tìm thấy modal thanh toán!');
        showToast('Lỗi hiển thị trang thanh toán!', 'error');
        return false;
      }
    } else {
      console.error('Không lấy được link thanh toán! paymentResult:', resultData);
      showToast('Không lấy được link thanh toán!', 'error');
      return false;
    }
  } catch (err) {
    console.error('Lỗi khi gọi API thanh toán:', err);
    showToast('Thanh toán thất bại hoặc bị hủy!', 'error');
    return false;
  }
}

/**
 * Hàm tạo modal thanh toán nếu chưa có
 */
export function createPaymentModal() {
  // Kiểm tra xem modal đã tồn tại chưa
  if (document.getElementById('paymentModal')) {
    return;
  }

  const modalHTML = `
    <div id="paymentModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000;">
      <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 10px; width: 90%; max-width: 800px; height: 80%; max-height: 600px; position: relative;">
          <button onclick="document.getElementById('paymentModal').style.display='none'" 
                  style="position: absolute; top: 10px; right: 10px; background: #ff6b6b; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 10001;">
            ×
          </button>
          <iframe id="paymentIframe" 
                  style="width: 100%; height: 100%; border: none; border-radius: 10px;" 
                  frameborder="0">
          </iframe>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Hàm hiển thị toast message (có thể tùy chỉnh)
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại thông báo (success, error, info, warning)
 */
export function showToast(message, type = 'info') {
  // Tạo toast element nếu chưa có
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10002;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(toastContainer);
  }

  // Tạo toast message
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  // Thêm CSS animation
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  toastContainer.appendChild(toast);

  // Tự động xóa sau 3 giây
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
} 