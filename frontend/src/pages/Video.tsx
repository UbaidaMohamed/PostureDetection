import { useState, useRef, useEffect } from "react";
import { Camera, CameraOff, Volume2, VolumeX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Video() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [postureStatus, setPostureStatus] = useState<"good" | "warning" | "bad">("good");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevStatusRef = useRef<typeof postureStatus | null>(null);
  const alertIntervalRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        if (audioEnabled) {
          try {
            if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
          } catch (e) {
          }
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // Mock posture detection simulation
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const statuses: Array<"good" | "warning" | "bad"> = ["good", "good", "warning", "bad"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setPostureStatus(randomStatus);
      
      if (randomStatus !== "good" && alertsEnabled) {
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isStreaming, alertsEnabled]);

  // Create a simple WebAudio notification player
  const playNotification = (type: "good" | "bad" | "warning") => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      if (type === 'bad' || type === 'warning') {
        // Short repetitive beep for warning/bad so it can repeat at 200ms intervals
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(type === 'bad' ? 440 : 660, now);
        g.gain.setValueAtTime(0, now);
        // quick attack, short release
        g.gain.linearRampToValueAtTime(0.7, now + 0.005);
        g.gain.linearRampToValueAtTime(0, now + 0.08);
        o.connect(g).connect(ctx.destination);
        o.start(now);
        o.stop(now + 0.09);
      } else if (type === 'good') {
        // OK: short double beep
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(880, now);
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(0.5, now + 0.01);
        g1.gain.linearRampToValueAtTime(0, now + 0.12);
        o1.connect(g1).connect(ctx.destination);
        o1.start(now);
        o1.stop(now + 0.14);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(980, now + 0.16);
        g2.gain.setValueAtTime(0, now + 0.16);
        g2.gain.linearRampToValueAtTime(0.45, now + 0.17);
        g2.gain.linearRampToValueAtTime(0, now + 0.3);
        o2.connect(g2).connect(ctx.destination);
        o2.start(now + 0.16);
        o2.stop(now + 0.32);
      }
    } catch (e) {
      // ignore audio errors
    }
  };

  // Play audio notifications and repeat while posture is bad/warning
  useEffect(() => {
    // clear any existing interval if conditions aren't met
    const clearExisting = () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current);
        alertIntervalRef.current = null;
      }
    };

    if (!audioEnabled || !isStreaming || !alertsEnabled) {
      clearExisting();
      return;
    }

    // If posture is bad or warning, play immediately and start repeating
    if (postureStatus === 'bad' || postureStatus === 'warning') {
      // play once immediately
      playNotification(postureStatus === 'bad' ? 'bad' : 'warning');

      // clear old interval then start a new repeat interval
      clearExisting();
      alertIntervalRef.current = window.setInterval(() => {
        playNotification(postureStatus === 'bad' ? 'bad' : 'warning');
      }, 200); // repeat every 200ms while posture remains bad/warning
    } else if (postureStatus === 'good') {
      // On good posture, clear repeating alerts and play confirmation sound once
      clearExisting();
      playNotification('good');
    }

    return () => clearExisting();
  }, [postureStatus, audioEnabled, alertsEnabled, isStreaming]);

  const getStatusText = () => {
    switch (postureStatus) {
      case "good": return "Good Posture";
      case "warning": return "Poor Posture";
      case "bad": return "Poor Posture";
      default: return "Monitoring...";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Posture Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor your sitting posture in real-time with AI-powered detection
        </p>
      </div>

      {/* Alert Banner */}
      {showAlert && (
        <Card className="border-warning bg-warning/10 animate-in slide-in-from-top">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="font-medium text-warning">Posture Alert: {getStatusText()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video Feed */}
        <div className="lg:col-span-2">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Live Video Feed</CardTitle>
                <StatusBadge variant={postureStatus}>
                  {getStatusText()}
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                
                {!isStreaming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <CameraOff className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Camera not active</p>
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                  <Button
                    onClick={isStreaming ? stopCamera : startCamera}
                    size="lg"
                    className="shadow-lg"
                    variant={isStreaming ? "destructive" : "default"}
                  >
                    {isStreaming ? (
                      <>
                        <CameraOff className="w-5 h-5 mr-2" />
                        Stop Camera
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        Start Camera
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Detection Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="alerts" className="text-sm font-medium">
                  Visual Alerts
                </Label>
                <Switch
                  id="alerts"
                  checked={alertsEnabled}
                  onCheckedChange={setAlertsEnabled}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="audio" className="text-sm font-medium">
                  Audio Notifications
                </Label>
                <Switch
                  id="audio"
                  checked={audioEnabled}
                  onCheckedChange={setAudioEnabled}
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Current Status</h4>
                <div className="flex items-center space-x-2">
                  {audioEnabled ? (
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isStreaming ? "Monitoring active" : "Monitoring paused"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Tips for Good Posture</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Keep your back straight against the chair</li>
                <li>• Feet flat on the floor</li>
                <li>• Monitor at eye level</li>
                <li>• Shoulders relaxed</li>
                <li>• Take breaks every 30 minutes</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}