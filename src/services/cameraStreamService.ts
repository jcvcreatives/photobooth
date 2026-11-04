/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistent Kiosk Camera Stream Manager
 *
 * Acquires the camera MediaStream once and keeps the hardware track alive
 * across the entire kiosk session (Attract -> Layout Select -> Capture Booth -> Editor -> Print).
 *
 * Why this is critical on iPadOS Chrome / Safari:
 * 1. Calling `track.stop()` on screen unmount releases camera permission state in iOS WKWebView,
 *    causing repeated permission prompts on subsequent sessions.
 * 2. Triggering `getUserMedia()` for the first time *after* entering Fullscreen forces iPadOS
 *    to exit Fullscreen to display the native OS permission dialog.
 * 3. By warming up and persisting a single live MediaStream attached to a hidden keep-alive
 *    video sink, camera permission is saved and every booth screen gets an instant 0ms video feed
 *    without ever interrupting Fullscreen lock.
 */

import { safeStorageGet, safeStorageSet } from './storage';

const CAMERA_PERMISSION_STORAGE_KEY = 'jcv_camera_always_allowed';
const CAMERA_DEVICE_ID_STORAGE_KEY = 'jcv_preferred_camera_device_id';

class CameraStreamService {
  private activeStream: MediaStream | null = null;
  private currentFacingMode: 'user' | 'environment' = 'user';
  private pendingPromise: Promise<MediaStream | null> | null = null;
  private keepAliveVideoEl: HTMLVideoElement | null = null;

  /**
   * Ensures a hidden 1x1 muted <video> element stays attached to the active stream
   * so iPadOS WebKit never suspends or garbage-collects the live camera track between screens.
   */
  private attachKeepAliveSink(stream: MediaStream) {
    if (typeof document === 'undefined') return;
    try {
      if (!this.keepAliveVideoEl) {
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.autoplay = true;
        v.setAttribute('playsinline', 'true');
        v.setAttribute('webkit-playsinline', 'true');
        v.setAttribute('muted', 'true');
        v.style.position = 'fixed';
        v.style.top = '-9999px';
        v.style.left = '-9999px';
        v.style.width = '1px';
        v.style.height = '1px';
        v.style.opacity = '0';
        v.style.pointerEvents = 'none';
        v.style.zIndex = '-1';
        document.body.appendChild(v);
        this.keepAliveVideoEl = v;
      }
      if (this.keepAliveVideoEl.srcObject !== stream) {
        this.keepAliveVideoEl.srcObject = stream;
        this.keepAliveVideoEl.play().catch(() => {});
      }
    } catch {
      // Ignore DOM errors
    }
  }

  /**
   * Returns true if the current cached stream has at least one active, live video track.
   */
  public hasLiveStream(facingMode?: 'user' | 'environment'): boolean {
    if (!this.activeStream) return false;
    if (facingMode && this.currentFacingMode !== facingMode) return false;
    const tracks = this.activeStream.getVideoTracks();
    return tracks.length > 0 && tracks.some((t) => t.readyState === 'live' && t.enabled);
  }

  /**
   * Synchronously returns the already-active MediaStream if available.
   */
  public getCachedStream(facingMode: 'user' | 'environment' = 'user'): MediaStream | null {
    if (this.hasLiveStream(facingMode)) {
      this.setIdleEcoMode(false);
      return this.activeStream;
    }
    return null;
  }

  /**
   * Returns whether camera permission has been granted and persisted.
   */
  public isPermissionSaved(): boolean {
    return safeStorageGet(CAMERA_PERMISSION_STORAGE_KEY) === 'true';
  }

  /**
   * Galaxy Tab A11 9–12 Hour Thermal Optimization:
   * When the kiosk sits idle on the Attract screen, throttle camera frameRate to 5fps
   * and pause the hidden video decoder sink so the tablet ISP & GPU stay cool while charging,
   * WITHOUT stopping the MediaStreamTrack (so camera permission and Fullscreen lock are 100% preserved).
   */
  public setIdleEcoMode(isIdle: boolean): void {
    try {
      if (!this.activeStream) return;
      const videoTrack = this.activeStream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') return;

      if (typeof videoTrack.applyConstraints === 'function') {
        videoTrack
          .applyConstraints({
            frameRate: isIdle ? { ideal: 5, max: 10 } : { ideal: 30 },
          })
          .catch(() => {});
      }

      if (this.keepAliveVideoEl) {
        if (isIdle) {
          this.keepAliveVideoEl.pause();
        } else if (this.keepAliveVideoEl.paused) {
          this.keepAliveVideoEl.play().catch(() => {});
        }
      }
    } catch {
      // Ignore constraint errors on unsupported mobile WebViews
    }
  }

  /**
   * Acquires or reuses the persistent camera stream.
   * Never stops tracks on normal screen navigation; only switches tracks if `facingMode` changes.
   */
  public async getOrStartStream(
    facingMode: 'user' | 'environment' = 'user'
  ): Promise<MediaStream | null> {
    if (this.hasLiveStream(facingMode)) {
      this.setIdleEcoMode(false);
      return this.activeStream;
    }

    if (this.pendingPromise && this.currentFacingMode === facingMode) {
      return this.pendingPromise;
    }

    // If switching between front ('user') and back ('environment') camera, stop previous track first
    if (this.activeStream && this.currentFacingMode !== facingMode) {
      this.activeStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.activeStream = null;
    }

    this.currentFacingMode = facingMode;

    this.pendingPromise = (async () => {
      try {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          return null;
        }

        const savedDeviceId =
          facingMode === 'user' ? safeStorageGet(CAMERA_DEVICE_ID_STORAGE_KEY) : null;

        const videoConstraints: MediaTrackConstraints = {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };

        if (savedDeviceId) {
          videoConstraints.deviceId = { ideal: savedDeviceId };
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        this.activeStream = stream;
        safeStorageSet(CAMERA_PERMISSION_STORAGE_KEY, 'true');

        // Persist the resolved camera deviceId so future requests bind to the exact hardware camera
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings?.();
          if (settings?.deviceId && facingMode === 'user') {
            safeStorageSet(CAMERA_DEVICE_ID_STORAGE_KEY, settings.deviceId);
          }
          // If the OS ever ends the track externally, clear reference so next call restarts seamlessly
          videoTrack.onended = () => {
            if (this.activeStream === stream) {
              this.activeStream = null;
            }
          };
        }

        this.attachKeepAliveSink(stream);
        return stream;
      } catch {
        return null;
      } finally {
        this.pendingPromise = null;
      }
    })();

    return this.pendingPromise;
  }
}

export const cameraStreamService = new CameraStreamService();
