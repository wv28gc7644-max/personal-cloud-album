/**
 * Bibliothèque de patterns SVG pour la personnalisation du site
 */

export interface Pattern {
  id: string;
  name: string;
  category: 'geometric' | 'organic' | 'abstract' | 'minimal';
  svg: string;
}

export const PATTERNS: Pattern[] = [
  // Geometric
  {
    id: 'grid',
    name: 'Grille',
    category: 'geometric',
    svg: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>`
  },
  {
    id: 'dots',
    name: 'Points',
    category: 'geometric',
    svg: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="2" fill="currentColor"/></svg>`
  },
  {
    id: 'hexagons',
    name: 'Hexagones',
    category: 'geometric',
    svg: `<svg width="56" height="100" xmlns="http://www.w3.org/2000/svg"><path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="currentColor" stroke-width="1"/><path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'diagonal',
    name: 'Diagonales',
    category: 'geometric',
    svg: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M0 40L40 0M-10 10L10 -10M30 50L50 30" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'chevron',
    name: 'Chevrons',
    category: 'geometric',
    svg: `<svg width="60" height="30" xmlns="http://www.w3.org/2000/svg"><path d="M0 30L30 0L60 30M0 15L30 -15L60 15" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'triangles',
    name: 'Triangles',
    category: 'geometric',
    svg: `<svg width="64" height="44" xmlns="http://www.w3.org/2000/svg"><path d="M32 0L64 44H0L32 0z" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'squares',
    name: 'Carrés',
    category: 'geometric',
    svg: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'diamonds',
    name: 'Losanges',
    category: 'geometric',
    svg: `<svg width="30" height="30" xmlns="http://www.w3.org/2000/svg"><path d="M15 0L30 15L15 30L0 15Z" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },

  // Organic
  {
    id: 'waves',
    name: 'Vagues',
    category: 'organic',
    svg: `<svg width="100" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M0 10C25 10 25 0 50 0S75 10 100 10" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'bubbles',
    name: 'Bulles',
    category: 'organic',
    svg: `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="20" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="70" cy="70" r="5" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'leaves',
    name: 'Feuilles',
    category: 'organic',
    svg: `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg"><path d="M25 5C40 5 45 25 25 45C5 25 10 5 25 5Z" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'clouds',
    name: 'Nuages',
    category: 'organic',
    svg: `<svg width="100" height="50" xmlns="http://www.w3.org/2000/svg"><path d="M20 40A15 15 0 0 1 35 25A20 20 0 0 1 75 25A15 15 0 0 1 90 40Z" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },

  // Abstract
  {
    id: 'noise',
    name: 'Bruit',
    category: 'abstract',
    svg: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noise)" opacity="0.1"/></svg>`
  },
  {
    id: 'circuit',
    name: 'Circuit',
    category: 'abstract',
    svg: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><path d="M10 50H40M60 50H90M50 10V40M50 60V90" stroke="currentColor" stroke-width="2"/><circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
  },
  {
    id: 'topography',
    name: 'Topographie',
    category: 'abstract',
    svg: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><path d="M0 50Q25 30 50 50T100 50" fill="none" stroke="currentColor" stroke-width="1"/><path d="M0 70Q25 50 50 70T100 70" fill="none" stroke="currentColor" stroke-width="1"/><path d="M0 30Q25 10 50 30T100 30" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'stars',
    name: 'Étoiles',
    category: 'abstract',
    svg: `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg"><path d="M25 5L30 20L45 20L33 30L38 45L25 35L12 45L17 30L5 20L20 20Z" fill="none" stroke="currentColor" stroke-width="1"/></svg>`
  },

  // Minimal
  {
    id: 'lines-horizontal',
    name: 'Lignes H',
    category: 'minimal',
    svg: `<svg width="100" height="10" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="5" x2="100" y2="5" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'lines-vertical',
    name: 'Lignes V',
    category: 'minimal',
    svg: `<svg width="10" height="100" xmlns="http://www.w3.org/2000/svg"><line x1="5" y1="0" x2="5" y2="100" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'crosshatch',
    name: 'Hachures',
    category: 'minimal',
    svg: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L40 40M40 0L0 40" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'plus',
    name: 'Plus',
    category: 'minimal',
    svg: `<svg width="30" height="30" xmlns="http://www.w3.org/2000/svg"><path d="M15 5V25M5 15H25" stroke="currentColor" stroke-width="2"/></svg>`
  }
];

export const PATTERN_CATEGORIES = [
  { id: 'all', name: 'Tous' },
  { id: 'geometric', name: 'Géométrique' },
  { id: 'organic', name: 'Organique' },
  { id: 'abstract', name: 'Abstrait' },
  { id: 'minimal', name: 'Minimal' }
];

export const getPatternById = (id: string): Pattern | undefined => {
  return PATTERNS.find(p => p.id === id);
};

export const getPatternsByCategory = (category: string): Pattern[] => {
  if (category === 'all') return PATTERNS;
  return PATTERNS.filter(p => p.category === category);
};

// Générer le CSS pour un pattern
export const generatePatternCSS = (
  pattern: Pattern,
  color: string,
  opacity: number,
  scale: number
): string => {
  const encodedSvg = encodeURIComponent(
    pattern.svg.replace(/currentColor/g, color)
  );
  return `url("data:image/svg+xml,${encodedSvg}")`;
};
