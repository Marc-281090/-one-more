export class HapticsAdapter {
  constructor(isEnabled) { this.isEnabled = isEnabled; }

  trigger(kind = 'light') {
    if (!this.isEnabled()) return;
    const nativeHaptics = globalThis.Capacitor?.Plugins?.Haptics;
    if (nativeHaptics) {
      const impactStyle = { light: 'LIGHT', success: 'MEDIUM', error: 'HEAVY' }[kind] || 'LIGHT';
      nativeHaptics.impact({ style: impactStyle }).catch(() => {});
      return;
    }
    // navigator.vibrate is intentionally a best-effort fallback; Safari on iOS ignores it.
    const pattern = { light: 10, success: [12, 28, 15], error: [35, 30, 55] }[kind] || 10;
    globalThis.navigator?.vibrate?.(pattern);
  }
}
