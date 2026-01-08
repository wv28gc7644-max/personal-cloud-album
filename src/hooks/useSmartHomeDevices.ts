import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Device Types
export type DeviceProtocol = 'matter' | 'tuya' | 'reolink' | 'homeassistant' | 'local';
export type DeviceCategory = 'light' | 'switch' | 'sensor' | 'camera' | 'climate' | 'energy' | 'lock' | 'cover' | 'media' | 'vacuum' | 'other';

export interface SmartDevice {
  id: string;
  name: string;
  protocol: DeviceProtocol;
  category: DeviceCategory;
  room?: string;
  ip?: string;
  model?: string;
  manufacturer?: string;
  firmware?: string;
  online: boolean;
  state: Record<string, any>;
  capabilities: string[];
  lastSeen?: Date;
  matterNodeId?: string;
  tuyaDeviceId?: string;
  reolinkChannel?: number;
}

export interface TuyaConfig {
  enabled: boolean;
  accessId: string;
  accessKey: string;
  region: 'eu' | 'us' | 'cn' | 'in';
  autoDiscovery: boolean;
}

export interface ReolinkConfig {
  enabled: boolean;
  cameras: {
    id: string;
    name: string;
    ip: string;
    username: string;
    password: string;
    channel: number;
  }[];
}

export interface MatterConfig {
  enabled: boolean;
  bridgePort: number;
  exposedDevices: string[];
}

interface SmartHomeConfig {
  tuya: TuyaConfig;
  reolink: ReolinkConfig;
  matter: MatterConfig;
}

const STORAGE_KEY = 'mediavault-smart-home';
const DEVICES_KEY = 'mediavault-smart-devices';

const defaultConfig: SmartHomeConfig = {
  tuya: {
    enabled: false,
    accessId: '',
    accessKey: '',
    region: 'eu',
    autoDiscovery: true,
  },
  reolink: {
    enabled: false,
    cameras: [],
  },
  matter: {
    enabled: false,
    bridgePort: 5540,
    exposedDevices: [],
  },
};

export function useSmartHomeDevices() {
  const [config, setConfig] = useState<SmartHomeConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const [devices, setDevices] = useState<SmartDevice[]>(() => {
    try {
      const saved = localStorage.getItem(DEVICES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [matterBridgeStatus, setMatterBridgeStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');

  // Persist config
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Persist devices
  useEffect(() => {
    localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
  }, [devices]);

  // Update config
  const updateConfig = useCallback(<K extends keyof SmartHomeConfig>(
    section: K,
    updates: Partial<SmartHomeConfig[K]>
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  }, []);

  // Add device
  const addDevice = useCallback((device: Omit<SmartDevice, 'id'>) => {
    const newDevice: SmartDevice = {
      ...device,
      id: `device-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lastSeen: new Date(),
    };
    setDevices(prev => [...prev, newDevice]);
    toast.success(`Appareil "${device.name}" ajouté`);
    return newDevice;
  }, []);

  // Remove device
  const removeDevice = useCallback((id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    toast.success('Appareil supprimé');
  }, []);

  // Update device state
  const updateDeviceState = useCallback((id: string, state: Partial<SmartDevice['state']>) => {
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, state: { ...d.state, ...state }, lastSeen: new Date() } : d
    ));
  }, []);

  // Toggle device
  const toggleDevice = useCallback(async (id: string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const newState = !device.state.on;
    updateDeviceState(id, { on: newState });

    // Simulate API call based on protocol
    switch (device.protocol) {
      case 'tuya':
        console.log(`[Tuya] Toggle device ${device.tuyaDeviceId} to ${newState}`);
        break;
      case 'reolink':
        console.log(`[Reolink] Toggle camera ${device.ip}`);
        break;
      case 'matter':
        console.log(`[Matter] Toggle node ${device.matterNodeId} to ${newState}`);
        break;
    }
  }, [devices, updateDeviceState]);

  // Set brightness
  const setBrightness = useCallback(async (id: string, brightness: number) => {
    updateDeviceState(id, { brightness });
    const device = devices.find(d => d.id === id);
    if (device?.protocol === 'tuya') {
      console.log(`[Tuya] Set brightness ${device.tuyaDeviceId} to ${brightness}%`);
    }
  }, [devices, updateDeviceState]);

  // Tuya Discovery
  const discoverTuyaDevices = useCallback(async (): Promise<SmartDevice[]> => {
    if (!config.tuya.enabled || !config.tuya.accessId) {
      return [];
    }

    // Simulate Tuya Cloud API discovery
    await new Promise(r => setTimeout(r, 1500));

    const mockTuyaDevices: SmartDevice[] = [
      {
        id: `tuya-${Date.now()}-1`,
        name: 'Smart Plug Energy Monitor',
        protocol: 'tuya',
        category: 'energy',
        ip: '192.168.1.101',
        model: 'BK7231T',
        manufacturer: 'Tuya',
        online: true,
        state: { on: true, power: 45.2, voltage: 230, current: 0.19, energy_today: 1.2 },
        capabilities: ['on_off', 'power_monitoring', 'energy_monitoring', 'voltage', 'current'],
        tuyaDeviceId: 'bf1234567890abcdef',
      },
      {
        id: `tuya-${Date.now()}-2`,
        name: 'RGB LED Strip Salon',
        protocol: 'tuya',
        category: 'light',
        ip: '192.168.1.102',
        model: 'WB3S',
        manufacturer: 'Tuya',
        online: true,
        state: { on: true, brightness: 80, color: { h: 240, s: 100, v: 100 } },
        capabilities: ['on_off', 'brightness', 'color_temperature', 'color_rgb'],
        tuyaDeviceId: 'bf0987654321fedcba',
      },
      {
        id: `tuya-${Date.now()}-3`,
        name: 'Capteur Température/Humidité',
        protocol: 'tuya',
        category: 'sensor',
        model: 'ZigBee Gateway',
        manufacturer: 'Tuya',
        online: true,
        state: { temperature: 21.5, humidity: 48, battery: 85 },
        capabilities: ['temperature', 'humidity', 'battery'],
        tuyaDeviceId: 'bf111222333444555',
      },
      {
        id: `tuya-${Date.now()}-4`,
        name: 'Smart Switch 3-Gang',
        protocol: 'tuya',
        category: 'switch',
        ip: '192.168.1.104',
        model: 'CB2S',
        manufacturer: 'Tuya',
        online: false,
        state: { switch_1: false, switch_2: true, switch_3: false },
        capabilities: ['on_off', 'multi_switch'],
        tuyaDeviceId: 'bf555666777888999',
      },
    ];

    return mockTuyaDevices;
  }, [config.tuya]);

  // Reolink Discovery
  const discoverReolinkCameras = useCallback(async (): Promise<SmartDevice[]> => {
    if (!config.reolink.enabled) {
      return [];
    }

    // Simulate Reolink ONVIF discovery
    await new Promise(r => setTimeout(r, 1200));

    const mockReolinkCameras: SmartDevice[] = [
      {
        id: `reolink-${Date.now()}-1`,
        name: 'RLC-510A Entrée',
        protocol: 'reolink',
        category: 'camera',
        ip: '192.168.1.201',
        model: 'RLC-510A',
        manufacturer: 'Reolink',
        firmware: 'v3.1.0.2347',
        online: true,
        state: { 
          recording: true, 
          motion_detected: false,
          night_vision: 'auto',
          ptz_supported: false,
          resolution: '2560x1920',
        },
        capabilities: ['stream', 'recording', 'motion_detection', 'night_vision', 'audio'],
        reolinkChannel: 0,
      },
      {
        id: `reolink-${Date.now()}-2`,
        name: 'E1 Zoom Salon',
        protocol: 'reolink',
        category: 'camera',
        ip: '192.168.1.202',
        model: 'E1 Zoom',
        manufacturer: 'Reolink',
        firmware: 'v3.0.0.660',
        online: true,
        state: {
          recording: true,
          motion_detected: false,
          night_vision: 'on',
          ptz_supported: true,
          zoom_level: 1.0,
          resolution: '2304x1296',
        },
        capabilities: ['stream', 'recording', 'motion_detection', 'night_vision', 'ptz', 'zoom', 'audio', 'two_way_audio'],
        reolinkChannel: 0,
      },
    ];

    return mockReolinkCameras;
  }, [config.reolink]);

  // Matter Discovery
  const discoverMatterDevices = useCallback(async (): Promise<SmartDevice[]> => {
    if (!config.matter.enabled) {
      return [];
    }

    // Simulate Matter/Thread discovery
    await new Promise(r => setTimeout(r, 1000));

    const mockMatterDevices: SmartDevice[] = [
      {
        id: `matter-${Date.now()}-1`,
        name: 'Thread Light Bulb',
        protocol: 'matter',
        category: 'light',
        model: 'Matter Thread 1.0',
        manufacturer: 'Eve',
        online: true,
        state: { on: true, brightness: 100 },
        capabilities: ['on_off', 'brightness'],
        matterNodeId: 'matter-node-001',
      },
      {
        id: `matter-${Date.now()}-2`,
        name: 'Eve Energy Plug',
        protocol: 'matter',
        category: 'energy',
        model: 'Eve Energy',
        manufacturer: 'Eve',
        online: true,
        state: { on: true, power: 12.5 },
        capabilities: ['on_off', 'power_monitoring'],
        matterNodeId: 'matter-node-002',
      },
    ];

    return mockMatterDevices;
  }, [config.matter]);

  // Full discovery
  const discoverAllDevices = useCallback(async () => {
    setIsDiscovering(true);
    const allDiscovered: SmartDevice[] = [];

    try {
      const [tuyaDevices, reolinkDevices, matterDevices] = await Promise.all([
        discoverTuyaDevices(),
        discoverReolinkCameras(),
        discoverMatterDevices(),
      ]);

      allDiscovered.push(...tuyaDevices, ...reolinkDevices, ...matterDevices);

      toast.success('Découverte terminée', {
        description: `${allDiscovered.length} appareil(s) trouvé(s)`,
      });

      return allDiscovered;
    } catch (error) {
      toast.error('Erreur lors de la découverte');
      return [];
    } finally {
      setIsDiscovering(false);
    }
  }, [discoverTuyaDevices, discoverReolinkCameras, discoverMatterDevices]);

  // Import discovered devices
  const importDevices = useCallback((newDevices: SmartDevice[]) => {
    const existingIds = new Set(devices.map(d => d.tuyaDeviceId || d.ip || d.matterNodeId));
    const uniqueNew = newDevices.filter(d => {
      const identifier = d.tuyaDeviceId || d.ip || d.matterNodeId;
      return !existingIds.has(identifier);
    });

    if (uniqueNew.length > 0) {
      setDevices(prev => [...prev, ...uniqueNew]);
      toast.success(`${uniqueNew.length} appareil(s) importé(s)`);
    } else {
      toast.info('Tous les appareils sont déjà importés');
    }
  }, [devices]);

  // Matter Bridge Control
  const startMatterBridge = useCallback(async () => {
    if (!config.matter.enabled) {
      toast.error('Activez Matter d\'abord');
      return;
    }

    setMatterBridgeStatus('starting');
    
    // Simulate bridge startup
    await new Promise(r => setTimeout(r, 2000));
    
    setMatterBridgeStatus('running');
    toast.success('Pont Matter démarré', {
      description: `Port ${config.matter.bridgePort} - Prêt pour Apple Home, Google Home, Alexa`,
    });
  }, [config.matter]);

  const stopMatterBridge = useCallback(async () => {
    setMatterBridgeStatus('stopped');
    toast.success('Pont Matter arrêté');
  }, []);

  const exposeMatterDevice = useCallback((deviceId: string) => {
    setConfig(prev => ({
      ...prev,
      matter: {
        ...prev.matter,
        exposedDevices: [...prev.matter.exposedDevices, deviceId],
      },
    }));
    toast.success('Appareil exposé via Matter');
  }, []);

  const unexposeMatterDevice = useCallback((deviceId: string) => {
    setConfig(prev => ({
      ...prev,
      matter: {
        ...prev.matter,
        exposedDevices: prev.matter.exposedDevices.filter(id => id !== deviceId),
      },
    }));
  }, []);

  // Get camera stream URL
  const getCameraStreamUrl = useCallback((device: SmartDevice): string | null => {
    if (device.protocol !== 'reolink' || !device.ip) return null;
    
    const camera = config.reolink.cameras.find(c => c.ip === device.ip);
    if (!camera) {
      // Default RTSP URL format for Reolink
      return `rtsp://${device.ip}:554/h264Preview_01_main`;
    }
    
    return `rtsp://${camera.username}:${camera.password}@${camera.ip}:554/h264Preview_0${camera.channel}_main`;
  }, [config.reolink.cameras]);

  // Device counts by protocol
  const deviceCounts = {
    tuya: devices.filter(d => d.protocol === 'tuya').length,
    reolink: devices.filter(d => d.protocol === 'reolink').length,
    matter: devices.filter(d => d.protocol === 'matter').length,
    total: devices.length,
    online: devices.filter(d => d.online).length,
  };

  return {
    // Config
    config,
    updateConfig,
    
    // Devices
    devices,
    addDevice,
    removeDevice,
    updateDeviceState,
    toggleDevice,
    setBrightness,
    importDevices,
    
    // Discovery
    isDiscovering,
    discoverAllDevices,
    discoverTuyaDevices,
    discoverReolinkCameras,
    discoverMatterDevices,
    
    // Matter Bridge
    matterBridgeStatus,
    startMatterBridge,
    stopMatterBridge,
    exposeMatterDevice,
    unexposeMatterDevice,
    
    // Camera
    getCameraStreamUrl,
    
    // Stats
    deviceCounts,
  };
}
