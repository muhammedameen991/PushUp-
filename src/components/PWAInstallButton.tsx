import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall.ts';
import { Download, Share, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 active:scale-95 transition"
        title="Install PushUp PWA on your device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-soft-stone px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          title="Install on iPhone / iPad"
        >
          <Share className="w-3.5 h-3.5 text-terracotta" />
          <span>Install PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-pure-white p-6 shadow-xl dark:bg-[#282825] border border-soft-stone animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-soft-stone">
                <h3 className="text-base font-bold text-charcoal">Install on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-charcoal-muted"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-charcoal-secondary leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center font-bold shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> icon in the Safari navigation bar.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center font-bold shrink-0">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center font-bold shrink-0">3</span>
                  <span>Enjoy fast offline access and fullscreen workout tracking!</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-terracotta py-2.5 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback desktop manual guide
  return (
    <button
      onClick={() => {
        alert('To install PushUp: Click the install icon in your browser address bar or menu ("Add to Home Screen" or "Install PushUp").');
      }}
      className="hidden md:flex items-center gap-1.5 rounded-xl border border-soft-stone px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
      title="Install PushUp PWA"
    >
      <Download className="w-3.5 h-3.5 text-terracotta" />
      <span>Install PWA</span>
    </button>
  );
};
