import * as THREE from 'three';

export class FlowerRingSystem {
    constructor(scene) {
        this.scene = scene;
        this.rotationSpeed = 0.002;
        this.flowers = [];
        this.isFlying = false;
        this.flowerTextures = [];

        // Các thông số có thể điều chỉnh
        this.flyingConfig = {
            duration: 300000,        // Thời gian bay (ms) - mặc định 300 giây (5 phút)
            scaleMultiplier: 5,      // Hệ số phóng to - mặc định gấp 5 lần (tăng từ 3 lên 5)
            floatSpeed: 0.00002,      // Tốc độ nổi lên - mặc định 0.0002 (chậm hơn)
            swaySpeed: 0.00015,      // Tốc độ đung đưa - mặc định 0.00015 (chậm hơn)
            swayAmount: 0.15,        // Độ đung đưa - mặc định 0.15 (nhẹ nhàng hơn)
            rotationSpeed: 0.001,    // Tốc độ xoay - mặc định 0.001 (chậm hơn)
            batchSize: 50,           // Số lượng bông hoa bay cùng lúc
            batchDelay: 1000,        // Thời gian delay giữa các đợt bay (ms)
            totalBatches: 25         // Tổng số đợt bay (25 đợt * 50 bông = 1200 bông)
        };

        this.createFlowerRing();
    }

    createFlowerRing() {
        this.flowerRing = new THREE.Group();
        this.scene.add(this.flowerRing);

        const textureLoader = new THREE.TextureLoader();
        
        // Load texture trực tiếp
        textureLoader.load('assets/b1.jpg', (texture) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = texture.image.width;
            canvas.height = texture.image.height;
            
            // Vẽ ảnh vào canvas
            ctx.drawImage(texture.image, 0, 0);
            
            // Lấy dữ liệu ảnh
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Xử lý bo tròn góc
            const radius = Math.min(canvas.width, canvas.height) * 0.1;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    
                    const distX = Math.min(x, canvas.width - x);
                    const distY = Math.min(y, canvas.height - y);
                    const dist = Math.sqrt(distX * distX + distY * distY);
                    
                    if (dist < radius) {
                        const alpha = Math.min(1, dist / radius);
                        data[i + 3] = Math.floor(255 * alpha);
                    } else {
                        data[i + 3] = 255;
                    }
                }
            }
            
            // Cập nhật ảnh đã xử lý
            ctx.putImageData(imageData, 0, 0);
            
            // Tạo texture từ canvas
            const processedTexture = new THREE.CanvasTexture(canvas);
            processedTexture.minFilter = THREE.NearestFilter;
            processedTexture.magFilter = THREE.NearestFilter;
            
            const flowerMaterial = new THREE.SpriteMaterial({ 
                map: processedTexture,
                color: 0xffffff,
                transparent: true,
                opacity: 1,
                depthTest: true,
                depthWrite: true,
                sizeAttenuation: true,
                alphaTest: 0.1
            });

            const numFlowers = 1600;
            const innerRadius = 150;
            const outerRadius = 600;
            const heightRange = 9;
            
            for (let i = 0; i < numFlowers; i++) {
                const sprite = new THREE.Sprite(flowerMaterial.clone());
                const angle = Math.random() * Math.PI * 2;
                const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
                const height = (Math.random() - 0.5) * heightRange * 2;

                sprite.position.set(
                    Math.cos(angle) * radius,
                    height,
                    Math.sin(angle) * radius
                );
                
                const size = 10 + Math.random() * 3;
                sprite.scale.set(size, size, 1);
                sprite.lookAt(0, height, 0);
                
                sprite.userData = {
                    originalPosition: sprite.position.clone(),
                    originalScale: sprite.scale.clone(),
                    velocity: new THREE.Vector3(),
                    targetPosition: new THREE.Vector3(),
                    startTime: 0,
                    delay: Math.random() * 2,
                    isFlying: false
                };
                
                this.flowers.push(sprite);
                this.flowerRing.add(sprite);
            }
        });
    }

    triggerFlyingEffect() {
        if (this.isFlying) return;
        
        this.isFlying = true;
        const currentTime = Date.now();
        let batchIndex = 0;
        
        // Chia các bông hoa thành các nhóm
        const batches = [];
        for (let i = 0; i < this.flowers.length; i += this.flyingConfig.batchSize) {
            batches.push(this.flowers.slice(i, i + this.flyingConfig.batchSize));
        }
        
        // Thiết lập thông tin bay cho từng bông hoa
        this.flowers.forEach(flower => {
            flower.userData.startTime = currentTime;
            flower.userData.isFlying = false;
            
            // Tạo vị trí ngẫu nhiên trong không gian
            const randomX = (Math.random() - 0.5) * 3000;
            const randomY = Math.random() * 1500 + 800;
            const randomZ = (Math.random() - 0.5) * 3000;
            
            flower.userData.targetPosition.set(randomX, randomY, randomZ);
            
            // Lưu thông tin ban đầu
            flower.userData.originalPosition = flower.position.clone();
            flower.userData.originalScale = flower.scale.clone();
            flower.userData.targetScale = flower.scale.clone().multiplyScalar(this.flyingConfig.scaleMultiplier);
            
            // Thêm thông tin cho hiệu ứng bong bóng
            flower.userData.floatOffset = Math.random() * Math.PI * 2;
            flower.userData.swayOffset = Math.random() * Math.PI * 2;
        });

        // Tạo hiệu ứng bay theo đợt
        const startBatch = () => {
            if (batchIndex < batches.length) {
                const currentBatch = batches[batchIndex];
                currentBatch.forEach(flower => {
                    flower.userData.isFlying = true;
                });
                batchIndex++;
                setTimeout(startBatch, this.flyingConfig.batchDelay);
            }
        };

        startBatch();
    }

    animate() {
        if (this.flowerRing) {
            if (!this.isFlying) {
                this.flowerRing.rotation.y += this.rotationSpeed;
            } else {
                const currentTime = Date.now();
                
                this.flowers.forEach(flower => {
                    if (!flower.userData.isFlying) {
                        if (currentTime - flower.userData.startTime > flower.userData.delay * 1000) {
                            flower.userData.isFlying = true;
                        }
                    } else {
                        // Tính toán thời gian bay
                        const progress = Math.min(1, (currentTime - flower.userData.startTime - flower.userData.delay * 1000) / this.flyingConfig.duration);
                        
                        // Easing function mượt mà hơn cho chuyển động bong bóng
                        const easeProgress = 1 - Math.pow(1 - progress, 2); // Bậc 2 để mượt hơn
                        
                        // Tính toán vị trí mới với hiệu ứng bong bóng
                        const floatY = Math.sin(currentTime * this.flyingConfig.floatSpeed + flower.userData.floatOffset) * this.flyingConfig.swayAmount;
                        const swayX = Math.sin(currentTime * this.flyingConfig.swaySpeed + flower.userData.swayOffset) * this.flyingConfig.swayAmount;
                        const swayZ = Math.cos(currentTime * this.flyingConfig.swaySpeed + flower.userData.swayOffset) * this.flyingConfig.swayAmount;
                        
                        // Cập nhật vị trí với chuyển động mượt mà
                        const targetPos = flower.userData.targetPosition.clone();
                        targetPos.y += floatY;
                        targetPos.x += swayX;
                        targetPos.z += swayZ;
                        
                        // Sử dụng lerp với hệ số nhỏ hơn để mượt hơn
                        flower.position.lerpVectors(
                            flower.userData.originalPosition,
                            targetPos,
                            easeProgress * 0.5 // Giảm tốc độ chuyển động
                        );
                        
                        // Cập nhật kích thước mượt mà
                        if (flower.userData.originalScale && flower.userData.targetScale) {
                            flower.scale.lerpVectors(
                                flower.userData.originalScale,
                                flower.userData.targetScale,
                                easeProgress * 0.5 // Giảm tốc độ phóng to
                            );
                        }
                        
                        // Thêm chuyển động xoay nhẹ nhàng hơn
                        flower.rotation.x += Math.sin(currentTime * this.flyingConfig.rotationSpeed) * 0.0005;
                        flower.rotation.y += Math.cos(currentTime * this.flyingConfig.rotationSpeed) * 0.0005;
                        flower.rotation.z += Math.sin(currentTime * this.flyingConfig.rotationSpeed * 0.5) * 0.0005;
                    }
                });
            }
        }
    }

    updateRotationSpeed(speed) {
        this.rotationSpeed = speed;
    }

    updateTextureByDataURL(dataURL) {
        const loader = new THREE.TextureLoader();
        loader.load(dataURL, (texture) => {
            // Xử lý lại bo tròn góc như createFlowerRing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = texture.image.width;
            canvas.height = texture.image.height;
            ctx.drawImage(texture.image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const radius = Math.min(canvas.width, canvas.height) * 0.1;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    const distX = Math.min(x, canvas.width - x);
                    const distY = Math.min(y, canvas.height - y);
                    const dist = Math.sqrt(distX * distX + distY * distY);
                    if (dist < radius) {
                        const alpha = Math.min(1, dist / radius);
                        data[i + 3] = Math.floor(255 * alpha);
                    } else {
                        data[i + 3] = 255;
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            const processedTexture = new THREE.CanvasTexture(canvas);
            processedTexture.minFilter = THREE.NearestFilter;
            processedTexture.magFilter = THREE.NearestFilter;
            // Cập nhật lại texture cho tất cả sprite
            this.flowers.forEach(sprite => {
                sprite.material.map = processedTexture;
                sprite.material.needsUpdate = true;
            });
        });
    }

    updateTexturesByDataURLs(dataURLs, showOverlay = true) {
        // Hiển thị overlay mờ khi bắt đầu load ảnh (chỉ khi showOverlay=true)
        const overlay = document.getElementById('flower-loading-overlay');
        if (overlay && showOverlay) overlay.style.display = 'block';
        // Tạo mảng texture từ mảng dataURL
        const loader = new THREE.TextureLoader();
        const textures = [];
        let loaded = 0;
        const onAllLoaded = () => {
            this.flowerTextures = textures;
            // Gán random texture cho từng bông hoa
            this.flowers.forEach(sprite => {
                const idx = Math.floor(Math.random() * textures.length);
                sprite.material.map = textures[idx];
                sprite.material.needsUpdate = true;
            });
            // Ẩn overlay khi load xong (chỉ khi showOverlay=true)
            if (overlay && showOverlay) overlay.style.display = 'none';
        };
        dataURLs.forEach((url, i) => {
            loader.load(url, (texture) => {
                // Xử lý bo tròn góc như cũ
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = texture.image.width;
                canvas.height = texture.image.height;
                ctx.drawImage(texture.image, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const radius = Math.min(canvas.width, canvas.height) * 0.1;
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const idx = (y * canvas.width + x) * 4;
                        const distX = Math.min(x, canvas.width - x);
                        const distY = Math.min(y, canvas.height - y);
                        const dist = Math.sqrt(distX * distX + distY * distY);
                        if (dist < radius) {
                            const alpha = Math.min(1, dist / radius);
                            data[idx + 3] = Math.floor(255 * alpha);
                        } else {
                            data[idx + 3] = 255;
                        }
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                const processedTexture = new THREE.CanvasTexture(canvas);
                processedTexture.minFilter = THREE.NearestFilter;
                processedTexture.magFilter = THREE.NearestFilter;
                textures[i] = processedTexture;
                loaded++;
                if (loaded === dataURLs.length) onAllLoaded();
            });
        });
    }
} 