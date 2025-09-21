import * as THREE from 'three';
import { fileToBase64, uploadImageToR2, uploadAudioToR2 } from './createProduct.js';
import { SERVER_URL_PROD } from '../config.js';
import { processPayment, showToast } from './payment.js';
import { setupVoucherListeners, loadUserVouchers, getFinalPrice, updateTotalPrice } from './vouchers.js';

export class CentralSphere {
    constructor(scene) {
        this.scene = scene;
        this.config = {
            color1: '#ff6b6b',
            color2: '#4ecdc4',
            size: 9,
            rotationSpeed: 0.005,
            particleSpeed: 2.0,
            points: 60000,
            radius: { MIN: 55, MAX: 60 },
            isGradient: false
        };

        this.points = [];
        this.sizes = [];
        this.shifts = [];
        this.uniforms = {
            time: { value: 0 },
            particleSpeed: { value: this.config.particleSpeed }
        };
        this.object = null;
        this.clock = new THREE.Clock();
        this.particleSystem = null;
        this.flowerRing = null;
        this.setupUI();
        this.createBody();
    }

    setupUI() {
        // Function ẩn Google login cho web con
        const hideGoogleLogin = () => {
            const googleLoginBtn = document.getElementById('googleLoginBtn');
            if (googleLoginBtn) {
                googleLoginBtn.style.display = 'none';
                googleLoginBtn.classList.add('hidden');
            }
        };

        // Tạo container cho controls
        const controlsContainer = document.createElement('div');
        controlsContainer.innerHTML = `
            <div class="settings-icon">
                <i class="fas fa-cog"></i>
            </div>
            <div class="controls dashboard" style="display: none; max-width: 420px; min-width: 320px;">
                <div class="controls-header">
                    <h2 style="margin:0 0 10px 0; font-size: 1.4em;">Dashboard Thiên Hà</h2>
                    <button id="showPriceTableBtn" style="background:none;border:1px solid #ddd;color:#666;font-size:0.85em;padding:4px 8px;border-radius:4px;cursor:pointer;margin-bottom:8px;" title="Xem chi tiết bảng giá">📋 Bảng giá</button>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div id="priceTableDetails" style="font-size:0.95em;color:#666;margin:8px 0;line-height:1.4;display:none;text-align:left;background:#f9f9f9;padding:12px 10px 10px 10px;border-radius:8px;border:1px solid #eee;width:100%;box-sizing:border-box;">
                    <div style="font-weight:600;color:#333;margin-bottom:8px;font-size:1em;">📋 Bảng giá:</div>
                    <div>💖 Trái tim to đùng: +5,000đ</div>
                    <div>🖼️ Ảnh thứ 2 trở đi: +3,000đ/ảnh</div>
                    <div>🎵 Đổi nhạc: +5,000đ</div>
                    <div>☄️ Mưa sao băng: +3,000đ</div>
                    <div>💾 Lưu vĩnh viễn: +3,000đ</div>
                </div>
                <div class="tab-bar">
                    <button class="tab-btn active" id="tab-preset">Mẫu tinh cầu đẹp</button>
                    <button class="tab-btn" id="tab-custom">Tùy chỉnh</button>
                </div>
                <div class="tab-content preset-content">
                    <div class="preset-list">
                        <div class="preset-group-title">Màu đơn</div>
                        <div class="preset-row">
                            <div class="preset-item" data-preset="1" style="background: #ff6b6b;"><span>Đỏ Hồng</span></div>
                            <div class="preset-item" data-preset="2" style="background: #ffd200;"><span>Vàng Tươi</span></div>
                            <div class="preset-item" data-preset="3" style="background: #43cea2;"><span>Xanh Ngọc</span></div>
                            <div class="preset-item" data-preset="4" style="background: #654ea3;"><span>Tím Đậm</span></div>
                            <div class="preset-item" data-preset="5" style="background: #11998e;"><span>Lục Bảo</span></div>
                            <div class="preset-item" data-preset="6" style="background: #ff512f;"><span>Đỏ Cam</span></div>
                            <div class="preset-item" data-preset="7" style="background: #00c3ff;"><span>Xanh Biển</span></div>
                            <div class="preset-item" data-preset="8" style="background: #f953c6;"><span>Hồng Tím</span></div>
                        </div>
                        <div class="preset-group-title">Màu gradient</div>
                        <div class="preset-row">
                            <div class="preset-item" data-preset="9" style="background: linear-gradient(135deg,#ff6b6b,#4ecdc4);"><span>Hồng Ngọc</span></div>
                            <div class="preset-item" data-preset="10" style="background: linear-gradient(135deg,#f7971e,#ffd200);"><span>Hoàng Kim</span></div>
                            <div class="preset-item" data-preset="11" style="background: linear-gradient(135deg,#43cea2,#185a9d);"><span>Lam Ngọc</span></div>
                            <div class="preset-item" data-preset="12" style="background: linear-gradient(135deg,#ff512f,#dd2476);"><span>Đỏ Tím</span></div>
                            <div class="preset-item" data-preset="13" style="background: linear-gradient(135deg,#00c3ff,#ffff1c);"><span>Thiên Thanh</span></div>
                            <div class="preset-item" data-preset="14" style="background: linear-gradient(135deg,#654ea3,#eaafc8);"><span>Tím Sương</span></div>
                            <div class="preset-item" data-preset="15" style="background: linear-gradient(135deg,#f953c6,#b91d73);"><span>Hồng Tím</span></div>
                            <div class="preset-item" data-preset="16" style="background: linear-gradient(135deg,#11998e,#38ef7d);"><span>Lục Bảo</span></div>
                        </div>
                    </div>
                </div>
                <div class="tab-content custom-content" style="display:none;">
                    <div class="section-divider">
                        <h4>Màu sắc tinh cầu</h4>
                    </div>
                    <div class="color-mode">
                        <button id="singleColor">Màu đơn</button>
                        <button id="gradientColor" class="active">Màu gradient</button>
                    </div>
                    <div class="color-picker single-color" style="display: none;">
                        <label for="bodyColor1">Màu:</label>
                        <input type="color" id="bodyColor1" value="#ff6b6b">
                    </div>
                    <div class="color-picker gradient-color">
                        <label for="gradientColor1">Màu 1:</label>
                        <input type="color" id="gradientColor1" value="#ff6b6b">
                        <label for="gradientColor2">Màu 2:</label>
                        <input type="color" id="gradientColor2" value="#4ecdc4">
                    </div>
                </div>
                <div class="section-divider">
                    <h4>Tùy chỉnh tinh cầu</h4>
                </div>
                <div class="control-group">
                    <label for="bodySize">Mật độ hạt tinh cầu:</label>
                    <input type="range" id="bodySize" min="2" max="12" step="0.2" value="4">
                </div>
                <div class="control-group">
                    <label for="rotationSpeed">Tốc độ xoay tinh cầu:</label>
                    <input type="range" id="rotationSpeed" min="0.0005" max="3" step="0.01" value="0.005">
                </div>
                <div class="control-group">
                    <label for="particleSpeed">Tốc độ hạt tinh cầu:</label>
                    <input type="range" id="particleSpeed" min="0.5" max="15.0" step="0.1" value="1.0">
                </div>
                <div class="section-divider">
                    <h4>Tốc độ quay các đĩa</h4>
                </div>
                <div class="control-group">
                    <label for="diskRotationSpeed">Tốc độ quay đĩa:</label>
                    <input type="range" id="diskRotationSpeed" min="0.00005" max="0.1" step="0.00001" value="0.003">
                </div>
                <div class="control-group">
                    <label for="textureRotationSpeed">Tốc độ xoay ảnh:</label>
                    <input type="range" id="textureRotationSpeed" min="0.0001" max="0.05" step="0.0001" value="0.003">
                </div>
                <div class="control-group">
                    <label for="flowerFloatSpeed">Tốc độ bay lên của vòng ảnh:</label>
                    <input type="range" id="flowerFloatSpeed" min="0.00002" max="2" step="0.00002" value="0.0001">
                </div>
                <div class="section-divider">
                    <h4>Màu sắc các đĩa hạt</h4>
                </div>
                <div class="control-group">
                    <div class="particle-colors">
                        <div class="color-picker">
                            <label for="backgroundColor">Màu nền không gian:</label>
                            <input type="color" id="backgroundColor" value="#ffffff">
                        </div>
                        <div class="color-picker">
                            <label for="diskColor">Màu đĩa chính:</label>
                            <input type="color" id="diskColor" value="#ffccf2">
                        </div>
                        <div class="color-picker">
                            <label for="innerDiskColor">Màu đĩa trong:</label>
                            <input type="color" id="innerDiskColor" value="#ffccf2">
                        </div>
                        <div class="color-picker">
                            <label for="outermostColor">Màu đĩa ngoài:</label>
                            <input type="color" id="outermostColor" value="#ffccf2">
                        </div>
                    </div>
                </div>
                <div class="section-divider">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" id="enableCentralHeart" style="width:18px;height:18px;">
                        <h4 style="margin:0;display:flex;align-items:center;gap:8px;">Trái tim to ở giữa
                            <span style="vertical-align:middle;margin-left:8px;">
                                <span style="color:#e53935;font-size:0.98em;font-weight:600;margin-left:2px;">+5.000đ</span>
                            </span>
                        </h4>
                    </div>
                </div>
                <div class="section-divider">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" id="enableMeteorFeature" style="width:18px;height:18px;">
                        <h4 style="margin:0;display:flex;align-items:center;gap:8px;">Mưa sao băng
                            <span style="vertical-align:middle;margin-left:8px;">
                                <img src="assets/vip.gif" alt="VIP" style="height:22px;vertical-align:middle;">
                                <span style="color:#e53935;font-size:0.98em;font-weight:600;margin-left:2px;">+3.000đ</span>
                            </span>
                        </h4>
                    </div>
                </div>
                <div class="control-group">
                    <label style="display:block;margin-bottom:4px;">Kiểu màu sao băng:</label>
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <button id="meteorTabSingle" class="active" type="button">Màu đơn</button>
                        <button id="meteorTabGradient" type="button">Màu gradient</button>
                    </div>
                    <div id="meteorSingleColorBox">
                        <input type="color" id="meteorColorPicker" value="#00f0ff" style="width:38px;height:38px;">
                    </div>
                    <div id="meteorGradientColorBox" style="display:none;">
                        <input type="color" id="meteorGradientColor1" value="#00f0ff" style="width:38px;height:38px;">
                        <input type="color" id="meteorGradientColor2" value="#ffffff" style="width:38px;height:38px;margin-left:8px;">
                    </div>
                        <div class="control-group">
                    <label for="meteorSpeedRange">Tốc độ bay:</label>
                    <input type="range" id="meteorSpeedRange" min="1" max="100" step="5" value="20">
                </div>
                <div class="control-group">
                    <label for="meteorDensityRange">Mật độ sao băng:</label>
                    <input type="range" id="meteorDensityRange" min="10" max="250" step="20" value="30">
                </div>
                <div class="section-divider">
                    <h4>Vòng ảnh & Nhạc nền</h4>
                </div>
                <div class="control-group">
                    <label for="flowerImageInput">Đổi ảnh (JPG, PNG, tối đa 5 ảnh): <span id="imagePriceText" style="color:#ff6b6b;font-weight:600;font-size:0.9em;"></span></label>
                    <input type="file" id="flowerImageInput" accept="image/jpeg,image/png" multiple>
                    <div id="flowerImageStatus" style="font-size:0.95em;color:#888;margin-top:4px;"></div>
                </div>
                <div class="control-group">
                    <label for="audioInput">Đổi nhạc nền (MP3, M4A): <span id="audioPriceText" style="color:#ff6b6b;font-weight:600;font-size:0.9em;"></span></label>
                    <input type="file" id="audioInput" accept="audio/mp3,audio/m4a">
                    <div id="audioStatus" style="font-size:0.95em;color:#888;margin-top:4px;"></div>
                </div>
                <div id="voucherListBox" style="margin-bottom: 8px;">
                    <div style="font-weight:600;margin-bottom:4px;">Chọn voucher giảm giá:</div>
                    <div id="voucherList" style="margin-bottom:4px;"></div>
                    <div id="voucherResult" style="font-size:0.95em;color:#888;"></div>
                    <div style="margin-top:8px;">
                        <label for="tipAmount" style="font-weight:500;">Nhập tiền tip (tuỳ chọn):</label>
                        <input type="number" id="tipAmount" min="0" max="1000000" step="1000" value="0" style="width:120px;padding:4px 8px;border-radius:6px;border:1px solid #ccc;">
                        <span id="tipError" style="color:#e53935;font-size:0.95em;margin-left:8px;display:none;">Tip không hợp lệ!</span>
                    </div>
                    <div style="margin-top:12px;display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" id="savePermanently" style="width:16px;height:16px;">
                        <label for="savePermanently" style="font-weight:50;font-size:0.9em;margin:0;cursor:pointer;">Lưu thiên hà vĩnh viễn</label>
                       <span style="color:#e53935;font-size:0.8em;margin-left:4px;">+3000đ</span>

                    </div>
                    <span style="color:#e53935;font-size:0.65em;margin-left:4px;">(Không bị xóa tự động sau 7 ngày)</span>
                          <div style="margin-top:10px;padding:8px 12px;background:#fff3cd;border-left:4px solid #ffc107;color:#856404;font-size:0.65em;font-style:italic;border-radius:4px;">
                        💡 Chúng tớ sẽ trích một phần lợi nhuận để giúp các bạn nhỏ có hoàn cảnh khó khăn.Các hoạt động sẽ được cập nhật trên kênh tiktok: tớ là Toán. 
                    </div
                </div>
                <div id="totalPriceBox" style="text-align:center;margin:18px 0 8px 0;">
                    <span style="display:inline-block;background:#fff0f0;color:#ff3b3b;font-size:1.18em;font-weight:700;padding:10px 32px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">Tổng tiền: <span id="totalPrice">0đ</span></span>
                    <div id="costBreakdown" style="font-size:0.85em;color:#666;margin-top:8px;line-height:1.4;background:#f8f9fa;padding:10px;border-radius:8px;border:1px solid #e9ecef;">
                        <div style="font-weight:600;color:#333;margin-bottom:8px;font-size:0.9em;">📊 Thống kê chi phí:</div>
                        <div id="costDetails" style="text-align:left;">
                            <div style="color:#999;font-style:italic;">Chưa có tính năng nào được chọn, nếu bạn ấn tạo bây giờ thì bạn sẽ có 1 thiên hà cơ bản free</div>
                        </div>
                    </div>
                </div>
                <div style="text-align:center; margin-top: 24px;">
                    <button id="finishCreateBtn" style="background:#ff6b6b;color:#fff;font-size:1.15em;padding:12px 36px;border:none;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.12);font-weight:600;cursor:pointer;" title="Tạo thiên hà theo các tính năng đã chọn">Hoàn tất tạo</button>
                </div>
            </div>
        `;
        document.body.appendChild(controlsContainer);

        // Thiết lập event listeners
        const settingsIcon = controlsContainer.querySelector('.settings-icon');
        const controls = controlsContainer.querySelector('.controls');
        const closeBtn = controlsContainer.querySelector('.close-btn');
        // Tab logic
        const tabPreset = controlsContainer.querySelector('#tab-preset');
        const tabCustom = controlsContainer.querySelector('#tab-custom');
        const presetContent = controlsContainer.querySelector('.preset-content');
        const customContent = controlsContainer.querySelector('.custom-content');
        // Preset items
        const presetItems = controlsContainer.querySelectorAll('.preset-item');
        // ... giữ nguyên các biến custom màu ...
        const singleColorBtn = controlsContainer.querySelector('#singleColor');
        const gradientColorBtn = controlsContainer.querySelector('#gradientColor');
        const singleColorPicker = controlsContainer.querySelector('.single-color');
        const gradientColorPicker = controlsContainer.querySelector('.gradient-color');
        const bodySize = controlsContainer.querySelector('#bodySize');
        const color1Input = controlsContainer.querySelector('#gradientColor1');
        const color2Input = controlsContainer.querySelector('#gradientColor2');
        const singleColorInput = controlsContainer.querySelector('#bodyColor1');
        const rotationSpeed = controlsContainer.querySelector('#rotationSpeed');
        const particleSpeedInput = controlsContainer.querySelector('#particleSpeed');
        const diskRotationSpeedInput = controlsContainer.querySelector('#diskRotationSpeed');
        const textureRotationSpeedInput = controlsContainer.querySelector('#textureRotationSpeed');
        const backgroundColorInput = controlsContainer.querySelector('#backgroundColor');
        const diskColorInput = controlsContainer.querySelector('#diskColor');
        const innerDiskColorInput = controlsContainer.querySelector('#innerDiskColor');
        const outermostColorInput = controlsContainer.querySelector('#outermostColor');
        const flowerImageInput = controlsContainer.querySelector('#flowerImageInput');
        const flowerImageStatus = controlsContainer.querySelector('#flowerImageStatus');
        const audioInput = controlsContainer.querySelector('#audioInput');
        const audioStatus = controlsContainer.querySelector('#audioStatus');
        const flowerFloatSpeedInput = controlsContainer.querySelector('#flowerFloatSpeed');

        // Tab switching logic
        tabPreset.addEventListener('click', () => {
            tabPreset.classList.add('active');
            tabCustom.classList.remove('active');
            presetContent.style.display = '';
            customContent.style.display = 'none';
        });
        tabCustom.addEventListener('click', () => {
            tabCustom.classList.add('active');
            tabPreset.classList.remove('active');
            presetContent.style.display = 'none';
            customContent.style.display = '';
        });

        // Preset chọn màu đẹp
        const presetConfigs = [
            // 8 màu đơn
            { isGradient: false, color1: '#ff6b6b', diskColor: '#ffb3b3', innerDiskColor: '#ffd6d6', outermostColor: '#ffb3b3', backgroundColor: '#fff0f0' }, // Đỏ Hồng
            { isGradient: false, color1: '#ffd200', diskColor: '#ffe066', innerDiskColor: '#fff6b3', outermostColor: '#ffe066', backgroundColor: '#fffbe6' }, // Vàng Tươi
            { isGradient: false, color1: '#43cea2', diskColor: '#b3ffe2', innerDiskColor: '#d6fff2', outermostColor: '#b3ffe2', backgroundColor: '#e6fff7' }, // Xanh Ngọc
            { isGradient: false, color1: '#654ea3', diskColor: '#b3a3ff', innerDiskColor: '#d1b3ff', outermostColor: '#b3a3ff', backgroundColor: '#f3e6ff' }, // Tím Đậm
            { isGradient: false, color1: '#11998e', diskColor: '#b3fff6', innerDiskColor: '#b3ffe2', outermostColor: '#b3fff6', backgroundColor: '#e6fffb' }, // Lục Bảo
            { isGradient: false, color1: '#ff512f', diskColor: '#ffd1b3', innerDiskColor: '#ffe2b3', outermostColor: '#ffd1b3', backgroundColor: '#fff3e6' }, // Đỏ Cam
            { isGradient: false, color1: '#00c3ff', diskColor: '#b3e6ff', innerDiskColor: '#b3f0ff', outermostColor: '#b3e6ff', backgroundColor: '#e6f7ff' }, // Xanh Biển
            { isGradient: false, color1: '#f953c6', diskColor: '#ffb3e6', innerDiskColor: '#ffd6f7', outermostColor: '#ffb3e6', backgroundColor: '#fff0fa' }, // Hồng Tím
            // 8 gradient
            { isGradient: true, color1: '#ff6b6b', color2: '#4ecdc4', diskColor: '#b3fff6', innerDiskColor: '#b3ffe2', outermostColor: '#b3fff6', backgroundColor: '#e6fffb' }, // Hồng Ngọc
            { isGradient: true, color1: '#f7971e', color2: '#ffd200', diskColor: '#ffe066', innerDiskColor: '#fff6b3', outermostColor: '#ffe066', backgroundColor: '#fffbe6' }, // Hoàng Kim
            { isGradient: true, color1: '#43cea2', color2: '#185a9d', diskColor: '#b3e6ff', innerDiskColor: '#b3ffe2', outermostColor: '#b3e6ff', backgroundColor: '#e6f7ff' }, // Lam Ngọc
            { isGradient: true, color1: '#ff512f', color2: '#dd2476', diskColor: '#ffd1b3', innerDiskColor: '#ffd6e6', outermostColor: '#ffd1b3', backgroundColor: '#fff3e6' }, // Đỏ Tím
            { isGradient: true, color1: '#00c3ff', color2: '#ffff1c', diskColor: '#ffffb3', innerDiskColor: '#e6f7ff', outermostColor: '#ffffb3', backgroundColor: '#ffffe6' }, // Thiên Thanh
            { isGradient: true, color1: '#654ea3', color2: '#eaafc8', diskColor: '#e6b3ff', innerDiskColor: '#f3e6ff', outermostColor: '#e6b3ff', backgroundColor: '#f9e6ff' }, // Tím Sương
            { isGradient: true, color1: '#f953c6', color2: '#b91d73', diskColor: '#ffb3e6', innerDiskColor: '#ffd6f7', outermostColor: '#ffb3e6', backgroundColor: '#fff0fa' }, // Hồng Tím
            { isGradient: true, color1: '#11998e', color2: '#38ef7d', diskColor: '#b3ffd1', innerDiskColor: '#d6ffe6', outermostColor: '#b3ffd1', backgroundColor: '#e6fff3' }, // Lục Bảo
        ];
        presetItems.forEach((item, idx) => {
            item.addEventListener('click', () => {
                this.updateConfig(presetConfigs[idx]);
                // Cập nhật input màu theo mẫu
                if (presetConfigs[idx].backgroundColor) backgroundColorInput.value = presetConfigs[idx].backgroundColor;
                if (presetConfigs[idx].diskColor) diskColorInput.value = presetConfigs[idx].diskColor;
                if (presetConfigs[idx].innerDiskColor) innerDiskColorInput.value = presetConfigs[idx].innerDiskColor;
                if (presetConfigs[idx].outermostColor) outermostColorInput.value = presetConfigs[idx].outermostColor;
            });
        });

        closeBtn.addEventListener('click', () => {
            controls.style.display = 'none';
        });

        // Thêm event listener cho click bên ngoài
        document.addEventListener('click', (event) => {
            const isClickInsideControls = controls.contains(event.target);
            const isClickOnSettingsIcon = settingsIcon.contains(event.target);

            if (!isClickInsideControls && !isClickOnSettingsIcon && controls.style.display === 'block') {
                controls.style.display = 'none';
            }
        });

        // Ngăn chặn sự kiện click trong bảng điều khiển lan ra ngoài
        controls.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        singleColorBtn.addEventListener('click', () => {
            singleColorBtn.classList.add('active');
            gradientColorBtn.classList.remove('active');
            singleColorPicker.style.display = 'block';
            gradientColorPicker.style.display = 'none';
            this.updateConfig({ isGradient: false, color1: singleColorInput.value });
        });

        gradientColorBtn.addEventListener('click', () => {
            gradientColorBtn.classList.add('active');
            singleColorBtn.classList.remove('active');
            gradientColorPicker.style.display = 'block';
            singleColorPicker.style.display = 'none';
            this.updateConfig({ isGradient: true, color1: color1Input.value, color2: color2Input.value });
        });

        bodySize.addEventListener('input', (e) => {
            this.updateConfig({ size: parseFloat(e.target.value) });
        });

        color1Input.addEventListener('input', (e) => {
            this.updateConfig({ color1: e.target.value });
        });

        color2Input.addEventListener('input', (e) => {
            this.updateConfig({ color2: e.target.value });
        });

        singleColorInput.addEventListener('input', (e) => {
            this.updateConfig({ color1: e.target.value });
        });
    
        rotationSpeed.addEventListener('input', (e) => {
            this.updateConfig({ rotationSpeed: parseFloat(e.target.value) });
        });

        particleSpeedInput.addEventListener('input', (e) => {
            this.updateConfig({ particleSpeed: parseFloat(e.target.value) });
        });

        diskRotationSpeedInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                const speed = parseFloat(e.target.value);
                this.particleSystem.updateDiskRotationSpeed(speed);
                this.particleSystem.updateInnerDiskRotationSpeed(speed);
            }
        });

        textureRotationSpeedInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateTextureRotationSpeed(parseFloat(e.target.value));
            }
            if (this.flowerRing) {
                this.flowerRing.updateRotationSpeed(parseFloat(e.target.value));
            }
        });

        // Thêm event listeners cho màu particles
        backgroundColorInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateColors(e.target.value, null, null, null);
            }
        });

        diskColorInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateColors(null, e.target.value, null, null);
            }
        });

        innerDiskColorInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateColors(null, null, e.target.value, null);
            }
        });

        outermostColorInput.addEventListener('input', (e) => {
            if (this.particleSystem) {
                this.particleSystem.updateColors(null, null, null, e.target.value);
            }
        });

        settingsIcon.addEventListener('click', () => {
            controls.style.display = 'block';
        });

        // Sự kiện đổi ảnh vòng hoa
        flowerImageInput.addEventListener('change', (e) => {
            // Chấp nhận định dạng ảnh phổ biến
            const allowedImageTypes = [
                'image/jpeg',    // .jpg, .jpeg
                'image/png',      // .png
            ];
            const files = Array.from(e.target.files).filter(f => allowedImageTypes.includes(f.type));
            
            // Validate kích thước file (5MB = 5 * 1024 * 1024 bytes)
            const maxSize = 5 * 1024 * 1024; // 5MB
            const oversizedFiles = files.filter(file => file.size > maxSize);
            const imagePriceText = document.getElementById('imagePriceText');
            
            if (oversizedFiles.length > 0) {
                flowerImageStatus.textContent = `File ${oversizedFiles[0].name} quá lớn! Chỉ chấp nhận file dưới 5MB.`;
                flowerImageInput.value = '';
                // Reset text giá tiền ảnh
                if (imagePriceText) {
                    imagePriceText.textContent = '';
                }
                return;
            }
            
            // Hiển thị preview ảnh đã chọn
            let previewDiv = document.getElementById('flowerImagePreview');
            if (!previewDiv) {
                previewDiv = document.createElement('div');
                previewDiv.id = 'flowerImagePreview';
                previewDiv.style.display = 'flex';
                previewDiv.style.gap = '8px';
                previewDiv.style.marginTop = '8px';
                previewDiv.style.flexWrap = 'wrap';
                flowerImageInput.parentNode.appendChild(previewDiv);
            }
            previewDiv.innerHTML = '';
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.style.width = '54px';
                    img.style.height = '54px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    img.style.boxShadow = '0 1px 6px #0002';
                    previewDiv.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
            if (files.length > 5) {
                flowerImageStatus.textContent = 'Chỉ được chọn tối đa 5 ảnh!';
                flowerImageInput.value = '';
                return;
            }
            if (files.length === 0) {
                flowerImageStatus.textContent = 'Bạn phải chọn ít nhất 1 ảnh (JPG, PNG)!';
                // Reset text giá tiền ảnh
                if (imagePriceText) {
                    imagePriceText.textContent = '';
                }
                return;
            }
            
            // Cập nhật text giá tiền ảnh
            if (imagePriceText) {
                if (files.length === 1) {
                    imagePriceText.textContent = '(Miễn phí)';
                    imagePriceText.style.color = '#4caf50';
                } else {
                    const additionalImages = files.length - 1;
                    const totalImagePrice = additionalImages * 3000;
                    imagePriceText.textContent = `(${additionalImages} ảnh = ${totalImagePrice.toLocaleString()}đ, free ảnh đầu)`;
                    imagePriceText.style.color = '#ff6b6b';
                }
            }
            
            // Nếu chỉ chọn 1 ảnh thì update luôn như cũ
            if (files.length === 1 && this.flowerRing && this.flowerRing.updateTextureByDataURL) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.flowerRing.updateTextureByDataURL(ev.target.result);
                };
                reader.readAsDataURL(files[0]);
            }
            // Nếu chọn nhiều hơn 1 ảnh, random cho các bông hoa
            if (files.length > 1 && this.flowerRing && this.flowerRing.updateTexturesByDataURLs) {
                let loaded = 0;
                const dataURLs = new Array(files.length);
                files.forEach((file, idx) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        dataURLs[idx] = ev.target.result;
                        loaded++;
                        if (loaded === files.length) {
                            this.flowerRing.updateTexturesByDataURLs(dataURLs, false);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
            // Cập nhật giá tiền khi thay đổi ảnh
            this.updatePriceDisplay();
        });

        // Xử lý upload audio
        audioInput.addEventListener('change', (e) => {
            const audioPriceText = document.getElementById('audioPriceText');
            const files = Array.from(e.target.files);
            
            if (audioPriceText) {
                if (files.length > 0) {
                    audioPriceText.textContent = '(+5,000đ)';
                    audioPriceText.style.color = '#ff6b6b';
                } else {
                    audioPriceText.textContent = '';
                }
            }
            
            updateTotalPrice(getDynamicPrice);
        });

        // Xử lý nút Hoàn tất tạo
        const finishBtn = controlsContainer.querySelector('#finishCreateBtn');
        finishBtn.addEventListener('click', async () => {
            // Spinner loading trên nút
            const originalText = finishBtn.innerHTML;
            finishBtn.innerHTML = '<span class="spinner"></span> Đang xử lý...';
            finishBtn.disabled = true;
            
            try {
                await this.handleFinishCreation();
            } catch (error) {
                console.error('Lỗi trong quá trình xử lý:', error);
                showToast('Có lỗi xảy ra trong quá trình xử lý!', 'error');
            } finally {
                // Trả lại nút như cũ
                finishBtn.innerHTML = originalText;
                finishBtn.disabled = false;
            }
        });

        // Khi load trang, nếu có config trong URL thì tự động render lại
        window.addEventListener('DOMContentLoaded', () => {
            const hash = window.location.hash;
            if (hash.startsWith('#id=')) {
                // Lấy id ngắn từ URL
                const galaxyId = hash.replace('#id=', '');
                fetch(`${SERVER_URL_PROD}/api/galaxy-configs/` + galaxyId)
                  .then(res => res.json())
                  .then(data => {
                    if (data.success && data.config) {
                        this.updateConfig(data.config);
                        // Ẩn dashboard và settings-icon luôn ở web con
                        if (controls) controls.style.display = 'none';
                        if (settingsIcon) settingsIcon.style.display = 'none';
                        
                        // Ẩn nút Google login cho web con
                        hideGoogleLogin();
                        
                        // Áp dụng các thuộc tính đặc biệt cho particleSystem và flowerRing
                        if (this.particleSystem) {
                            if (data.config.diskRotationSpeed !== undefined) {
                                this.particleSystem.updateDiskRotationSpeed(data.config.diskRotationSpeed);
                                this.particleSystem.updateInnerDiskRotationSpeed(data.config.diskRotationSpeed);
                            }
                            if (data.config.textureRotationSpeed !== undefined) {
                                this.particleSystem.updateTextureRotationSpeed(data.config.textureRotationSpeed);
                            }
                        }
                        if (this.flowerRing) {
                            if (data.config.textureRotationSpeed !== undefined) {
                                this.flowerRing.updateRotationSpeed(data.config.textureRotationSpeed);
                            }
                            if (data.config.flowerFloatSpeed !== undefined) {
                                this.flowerRing.flyingConfig.floatSpeed = data.config.flowerFloatSpeed;
                            }
                            if (data.config.imageUrls && data.config.imageUrls.length > 0 && this.flowerRing.updateTexturesByDataURLs) {
                                this.flowerRing.updateTexturesByDataURLs(data.config.imageUrls);
                            }
                        }
                        // Nếu có audioUrl thì set cho audio.js
                        if (data.config.audioUrl && window.audioManager && window.audioManager.setAudioUrl) {
                            window.audioManager.setAudioUrl(data.config.audioUrl);
                        }
                        // Kiểm tra và áp dụng trạng thái trái tim to đùng
                        if (data.config.centralHeartEnabled !== undefined) {
                            console.log('Web con - Áp dụng trạng thái trái tim từ server config:', data.config.centralHeartEnabled);
                            // Đợi một chút để đảm bảo trái tim 3D đã load
                            setTimeout(() => {
                                this.applyCentralHeartState(data.config.centralHeartEnabled);
                            }, 1000);
                        }
                        // Kiểm tra và áp dụng mưa sao băng
                        if (data.config.meteorEnabled !== undefined) {
                            console.log('Web con - Áp dụng mưa sao băng từ server config:', data.config.meteorEnabled);
                            // Đợi một chút để đảm bảo meteors.js đã load
                            setTimeout(() => {
                                // Đảm bảo isMeteorFeatureEnabled được set đúng
                                if (window.isMeteorFeatureEnabled === undefined) {
                                    window.isMeteorFeatureEnabled = data.config.meteorEnabled;
                                }
                                
                                // Cập nhật các thông số mưa sao băng trước
                                if (window.setMeteorSpeed && data.config.meteorSpeed) {
                                    window.setMeteorSpeed(data.config.meteorSpeed);
                                }
                                if (window.setMeteorDensity && data.config.meteorDensity) {
                                    window.setMeteorDensity(data.config.meteorDensity);
                                }
                                if (data.config.meteorColorMode === 'single' && data.config.meteorColor1 && window.setMeteorColor) {
                                    window.setMeteorColor(data.config.meteorColor1);
                                } else if (data.config.meteorColorMode === 'gradient' && data.config.meteorColor1 && data.config.meteorColor2 && window.setMeteorGradient) {
                                    window.setMeteorGradient(data.config.meteorColor1, data.config.meteorColor2);
                                }
                                
                                // Bật/tắt mưa sao băng dựa trên config
                                if (window.toggleMeteorShower) {
                                    // Kiểm tra trạng thái hiện tại
                                    const currentState = window.isMeteorShowerActive || false;
                                    const targetState = data.config.meteorEnabled;
                                    
                                    console.log('Trạng thái mưa sao băng hiện tại:', currentState);
                                    console.log('Trạng thái mục tiêu:', targetState);
                                    console.log('isMeteorFeatureEnabled:', window.isMeteorFeatureEnabled);
                                    
                                    // Chỉ toggle nếu trạng thái khác nhau
                                    if (currentState !== targetState) {
                                        console.log('Thay đổi trạng thái mưa sao băng từ', currentState, 'sang', targetState);
                                        window.toggleMeteorShower();
                                    } else {
                                        console.log('Không cần thay đổi trạng thái mưa sao băng');
                                    }
                                }
                            }, 1500);
                        }
                    }
                  });
            } else if (hash.startsWith('#config=')) {
                try {
                    const base64Config = hash.replace('#config=', '');
                    const configStr = decodeURIComponent(escape(atob(base64Config)));
                    const config = JSON.parse(configStr);
                    this.updateConfig(config);
                    // Ẩn dashboard và settings-icon luôn ở web con
                    if (controls) controls.style.display = 'none';
                    if (settingsIcon) settingsIcon.style.display = 'none';
                    // Ẩn nút Google login cho web con
                    const googleLoginBtn = document.getElementById('googleLoginBtn');
                    if (googleLoginBtn) {
                        googleLoginBtn.style.display = 'none';
                        googleLoginBtn.classList.add('hidden');
                    }
                    // Áp dụng các thuộc tính đặc biệt cho particleSystem và flowerRing
                    if (this.particleSystem) {
                        if (config.diskRotationSpeed !== undefined) {
                            this.particleSystem.updateDiskRotationSpeed(config.diskRotationSpeed);
                            this.particleSystem.updateInnerDiskRotationSpeed(config.diskRotationSpeed);
                        }
                        if (config.textureRotationSpeed !== undefined) {
                            this.particleSystem.updateTextureRotationSpeed(config.textureRotationSpeed);
                        }
                    }
                    if (this.flowerRing) {
                        if (config.textureRotationSpeed !== undefined) {
                            this.flowerRing.updateRotationSpeed(config.textureRotationSpeed);
                        }
                        if (config.flowerFloatSpeed !== undefined) {
                            this.flowerRing.flyingConfig.floatSpeed = config.flowerFloatSpeed;
                        }
                        if (config.imageUrls && config.imageUrls.length > 0 && this.flowerRing.updateTexturesByDataURLs) {
                            this.flowerRing.updateTexturesByDataURLs(config.imageUrls);
                        }
                    }
                    // Bổ sung: nếu có audioUrl thì set cho audio.js
                    if (config.audioUrl && window.audioManager && window.audioManager.setAudioUrl) {
                        window.audioManager.setAudioUrl(config.audioUrl);
                    }
                    // Kiểm tra và áp dụng trạng thái trái tim to đùng
                    if (config.centralHeartEnabled !== undefined) {
                        console.log('Web con - Áp dụng trạng thái trái tim từ URL config:', config.centralHeartEnabled);
                        // Đợi một chút để đảm bảo trái tim 3D đã load
                        setTimeout(() => {
                            this.applyCentralHeartState(config.centralHeartEnabled);
                        }, 1000);
                    }
                    // Kiểm tra và áp dụng mưa sao băng
                    if (config.meteorEnabled !== undefined) {
                        console.log('Web con - Áp dụng mưa sao băng từ URL config:', config.meteorEnabled);
                        // Đợi một chút để đảm bảo meteors.js đã load
                        setTimeout(() => {
                            // Đảm bảo isMeteorFeatureEnabled được set đúng
                            if (window.isMeteorFeatureEnabled === undefined) {
                                window.isMeteorFeatureEnabled = config.meteorEnabled;
                            }
                            
                            // Cập nhật các thông số mưa sao băng trước
                            if (window.setMeteorSpeed && config.meteorSpeed) {
                                window.setMeteorSpeed(config.meteorSpeed);
                            }
                            if (window.setMeteorDensity && config.meteorDensity) {
                                window.setMeteorDensity(config.meteorDensity);
                            }
                            if (config.meteorColorMode === 'single' && config.meteorColor1 && window.setMeteorColor) {
                                window.setMeteorColor(config.meteorColor1);
                            } else if (config.meteorColorMode === 'gradient' && config.meteorColor1 && config.meteorColor2 && window.setMeteorGradient) {
                                window.setMeteorGradient(config.meteorColor1, config.meteorColor2);
                            }
                            
                            // Bật/tắt mưa sao băng dựa trên config
                            if (window.toggleMeteorShower) {
                                // Kiểm tra trạng thái hiện tại
                                const currentState = window.isMeteorShowerActive || false;
                                const targetState = config.meteorEnabled;
                                
                                console.log('Trạng thái mưa sao băng hiện tại:', currentState);
                                console.log('Trạng thái mục tiêu:', targetState);
                                console.log('isMeteorFeatureEnabled:', window.isMeteorFeatureEnabled);
                                
                                // Chỉ toggle nếu trạng thái khác nhau
                                if (currentState !== targetState) {
                                    console.log('Thay đổi trạng thái mưa sao băng từ', currentState, 'sang', targetState);
                                    window.toggleMeteorShower();
                                } else {
                                    console.log('Không cần thay đổi trạng thái mưa sao băng');
                                }
                            }
                        }, 1500);
                    }
                } catch (e) {
                    // Nếu lỗi thì bỏ qua
                }
            }
        });

        if (flowerFloatSpeedInput && this.flowerRing) {
            flowerFloatSpeedInput.value = this.flowerRing.flyingConfig.floatSpeed;
            flowerFloatSpeedInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.flowerRing.flyingConfig.floatSpeed = val;
            });
        }

        // Khởi tạo voucher
        const getDynamicPrice = () => this.calculateTotalPrice();
        setupVoucherListeners(getDynamicPrice);
        // loadUserVouchers(getDynamicPrice()); // Đã được gọi từ auth.js khi đăng nhập

        // Bỏ tích tất cả checkbox khi mở dashboard để tránh nhầm lẫn
        const enableCentralHeart = document.getElementById('enableCentralHeart');
        const savePermanently = document.getElementById('savePermanently');
        const enableMeteor = document.getElementById('enableMeteorFeature');
        
        if (enableCentralHeart) enableCentralHeart.checked = false; // Auto bỏ tích trái tim to
        if (savePermanently) savePermanently.checked = false;
        if (enableMeteor) enableMeteor.checked = false;

        // Khởi tạo giá tiền ban đầu ngay lập tức
        updateTotalPrice(getDynamicPrice);

        // Event listener cho nút "Xem bảng giá"
        const showPriceTableBtn = controlsContainer.querySelector('#showPriceTableBtn');
        const priceTableDetails = controlsContainer.querySelector('#priceTableDetails');
        if (showPriceTableBtn && priceTableDetails) {
            showPriceTableBtn.addEventListener('click', () => {
                if (priceTableDetails.style.display === 'none') {
                    priceTableDetails.style.display = 'block';
                    showPriceTableBtn.textContent = '📋 Ẩn bảng giá';
                    showPriceTableBtn.style.background = '#f0f0f0';
                } else {
                    priceTableDetails.style.display = 'none';
                    showPriceTableBtn.textContent = '📋 Xem bảng giá';
                    showPriceTableBtn.style.background = 'none';
                }
            });
        }

        // Validate tip input
        const tipInput = controlsContainer.querySelector('#tipAmount');
        const tipError = controlsContainer.querySelector('#tipError');
        if (tipInput) {
            tipInput.addEventListener('input', () => {
                let val = parseInt(tipInput.value, 10);
                if (isNaN(val) || val < 0) {
                    tipInput.value = 0;
                    tipError.style.display = 'inline';
                } else {
                    tipError.style.display = 'none';
                }
                // Gọi lại updateTotalPrice để cộng tip
                updateTotalPrice(getDynamicPrice);
            });
        }

        // Khởi tạo giá tiền ban đầu
        this.updatePriceDisplay = () => {
            updateTotalPrice(getDynamicPrice);
        };

        // Liên kết control mưa sao băng với meteors.js
        setTimeout(() => {
            const tabSingle = document.getElementById('meteorTabSingle');
            const tabGradient = document.getElementById('meteorTabGradient');
            const singleBox = document.getElementById('meteorSingleColorBox');
            const gradBox = document.getElementById('meteorGradientColorBox');
            const colorPicker = document.getElementById('meteorColorPicker');
            const color1 = document.getElementById('meteorGradientColor1');
            const color2 = document.getElementById('meteorGradientColor2');
            if (tabSingle && tabGradient && singleBox && gradBox && colorPicker && color1 && color2) {
                tabSingle.addEventListener('click', () => {
                    tabSingle.classList.add('active');
                    tabGradient.classList.remove('active');
                    singleBox.style.display = '';
                    gradBox.style.display = 'none';
                    if (typeof window.setMeteorColor === 'function') window.setMeteorColor(colorPicker.value);
                });
                tabGradient.addEventListener('click', () => {
                    tabGradient.classList.add('active');
                    tabSingle.classList.remove('active');
                    singleBox.style.display = 'none';
                    gradBox.style.display = '';
                    if (typeof window.setMeteorGradient === 'function') window.setMeteorGradient(color1.value, color2.value);
                });
                colorPicker.addEventListener('input', function() {
                    if (tabSingle.classList.contains('active') && typeof window.setMeteorColor === 'function') window.setMeteorColor(this.value);
                });
                color1.addEventListener('input', function() {
                    if (tabGradient.classList.contains('active') && typeof window.setMeteorGradient === 'function') window.setMeteorGradient(color1.value, color2.value);
                });
                color2.addEventListener('input', function() {
                    if (tabGradient.classList.contains('active') && typeof window.setMeteorGradient === 'function') window.setMeteorGradient(color1.value, color2.value);
                });
            }

            // Checkbox enable/disable meteor feature
            const enableMeteor = document.getElementById('enableMeteorFeature');
            const meteorControls = [
                document.getElementById('meteorTabSingle'),
                document.getElementById('meteorTabGradient'),
                document.getElementById('meteorSingleColorBox'),
                document.getElementById('meteorGradientColorBox'),
                document.getElementById('meteorSpeedRange'),
                document.getElementById('meteorDensityRange'),
            ];
            function setMeteorControlsEnabled(enabled) {
                meteorControls.forEach(ctrl => {
                    if (!ctrl) return;
                    if (ctrl.tagName === 'INPUT' || ctrl.tagName === 'SELECT' || ctrl.tagName === 'BUTTON') {
                        ctrl.disabled = !enabled;
                    } else {
                        ctrl.style.pointerEvents = enabled ? '' : 'none';
                        ctrl.style.opacity = enabled ? '1' : '0.5';
                    }
                });
            }
            if (enableMeteor) {
                enableMeteor.addEventListener('change', function() {
                    setMeteorControlsEnabled(this.checked);
                    updateTotalPrice(getDynamicPrice);
                    
                    // Liên kết với trạng thái bật/tắt mưa sao băng trên web cha
                    const hash = window.location.hash;
                    
                    // Chỉ xử lý trên web cha (không có config hoặc id)
                    if (!hash.startsWith('#config=') && !hash.startsWith('#id=')) {
                        console.log('Web cha - Checkbox changed:', this.checked);
                        
                        // Đợi một chút để đảm bảo trạng thái được cập nhật
                        setTimeout(() => {
                            console.log('Current meteor state:', window.isMeteorShowerActive);
                            
                            if (this.checked && !window.isMeteorShowerActive) {
                                // Bật mưa sao băng (chỉ khi đang tắt)
                                console.log('Bật mưa sao băng từ checkbox');
                                if (window.toggleMeteorShower) {
                                    window.toggleMeteorShower();
                                }
                            } else if (!this.checked && window.isMeteorShowerActive) {
                                // Tắt mưa sao băng (chỉ khi đang bật)
                                console.log('Tắt mưa sao băng từ checkbox');
                                if (window.toggleMeteorShower) {
                                    window.toggleMeteorShower();
                                }
                            } else {
                                console.log('Không cần thay đổi trạng thái mưa sao băng');
                            }
                        }, 50);
                    }
                });
                setMeteorControlsEnabled(enableMeteor.checked);
            }

            // Checkbox enable/disable central heart feature
            const enableCentralHeart = document.getElementById('enableCentralHeart');
            if (enableCentralHeart) {
                enableCentralHeart.addEventListener('change', function() {
                    updateTotalPrice(getDynamicPrice);
                    console.log('Trái tim to đùng:', this.checked ? 'BẬT' : 'TẮT');
                    // Áp dụng trạng thái ngay lập tức
                    if (window.centralSphere && window.centralSphere.applyCentralHeartState) {
                        window.centralSphere.applyCentralHeartState(this.checked);
                    }
                });
                // Khởi tạo trạng thái ban đầu (ẩn trái tim vì checkbox bị bỏ tích)
                if (window.centralSphere && window.centralSphere.applyCentralHeartState) {
                    window.centralSphere.applyCentralHeartState(false);
                }
            }

            // Checkbox lưu vĩnh viễn
            const savePermanently = document.getElementById('savePermanently');
            if (savePermanently) {
                savePermanently.addEventListener('change', function() {
                    updateTotalPrice(getDynamicPrice);
                    console.log('Lưu vĩnh viễn:', this.checked ? 'BẬT' : 'TẮT');
                });
            }

            // Khởi tạo tổng tiền ban đầu đúng (mặc định 10.000đ)
            updateTotalPrice(getDynamicPrice);

            const speedRange = document.getElementById('meteorSpeedRange');
            if (speedRange) {
                speedRange.addEventListener('input', function() {
                    if (typeof window.setMeteorSpeed === 'function') window.setMeteorSpeed(Number(this.value));
                });
            }
          
            const densityRange = document.getElementById('meteorDensityRange');
            if (densityRange) {
                densityRange.addEventListener('input', function() {
                    if (typeof window.setMeteorDensity === 'function') window.setMeteorDensity(Number(this.value));
                });
            }
        }, 500);
    }

    generatePoints() {
        this.points = [];
        this.sizes = [];
        this.shifts = [];

        for (let i = 0; i < this.config.points; i++) {
            this.sizes.push(Math.random() * 1.5 + 0.5);
            this.pushShift();
            this.points.push(this.createPoint());
        }
    }

    createPoint() {
        return new THREE.Vector3()
            .randomDirection()
            .multiplyScalar(
                Math.random() * (this.config.radius.MAX - this.config.radius.MIN)
                + this.config.radius.MIN
            );
    }

    pushShift() {
        this.shifts.push(
            Math.random() * Math.PI,
            Math.random() * Math.PI * 2,
            (Math.random() * 0.9 + 0.1) * Math.PI * 1.0,
            Math.random() * 0.9 + 0.1
        );
    }

    createBody() {
        this.generatePoints();

        const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        geometry.setAttribute("sizes", new THREE.Float32BufferAttribute(this.sizes, 1));
        geometry.setAttribute("shift", new THREE.Float32BufferAttribute(this.shifts, 4));

        const material = this.createMaterial();
        const body = new THREE.Points(geometry, material);

        body.rotation.order = "ZYX";
        body.rotation.z = 0.2;

        if (this.object) {
            this.scene.remove(this.object);
        }

        this.object = body;
        this.scene.add(body);
    }

    createMaterial() {
        const material = new THREE.PointsMaterial({
            size: 0.15 * this.config.size,
            transparent: true,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });

        const vertexShader = `
            uniform float time;
            uniform float particleSpeed;
            uniform float size;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform bool isGradient;
            attribute float sizes;
            attribute vec4 shift;
            varying vec3 vColor;
            const float PI2 = 6.28318530718;

            void main() {
                if (isGradient) {
                    float colorMix = mod(shift.x + shift.y, 1.0);
                    vColor = mix(color1, color2, colorMix);
                } else {
                    vColor = color1;
                }
                
                vec3 pos = position;
                float t = time * particleSpeed;
                float moveT = mod(shift.x + shift.z * t, PI2);
                float moveS = mod(shift.y + shift.z * t, PI2);
                pos += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * sizes * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            varying vec3 vColor;

            void main() {
                float d = length(gl_PointCoord.xy - 0.5);
                if (d > 0.5) discard;
                gl_FragColor = vec4(vColor, smoothstep(0.5, 0.1, d) * 0.8);
            }
        `;

        material.onBeforeCompile = (shader) => {
            const color1 = new THREE.Color(this.config.color1);
            const color2 = new THREE.Color(this.config.color2);

            shader.uniforms.time = { value: 0 };
            shader.uniforms.particleSpeed = { value: this.config.particleSpeed };
            shader.uniforms.color1 = { value: new THREE.Vector3(color1.r, color1.g, color1.b) };
            shader.uniforms.color2 = { value: new THREE.Vector3(color2.r, color2.g, color2.b) };
            shader.uniforms.isGradient = { value: this.config.isGradient };

            shader.vertexShader = vertexShader;
            shader.fragmentShader = fragmentShader;
            this.uniforms = shader.uniforms;
        };

        return material;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (this.object) {
            const newMaterial = this.createMaterial();
            this.object.material = newMaterial;
            newMaterial.needsUpdate = true;
        }
        // Áp dụng màu đĩa, màu nền nếu có
        let ps = this.particleSystem;
        if (!ps && window.particleSystem) {
            ps = window.particleSystem;
            this.particleSystem = ps;
        }
        if (ps && (
            newConfig.diskColor || newConfig.innerDiskColor || newConfig.outermostColor || newConfig.backgroundColor)) {
            ps.updateColors(
                newConfig.backgroundColor || null,
                newConfig.diskColor || null,
                newConfig.innerDiskColor || null,
                newConfig.outermostColor || null
            );
        }
    }

    animate() {
        if (this.object) {
            const elapsedTime = this.clock.getElapsedTime();
            this.uniforms.time.value = elapsedTime;
            this.uniforms.particleSpeed.value = this.config.particleSpeed;
            this.object.rotation.y = elapsedTime * this.config.rotationSpeed;
        }
    }

    setParticleSystem(particleSystem) {
        this.particleSystem = particleSystem;
    }

    setFlowerRing(flowerRing) {
        this.flowerRing = flowerRing;
    }

    // Lấy toàn bộ config dashboard (gồm cả các giá trị đặc biệt)
    getCurrentConfig() {
        // Lấy các giá trị từ input dashboard
        const configObj = { ...this.config };
        // Màu các đĩa và không gian
        const backgroundColorInput = document.getElementById('backgroundColor');
        const diskColorInput = document.getElementById('diskColor');
        const innerDiskColorInput = document.getElementById('innerDiskColor');
        const outermostColorInput = document.getElementById('outermostColor');
        if (backgroundColorInput) configObj.backgroundColor = backgroundColorInput.value;
        if (diskColorInput) configObj.diskColor = diskColorInput.value;
        if (innerDiskColorInput) configObj.innerDiskColor = innerDiskColorInput.value;
        if (outermostColorInput) configObj.outermostColor = outermostColorInput.value;
        // Tốc độ quay đĩa
        const diskRotationSpeedInput = document.getElementById('diskRotationSpeed');
        if (diskRotationSpeedInput) configObj.diskRotationSpeed = parseFloat(diskRotationSpeedInput.value);
        // Tốc độ quay vòng ảnh
        const textureRotationSpeedInput = document.getElementById('textureRotationSpeed');
        if (textureRotationSpeedInput) configObj.textureRotationSpeed = parseFloat(textureRotationSpeedInput.value);
        // Tốc độ bay vòng ảnh
        const flowerFloatSpeedInput = document.getElementById('flowerFloatSpeed');
        if (flowerFloatSpeedInput) configObj.flowerFloatSpeed = parseFloat(flowerFloatSpeedInput.value);
        // Lưu thông tin mưa sao băng
        const enableMeteor = document.getElementById('enableMeteorFeature');
        configObj.meteorEnabled = enableMeteor ? enableMeteor.checked : false;
        const speedRange = document.getElementById('meteorSpeedRange');
        configObj.meteorSpeed = speedRange ? Number(speedRange.value) : 6;
        const densityRange = document.getElementById('meteorDensityRange');
        configObj.meteorDensity = densityRange ? Number(densityRange.value) : 70;
        // Lưu trạng thái trái tim to đùng
        const enableCentralHeart = document.getElementById('enableCentralHeart');
        configObj.centralHeartEnabled = enableCentralHeart ? enableCentralHeart.checked : true;
        // Lưu mode và màu
        const tabSingle = document.getElementById('meteorTabSingle');
        const tabGradient = document.getElementById('meteorTabGradient');
        if (tabSingle && tabSingle.classList.contains('active')) {
            configObj.meteorColorMode = 'single';
            const colorPicker = document.getElementById('meteorColorPicker');
            configObj.meteorColor1 = colorPicker ? colorPicker.value : '#00f0ff';
            configObj.meteorColor2 = colorPicker ? colorPicker.value : '#00f0ff';
        } else if (tabGradient && tabGradient.classList.contains('active')) {
            configObj.meteorColorMode = 'gradient';
            const color1 = document.getElementById('meteorGradientColor1');
            const color2 = document.getElementById('meteorGradientColor2');
            configObj.meteorColor1 = color1 ? color1.value : '#00f0ff';
            configObj.meteorColor2 = color2 ? color2.value : '#ffffff';
        }
        return configObj;
    }

    // ===== CÁC HÀM TIỆN ÍCH =====
    
    /**
     * Upload ảnh lên R2
     * @param {FileList} files - Danh sách file ảnh
     * @returns {Promise<string[]>} - Mảng URL ảnh
     */
    async uploadImages(files) {
        console.log('🚀 uploadImages được gọi với files:', files);
        const imageUrls = [];
        if (files && files.length > 0) {
            // Kiểm tra checkbox lưu vĩnh viễn
            const savePermanently = document.getElementById('savePermanently');
            const prefix = savePermanently && savePermanently.checked ? 'vip' : '';
            
            console.log('🔍 Upload Images - Checkbox savePermanently:', savePermanently?.checked);
            console.log('🔍 Upload Images - Prefix value:', prefix);
            
            for (let i = 0; i < files.length; i++) {
                const imgBase64 = await fileToBase64(files[i]);
                const url = await uploadImageToR2(imgBase64, prefix);
                imageUrls.push(url);
            }
            console.log('Các link ảnh R2:', imageUrls);
        }
        return imageUrls;
    }

    /**
     * Upload audio lên R2
     * @param {File} file - File audio
     * @returns {Promise<string>} - URL audio
     */
    async uploadAudio(file) {
        console.log('🚀 uploadAudio được gọi với file:', file);
        if (file) {
            // Kiểm tra checkbox lưu vĩnh viễn
            const savePermanently = document.getElementById('savePermanently');
            const prefix = savePermanently && savePermanently.checked ? 'vip' : '';
            
            console.log('🔍 Upload Audio - Checkbox savePermanently:', savePermanently?.checked);
            console.log('🔍 Upload Audio - Prefix value:', prefix);
            
            const audioBase64 = await fileToBase64(file);
            const url = await uploadAudioToR2(audioBase64, prefix);
            return url;
        }
        return null;
    }

    /**
     * Xử lý thanh toán (chỉ ở web cha)
     * @returns {Promise<boolean>} - Kết quả thanh toán
     */
    async handlePayment() {
        const hash = window.location.hash;
        // Chỉ thanh toán khi ở web cha (không có #config= hoặc #id=)
        if (!hash.startsWith('#config=') && !hash.startsWith('#id=')) {
            // UID đã được kiểm tra ở handleFinishCreation() rồi
            let price = (typeof getFinalPrice === 'function' && getFinalPrice() > 0)
                ? getFinalPrice()
                : this.calculateTotalPrice();
            return await processPayment(price, showToast, null);
        }
        return true; // Web con không cần thanh toán
    }

    /**
     * Lưu cấu hình lên backend
     * @param {Object} config - Cấu hình thiên hà
     * @returns {Promise<{success: boolean, shortLink: string, message: string}>}
     */
    async saveGalaxyConfig(config) {
        try {
            const response = await fetch(`${SERVER_URL_PROD}/api/galaxy-configs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });
            const data = await response.json();
            if (data.success && data.galaxyId) {
                const shortLink = window.location.origin + window.location.pathname + '#id=' + data.galaxyId;
                return {
                    success: true,
                    shortLink,
                    message: '<div style="color:green;margin-bottom:8px;">Đã lưu cấu hình thiên hà lên hệ thống!</div>'
                };
            } else {
                return {
                    success: false,
                    shortLink: '',
                    message: '<div style="color:#e53935;margin-bottom:8px;">Lưu cấu hình thất bại: ' + (data.message || 'Lỗi không xác định') + '</div>'
                };
            }
        } catch (err) {
            return {
                success: false,
                shortLink: '',
                message: '<div style="color:#e53935;margin-bottom:8px;">Lỗi kết nối server: ' + err.message + '</div>'
            };
        }
    }

    /**
     * Tạo sản phẩm trên backend
     * @param {string} shareUrl - Link chia sẻ
     * @param {string} imageUrl - URL ảnh đại diện
     * @param {number} totalPrice - Tổng tiền đã tính toán
     * @returns {Promise<string>} - Message kết quả
     */
    async createProduct(shareUrl, imageUrl, totalPrice) {
        const name = 'Thiên hà tình yêu';
        const type = 'Galaxy Advanced';
        const uid = localStorage.getItem('user_uid') ;
        const images = imageUrl || 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
        try {
            const response = await fetch(`${SERVER_URL_PROD}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, name, type, price: totalPrice, images, linkproduct: shareUrl })
            });
            const data = await response.json();
            if (data.success) {
                return '<div style="color:green;margin-bottom:8px;">Đã lưu sản phẩm lên hệ thống!</div>';
            } else {
                return '<div style="color:#e53935;margin-bottom:8px;">Lưu sản phẩm thất bại: ' + (data.message || 'Lỗi không xác định') + '</div>';
            }
        } catch (err) {
            return '<div style="color:#e53935;margin-bottom:8px;">Lỗi kết nối server: ' + err.message + '</div>';
        }
    }

    /**
     * Tạo fallback URL nếu không lưu được config
     * @param {Object} config - Cấu hình thiên hà
     * @returns {string} - URL fallback
     */
    createFallbackUrl(config) {
        const configStr = JSON.stringify(config);
        const base64Config = btoa(unescape(encodeURIComponent(configStr)));
        return window.location.origin + window.location.pathname + '#config=' + base64Config;
    }

    /**
     * Hiển thị popup chia sẻ
     * @param {string} shareUrl - Link chia sẻ
     * @param {string} apiMessage - Message từ API
     */
    showSharePopup(shareUrl, apiMessage) {
        const popup = document.createElement('div');
        popup.className = 'shrimp-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            color: #222;
            padding: 28px 24px;
            border-radius: 14px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.18);
            z-index: 9999;
        `;
        
        popup.innerHTML = `
            ${apiMessage}
            <div style='font-size:1.15em;font-weight:600;margin-bottom:12px;'>Link chia sẻ thiên hà của bạn:</div>
            <input id='shareLinkInput' style='width:100%;padding:8px 6px;font-size:1em;border-radius:6px;border:1px solid #ccc;margin-bottom:12px;' value='${shareUrl}' readonly>
            <div style='font-size:0.9em;color:#666;margin-bottom:12px;font-style:italic;'>💡 Nhấn "Sao chép link & Tạo QR" để copy link và mở trang tạo QR trái tim, sau đó dán link vào ô là được nhaaa!</div>
            <button id='copyShareLinkBtn' style='background:#ff6b6b;color:#fff;padding:8px 18px;border:none;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer;'>Sao chép link & Tạo QR</button>
            <button id='closeSharePopupBtn' style='margin-left:12px;background:#eee;color:#222;padding:8px 18px;border:none;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer;'>Đóng</button>
        `;
        
        document.body.appendChild(popup);
        
        // Xử lý sự kiện copy và redirect
        document.getElementById('copyShareLinkBtn').onclick = () => {
            const input = document.getElementById('shareLinkInput');
            input.select();
            document.execCommand('copy');
            document.getElementById('copyShareLinkBtn').innerText = 'Đã sao chép!';
            
            // Redirect đến trang QR với link thiên hà
            setTimeout(() => {
                const qrUrl = `https://deargift.online/heartqr.html?url=${encodeURIComponent(shareUrl)}`;
                window.open(qrUrl, '_blank');
            }, 200);
        };
        
        // Xử lý sự kiện đóng
        document.getElementById('closeSharePopupBtn').onclick = () => {
            document.body.removeChild(popup);
        };
    }

    /**
     * Xử lý logic chính khi click nút hoàn tất
     */
    async handleFinishCreation() {
        try {
            // 0. Kiểm tra UID - người dùng phải đăng nhập trước
            const uid = localStorage.getItem('user_uid');
            if (!uid) {
                showToast('Vui lòng đăng nhập trước khi tạo thiên hà!', 'error');
                // Highlight nút Google login
                const googleBtn = document.getElementById('googleLoginBtn');
                if (googleBtn) {
                    googleBtn.style.boxShadow = '0 0 0 4px #ff6b6b, 0 2px 8px #0002';
                    googleBtn.style.animation = 'shake 0.4s';
                    setTimeout(() => {
                        googleBtn.style.boxShadow = '';
                        googleBtn.style.animation = '';
                    }, 1000);
                }
                return;
            }

            // 1. Lấy cấu hình hiện tại
            const config = this.getCurrentConfig();

            // 2. Upload ảnh và audio
            const imageInput = document.getElementById('flowerImageInput');
            const audioInput = document.getElementById('audioInput');
            
            const imageUrls = await this.uploadImages(imageInput?.files);
            const audioUrl = await this.uploadAudio(audioInput?.files[0]);
            
            // Cập nhật config với URL
            config.imageUrls = imageUrls;
            if (audioUrl) config.audioUrl = audioUrl;
            
            console.log('Config sau khi upload:', config);

            // 3. Tính tổng tiền
            const totalPrice = (typeof getFinalPrice === 'function') ? getFinalPrice() : this.calculateTotalPrice();
            console.log('Tổng tiền:', totalPrice);

            // 4. Xử lý thanh toán (chỉ khi có phí)
            if (totalPrice > 0) {
                const paymentSuccess = await this.handlePayment();
                if (!paymentSuccess) return;
            } else {
                console.log('Tạo phiên bản free - không cần thanh toán');
            }

            // 5. Lưu cấu hình lên backend
            const configResult = await this.saveGalaxyConfig(config);
            let shareUrl = configResult.shortLink;
            let apiMessage = configResult.message;

            // 6. Tạo fallback URL nếu cần
            if (!shareUrl) {
                shareUrl = this.createFallbackUrl(config);
            }

            // 7. Tạo sản phẩm
            const productMessage = await this.createProduct(shareUrl, imageUrls[0], totalPrice);
            apiMessage += productMessage;

            // 8. Hiển thị popup chia sẻ
            this.showSharePopup(shareUrl, apiMessage);

        } catch (error) {
            console.error('Lỗi trong quá trình xử lý:', error);
            showToast('Có lỗi xảy ra trong quá trình xử lý!', 'error');
        }
    }

    /**
     * Tính tổng tiền dựa trên các tùy chọn
     * @returns {number} - Tổng tiền
     */
    calculateTotalPrice() {
        let totalPrice = 0; // Giá gốc thay đổi từ 10000 thành 0
        let costBreakdown = [];
        
        // Tính tiền trái tim to đùng ở giữa (chỉ khi checkbox được tích)
        const enableCentralHeart = document.getElementById('enableCentralHeart');
        if (enableCentralHeart && enableCentralHeart.checked) {
            totalPrice += 5000; // Trái tim to đùng ở giữa: 5,000đ
            costBreakdown.push('💖 Trái tim to đùng: +5,000đ');
        }
        
        // Tính tiền ảnh (từ ảnh thứ 2 trở đi)
        const imageInput = document.getElementById('flowerImageInput');
        if (imageInput && imageInput.files.length > 1) {
            const extraImages = imageInput.files.length - 1; // Trừ ảnh đầu tiên
            const imageCost = extraImages * 3000;
            totalPrice += imageCost; // Thay đổi từ 2000 thành 3000/ảnh từ ảnh thứ 2
            costBreakdown.push(`🖼️ ${extraImages} ảnh thêm: +${imageCost.toLocaleString()}đ`);
        }
        
        // Tính tiền đổi nhạc
        const audioInput = document.getElementById('audioInput');
        if (audioInput && audioInput.files.length > 0) {
            totalPrice += 5000; // 5000 cho việc đổi nhạc
            costBreakdown.push('🎵 Đổi nhạc: +5,000đ');
        }
        
        // Tính tiền mưa sao băng nâng cao
        const enableMeteor = document.getElementById('enableMeteorFeature');
        if (enableMeteor && enableMeteor.checked) {
            totalPrice += 3000; // Thay đổi từ 7000 thành 3000
            costBreakdown.push('☄️ Mưa sao băng: +3,000đ');
        }
        
        // Tính tiền lưu vĩnh viễn
        const savePermanently = document.getElementById('savePermanently');
        if (savePermanently && savePermanently.checked) {
            totalPrice += 3000; // Lưu vĩnh viễn: 3,000đ
            costBreakdown.push('💾 Lưu vĩnh viễn: +3,000đ');
        }
        
        // Cập nhật bảng thống kê chi phí
        this.updateCostBreakdown(costBreakdown);
        
        return totalPrice;
    }

    /**
     * Cập nhật bảng thống kê chi phí
     * @param {Array} costBreakdown - Danh sách các khoản chi phí
     */
    updateCostBreakdown(costBreakdown) {
        const costDetails = document.getElementById('costDetails');
        if (costDetails) {
            if (costBreakdown.length === 0) {
                costDetails.innerHTML = '<div style="color:#999;font-style:italic;">Chưa có tính năng nào được chọn, nếu bạn ấn tạo bây giờ thì bạn sẽ có 1 thiên hà cơ bản free</div>';
            } else {
                costDetails.innerHTML = costBreakdown.map(item => `<div>${item}</div>`).join('');
            }
        }
    }

    showFreeVersionInfo() {
        const popup = document.createElement('div');
        popup.className = 'free-version-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            color: #222;
            padding: 32px 28px;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 480px;
            width: 90%;
        `;
        
        popup.innerHTML = `
            <div style='text-align:center;margin-bottom:24px;'>
                <h2 style='margin:0 0 8px 0;color:#4ecdc4;font-size:1.4em;'>🌌 Phiên Bản Free</h2>
                <p style='margin:0;color:#666;font-size:1.1em;'>Với phiên bản free, các bạn sẽ có 1 thiên hà mặc định:</p>
            </div>
            <div style='background:#f8f9fa;padding:20px;border-radius:12px;margin-bottom:24px;'>
                <ul style='margin:0;padding-left:20px;line-height:1.6;color:#333;'>
                    <li>• <strong>Không có trái tim to ở giữa</strong></li>
                    <li>• <strong>Có thể đổi 1 ảnh</strong></li>
                    <li>• <strong>Dùng nhạc mặc định</strong></li>
                    <li>• <strong>Có thể tùy chỉnh màu sắc tùy ý</strong></li>
                </ul>
            </div>
            <div style='text-align:center;'>
                <button id='createFreeConfirmBtn' style='background:#4ecdc4;color:#fff;padding:12px 32px;border:none;border-radius:10px;font-size:1.1em;font-weight:600;cursor:pointer;margin-right:12px;'>Tạo Free Ngay</button>
                <button id='closeFreePopupBtn' style='background:#eee;color:#222;padding:12px 32px;border:none;border-radius:10px;font-size:1.1em;font-weight:600;cursor:pointer;'>Đóng</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Xử lý sự kiện tạo free
        document.getElementById('createFreeConfirmBtn').onclick = () => {
            this.handleFreeCreation();
            document.body.removeChild(popup);
        };
        
        // Xử lý sự kiện đóng
        document.getElementById('closeFreePopupBtn').onclick = () => {
            document.body.removeChild(popup);
        };
    }

    /**
     * Xử lý tạo phiên bản free
     */
    async handleFreeCreation() {
        try {
            // Tạo config cho phiên bản free
            const freeConfig = {
                // Màu sắc cơ bản (giữ nguyên từ config hiện tại)
                color1: this.config.color1,
                color2: this.config.color2,
                isGradient: this.config.isGradient,
                size: this.config.size,
                rotationSpeed: this.config.rotationSpeed,
                particleSpeed: this.config.particleSpeed,
                points: this.config.points,
                radius: this.config.radius,
                
                // Tắt trái tim to đùng ở giữa cho phiên bản free
                hideCentralHeart: true,
                
                // Giới hạn chỉ 1 ảnh
                maxImages: 1,
                
                // Không có mưa sao băng
                meteorEnabled: false,
                
                // Không có audio tùy chỉnh
                useDefaultAudio: true
            };

            // Upload ảnh (chỉ 1 ảnh đầu tiên nếu có)
            const imageInput = document.getElementById('flowerImageInput');
            let imageUrls = [];
            if (imageInput && imageInput.files.length > 0) {
                const firstImage = imageInput.files[0];
                const imgBase64 = await fileToBase64(firstImage);
                const url = await uploadImageToR2(imgBase64);
                imageUrls.push(url);
                freeConfig.imageUrls = imageUrls;
            }

            // Tạo fallback URL cho phiên bản free
            const shareUrl = this.createFallbackUrl(freeConfig);

            // Hiển thị popup chia sẻ cho phiên bản free
            this.showFreeSharePopup(shareUrl);

        } catch (error) {
            console.error('Lỗi trong quá trình tạo phiên bản free:', error);
            showToast('Có lỗi xảy ra trong quá trình tạo phiên bản free!', 'error');
        }
    }

    /**
     * Hiển thị popup chia sẻ cho phiên bản free
     * @param {string} shareUrl - Link chia sẻ
     */
    showFreeSharePopup(shareUrl) {
        const popup = document.createElement('div');
        popup.className = 'free-share-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            color: #222;
            padding: 28px 24px;
            border-radius: 14px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.18);
            z-index: 9999;
            max-width: 480px;
            width: 90%;
        `;
        
        popup.innerHTML = `
            <div style='text-align:center;margin-bottom:20px;'>
                <h3 style='margin:0 0 8px 0;color:#4ecdc4;font-size:1.3em;'>🎉 Tạo Free Thành Công!</h3>
                <p style='margin:0;color:#666;font-size:1em;'>Thiên hà free của bạn đã sẵn sàng để chia sẻ</p>
            </div>
            <div style='font-size:1.15em;font-weight:600;margin-bottom:12px;'>Link chia sẻ thiên hà free:</div>
            <input id='freeShareLinkInput' style='width:100%;padding:8px 6px;font-size:1em;border-radius:6px;border:1px solid #ccc;margin-bottom:12px;' value='${shareUrl}' readonly>
            <div style='text-align:center;'>
                <button id='copyFreeShareLinkBtn' style='background:#4ecdc4;color:#fff;padding:8px 18px;border:none;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer;margin-right:12px;'>Sao chép link</button>
                <button id='closeFreeSharePopupBtn' style='background:#eee;color:#222;padding:8px 18px;border:none;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer;'>Đóng</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Xử lý sự kiện copy
        document.getElementById('copyFreeShareLinkBtn').onclick = () => {
            const input = document.getElementById('freeShareLinkInput');
            input.select();
            document.execCommand('copy');
            document.getElementById('copyFreeShareLinkBtn').innerText = 'Đã sao chép!';
        };
        
        // Xử lý sự kiện đóng
        document.getElementById('closeFreeSharePopupBtn').onclick = () => {
            document.body.removeChild(popup);
        };
    }

    /**
     * Áp dụng trạng thái trái tim to đùng
     * @param {boolean} enabled - Trạng thái bật/tắt trái tim to đùng
     */
    applyCentralHeartState(enabled) {
        console.log('=== Áp dụng trạng thái trái tim to đùng ===');
        console.log('Trạng thái:', enabled ? 'BẬT' : 'TẮT');
        console.log('window.heart3D tồn tại:', !!window.heart3D);
        
        if (enabled) {
            // Nếu checkbox được tích và trái tim đã load
            if (window.heart3D) {
                window.heart3D.visible = true;
                window.heart3D.traverse((child) => {
                    if (child.isMesh) {
                        child.visible = true;
                    }
                });
                console.log('✅ Trái tim 3D đã được hiện');
            } else {
                console.log('⚠️ Trái tim 3D chưa được load');
            }
        } else {
            // Nếu checkbox bị bỏ tích và trái tim đã load
            if (window.heart3D) {
                window.heart3D.visible = false;
                window.heart3D.traverse((child) => {
                    if (child.isMesh) {
                        child.visible = false;
                    }
                });
                console.log('✅ Trái tim 3D đã được ẩn');
            }
        }
        console.log('=== Kết thúc áp dụng trạng thái ===');
    }
} 