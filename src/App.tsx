/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ScreenState,
  FrameLayoutType,
  FrameTheme,
  PhotoFilterType,
  PhotostripResult,
  RemoteKioskConfig,
  KioskTelemetry,
  PaymentTransaction,
} from './types';
import { FRAME_THEMES } from './services/frameTemplates';
import { remoteConfigService } from './services/remoteConfig';
import { analyticsService } from './services/analytics';
import { storageService, safeStorageGet } from './services/storage';
import { soundEffects } from './services/soundEffects';
import { cameraStreamService } from './services/cameraStreamService';
import { enduranceManager } from './services/enduranceManager';
import { decodeOfflinePhotoFromLocation } from './services/offlineQrTransfer';

// Components
import {
  KioskNavBar,
  lockKioskFullscreen,
  unlockKioskFullscreen,
  enterBrowserFullscreenApi,
} from './components/KioskNavBar';
import { AttractScreen } from './components/AttractScreen';
import { PaymentModal } from './components/PaymentModal';
import { FrameSelector } from './components/FrameSelector';
import { CaptureBooth } from './components/CaptureBooth';
import { EditorScreen } from './components/EditorScreen';
import { PrintAndShareScreen } from './components/PrintAndShareScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { GuestShareModal } from './components/GuestShareModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('attract');
  const [config, setConfig] = useState<RemoteKioskConfig>(remoteConfigService.getConfig());
  const [telemetry, setTelemetry] = useState<KioskTelemetry>(analyticsService.getTelemetry());

  // Session State
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [activePayment, setActivePayment] = useState<PaymentTransaction | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<FrameLayoutType>('strip_3');
  const [selectedTheme, setSelectedTheme] = useState<FrameTheme>(FRAME_THEMES[0]);
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterType>('none');
  const [selectedCopies, setSelectedCopies] = useState<number>(1);
  const [selectedBrightness, setSelectedBrightness] = useState<number>(
    config.thermalPrinter?.brightness ?? 45
  );
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [finalizedResult, setFinalizedResult] = useState<PhotostripResult | null>(null);
  const [finalizedCanvas, setFinalizedCanvas] = useState<HTMLCanvasElement | null>(null);

  // Modals
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showMobileShareModal, setShowMobileShareModal] = useState(false);

  // Initialize config, telemetry, persistent camera stream, Galaxy Tab A11 12h endurance manager, and check URL for direct mobile guest share (?share=... or #offline-photo=...)
  useEffect(() => {
    enduranceManager.init();

    // Check if opened with self-contained #offline-photo=... QR payload on a guest's smartphone
    const checkShareUrlOrHash = () => {
      try {
        const offlineDecoded = decodeOfflinePhotoFromLocation(
          window.location.search,
          window.location.hash
        );
        if (offlineDecoded) {
          setFinalizedResult(offlineDecoded);
          setShowMobileShareModal(true);
          return true;
        }

        const params = new URLSearchParams(window.location.search);
        const shareId = params.get('share');
        if (shareId) {
          storageService
            .getCapture(shareId)
            .then((cap) => {
              if (cap) {
                setFinalizedResult(cap);
                setShowMobileShareModal(true);
              }
            })
            .catch(() => {});
          return true;
        }
      } catch {
        // Ignore URL parsing errors on non-standard schemes
      }
      return false;
    };

    const isGuestPhoneView = checkShareUrlOrHash();
    window.addEventListener('hashchange', checkShareUrlOrHash);

    // Only eagerly acquire kiosk camera stream if not opened as a guest mobile share link
    if (!isGuestPhoneView) {
      cameraStreamService
        .getOrStartStream('user')
        .then(() => {
          if (safeStorageGet('jcv_fullscreen_locked') === 'true') {
            enterBrowserFullscreenApi();
          }
        })
        .catch(() => {});
    }

    remoteConfigService
      .init()
      .then((loadedConfig) => {
        setConfig(loadedConfig);
        setSelectedCopies(1);
        setSelectedBrightness(loadedConfig.thermalPrinter?.brightness ?? 45);
      })
      .catch(() => {});
    analyticsService.init().then(setTelemetry).catch(() => {});

    return () => {
      window.removeEventListener('hashchange', checkShareUrlOrHash);
    };
  }, []);

  // Handler: Return to Attract / Reset (frees offscreen GPU canvas textures for 12-hour endurance)
  const handleResetToAttract = React.useCallback(() => {
    enduranceManager.releaseCanvasMemory(finalizedCanvas);
    setCapturedPhotos([]);
    setFinalizedResult(null);
    setFinalizedCanvas(null);
    setActivePayment(null);
    setSelectedCopies(1);
    setCurrentScreen('attract');
  }, [finalizedCanvas]);

  // Galaxy Tab A11 9–12 Hour Endurance Watchdog:
  // 1. Throttles camera ISP to 5fps eco-mode when sitting idle on Attract screen >35s (without releasing permission).
  // 2. Activates Smart Thermal Dimmer on Attract screen after idleDimTimeoutSec (default 180s).
  // 3. Auto-resets abandoned guest sessions back to Attract screen after abandonedSessionResetSec (default 180s).
  useEffect(() => {
    const endurance = config.tabletEndurance;
    if (endurance?.enabled === false) {
      enduranceManager.setIdleDimmed(false);
      cameraStreamService.setIdleEcoMode(false);
      return;
    }

    if (currentScreen !== 'attract') {
      enduranceManager.setIdleDimmed(false);
      cameraStreamService.setIdleEcoMode(false);
    }

    const watchdogInterval = setInterval(() => {
      if (showAdminModal || showMobileShareModal) return;

      const idleSec = enduranceManager.getIdleSeconds();
      const dimTimeout = endurance?.idleDimTimeoutSec ?? 180;
      const abandonTimeout = endurance?.abandonedSessionResetSec ?? 180;

      if (currentScreen === 'attract') {
        if (endurance?.cameraIdleEcoMode !== false && idleSec >= 35) {
          cameraStreamService.setIdleEcoMode(true);
        }
        if (dimTimeout > 0 && idleSec >= dimTimeout) {
          enduranceManager.setIdleDimmed(true);
        }
      } else if (
        currentScreen !== 'capture' &&
        abandonTimeout > 0 &&
        idleSec >= abandonTimeout
      ) {
        // Guest walked away mid-session — reclaim memory and return to Attract screen
        handleResetToAttract();
      }
    }, 5000);

    return () => clearInterval(watchdogInterval);
  }, [
    currentScreen,
    config.tabletEndurance,
    showAdminModal,
    showMobileShareModal,
    handleResetToAttract,
  ]);

  // Handler: Start Session from Attract screen
  const handleStartSession = React.useCallback(() => {
    enduranceManager.recordTouchActivity();
    cameraStreamService.setIdleEcoMode(false);
    setSessionStartTime(Date.now());
    setSelectedCopies(1); // 1 Voucher = 1 Print Copy
    setSelectedBrightness(config.thermalPrinter?.brightness ?? 45);
    soundEffects.playTap();

    // Automatically lock tablet into Fullscreen Kiosk-Mode display upon session start if enabled
    if (config.autoFullscreenLock !== false) {
      lockKioskFullscreen(true);
    }

    // Ensure persistent camera stream is active and re-assert fullscreen lock once ready
    cameraStreamService
      .getOrStartStream('user')
      .then(() => {
        if (config.autoFullscreenLock !== false || safeStorageGet('jcv_fullscreen_locked') === 'true') {
          enterBrowserFullscreenApi();
        }
      })
      .catch(() => {});

    // If free play mode active, skip payment gate straight to frame customization
    if (config.freePlayMode) {
      setCurrentScreen('frame_select');
    } else {
      setCurrentScreen('payment');
    }
  }, [
    config.freePlayMode,
    config.autoFullscreenLock,
    config.thermalPrinter?.brightness,
  ]);

  // Handler: Payment Succeeded
  const handlePaymentSuccess = (tx: PaymentTransaction) => {
    enduranceManager.recordTouchActivity();
    setActivePayment(tx);
    setSelectedCopies(1); // 1 Voucher = 1 Print Copy
    if (tx.layoutType) {
      setSelectedLayout(tx.layoutType);
    }
    setCurrentScreen('frame_select');
  };

  // Handler: Captures Completed
  const handleCapturesComplete = (photos: string[]) => {
    enduranceManager.recordTouchActivity();
    setCapturedPhotos(photos);
    setCurrentScreen('editor');
  };

  // Handler: Photostrip Finalized in Editor
  const handlePhotostripFinalized = async (result: PhotostripResult, canvas: HTMLCanvasElement) => {
    enduranceManager.recordTouchActivity();
    enduranceManager.recordSessionCompleted();
    setFinalizedResult(result);
    setFinalizedCanvas(canvas);
    setCurrentScreen('print_share');

    // Save capture to local IndexedDB (ring-buffer capped)
    storageService.saveCapture(result).catch(() => {});

    // Record session metrics in analytics
    const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
    const revenue = activePayment ? activePayment.amount : 0;
    const copiesCount = Math.max(1, result.printCopies || selectedCopies || 1);
    analyticsService
      .recordSessionComplete({
        frameThemeId: result.themeId,
        filterId: result.filter,
        durationSec,
        printed: true,
        printCopies: copiesCount,
        revenueAdded: revenue,
      })
      .then(() => {
        setTelemetry({ ...analyticsService.getTelemetry() });
      })
      .catch(() => {});
  };

  // Handler: Undo / Retake photos from Editor without resetting the paid session
  const handleRetakeFromEditor = () => {
    enduranceManager.releaseCanvasMemory(finalizedCanvas);
    setCapturedPhotos([]);
    setFinalizedResult(null);
    setFinalizedCanvas(null);
    setCurrentScreen('capture');
  };

  return (
    <div
      className={`flex flex-col h-dvh min-h-screen w-full bg-[#fafaf9] text-zinc-900 overflow-hidden font-sans ${
        showMobileShareModal ? 'select-auto' : 'select-none'
      }`}
    >
      {/* Kiosk Status & Hardware Bar */}
      <KioskNavBar
        currentScreen={currentScreen}
        onNavigateScreen={setCurrentScreen}
        telemetry={telemetry}
        config={config}
        onRequestAdmin={() => {
          unlockKioskFullscreen();
          setShowAdminModal(true);
        }}
      />

      {/* Screen Router */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* 1. Attract Screen */}
        {currentScreen === 'attract' && (
          <AttractScreen
            config={config}
            onStartSession={handleStartSession}
            onSecretAdminTap={() => {
              unlockKioskFullscreen();
              setShowAdminModal(true);
            }}
          />
        )}

        {/* 2. Payment & Voucher Gate */}
        {currentScreen === 'payment' && (
          <PaymentModal
            config={config}
            onPaymentSuccess={handlePaymentSuccess}
            onCancel={handleResetToAttract}
            onSecretAdminTap={() => {
              unlockKioskFullscreen();
              setShowAdminModal(true);
            }}
          />
        )}

        {/* 3. Frame & Filter Selector */}
        {currentScreen === 'frame_select' && (
          <FrameSelector
            selectedLayout={selectedLayout}
            onSelectLayout={setSelectedLayout}
            selectedTheme={selectedTheme}
            onSelectTheme={setSelectedTheme}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            copies={1}
            onSelectCopies={setSelectedCopies}
            layoutPrices={config.layoutPrices}
            lockedLayout={activePayment?.layoutType}
            voucherCode={activePayment?.voucherCode}
            onContinue={() => setCurrentScreen('capture')}
            onBack={handleResetToAttract}
            onSecretAdminTap={() => {
              unlockKioskFullscreen();
              setShowAdminModal(true);
            }}
          />
        )}

        {/* 4. Live Camera Capture Booth */}
        {currentScreen === 'capture' && (
          <CaptureBooth
            layout={selectedLayout}
            filter={selectedFilter}
            onCapturesComplete={handleCapturesComplete}
            onCancel={() => setCurrentScreen('frame_select')}
            onSecretAdminTap={() => {
              unlockKioskFullscreen();
              setShowAdminModal(true);
            }}
          />
        )}

        {/* 5. Customization & Decoration Editor */}
        {currentScreen === 'editor' && (
          <EditorScreen
            photos={capturedPhotos}
            layout={selectedLayout}
            initialTheme={selectedTheme}
            initialFilter={selectedFilter}
            copies={selectedCopies}
            onChangeCopies={setSelectedCopies}
            brightness={selectedBrightness}
            onChangeBrightness={setSelectedBrightness}
            onFinalized={handlePhotostripFinalized}
            onRetake={handleRetakeFromEditor}
            onSecretAdminTap={() => {
              unlockKioskFullscreen();
              setShowAdminModal(true);
            }}
          />
        )}

        {/* 6. Print & Share Hub */}
        {currentScreen === 'print_share' && finalizedResult && finalizedCanvas && (
          <PrintAndShareScreen
            result={finalizedResult}
            canvas={finalizedCanvas}
            config={config}
            copies={selectedCopies}
            onDone={handleResetToAttract}
            onOpenMobileShareModal={() => setShowMobileShareModal(true)}
            onSecretAdminTap={() => {
              unlockKioskFullscreen();
              setShowAdminModal(true);
            }}
          />
        )}
      </main>

      {/* Admin Dashboard Modal */}
      {showAdminModal && (
        <AdminDashboard
          config={config}
          onUpdateConfig={(newConf) => {
            setConfig(newConf);
            if (newConf.thermalPrinter?.brightness !== undefined) {
              setSelectedBrightness(newConf.thermalPrinter.brightness);
            }
            if (newConf.thermalPrinter?.printCopies !== undefined && currentScreen === 'attract') {
              setSelectedCopies(Math.max(1, newConf.thermalPrinter.printCopies));
            }
            setTelemetry(analyticsService.getTelemetry());
          }}
          onClose={() => setShowAdminModal(false)}
        />
      )}

      {/* Mobile Guest Share View Simulation */}
      {showMobileShareModal && finalizedResult && (
        <GuestShareModal
          result={finalizedResult}
          onClose={() => setShowMobileShareModal(false)}
        />
      )}

      {/* PWA Install Prompt & Offline Connectivity Banner */}
      <PWAInstallPrompt />
    </div>
  );
}
