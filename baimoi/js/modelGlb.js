import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Heart {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        this.isLoaded = false;
        // Load model ngay khi khởi tạo
        this.loadModel();
    }

    loadModel() {
        if (this.isLoaded) return; // Đã load rồi thì không load nữa
        
        const loader = new GLTFLoader();
        loader.load(
            'assets/heart_in_love.glb',
            (gltf) => {
                this.model = gltf.scene;
                
                // Reset transform của model
                this.model.position.set(0, 0, 0);
                this.model.rotation.set(0, 0, 0);
                this.model.updateMatrix();

                // Tạo một group để chứa model
                this.modelGroup = new THREE.Group();
                this.modelGroup.add(this.model);
                
                // Điều chỉnh kích thước của model
                this.model.scale.set(2, 2, 2); // Tăng kích thước lên để dễ nhìn thấy
                
                // Đặt vị trí của group
                this.modelGroup.position.set(0, 200, 0);
                
                // Log thông tin chi tiết để debug
                console.log('Model geometry:', this.model.geometry);
                console.log('Model materials:', this.model.material);
                console.log('Model children:', this.model.children);
                console.log('Model world position:', this.model.getWorldPosition(new THREE.Vector3()));
                console.log('Group world position:', this.modelGroup.getWorldPosition(new THREE.Vector3()));
                
                // Log để debug
                console.log('Setting position to:', this.modelGroup.position);
                
                // Thêm group vào scene thay vì thêm model trực tiếp
                this.scene.add(this.modelGroup);
                
                // Lưu reference vào window để có thể truy cập từ sphere.js
                window.heart3D = this.modelGroup;
                
                // Ẩn trái tim mặc định khi load (chỉ hiện khi checkbox được tích)
                window.heart3D.visible = false;
                window.heart3D.traverse((child) => {
                    if (child.isMesh) {
                        child.visible = false;
                    }
                });
                
                this.isLoaded = true;
                
                // Log vị trí và scale để debug
                console.log('Model position:', this.model.position);
                console.log('Model scale:', this.model.scale);
                
                // Kiểm tra và log thông tin animation
                console.log('Animations in model:', gltf.animations);
                
                // Thêm animation nếu có
                if (gltf.animations && gltf.animations.length) {
                    console.log('Number of animations:', gltf.animations.length);
                    this.mixer = new THREE.AnimationMixer(this.model);
                    
                    // Play tất cả các animation có trong model
                    gltf.animations.forEach((clip, index) => {
                        console.log(`Animation ${index}:`, clip.name);
                        const action = this.mixer.clipAction(clip);
                        action.setLoop(THREE.LoopRepeat);
                        action.clampWhenFinished = false;
                        action.play();
                    });
                } else {
                    console.log('No animations found in the model');
                }
                
                // Thêm ánh sáng để làm nổi bật model
                const heartLight = new THREE.PointLight(0xffffff, 2, 1000);
                heartLight.position.set(0, 200, 100);
                this.scene.add(heartLight);

                // Thêm ánh sáng phụ trợ
                const helperLight = new THREE.DirectionalLight(0xffffff, 1);
                helperLight.position.set(0, 200, -100);
                this.scene.add(helperLight);

                // Bỏ BoxHelper để không hiển thị khung đỏ
                
                // Model đã được thêm vào group ở trên
                console.log('heart model loaded successfully');
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('Error loading model:', error);
                console.error('Error details:', error.message);
            }
        );
    }

    animate() {
        if (this.mixer) {
            const delta = this.clock.getDelta();
            this.mixer.update(delta);
        }
        
        if (this.model) {
            // Chỉ thêm chuyển động lên xuống nhẹ nếu không có animation
            if (!this.mixer || !this.mixer.existingAction) {
                const time = Date.now() * 0.001;
                this.model.position.y = 70 + Math.sin(time) * 2; // Giảm biên độ xuống 2
            }
        }
    }
} 