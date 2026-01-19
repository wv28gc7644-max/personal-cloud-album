import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Copy, Check, Smartphone, Wifi, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeAccessProps {
  trigger?: React.ReactNode;
}

export function QRCodeAccess({ trigger }: QRCodeAccessProps) {
  const [open, setOpen] = useState(false);
  const [localIp, setLocalIp] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const port = localStorage.getItem('mediavault_server_port') || '3001';
  const accessUrl = localIp ? `http://${localIp}:${port}` : '';

  // Detect local IP
  useEffect(() => {
    const detectLocalIp = async () => {
      try {
        // Try to get from local server
        const serverUrl = localStorage.getItem('mediavault_server_url') || 'http://localhost:3001';
        const response = await fetch(`${serverUrl}/api/local-ip`);
        if (response.ok) {
          const data = await response.json();
          setLocalIp(data.ip);
          return;
        }
      } catch {}

      // Fallback: try common local IP patterns
      const possibleIps = ['192.168.1.', '192.168.0.', '10.0.0.', '172.16.'];
      for (const prefix of possibleIps) {
        for (let i = 1; i <= 254; i++) {
          const ip = `${prefix}${i}`;
          try {
            const response = await fetch(`http://${ip}:${port}/api/health`, { 
              mode: 'no-cors',
              signal: AbortSignal.timeout(100)
            });
            setLocalIp(ip);
            return;
          } catch {}
        }
      }

      // Last fallback: check server URL
      const serverUrl = localStorage.getItem('mediavault_server_url') || '';
      const match = serverUrl.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        setLocalIp(match[1]);
      }
    };

    if (open) {
      detectLocalIp();
    }
  }, [open, port]);

  // Generate QR code
  useEffect(() => {
    if (!accessUrl) return;

    // Use a simple QR code API or generate locally
    const generateQR = async () => {
      try {
        // Using QR Server API (free, no key needed)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(accessUrl)}`;
        setQrDataUrl(qrUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQR();
  }, [accessUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accessUrl);
      setCopied(true);
      toast.success('URL copiée !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const handleRefresh = () => {
    setLocalIp('');
    setQrDataUrl('');
    // Re-trigger detection
    const event = new Event('open-qr');
    window.dispatchEvent(event);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="w-4 h-4" />
            Accès mobile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Accès Mobile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Instructions */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Wifi className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Connexion locale</p>
              <p className="text-muted-foreground">
                Scannez ce QR code avec votre téléphone pour accéder à MediaVault.
                Assurez-vous d'être connecté au même réseau WiFi.
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            {qrDataUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-white rounded-xl"
              >
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </motion.div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-xl">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* URL */}
            <div className="w-full space-y-2">
              <Label>URL d'accès</Label>
              <div className="flex gap-2">
                <Input
                  value={accessUrl}
                  readOnly
                  placeholder="Détection en cours..."
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!accessUrl}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Manual IP input */}
            <div className="w-full space-y-2">
              <Label>Adresse IP manuelle</Label>
              <div className="flex gap-2">
                <Input
                  value={localIp}
                  onChange={(e) => setLocalIp(e.target.value)}
                  placeholder="192.168.1.x"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Si la détection automatique échoue, entrez l'IP de votre PC manuellement.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
