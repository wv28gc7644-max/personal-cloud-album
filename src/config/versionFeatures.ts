// Configuration des fonctionnalités par version
// Ce fichier est mis à jour à chaque nouvelle version

export const APP_VERSION = "1.5.0";
export const BUILD_DATE = new Date().toISOString();

// Features nouvelles par version (pour les badges "New")
export const VERSION_FEATURES: Record<string, string[]> = {
  "1.5.0": [
    "custom-video-player",
    "heatmap-courbe", 
    "silent-update",
    "adaptive-grid",
    "split-card-editor",
    "realtime-update-check"
  ],
  "1.4.0": [
    "timeline",
    "calendar",
    "albums",
    "masonry-view"
  ],
  "1.3.0": [
    "ai-studio",
    "ai-creations",
    "smart-home"
  ]
};

// Mapping entre feature ID et éléments de navigation/sidebar
export const FEATURE_NAV_MAPPING: Record<string, string[]> = {
  "custom-video-player": ["videos"],
  "heatmap-courbe": ["videos", "stats"],
  "silent-update": ["update", "admin"],
  "adaptive-grid": ["home", "photos", "videos"],
  "split-card-editor": ["admin"],
  "realtime-update-check": ["admin"],
  "timeline": ["timeline"],
  "calendar": ["calendar"],
  "albums": ["albums"],
  "masonry-view": ["home", "photos", "videos"],
  "ai-studio": ["ai-studio"],
  "ai-creations": ["ai-creations"],
  "smart-home": ["smart-home"]
};

// Obtenir les features actuelles
export const getCurrentVersionFeatures = (): string[] => {
  return VERSION_FEATURES[APP_VERSION] || [];
};

// Vérifier si un élément de navigation a une nouvelle feature
export const hasNewFeature = (navId: string, seenFeatures: string[]): boolean => {
  const currentFeatures = getCurrentVersionFeatures();
  
  for (const feature of currentFeatures) {
    const mappedNavs = FEATURE_NAV_MAPPING[feature] || [];
    if (mappedNavs.includes(navId) && !seenFeatures.includes(feature)) {
      return true;
    }
  }
  
  return false;
};
