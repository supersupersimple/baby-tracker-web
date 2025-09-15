"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AuthButton } from "@/components/AuthButton";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Baby, Moon, TrendingUp, PlayCircle } from "lucide-react";

const chartTypes = [
  { value: 'feeding', label: '🍼 Feeding', icon: Baby },
  { value: 'sleep', label: '😴 Sleep', icon: Moon },
  { value: 'diapering', label: '💧 Diapering', icon: Baby },
  { value: 'growth', label: '📏 Growth', icon: TrendingUp },
  { value: 'leisure', label: '🎈 Leisure', icon: PlayCircle }
];

const timeRanges = [
  { value: '7', label: '📅 7 days' },
  { value: '14', label: '📅 14 days' },
  { value: '30', label: '📅 30 days' }
];

export default function ChartsPage() {
  const { data: session, status } = useSession();
  const [selectedBaby, setSelectedBaby] = useState(null);
  const [chartType, setChartType] = useState('feeding');
  const [timeRange, setTimeRange] = useState('7');
  const [chartData, setChartData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleBabyChange = (baby) => {
    setSelectedBaby(baby);
  };

  useEffect(() => {
    const fetchChartData = async () => {
      if (!selectedBaby?.id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/charts?babyId=${selectedBaby.id}&type=${chartType}&days=${timeRange}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }

        const data = await response.json();
        setChartData(data.data.chartData || []);
        setSummaryStats(data.data.summaryStats || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [selectedBaby, chartType, timeRange]);

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-500">No data available for this period</p>
          </div>
        </div>
      );
    }

    const chartConfig = {
      amount: { label: "Amount (ml)", color: "#3b82f6" },
      hours: { label: "Hours", color: "#10b981" },
      pee: { label: "Pee", color: "#f59e0b" },
      poo: { label: "Poo", color: "#8b5cf6" },
      weight: { label: "Weight (kg)", color: "#ef4444" },
      height: { label: "Height (cm)", color: "#06b6d4" }
    };

    switch (chartType) {
      case 'feeding':
        return (
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill={chartConfig.amount.color} />
            </BarChart>
          </ChartContainer>
        );

      case 'sleep':
        return (
          <ChartContainer config={chartConfig} className="h-64">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke={chartConfig.hours.color} 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        );

      case 'diapering':
        return (
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="pee" fill={chartConfig.pee.color} />
              <Bar dataKey="poo" fill={chartConfig.poo.color} />
            </BarChart>
          </ChartContainer>
        );

      case 'growth':
        return (
          <ChartContainer config={chartConfig} className="h-64">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke={chartConfig.weight.color} 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="height" 
                stroke={chartConfig.height.color} 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        );

      case 'leisure':
        return (
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="hours" fill={chartConfig.hours.color} />
            </BarChart>
          </ChartContainer>
        );

      default:
        return null;
    }
  };

  const renderSummaryStats = () => {
    const stats = Object.entries(summaryStats);
    if (stats.length === 0) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(([key, value]) => (
          <div key={key} className="text-center">
            <p className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
            <p className="font-semibold text-lg">{value}</p>
          </div>
        ))}
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col h-full min-h-0">
        <AppHeader selectedBaby={null} onBabyChange={() => {}} />
        <main className="flex-1 max-w-4xl mx-auto py-3 px-2 sm:px-4 lg:px-6 pb-8 sm:pb-6 flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500">Loading...</p>
            </div>
          </div>
        </main>
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <AppHeader selectedBaby={selectedBaby} onBabyChange={handleBabyChange} />

      <main className="flex-1 max-w-4xl mx-auto py-3 px-2 sm:px-4 lg:px-6 pb-8 sm:pb-6 flex flex-col overflow-hidden min-w-0">
        {!session ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">📊</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Activity Charts
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                View daily activity trends and insights for your baby.
              </p>
              <AuthButton />
            </div>
          </div>
        ) : !selectedBaby ? (
          <div className="text-center py-16 px-4">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              Daily Activities Chart
            </h3>
            <p className="text-lg text-gray-500 mb-6 max-w-md mx-auto">
              Select a baby from the dropdown above to view activity charts and insights.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  Daily Activities Chart
                </h1>
                {selectedBaby && (
                  <p className="text-gray-600">
                    Viewing charts for {selectedBaby.babyName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chart Type
                </label>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {chartTypes.find(t => t.value === chartType)?.label} - Last {timeRange} days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="text-4xl mb-4">⏳</div>
                      <p className="text-gray-500">Loading chart data...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="text-4xl mb-4">⚠️</div>
                      <p className="text-red-500">{error}</p>
                    </div>
                  </div>
                ) : (
                  renderChart()
                )}
              </CardContent>
            </Card>

            {Object.keys(summaryStats).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderSummaryStats()}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <OfflineIndicator />
    </div>
  );
}