import * as THREE from 'three';

export class AudioManager {
    constructor() {
        this.audio = document.getElementById('bg-audio');
        this.defaultAudioUrl = 'assets/hukhong.mp3';
        this.currentAudioUrl = null;
        this.isPlaying = false;
        this.isAudioLoaded = false;
        this.setAudioUrl(this.defaultAudioUrl);
        this.setupAudioEvents();
    }

    setAudioUrl(url) {
        if (url && url !== this.currentAudioUrl) {
            this.audio.src = url;
            this.currentAudioUrl = url;
            this.audio.load();
            this.isPlaying = false;
            this.isAudioLoaded = false;
        }
    }

    setupAudioEvents() {
        // Xử lý sự kiện khi audio được load
        this.audio.addEventListener('canplaythrough', () => {
            console.log('Audio loaded successfully');
            this.isAudioLoaded = true;
            // Phát event để thông báo audio đã sẵn sàng
            document.dispatchEvent(new CustomEvent('audioLoaded'));
        });

        // Xử lý sự kiện khi audio bắt đầu phát
        this.audio.addEventListener('play', () => {
            console.log('Audio started playing');
            this.isPlaying = true;
        });

        // Xử lý sự kiện khi audio tạm dừng
        this.audio.addEventListener('pause', () => {
            console.log('Audio paused');
            this.isPlaying = false;
        });

        // Xử lý lỗi
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.isAudioLoaded = false;
        });

        // Xử lý sự kiện khi audio có thể phát
        this.audio.addEventListener('canplay', () => {
            console.log('Audio can play');
            this.isAudioLoaded = true;
        });
    }

    async toggle() {
        try {
            console.log('Toggle called, audio paused:', this.audio.paused);
            console.log('Audio ready state:', this.audio.readyState);
            
            // Chỉ cho phép phát nhạc, không cho phép tắt
            if (this.audio.paused) {
                // Đảm bảo audio context được resume (cần thiết cho mobile)
                if (this.audio.readyState >= 2) { // HAVE_CURRENT_DATA
                    console.log('Audio ready, attempting to play...');
                    await this.audio.play();
                    this.isPlaying = true;
                    console.log('Audio play successful');
                } else {
                    console.log('Audio not ready to play, waiting...');
                    // Đợi audio load xong
                    this.audio.addEventListener('canplay', async () => {
                        console.log('Audio can play event fired, starting playback...');
                        await this.audio.play();
                        this.isPlaying = true;
                    }, { once: true });
                }
            } else {
                // Không cho phép tắt nhạc
                console.log('Audio is already playing, cannot pause');
            }
        } catch (error) {
            console.error('Error toggling audio:', error);
            this.isPlaying = false;
        }
    }

    // Method chỉ để phát nhạc (không toggle)
    async playOnly() {
        try {
            if (this.audio.paused && this.audio.readyState >= 2) {
                console.log('Playing audio only...');
                await this.audio.play();
                this.isPlaying = true;
                console.log('Audio play successful');
            } else if (this.audio.paused && this.audio.readyState < 2) {
                console.log('Audio not ready, waiting for load...');
                this.audio.addEventListener('canplay', async () => {
                    console.log('Audio can play event fired, starting playback...');
                    await this.audio.play();
                    this.isPlaying = true;
                }, { once: true });
            } else {
                console.log('Audio is already playing');
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            this.isPlaying = false;
        }
    }
} 