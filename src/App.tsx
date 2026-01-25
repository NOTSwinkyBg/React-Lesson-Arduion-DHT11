import React, {useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Terminal, Thermometer, Droplets, AlertTriangle } from 'lucide-react';

interface SensorData {
  temp: number;
  hum: number;
  alarm: boolean;
}

export default function Main() {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<SensorData>({temp: 0, hum: 0, alarm: false});
  const [history, setHistory] = useState<number[]>([]);

  const connectSerial = async () => {
    try {
      //@ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({baudRate: 9600 });
      setIsConnected(true);

      const textDecoder = new TextDecoderStream();
      const readbleStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      let buffer ="";

      while(true){
        const { value, done } = await reader.read();
        if (done) break;

        if(value) {
          buffer += value;
          const lines = buffer.split('\r\n');
          buffer = lines.pop() || "";

          for(const line of lines){
            if(line.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(line);

                if (typeof parsed.temp === 'number') {
                  setData(parsed);

                  setHistory(prev => [...prev.slice(-19), parsed.temp]);
                }
              } catch (e) {
                console.error("JSON Parse Error:", e);
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

  return(
    <div className={`min-h-screen p-8 font-sans transition-colors duration-500 ${data.alarm ? 'bg-red-950/40' : 'bg-slate-950'} text-slate-50 flex flex-col items-center`}>
      <div className='w-full max-w-4xl space-y-8'>

        {/* Header */}
        <div className='flex justify-between items-center border-b border-slate-800 pb-6'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight flex items-center gap-3'>
              Готиния темрометър <Terminal className='w-6 h-6 text-slate-500'/>
            </h1>
            <p className='text-slate-400 mt-1'>Реални данни от Arduion DHT11/22</p>
          </div>
          <div>
            {!isConnected ? (
              <button 
                onClick={connectSerial}
                className='bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2'
              >Свържи устройстви </button>
            ) : (
              <Badge variant="outline" className='text-green-400 border-green-900 bg-green-900/20 px-3 py-1'>
                Live Connection
              </Badge>
            )}
          </div>
        </div>

        {/* Alarm */}
        {data.alarm && (
          <Alert variant="destructive" className='animate-pulse border-red-600 bg-red-950 text-red-200'>
              <AlertTriangle className='h-4 w-4'/>
              <AlertTitle>ВНИМАНИЕ: КРИТИЧНА ТЕМПЕРАТУРА</AlertTitle>
              <AlertDescription>
                Сензорът отчита стойности над допустимата граница (28 градуса)
              </AlertDescription>
          </Alert>
        )}

        {/* Base Content */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Temperature */}
          <Card className={`bg-slate-900 border-slate-800 ${data.alarm ? 'border-red-500/50' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">
                        Температура
                    </CardTitle>
                    <Thermometer className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                    <div className="text-5xl font-bold text-white mb-2">
                        {data.temp.toFixed(1)}°C
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                        Оптимална зона: 20°C - 25°C
                    </p>
                    <div className="flex items-end h-12 gap-1 mt-4 border-b border-slate-800 pb-1">
                        {history.map((h, i) => (
                            <div 
                                key={i} 
                                className={`flex-1 rounded-t-sm transition-all duration-300 ${h > 28 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ height: `${Math.min(100, (h / 40) * 100)}%` }}
                            ></div>
                        ))}
                    </div>
                </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">
                        Влажност на въздуха
                    </CardTitle>
                    <Droplets className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-5xl font-bold text-white mb-4">
                        {data.hum}%
                    </div>

                    <div className="space-y-3">
                        <Progress value={data.hum} className="h-2 bg-slate-700" />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>0% (Сухо)</span>
                            <span>100% (Наситено)</span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Badge variant={data.hum > 60 ? "destructive" : "secondary"}>
                            {data.hum > 60 ? "Висока Влажност" : "Комфортна Среда"}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card className='bg-black/40 border-slate-800'>
          <CardContent className="py-3 px-4">
            <code className='text-xs font-mono text-slate-600'>
              SERIAL_STREAM: {JSON.stringify(data)}
            </code>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}