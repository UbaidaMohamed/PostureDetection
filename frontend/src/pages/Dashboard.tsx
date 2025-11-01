import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { 
  TrendingUp, 
  Target, 
  CheckCircle,
  Loader2
} from "lucide-react";
import API from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  currentScore: number;
  weeklyAverage: number;
  weeklyChange: number;
}

interface PostureDataPoint {
  time: string;
  good: number;
  poor: number;
  score: number;
}

interface WeeklyDataPoint {
  day: string;
  score: number;
  sessions: number;
}

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month">("today");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    currentScore: 0,
    weeklyAverage: 0,
    weeklyChange: 0,
  });
  const [postureData, setPostureData] = useState<PostureDataPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const { toast } = useToast();

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all dashboard data in parallel
        const [statsResponse, todayResponse, weekResponse] = await Promise.all([
          API.get("/posture/dashboard/stats"),
          API.get("/posture/dashboard/today"),
          API.get("/posture/dashboard/week")
        ]);

        setStats(statsResponse.data);
        setPostureData(todayResponse.data.data || []);
        setWeeklyData(weekResponse.data.data || []);
        // Fetch recent activity (latest posture logs)
        try {
          const recentRes = await API.get(`/posture/logs?limit=6`);
          setRecentActivity(recentRes.data.data || []);
        } catch (err) {
          console.warn("Failed to load recent activity", err);
        }
      } catch (error: any) {
        console.error("Failed to fetch dashboard data:", error);
        toast({
          title: "Error Loading Dashboard",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  // Interpret score as posture angle in degrees.
  // Good posture: angle > 90
  // Bad posture: angle < 90
  // Exactly 90 is considered neutral.
  const getScoreStatus = (angle: number): { variant: "good" | "warning" | "bad" | "neutral"; text: string } => {
    if (angle > 90) return { variant: "good", text: "Good" };
    if (angle < 90) return { variant: "bad", text: "Bad" };
    return { variant: "neutral", text: "Neutral" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Posture Dashboard</h1>
          <p className="text-muted-foreground">Track your posture health and progress</p>
        </div>
        {/* Header action buttons removed (Export Data, Schedule Check-in) */}
      </div>

  {/* Top layout: stats on left, charts on right */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Left - stats stacked */}
    <div className="space-y-4">
      <Card className="card-elevated">
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Angle</p>
              <p className="text-2xl font-bold text-foreground">{Math.round(stats.currentScore)}°</p>
            </div>
            <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="mt-2">
            <StatusBadge variant={getScoreStatus(stats.currentScore).variant}>
              {getScoreStatus(stats.currentScore).text}
            </StatusBadge>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Weekly Average</p>
              <p className="text-2xl font-bold text-foreground">{stats.weeklyAverage}°</p>
            </div>
            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-accent" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">↑ {stats.weeklyChange}° from last week</p>
        </CardContent>
      </Card>
    </div>

    {/* Right - charts */}
    <div className="lg:col-span-2 space-y-6">
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Posture Score Today</CardTitle>
            <div className="flex space-x-1">
              {["today", "week", "month"].map((period) => (
                <Button
                  key={period}
                  variant={timeframe === period ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeframe(period as any)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          ) : postureData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-muted-foreground">No data available for today</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={postureData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 180]} tickFormatter={(v) => `${v}°`} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Weekly Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[240px]">
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px]">
              <p className="text-muted-foreground">No data available for this week</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 180]} tickFormatter={(v) => `${v}°`} />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  </div>

      {/* Recent Activity */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground">No recent activity</p>
            ) : (
              recentActivity.map((log: any, index: number) => {
                const date = new Date(log.timestamp || log.createdAt || log.time);
                const hh = String(date.getHours()).padStart(2, "0");
                const mm = String(date.getMinutes()).padStart(2, "0");
                const timeLabel = `${hh}:${mm}`;

                // Map backend postureType to frontend types
                const type = log.postureType === "good" ? "good" : log.postureType === "moderate" ? "warning" : "bad";

                const message =
                  log.postureType === "good"
                    ? `Good posture maintained for ${Math.round((log.duration || 0) / 60)} minutes`
            : log.postureType === "moderate"
              ? `Poor posture - ${Math.round((log.duration || 0))}s session`
                    : `Poor posture alert - ${log.notes || "detected"}`;

                return (
                  <div key={log._id || index} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      type === "good" ? "bg-success" : type === "warning" ? "bg-warning" : "bg-destructive"
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{message}</p>
                        <Badge variant="outline" className="text-xs">
                          {timeLabel}
                        </Badge>
                      </div>
                    </div>
                    {type === "good" && (
                      <CheckCircle className="w-4 h-4 text-success mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}