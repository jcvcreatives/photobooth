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
   * No-op eco mode setter (avoids calling videoTrack.applyConstraints which freezes mobile/web camera drivers).
   */
  public setIdleEcoMode(_isIdle: boolean): void {
    // Intentionally no-op to prevent camera driver stalls during screen transitions
  }

  /**
   * Acquires or reuses the persistent camera stream.
   */
  public async getOrStartStream(
    facingMode: 'user' | 'environment' = 'user'
  ): Promise<MediaStream | null> {
    if (this.hasLiveStream(facingMode)) {
      return this.activeStream;
    }

    if (this.pendingPromise && this.currentFacingMode === facingMode) {
      return this.pendingPromise;
    }

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

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        if (!stream) return null;

        this.activeStream = stream;
        safeStorageSet(CAMERA_PERMISSION_STORAGE_KEY, 'true');

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings?.();
          if (settings?.deviceId && facingMode === 'user') {
            safeStorageSet(CAMERA_DEVICE_ID_STORAGE_KEY, settings.deviceId);
          }
          videoTrack.onended = () => {
            if (this.activeStream === stream) {
              this.activeStream = null;
            }
          };
        }

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
