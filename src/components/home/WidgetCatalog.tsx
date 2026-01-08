import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search,
  Plus,
  Lightbulb,
  Thermometer,
  Droplets,
  Wind,
  Power,
  Lock,
  Camera,
  Speaker,
  Sun,
  Moon,
  Zap,
  Gauge,
  Home,
  Tv,
  Fan,
  Car,
  Baby,
  Dog,
  Flower2,
  Waves,
  Timer,
  Bell,
  Shield,
  Eye,
  Cpu,
  Wifi,
  Battery,
  CloudRain,
  Snowflake,
  Flame,
  Activity,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Radio,
  Mic,
  Play,
  Pause,
  SkipForward,
  Volume2,
  Smartphone,
  Laptop,
  Monitor,
  Printer,
  HardDrive,
  Server,
  Database,
  Globe,
  Mail,
  MessageSquare,
  Users,
  UserCheck,
  DoorOpen,
  DoorClosed,
  Square,
  Rows3,
  Sofa,
  Bed,
  Bath,
  CookingPot,
  Refrigerator,
  WashingMachine,
  AirVent,
  Heater,
  Plug,
  LightbulbOff,
  ToggleLeft,
  Siren,
  Cctv,
  Fingerprint,
  Key,
  AlertTriangle,
  CircleDot,
  Scan,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  hasToggle?: boolean;
  hasSlider?: boolean;
  hasChart?: boolean;
  dataFields?: string[];
  size?: 'small' | 'medium' | 'large';
}

export type WidgetCategory = 
  | 'lighting'
  | 'climate'
  | 'security'
  | 'energy'
  | 'media'
  | 'sensors'
  | 'cameras'
  | 'appliances'
  | 'charts'
  | 'info'
  | 'controls';

const CATEGORY_INFO: Record<WidgetCategory, { label: string; icon: LucideIcon; color: string }> = {
  lighting: { label: 'Éclairage', icon: Lightbulb, color: 'text-amber-500' },
  climate: { label: 'Climat', icon: Thermometer, color: 'text-cyan-500' },
  security: { label: 'Sécurité', icon: Shield, color: 'text-red-500' },
  energy: { label: 'Énergie', icon: Zap, color: 'text-yellow-500' },
  media: { label: 'Multimédia', icon: Tv, color: 'text-purple-500' },
  sensors: { label: 'Capteurs', icon: Activity, color: 'text-green-500' },
  cameras: { label: 'Caméras', icon: Camera, color: 'text-blue-500' },
  appliances: { label: 'Appareils', icon: Home, color: 'text-orange-500' },
  charts: { label: 'Graphiques', icon: BarChart3, color: 'text-indigo-500' },
  info: { label: 'Information', icon: Globe, color: 'text-teal-500' },
  controls: { label: 'Contrôles', icon: ToggleLeft, color: 'text-pink-500' },
};

// Full widget catalog (110+ widgets)
export const WIDGET_CATALOG: WidgetTemplate[] = [
  // === LIGHTING (15) ===
  { id: 'light-bulb', name: 'Ampoule', description: 'Contrôle on/off et luminosité', category: 'lighting', icon: Lightbulb, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-orange-500/10', hasToggle: true, hasSlider: true },
  { id: 'light-strip', name: 'Bandeau LED', description: 'RGB avec effets', category: 'lighting', icon: Lightbulb, color: 'text-pink-400', bgGradient: 'from-pink-500/20 to-purple-500/10', hasToggle: true, hasSlider: true },
  { id: 'light-spot', name: 'Spot', description: 'Spot encastrable', category: 'lighting', icon: CircleDot, color: 'text-yellow-400', bgGradient: 'from-yellow-500/20 to-amber-500/10', hasToggle: true, hasSlider: true },
  { id: 'light-ceiling', name: 'Plafonnier', description: 'Éclairage principal', category: 'lighting', icon: Sun, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-red-500/10', hasToggle: true, hasSlider: true },
  { id: 'light-outdoor', name: 'Éclairage extérieur', description: 'Jardin et terrasse', category: 'lighting', icon: Sun, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10', hasToggle: true },
  { id: 'light-night', name: 'Veilleuse', description: 'Mode nuit automatique', category: 'lighting', icon: Moon, color: 'text-indigo-400', bgGradient: 'from-indigo-500/20 to-blue-500/10', hasToggle: true },
  { id: 'light-lamp', name: 'Lampe', description: 'Lampe de table/bureau', category: 'lighting', icon: LightbulbOff, color: 'text-amber-300', bgGradient: 'from-amber-400/20 to-yellow-500/10', hasToggle: true, hasSlider: true },
  { id: 'scene-day', name: 'Scène Jour', description: 'Éclairage journée', category: 'lighting', icon: Sun, color: 'text-yellow-400', bgGradient: 'from-yellow-500/20 to-amber-500/10', hasToggle: true },
  { id: 'scene-night', name: 'Scène Nuit', description: 'Éclairage soirée', category: 'lighting', icon: Moon, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10', hasToggle: true },
  { id: 'scene-movie', name: 'Scène Cinéma', description: 'Mode film', category: 'lighting', icon: Tv, color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/10', hasToggle: true },
  { id: 'scene-romantic', name: 'Scène Romantique', description: 'Ambiance tamisée', category: 'lighting', icon: Flame, color: 'text-rose-400', bgGradient: 'from-rose-500/20 to-pink-500/10', hasToggle: true },
  { id: 'scene-party', name: 'Scène Fête', description: 'Mode festif', category: 'lighting', icon: Zap, color: 'text-fuchsia-400', bgGradient: 'from-fuchsia-500/20 to-purple-500/10', hasToggle: true },
  { id: 'light-group', name: 'Groupe de lumières', description: 'Contrôle groupé', category: 'lighting', icon: Lightbulb, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-orange-500/10', hasToggle: true, hasSlider: true, size: 'medium' },
  { id: 'light-adaptive', name: 'Éclairage adaptatif', description: 'Suit le rythme circadien', category: 'lighting', icon: Sun, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-amber-500/10', hasToggle: true },
  { id: 'light-motion', name: 'Éclairage mouvement', description: 'S\'active au mouvement', category: 'lighting', icon: Eye, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10', hasToggle: true },

  // === CLIMATE (12) ===
  { id: 'thermostat', name: 'Thermostat', description: 'Température cible', category: 'climate', icon: Thermometer, color: 'text-red-400', bgGradient: 'from-red-500/20 to-orange-500/10', hasSlider: true },
  { id: 'hvac', name: 'Climatisation', description: 'Chaud/Froid/Auto', category: 'climate', icon: AirVent, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10', hasToggle: true, hasSlider: true },
  { id: 'heater', name: 'Chauffage', description: 'Radiateur connecté', category: 'climate', icon: Heater, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-red-500/10', hasToggle: true, hasSlider: true },
  { id: 'fan', name: 'Ventilateur', description: 'Vitesse réglable', category: 'climate', icon: Fan, color: 'text-teal-400', bgGradient: 'from-teal-500/20 to-green-500/10', hasToggle: true, hasSlider: true },
  { id: 'humidifier', name: 'Humidificateur', description: 'Contrôle humidité', category: 'climate', icon: Droplets, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-cyan-500/10', hasToggle: true, hasSlider: true },
  { id: 'dehumidifier', name: 'Déshumidificateur', description: 'Réduit l\'humidité', category: 'climate', icon: Wind, color: 'text-sky-400', bgGradient: 'from-sky-500/20 to-blue-500/10', hasToggle: true },
  { id: 'air-purifier', name: 'Purificateur d\'air', description: 'Qualité de l\'air', category: 'climate', icon: Wind, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10', hasToggle: true },
  { id: 'floor-heating', name: 'Plancher chauffant', description: 'Zone par zone', category: 'climate', icon: Flame, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-orange-500/10', hasToggle: true, hasSlider: true },
  { id: 'window-ac', name: 'Climatiseur fenêtre', description: 'Unité individuelle', category: 'climate', icon: Snowflake, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-cyan-500/10', hasToggle: true, hasSlider: true },
  { id: 'pool-heater', name: 'Chauffage piscine', description: 'Température eau', category: 'climate', icon: Waves, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10', hasToggle: true, hasSlider: true },
  { id: 'sauna', name: 'Sauna', description: 'Préchauffage', category: 'climate', icon: Flame, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-red-500/10', hasToggle: true, hasSlider: true },
  { id: 'towel-warmer', name: 'Sèche-serviettes', description: 'Salle de bain', category: 'climate', icon: Heater, color: 'text-rose-400', bgGradient: 'from-rose-500/20 to-pink-500/10', hasToggle: true },

  // === SECURITY (15) ===
  { id: 'lock-door', name: 'Serrure porte', description: 'Verrou/Déverrou', category: 'security', icon: Lock, color: 'text-red-400', bgGradient: 'from-red-500/20 to-pink-500/10', hasToggle: true },
  { id: 'lock-garage', name: 'Porte garage', description: 'Ouvrir/Fermer', category: 'security', icon: DoorOpen, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-amber-500/10', hasToggle: true },
  { id: 'alarm', name: 'Alarme', description: 'Armé/Désarmé', category: 'security', icon: Siren, color: 'text-red-500', bgGradient: 'from-red-600/20 to-red-400/10', hasToggle: true },
  { id: 'motion-sensor', name: 'Détecteur mouvement', description: 'Zone surveillée', category: 'security', icon: Eye, color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/10' },
  { id: 'door-sensor', name: 'Capteur porte', description: 'Ouvert/Fermé', category: 'security', icon: DoorClosed, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'window-sensor', name: 'Capteur fenêtre', description: 'État des fenêtres', category: 'security', icon: Window, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'smoke-detector', name: 'Détecteur fumée', description: 'Alerte incendie', category: 'security', icon: AlertTriangle, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-red-500/10' },
  { id: 'co-detector', name: 'Détecteur CO', description: 'Monoxyde de carbone', category: 'security', icon: AlertTriangle, color: 'text-yellow-400', bgGradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'water-leak', name: 'Fuite d\'eau', description: 'Détection inondation', category: 'security', icon: Droplets, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
  { id: 'fingerprint', name: 'Lecteur empreinte', description: 'Accès biométrique', category: 'security', icon: Fingerprint, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10' },
  { id: 'keypad', name: 'Clavier code', description: 'Saisie code PIN', category: 'security', icon: Key, color: 'text-indigo-400', bgGradient: 'from-indigo-500/20 to-purple-500/10' },
  { id: 'siren', name: 'Sirène', description: 'Alerte sonore', category: 'security', icon: Siren, color: 'text-red-400', bgGradient: 'from-red-500/20 to-orange-500/10', hasToggle: true },
  { id: 'doorbell', name: 'Sonnette vidéo', description: 'Interphone connecté', category: 'security', icon: Bell, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-yellow-500/10' },
  { id: 'presence', name: 'Présence', description: 'À la maison / Absent', category: 'security', icon: Home, color: 'text-green-400', bgGradient: 'from-green-500/20 to-teal-500/10' },
  { id: 'night-mode', name: 'Mode nuit', description: 'Sécurité renforcée', category: 'security', icon: Moon, color: 'text-indigo-400', bgGradient: 'from-indigo-500/20 to-blue-500/10', hasToggle: true },

  // === ENERGY (10) ===
  { id: 'power-meter', name: 'Compteur puissance', description: 'Watts temps réel', category: 'energy', icon: Zap, color: 'text-yellow-400', bgGradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'energy-daily', name: 'Conso journalière', description: 'kWh du jour', category: 'energy', icon: BarChart3, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-red-500/10', hasChart: true },
  { id: 'energy-monthly', name: 'Conso mensuelle', description: 'Historique mois', category: 'energy', icon: TrendingUp, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10', hasChart: true, size: 'large' },
  { id: 'solar-panel', name: 'Panneaux solaires', description: 'Production PV', category: 'energy', icon: Sun, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-yellow-500/10' },
  { id: 'battery-storage', name: 'Batterie', description: 'Stockage énergie', category: 'energy', icon: Battery, color: 'text-green-400', bgGradient: 'from-green-500/20 to-teal-500/10' },
  { id: 'ev-charger', name: 'Borne VE', description: 'Recharge véhicule', category: 'energy', icon: Car, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10', hasToggle: true },
  { id: 'smart-plug', name: 'Prise connectée', description: 'On/Off + mesure', category: 'energy', icon: Plug, color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/10', hasToggle: true },
  { id: 'water-meter', name: 'Compteur eau', description: 'Consommation L', category: 'energy', icon: Droplets, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
  { id: 'gas-meter', name: 'Compteur gaz', description: 'Consommation m³', category: 'energy', icon: Flame, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-red-500/10' },
  { id: 'cost-tracker', name: 'Coût estimé', description: 'Facture prévue', category: 'energy', icon: TrendingUp, color: 'text-emerald-400', bgGradient: 'from-emerald-500/20 to-green-500/10' },

  // === MEDIA (12) ===
  { id: 'tv', name: 'Télévision', description: 'Contrôle TV', category: 'media', icon: Tv, color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/10', hasToggle: true },
  { id: 'speaker', name: 'Enceinte', description: 'Audio multiroom', category: 'media', icon: Speaker, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10', hasToggle: true, hasSlider: true },
  { id: 'soundbar', name: 'Barre de son', description: 'Home cinéma', category: 'media', icon: Volume2, color: 'text-indigo-400', bgGradient: 'from-indigo-500/20 to-purple-500/10', hasToggle: true, hasSlider: true },
  { id: 'music-player', name: 'Lecteur musique', description: 'Play/Pause/Skip', category: 'media', icon: Play, color: 'text-pink-400', bgGradient: 'from-pink-500/20 to-rose-500/10' },
  { id: 'radio', name: 'Radio', description: 'Stations FM/Web', category: 'media', icon: Radio, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-orange-500/10', hasToggle: true },
  { id: 'projector', name: 'Projecteur', description: 'Vidéoprojecteur', category: 'media', icon: Monitor, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10', hasToggle: true },
  { id: 'gaming', name: 'Console jeux', description: 'PS5/Xbox/Switch', category: 'media', icon: Cpu, color: 'text-red-400', bgGradient: 'from-red-500/20 to-orange-500/10', hasToggle: true },
  { id: 'streaming-box', name: 'Box streaming', description: 'Apple TV/Fire TV', category: 'media', icon: Tv, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10', hasToggle: true },
  { id: 'receiver', name: 'Ampli AV', description: 'Récepteur audio', category: 'media', icon: Volume2, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-yellow-500/10', hasToggle: true, hasSlider: true },
  { id: 'record-player', name: 'Platine vinyle', description: 'Audio analogique', category: 'media', icon: CircleDot, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-red-500/10', hasToggle: true },
  { id: 'voice-assistant', name: 'Assistant vocal', description: 'Alexa/Google/Siri', category: 'media', icon: Mic, color: 'text-teal-400', bgGradient: 'from-teal-500/20 to-cyan-500/10' },
  { id: 'intercom', name: 'Interphone', description: 'Communication', category: 'media', icon: MessageSquare, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10' },

  // === SENSORS (15) ===
  { id: 'temperature', name: 'Température', description: '°C intérieur', category: 'sensors', icon: Thermometer, color: 'text-red-400', bgGradient: 'from-red-500/20 to-orange-500/10' },
  { id: 'humidity', name: 'Humidité', description: '% humidité relative', category: 'sensors', icon: Droplets, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
  { id: 'pressure', name: 'Pression', description: 'hPa atmosphérique', category: 'sensors', icon: Gauge, color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/10' },
  { id: 'co2', name: 'CO2', description: 'ppm dioxyde carbone', category: 'sensors', icon: Wind, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10' },
  { id: 'air-quality', name: 'Qualité air', description: 'Indice AQI', category: 'sensors', icon: Activity, color: 'text-teal-400', bgGradient: 'from-teal-500/20 to-cyan-500/10' },
  { id: 'light-sensor', name: 'Luminosité', description: 'Lux ambiant', category: 'sensors', icon: Sun, color: 'text-yellow-400', bgGradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'noise', name: 'Niveau sonore', description: 'dB ambiant', category: 'sensors', icon: Volume2, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-red-500/10' },
  { id: 'uv-index', name: 'Indice UV', description: 'Rayonnement UV', category: 'sensors', icon: Sun, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-orange-500/10' },
  { id: 'rain-sensor', name: 'Capteur pluie', description: 'Précipitations', category: 'sensors', icon: CloudRain, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'wind-speed', name: 'Vitesse vent', description: 'km/h anémomètre', category: 'sensors', icon: Wind, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'soil-moisture', name: 'Humidité sol', description: 'Arrosage jardin', category: 'sensors', icon: Flower2, color: 'text-green-400', bgGradient: 'from-green-500/20 to-lime-500/10' },
  { id: 'pool-temp', name: 'Température piscine', description: '°C eau', category: 'sensors', icon: Waves, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'ph-sensor', name: 'pH piscine', description: 'Acidité eau', category: 'sensors', icon: Droplets, color: 'text-lime-400', bgGradient: 'from-lime-500/20 to-green-500/10' },
  { id: 'power-quality', name: 'Qualité réseau', description: 'Tension/Fréquence', category: 'sensors', icon: Zap, color: 'text-yellow-400', bgGradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'network-status', name: 'État réseau', description: 'Ping/Bande passante', category: 'sensors', icon: Wifi, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10' },

  // === CAMERAS (8) ===
  { id: 'camera-indoor', name: 'Caméra intérieure', description: 'Surveillance salon', category: 'cameras', icon: Camera, color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/10', size: 'medium' },
  { id: 'camera-outdoor', name: 'Caméra extérieure', description: 'Surveillance jardin', category: 'cameras', icon: Cctv, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10', size: 'medium' },
  { id: 'camera-doorbell', name: 'Sonnette vidéo', description: 'Porte d\'entrée', category: 'cameras', icon: Bell, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-yellow-500/10', size: 'medium' },
  { id: 'camera-baby', name: 'Babyphone', description: 'Surveillance bébé', category: 'cameras', icon: Baby, color: 'text-pink-400', bgGradient: 'from-pink-500/20 to-rose-500/10', size: 'medium' },
  { id: 'camera-pet', name: 'Caméra animaux', description: 'Surveillance animal', category: 'cameras', icon: Dog, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-amber-500/10', size: 'medium' },
  { id: 'camera-garage', name: 'Caméra garage', description: 'Surveillance garage', category: 'cameras', icon: Car, color: 'text-gray-400', bgGradient: 'from-gray-500/20 to-slate-500/10', size: 'medium' },
  { id: 'camera-ptz', name: 'Caméra PTZ', description: 'Pan-Tilt-Zoom', category: 'cameras', icon: Scan, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10', size: 'large' },
  { id: 'camera-grid', name: 'Mosaïque caméras', description: 'Vue multi-caméras', category: 'cameras', icon: Cctv, color: 'text-indigo-400', bgGradient: 'from-indigo-500/20 to-purple-500/10', size: 'large' },

  // === APPLIANCES (12) ===
  { id: 'washer', name: 'Lave-linge', description: 'Programme en cours', category: 'appliances', icon: WashingMachine, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
  { id: 'dryer', name: 'Sèche-linge', description: 'Temps restant', category: 'appliances', icon: Wind, color: 'text-orange-400', bgGradient: 'from-orange-500/20 to-amber-500/10' },
  { id: 'dishwasher', name: 'Lave-vaisselle', description: 'État programme', category: 'appliances', icon: Droplets, color: 'text-teal-400', bgGradient: 'from-teal-500/20 to-cyan-500/10' },
  { id: 'fridge', name: 'Réfrigérateur', description: 'Température frigo', category: 'appliances', icon: Refrigerator, color: 'text-cyan-400', bgGradient: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'oven', name: 'Four', description: 'Préchauffage', category: 'appliances', icon: CookingPot, color: 'text-red-400', bgGradient: 'from-red-500/20 to-orange-500/10', hasToggle: true },
  { id: 'coffee', name: 'Cafetière', description: 'Préparation café', category: 'appliances', icon: CookingPot, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-brown-500/10', hasToggle: true },
  { id: 'vacuum', name: 'Aspirateur robot', description: 'Nettoyage auto', category: 'appliances', icon: CircleDot, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10', hasToggle: true },
  { id: 'mower', name: 'Tondeuse robot', description: 'Tonte jardin', category: 'appliances', icon: Flower2, color: 'text-lime-400', bgGradient: 'from-lime-500/20 to-green-500/10', hasToggle: true },
  { id: 'pool-pump', name: 'Pompe piscine', description: 'Filtration', category: 'appliances', icon: Waves, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-cyan-500/10', hasToggle: true },
  { id: 'irrigation', name: 'Arrosage', description: 'Système arrosage', category: 'appliances', icon: Droplets, color: 'text-green-400', bgGradient: 'from-green-500/20 to-teal-500/10', hasToggle: true },
  { id: 'blinds', name: 'Volets roulants', description: 'Ouvrir/Fermer', category: 'appliances', icon: Blinds, color: 'text-gray-400', bgGradient: 'from-gray-500/20 to-slate-500/10', hasSlider: true },
  { id: 'curtains', name: 'Rideaux', description: 'Position rideaux', category: 'appliances', icon: Window, color: 'text-indigo-400', bgGradient: 'from-indigo-500/20 to-purple-500/10', hasSlider: true },

  // === CHARTS & INFO (11) ===
  { id: 'chart-line', name: 'Graphique ligne', description: 'Évolution temps', category: 'charts', icon: TrendingUp, color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-indigo-500/10', hasChart: true, size: 'large' },
  { id: 'chart-bar', name: 'Graphique barres', description: 'Comparaison', category: 'charts', icon: BarChart3, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10', hasChart: true, size: 'large' },
  { id: 'chart-pie', name: 'Graphique camembert', description: 'Répartition', category: 'charts', icon: PieChart, color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/10', hasChart: true, size: 'medium' },
  { id: 'weather', name: 'Météo', description: 'Prévisions locales', category: 'info', icon: CloudRain, color: 'text-sky-400', bgGradient: 'from-sky-500/20 to-blue-500/10', size: 'medium' },
  { id: 'clock', name: 'Horloge', description: 'Heure actuelle', category: 'info', icon: Clock, color: 'text-indigo-400', bgGradient: 'from-indigo-500/20 to-purple-500/10' },
  { id: 'calendar', name: 'Calendrier', description: 'Événements du jour', category: 'info', icon: Calendar, color: 'text-red-400', bgGradient: 'from-red-500/20 to-pink-500/10', size: 'medium' },
  { id: 'timer', name: 'Minuteur', description: 'Compte à rebours', category: 'info', icon: Timer, color: 'text-amber-400', bgGradient: 'from-amber-500/20 to-orange-500/10' },
  { id: 'location', name: 'Localisation', description: 'Position famille', category: 'info', icon: MapPin, color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/10' },
  { id: 'notifications', name: 'Notifications', description: 'Alertes récentes', category: 'info', icon: Bell, color: 'text-yellow-400', bgGradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'users-home', name: 'Qui est là', description: 'Présence famille', category: 'info', icon: Users, color: 'text-teal-400', bgGradient: 'from-teal-500/20 to-cyan-500/10' },
  { id: 'quick-actions', name: 'Actions rapides', description: 'Boutons scènes', category: 'controls', icon: Zap, color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/10', size: 'medium' },
];

interface WidgetCatalogProps {
  onAddWidget: (template: WidgetTemplate) => void;
}

export function WidgetCatalog({ onAddWidget }: WidgetCatalogProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all');

  const filteredWidgets = WIDGET_CATALOG.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(search.toLowerCase()) ||
                          widget.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Object.entries(CATEGORY_INFO);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Catalogue de widgets
        </CardTitle>
        <CardDescription>
          {WIDGET_CATALOG.length}+ widgets disponibles pour personnaliser votre tableau de bord
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un widget..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categories */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Tous
            </TabsTrigger>
            {categories.map(([key, info]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <info.icon className={cn("w-3.5 h-3.5", info.color)} />
                <span className="hidden sm:inline">{info.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Widget Grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredWidgets.map(widget => (
              <button
                key={widget.id}
                onClick={() => {
                  onAddWidget(widget);
                  toast.success(`Widget "${widget.name}" ajouté`);
                }}
                className={cn(
                  "group relative p-4 rounded-xl border transition-all text-left",
                  "hover:border-primary/50 hover:shadow-lg hover:scale-[1.02]",
                  "bg-gradient-to-br",
                  widget.bgGradient
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg w-fit mb-2",
                  "bg-background/50 group-hover:bg-background/80"
                )}>
                  <widget.icon className={cn("w-5 h-5", widget.color)} />
                </div>
                <p className="text-sm font-medium truncate">{widget.name}</p>
                <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
                
                {/* Feature badges */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {widget.hasToggle && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">On/Off</Badge>
                  )}
                  {widget.hasSlider && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">Slider</Badge>
                  )}
                  {widget.hasChart && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">Graphique</Badge>
                  )}
                </div>

                {/* Add overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 rounded-full bg-primary text-primary-foreground">
                    <Plus className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {filteredWidgets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>Aucun widget trouvé</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
