import  {useEffect, useRef, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Thermometer, Droplets,  Database, Trash2, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const SUPABASE_URL = 'https://ljbhlggltdsirxndjfqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqYmhsZ2dsdGRzaXJ4bmRqZnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDIwMTEsImV4cCI6MjA4NjExODAxMX0.6Hfmh5EQqaHAWAGfHkaQ_fXRHUJgOYRz4kszj702qBA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface SensorData {
  temp: number;
  hum: number;
  reset: boolean;
}

interface HistoryRow {
  created_at: string;
  temperature: number;
}

export default function Main() {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<SensorData>({temp: 0, hum: 0, reset: false});
  // const [history, setHistory] = useState<number[]>([]);
  const [dbHistory, setDbHistory] = useState<HistoryRow[]>([]);
  const [statusMsg, setStatusMsg] = useState("Ready");

  const lastSavedTime = useRef<number>(0);

  const fetchHistory = async() => {
    const {data, error} = await supabase
    .from('Temp_Data').select('created_at, temperature')
    .order('created_at', {ascending: false})
    .limit(20);
    
    if(error) console.error('Error fetching history: ', error);
    else if (data) setDbHistory(data.reverse());

    console.log(data)
  };

  const chartData = dbHistory.map((row) => ({
  time: new Date(row.created_at).toLocaleTimeString(),
  temperature: row.temperature,
  }));


  const saveReading = async (temp: number, hum: number) => {
  if (!Number.isFinite(temp) || !Number.isFinite(hum)) return;

  const now = Date.now();
  if (now - lastSavedTime.current > 5000) {
    const { error } = await supabase
      .from('Temp_Data')
      .insert({ temperature: temp, humidity: hum });

    if (!error) {
      lastSavedTime.current = now;
      setStatusMsg("Data saved into cloud");
      fetchHistory();
    }
  }
};

  const resetDatabase = async () => {
    setStatusMsg("DELETING ALL DATA...");
    const {error} = await supabase
    .from('Temp_Data').delete()
    .neq('id', 0);

    if(!error) {
      setDbHistory([]);
      setStatusMsg("Database Cleared!");
    }
  }

  const connectSerial = async () => {
    try {
      //@ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({baudRate: 9600 });
      setIsConnected(true);

      const textDecoder = new TextDecoderStream();
      const reader = textDecoder.readable.getReader();

      let buffer ="";

      while(true){
        const { value, done } = await reader.read();
        if (done) break;

        if(value) {
          buffer += value;
          const lines = buffer.split('\r\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
  const trimmed = line.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);

      if (
        typeof parsed.temp === "number" &&
        typeof parsed.hum === "number" &&
        typeof parsed.reset === "boolean"
      ) {
        setData(parsed);

        if (parsed.reset) {
          await resetDatabase();
        } else {
          await saveReading(parsed.temp, parsed.hum);
        }
      }
    } catch (e) {
      console.error("Invalid JSON:", trimmed);
    }
  }
}

        }
      }
    } catch (err) {
      console.error("Serial Connection Error: ", err);
      alert("Неуспешно свързване!");
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-slate-950 text-slate-50 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    IoT Cloud Monitor <Database className="w-6 h-6 text-blue-500" />
                </h1>
                <p className="text-slate-400 mt-1 flex items-center gap-2">
                    <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        {statusMsg}
                    </span>
                </p>
            </div>
            <div>
                {!isConnected ? (
                    <button 
                        onClick={connectSerial}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all"
                    >
                        START SYSTEM
                    </button>
                ) : (
                    <Badge variant="outline" className="text-green-400 border-green-900 bg-green-900/10 px-3 py-1 animate-pulse">
                        ● LIVE DATA STREAM
                    </Badge>
                )}
            </div>
        </div>

        {/* АЛАРМА ЗА РЕСТАРТ */}
        {data.reset && (
            <Alert className="border-orange-500 bg-orange-950/50 text-orange-200 animate-bounce">
                <Trash2 className="h-4 w-4" />
                <AlertTitle>HARDWARE RESET DETECTED</AlertTitle>
                <AlertDescription>
                    Натиснат е бутон на устройството. Базата данни се изчиства...
                </AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ТЕКУЩИ ДАННИ (LIVE) */}
            <Card className="md:col-span-1 bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-400 text-sm uppercase">Текущи Стойности</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="flex items-center gap-2 text-slate-200"><Thermometer size={18}/> Температура</span>
                            <span className="text-4xl font-bold text-white">{data.temp.toFixed(1)}°</span>
                        </div>
                        <Progress value={(data.temp / 40) * 100} className="h-2 bg-slate-800" />
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="flex items-center gap-2 text-slate-200"><Droplets size={18}/> Влажност</span>
                            <span className="text-4xl font-bold text-blue-400">{data.hum}%</span>
                        </div>
                        <Progress value={data.hum} className="h-2 bg-slate-800" />
                    </div>
                </CardContent>
            </Card>

            {/* ИСТОРИЯ ОТ БАЗАТА ДАННИ (GRAPH) */}
            <Card className="md:col-span-2 bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-slate-400 text-sm uppercase">
                        История в Облака (Supabase)
                    </CardTitle>
                    <button onClick={fetchHistory} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <RefreshCw size={12}/> Refresh DB
                    </button>
                </CardHeader>
                      

                      <CardContent>
                        {chartData.length === 0 ? (
                          <div className="h-62.5 flex items-center justify-center text-slate-600 italic">
                            Няма записани данни в облака...
                          </div>
                        ) : (
                          <ChartContainer
                            config={{
                              temperature: {
                                label: "Температура (°C)",
                                color: "hsl(var(--chart-1))",
                              },
                            }}
                            className="h-62.5"
                          >
                            <BarChart data={chartData}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" />
                              <XAxis
                                dataKey="time"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "#94a3b8", fontSize: 12 }}
                              />
                              <YAxis
                                domain={[0, 40]}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "#94a3b8", fontSize: 12 }}
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar
                                dataKey="temperature"
                                radius={[4, 4, 0, 0]}
                                fill="var(--color-temperature)"
                              />
                            </BarChart>
                          </ChartContainer>
                        )}

                        <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
                          <span>Преди {chartData.length} записа</span>
                          <span>Сега</span>
                        </div>
                      </CardContent>
                    </Card>

                

        </div>
      </div>
    </div>
  );
}