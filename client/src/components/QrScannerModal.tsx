import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from './ui';

const ACTION_LABEL: Record<string, string> = {
  confirm: 'Confirm',
  shipping: 'Shipping',
  retour: 'Retour',
  Location: 'Location',
  Batch: 'Batch',
};

export default function QrScannerModal({ action, onScan, onClose }: { action?: string; onScan: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const containerId = `qr-scanner-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    let disposed = false;
    let scanner: Html5Qrcode;
    try {
      scanner = new Html5Qrcode(containerId);
    } catch {
      return;
    }

    const teardown = (): Promise<void> =>
      Promise.resolve()
        .then(async () => {
          if (scanner.isScanning) await scanner.stop();
        })
        .then(() => {
          try {
            scanner.clear();
          } catch {
          }
        });

    const startPromise = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (disposed) return;
          disposed = true;
          teardown()
            .catch(() => {})
            .finally(() => onScanRef.current(decoded));
        },
        () => {}
      )
      .catch((err) => {
        if (!disposed) setError(typeof err === 'string' ? err : ((err as Error)?.message ?? 'Camera is not available'));
      });

    return () => {
      disposed = true;
      startPromise.then(teardown).catch(() => {});
    };
  }, [containerId]);

  return (
    <Modal open onClose={onClose} title="Scan QR code with camera">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Point your camera at the QR code. It will be scanned as <span className="font-semibold text-brand-700">{ACTION_LABEL[action ?? ''] ?? action ?? 'Scan'}</span>.
        </p>
        <div id={containerId} className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl [&_video]:w-full" />
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">⚠️ {error}</p>}
        <p className="text-center text-xs text-slate-400">Make sure the QR code fills the scanning box.</p>
      </div>
    </Modal>
  );
}
