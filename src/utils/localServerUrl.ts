// Utilitaire centralisé pour récupérer l'URL du serveur local.
// Objectif: éviter les incohérences entre les écrans (Settings, FFmpeg, import, etc.)

export const getLocalServerUrl = (): string => {
  // 1) Clé utilisée par ServerSettings (écran de connexion)
  const direct = localStorage.getItem('mediavault-server-url');
  if (direct && typeof direct === 'string' && direct.trim()) return direct.trim();

  // 2) Ancienne/alternative clé (admin settings)
  const saved = localStorage.getItem('mediavault-admin-settings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      const url = settings?.localServerUrl;
      if (typeof url === 'string' && url.trim()) return url.trim();
    } catch {
      // ignore
    }
  }

  return 'http://localhost:3001';
};
