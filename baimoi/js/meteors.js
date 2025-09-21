// Biến cho phép custom màu sao băng
let selectedColor = '#00f0ff'; // Bạn có thể đổi màu này tuỳ ý
let gradientColor1 = '#00f0ff';
let gradientColor2 = '#ffffff';
let isGradientMode = false;
let currentMeteorSpeed = 6; // Giá trị mặc định, sẽ cập nhật theo dashboard
let isMeteorShowerActive = false; // Biến kiểm soát trạng thái bật/tắt mưa sao băng
let isMeteorFeatureEnabled = false; // Biến kiểm tra xem có config mưa sao băng trong URL không

// Export biến để truy cập từ bên ngoài
window.isMeteorShowerActive = isMeteorShowerActive;
window.isMeteorFeatureEnabled = isMeteorFeatureEnabled;

const NUM_GROUPS = 20;
const GROUP_INTERVAL = 300; 
const meteors = [];
const groupDelays = [];
for (let g = 0; g < NUM_GROUPS; g++) {
    groupDelays[g] = g * GROUP_INTERVAL;
}

class Meteor {
    constructor(groupIndex) {
        this.groupIndex = groupIndex;
        this.groupDelay = groupDelays[groupIndex];
        // Thêm delay ngẫu nhiên cho từng sao băng trong tốp (0-900ms)
        this.individualDelay = Math.random() * 8000;
        
        // Thêm delay ngẫu nhiên cho đợt đầu tiên để tránh bay cùng lúc
        const initialRandomDelay = 0;
        
        this.lastStart = Date.now();
        this.active = false;
        
        // Phân bố sao băng theo vùng khác nhau trên màn hình
        const screenWidth = window.innerWidth;
        const regionWidth = screenWidth / NUM_GROUPS;
        const regionStart = this.groupIndex * regionWidth;
        const regionEnd = regionStart + regionWidth;
        this.x = regionStart + Math.random() * regionWidth; // Sao băng chỉ xuất hiện trong vùng của tốp
        
        this.y = -50;
        this.length = Math.random() * 80 + 60;
        this.speed = currentMeteorSpeed;
        this.angle = Math.PI / 12 + (Math.random() - 0.5) * 0.2;
        this.opacity = 0.1;
        this.particles = [];
        this.color1 = gradientColor1;
        this.color2 = gradientColor2;
        
        // Lưu delay ban đầu để sử dụng khi reset
        this.initialRandomDelay = initialRandomDelay;
    }

    update() {
        if (!this.active) {
            // Kiểm tra cả group delay, individual delay và initial random delay
            const totalDelay = this.groupDelay + this.individualDelay + this.initialRandomDelay;
            if (Date.now() - this.lastStart > totalDelay) {
                this.active = true;
            } else {
                return; // chưa đến thời điểm bay
            }
        }
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity -= 0.002;
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.opacity -= 0.02;
        });
        this.particles = this.particles.filter(p => p.opacity > 0);
        if (Math.random() < 0.7) {
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 1.2,
                vy: (Math.random() + 0.5) * 1.5,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.5,
                color: this.color1
            });
        }
        if (this.y > window.innerHeight || this.opacity <= 0) {
            this.lastStart = Date.now();
            this.active = false;
            this.reset();
        }
    }

    reset() {
        // Phân bố sao băng theo vùng khác nhau trên màn hình khi reset
        const screenWidth = window.innerWidth;
        const regionWidth = screenWidth / NUM_GROUPS;
        const regionStart = this.groupIndex * regionWidth;
        this.x = regionStart + Math.random() * regionWidth; // Sao băng chỉ xuất hiện trong vùng của tốp
        
        this.y = -50;
        this.length = Math.random() * 80 + 60;
        this.speed = currentMeteorSpeed;
        this.angle = Math.PI / 12 + (Math.random() - 0.5) * 0.2;
        this.opacity = 1;
        this.particles = [];
        this.color1 = gradientColor1;
        this.color2 = gradientColor2;
        // Giữ nguyên individualDelay và initialRandomDelay, chỉ reset thời gian bắt đầu
        this.lastStart = Date.now();
        this.active = false;
    }

    draw(ctx) {
        ctx.save();
        const tailX = this.x - Math.cos(this.angle) * this.length;
        const tailY = this.y - Math.sin(this.angle) * this.length;
        // Gradient đuôi theo 2 màu hoặc 1 màu
        const grad = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
        if (isGradientMode) {
            grad.addColorStop(0, this.hexToRgba(this.color1, this.opacity));
            grad.addColorStop(1, this.hexToRgba(this.color2, 0));
        } else {
            grad.addColorStop(0, this.hexToRgba(this.color1, this.opacity));
            grad.addColorStop(1, this.hexToRgba(this.color1, 0));
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Đầu meteor là chấm sáng màu
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        const headGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 8);
        if (isGradientMode) {
            headGrad.addColorStop(0, this.hexToRgba(this.color1, 1));
            headGrad.addColorStop(1, this.hexToRgba(this.color2, 0));
        } else {
            headGrad.addColorStop(0, this.hexToRgba(this.color1, 1));
            headGrad.addColorStop(1, this.hexToRgba(this.color1, 0));
        }
        ctx.fillStyle = headGrad;
        ctx.fill();

        // Particles nhỏ rơi ra, cùng màu meteor
        this.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = this.hexToRgba(p.color, p.opacity);
            ctx.fill();
        });
        ctx.restore();
    }

    // Hàm chuyển mã hex sang rgba
    hexToRgba(hex, alpha) {
        let c = hex.replace('#', '');
        if (c.length === 3) {
            c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
        }
        const num = parseInt(c, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r},${g},${b},${alpha})`;
    }
}

// Khởi tạo meteors chia đều cho các group
function createMeteors(total) {
    meteors.length = 0;
    for (let i = 0; i < total; i++) {
        const groupIndex = i % NUM_GROUPS;
        meteors.push(new Meteor(groupIndex));
    }
}
createMeteors(200);  

function animate() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Chỉ vẽ mưa sao băng khi được bật
    if (isMeteorShowerActive) {
        ctx.fillStyle = 'rgba(0, 0, 50, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        meteors.forEach(meteor => {
            meteor.update();
            meteor.draw(ctx);
        });
    }

    requestAnimationFrame(animate);
}

window.addEventListener('load', () => {
    animate();
    // Kiểm tra config mưa sao băng sau khi load
    setTimeout(() => {
        window.checkMeteorConfig();
    }, 1000); // Đợi 1 giây để đảm bảo các script khác đã load
});

window.addEventListener('resize', () => {
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// Hàm đổi màu sao băng, gọi hàm này khi muốn đổi màu
window.setMeteorColor = function(color) {
    isGradientMode = false;
    gradientColor1 = color;
    gradientColor2 = color;
    meteors.forEach(m => {
        m.color1 = color;
        m.color2 = color;
    });
};

window.setMeteorSpeed = function(speed) {
    currentMeteorSpeed = speed;
    meteors.forEach(m => m.speed = speed);
};

window.setMeteorDensity = function(density) {
    meteors.length = 0;
    createMeteors(density);
};

window.setMeteorGradient = function(c1, c2) {
    isGradientMode = true;
    gradientColor1 = c1;
    gradientColor2 = c2;
    meteors.forEach(m => { m.color1 = c1; m.color2 = c2; });
};

// Hàm toggle mưa sao băng
window.toggleMeteorShower = function() {
    const hash = window.location.hash;
    const isWebCha = !hash.startsWith('#config=') && !hash.startsWith('#id=');
    
    // Trên web cha thì không cần kiểm tra config
    if (!isWebCha && !isMeteorFeatureEnabled) {
        showMeteorMessage('❌ Tính năng mưa sao băng chưa được kích hoạt trong thiên hà này');
        return;
    }
    
    isMeteorShowerActive = !isMeteorShowerActive;
    // Cập nhật biến global
    window.isMeteorShowerActive = isMeteorShowerActive;
    
    console.log('Mưa sao băng:', isMeteorShowerActive ? 'BẬT' : 'TẮT');
    
    // Hiển thị thông báo cho người dùng
    const message = isMeteorShowerActive ? '✨ Mưa sao băng đã được BẬT' : '🌙 Mưa sao băng đã được TẮT';
    showMeteorMessage(message);
    
    // Cập nhật trạng thái nút
    const meteorToggleBtn = document.getElementById('meteorToggleBtn');
    if (meteorToggleBtn) {
        if (isMeteorShowerActive) {
            meteorToggleBtn.classList.add('active');
        } else {
            meteorToggleBtn.classList.remove('active');
        }
    }
    
    // Reset tất cả meteors khi bật lại
    if (isMeteorShowerActive) {
        meteors.forEach(meteor => {
            meteor.reset();
        });
    }
};

// Hàm kiểm tra và cập nhật config mưa sao băng từ URL
window.checkMeteorConfig = function() {
    const hash = window.location.hash;
    
    // Nếu là web cha (không có config), cho phép toggle tự do
    if (!hash.startsWith('#config=') && !hash.startsWith('#id=')) {
        isMeteorFeatureEnabled = true;
        window.isMeteorFeatureEnabled = true;
        return;
    }
    
    // Nếu là web con, kiểm tra config
    if (hash.startsWith('#config=')) {
        try {
            const base64Config = hash.replace('#config=', '');
            const configStr = decodeURIComponent(escape(atob(base64Config)));
            const config = JSON.parse(configStr);
            
            // Kiểm tra xem có config mưa sao băng không
            if (config.meteorEnabled === true) {
                isMeteorFeatureEnabled = true;
                window.isMeteorFeatureEnabled = true;
                // Cập nhật các thông số mưa sao băng từ config
                if (config.meteorSpeed) {
                    currentMeteorSpeed = config.meteorSpeed;
                    meteors.forEach(m => m.speed = config.meteorSpeed);
                }
                if (config.meteorDensity) {
                    meteors.length = 0;
                    createMeteors(config.meteorDensity);
                }
                if (config.meteorColorMode === 'single' && config.meteorColor1) {
                    window.setMeteorColor(config.meteorColor1);
                } else if (config.meteorColorMode === 'gradient' && config.meteorColor1 && config.meteorColor2) {
                    window.setMeteorGradient(config.meteorColor1, config.meteorColor2);
                }
                
                // Tự động bật mưa sao băng nếu chưa bật
                if (!isMeteorShowerActive) {
                    isMeteorShowerActive = true;
                    window.isMeteorShowerActive = true;
                    console.log('Tự động bật mưa sao băng từ config');
                }
                
                // Cập nhật trạng thái nút mưa sao băng
                const meteorToggleBtn = document.getElementById('meteorToggleBtn');
                if (meteorToggleBtn) {
                    meteorToggleBtn.classList.add('active');
                }
                
                console.log('Mưa sao băng được kích hoạt từ config');
            } else {
                isMeteorFeatureEnabled = false;
                window.isMeteorFeatureEnabled = false;
                console.log('Mưa sao băng không được kích hoạt trong config');
            }
        } catch (e) {
            console.error('Lỗi khi parse config:', e);
            isMeteorFeatureEnabled = false;
            window.isMeteorFeatureEnabled = false;
        }
    } else if (hash.startsWith('#id=')) {
        // Xử lý cho trường hợp #id= (cần fetch từ server)
        const galaxyId = hash.replace('#id=', '');
        
        // Kiểm tra xem có phải đang chạy local không
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocal) {
            console.log('Đang chạy local - bỏ qua fetch config từ server');
            isMeteorFeatureEnabled = false;
            window.isMeteorFeatureEnabled = false;
            return;
        }
        
        fetch(`${window.location.origin}/api/galaxy-configs/${galaxyId}`)
            .then(res => {
                // Kiểm tra response có phải JSON không
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server trả về không phải JSON');
                }
                return res.json();
            })
            .then(data => {
                if (data.success && data.config && data.config.meteorEnabled === true) {
                    isMeteorFeatureEnabled = true;
                    window.isMeteorFeatureEnabled = true;
                    // Cập nhật các thông số mưa sao băng từ config
                    if (data.config.meteorSpeed) {
                        currentMeteorSpeed = data.config.meteorSpeed;
                        meteors.forEach(m => m.speed = data.config.meteorSpeed);
                    }
                    if (data.config.meteorDensity) {
                        meteors.length = 0;
                        createMeteors(data.config.meteorDensity);
                    }
                    if (data.config.meteorColorMode === 'single' && data.config.meteorColor1) {
                        window.setMeteorColor(data.config.meteorColor1);
                    } else if (data.config.meteorColorMode === 'gradient' && data.config.meteorColor1 && data.config.meteorColor2) {
                        window.setMeteorGradient(data.config.meteorColor1, data.config.meteorColor2);
                    }
                    
                    // Tự động bật mưa sao băng nếu chưa bật
                    if (!isMeteorShowerActive) {
                        isMeteorShowerActive = true;
                        window.isMeteorShowerActive = true;
                        console.log('Tự động bật mưa sao băng từ server config');
                    }
                    
                    // Cập nhật trạng thái nút mưa sao băng
                    const meteorToggleBtn = document.getElementById('meteorToggleBtn');
                    if (meteorToggleBtn) {
                        meteorToggleBtn.classList.add('active');
                    }
                    
                    console.log('Mưa sao băng được kích hoạt từ server config');
                } else {
                    isMeteorFeatureEnabled = false;
                    window.isMeteorFeatureEnabled = false;
                    console.log('Mưa sao băng không được kích hoạt trong server config');
                }
            })
            .catch(err => {
                console.error('Lỗi khi fetch config từ server:', err);
                isMeteorFeatureEnabled = false;
                window.isMeteorFeatureEnabled = false;
            });
    }
};

// Hàm hiển thị thông báo mưa sao băng
function showMeteorMessage(message) {
    // Tạo hoặc lấy element thông báo
    let messageEl = document.getElementById('meteor-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'meteor-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.opacity = '1';
    
    // Ẩn thông báo sau 2 giây
    setTimeout(() => {
        messageEl.style.opacity = '0';
    }, 2000);
}