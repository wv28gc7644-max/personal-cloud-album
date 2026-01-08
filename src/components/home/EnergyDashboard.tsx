import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  BarChart3,
  Activity,
  Power,
  Plug,
  Sun,
  Battery,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface EnergyData {
  timestamp: string;
  consumption: number;
  production?: number;
  cost?: number;
}

interface DeviceConsumption {
  id: string;
  name: string;
  consumption: number;
  percentage: number;
  color: string;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

// Generate mock data
function generateHourlyData(): EnergyData[] {
  const data: EnergyData[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const baseConsumption = 200 + Math.sin(i / 4) * 100;
    data.push({
      timestamp: hour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      consumption: Math.round(baseConsumption + Math.random() * 150),
      production: Math.max(0, Math.round((Math.sin((i - 6) / 3) * 100 + Math.random() * 50))),
      cost: Math.round((baseConsumption / 1000) * 0.18 * 100) / 100
    });
  }
  return data;
}

function generateDailyData(): EnergyData[] {
  const data: EnergyData[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    data.push({
      timestamp: day.toLocaleDateString('fr-FR', { weekday: 'short' }),
      consumption: Math.round(4000 + Math.random() * 3000),
      production: Math.round(1000 + Math.random() * 2000),
      cost: Math.round((5 + Math.random() * 3) * 100) / 100
    });
  }
  return data;
}

function generateMonthlyData(): EnergyData[] {
  const data: EnergyData[] = [];
  for (let i = 11; i >= 0; i--) {
    const month = new Date();
    month.setMonth(month.getMonth() - i);
    data.push({
      timestamp: month.toLocaleDateString('fr-FR', { month: 'short' }),
      consumption: Math.round(100000 + Math.random() * 50000),
      production: Math.round(20000 + Math.random() * 30000),
      cost: Math.round((120 + Math.random() * 80) * 100) / 100
    });
  }
  return data;
}

const mockDevices: DeviceConsumption[] = [
  { id: '1', name: 'Chauffage', consumption: 2500, percentage: 35, color: COLORS[0] },
  { id: '2', name: 'Chauffe-eau', consumption: 1200, percentage: 17, color: COLORS[1] },
  { id: '3', name: 'Réfrigérateur', consumption: 800, percentage: 11, color: COLORS[2] },
  { id: '4', name: 'Éclairage', consumption: 600, percentage: 8, color: COLORS[3] },
  { id: '5', name: 'PC & Gaming', consumption: 500, percentage: 7, color: COLORS[4] },
  { id: '6', name: 'TV & Multimédia', consumption: 400, percentage: 6, color: COLORS[5] },
  { id: '7', name: 'Cuisine', consumption: 600, percentage: 8, color: COLORS[6] },
  { id: '8', name: 'Autres', consumption: 600, percentage: 8, color: COLORS[7] },
];

export function EnergyDashboard() {
  const [period, setPeriod] = useState<'hour' | 'day' | 'month'>('day');
  const [data, setData] = useState<EnergyData[]>([]);
  const [currentPower, setCurrentPower] = useState(1247);
  const [dailyCost, setDailyCost] = useState(4.82);
  const [monthlyEstimate, setMonthlyEstimate] = useState(145);

  useEffect(() => {
    // Load data based on period
    switch (period) {
      case 'hour':
        setData(generateHourlyData());
        break;
      case 'day':
        setData(generateDailyData());
        break;
      case 'month':
        setData(generateMonthlyData());
        break;
    }
  }, [period]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPower(prev => prev + Math.round((Math.random() - 0.5) * 50));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalConsumption = data.reduce((sum, d) => sum + d.consumption, 0);
  const totalProduction = data.reduce((sum, d) => sum + (d.production || 0), 0);
  const totalCost = data.reduce((sum, d) => sum + (d.cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Real-time Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Puissance actuelle</p>
                <p className="text-2xl font-bold">{currentPower}W</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Sun className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Production solaire</p>
                <p className="text-2xl font-bold">{Math.round(totalProduction / 1000)}kWh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coût aujourd'hui</p>
                <p className="text-2xl font-bold">{dailyCost.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimation mois</p>
                <p className="text-2xl font-bold">{monthlyEstimate}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Consommation & Production
              </CardTitle>
              <CardDescription>
                Historique de votre consommation électrique
              </CardDescription>
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">24 heures</SelectItem>
                <SelectItem value="day">7 jours</SelectItem>
                <SelectItem value="month">12 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="timestamp" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => period === 'month' ? `${v/1000}k` : v}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [
                    period === 'month' ? `${(value/1000).toFixed(1)} kWh` : `${value} W`,
                    ''
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="consumption"
                  stroke="#F59E0B"
                  fillOpacity={1}
                  fill="url(#colorConsumption)"
                  name="Consommation"
                />
                <Area
                  type="monotone"
                  dataKey="production"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorProduction)"
                  name="Production"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Device Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="w-5 h-5" />
              Répartition par appareil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockDevices}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="consumption"
                  >
                    {mockDevices.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value} W`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Top consommateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockDevices.slice(0, 6).map((device, index) => (
                <div key={device.id} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: device.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{device.name}</span>
                      <span className="text-sm text-muted-foreground">{device.consumption}W</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${device.percentage}%`,
                          backgroundColor: device.color
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {device.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Analyse des coûts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Coût moyen / jour</p>
              <p className="text-2xl font-bold">4.82€</p>
              <Badge variant="outline" className="mt-2 gap-1">
                <TrendingDown className="w-3 h-3 text-green-500" />
                -12% vs mois dernier
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Prix du kWh</p>
              <p className="text-2xl font-bold">0.18€</p>
              <Badge variant="outline" className="mt-2">Tarif base</Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Économies solaires</p>
              <p className="text-2xl font-bold text-green-500">32€</p>
              <Badge variant="outline" className="mt-2 gap-1">
                <Sun className="w-3 h-3 text-amber-500" />
                Ce mois
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
