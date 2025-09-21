import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraController {
    constructor(camera, renderer) {
        this.camera = camera;
        this.controls = new OrbitControls(camera, renderer.domElement);
        this.setupControls();
        this.setupCamera();
        this.isAnimating = false;
    }

    setupControls() {
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    setupCamera() {
        this.camera.position.set(0, 60, 200);
        this.camera.lookAt(0, 0, 0);
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    triggerAnimation() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.controls.enabled = false;

            gsap.to(this.camera.position, {
                x: 0,
                y: 10,
                z: 80,
                duration: 5,
                ease: 'power2.inOut',
                onUpdate: () => {
                    console.log('Camera position:', this.camera.position);
                    this.camera.lookAt(0, 0, 0);
                },
                onComplete: () => {
                    gsap.to(this.camera.position, {
                        x: 0,
                        y: 30,
                        z: 600,
                        duration: 12,
                        ease: 'power2.inOut',
                        onUpdate: () => {
                            this.camera.lookAt(0, 0, 0);
                        },
                        onComplete: () => {
                            gsap.to(this.camera.position, {
                                x: -200,
                                y: 400,
                                z: -700,
                                duration: 5,
                                ease: 'power2.inOut',
                                onUpdate: () => {
                                    this.camera.lookAt(0, 0, 0);
                                },
                                onComplete: () => {
                                    this.isAnimating = false;
                                    this.controls.enabled = true;
                                }
                            });
                        }
                    });
                }
            });
        }
    }

    update() {
        this.controls.update();
    }
} 