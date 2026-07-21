import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';

export function AdminCharts({ stats }) {
  // 1. Prepare Data for "New Shops Last 30 Days"
  const growthData = useMemo(() => {
    const last30Days = [...Array(30)].map((_, i) => {
      const d = subDays(new Date(), 29 - i);
      return {
        date: format(d, 'MMM dd'),
        fullDate: d,
        count: 0
      };
    });

    stats.forEach(shop => {
      const createdAt = parseISO(shop.created_at);
      const day = last30Days.find(d => isSameDay(d.fullDate, createdAt));
      if (day) {
        day.count += 1;
      }
    });
    
    // Accumulate for "Total Shops" trend or just daily signups? 
    // Let's do cumulative for a nice upward curve, or daily bars. 
    // Let's do Daily Signups line.
    return last30Days;
  }, [stats]);

  // 2. Prepare Data for "Plan Distribution"
  const planData = useMemo(() => {
    const counts = stats.reduce((acc, curr) => {
      acc[curr.plan_key] = (acc[curr.plan_key] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(counts).map(key => ({
      name: key === 'free' ? 'Free Experience' : 'Smart Shop',
      value: counts[key]
    }));
  }, [stats]);

  const COLORS = ['#94a3b8', '#4f46e5']; // Slate for Free, Indigo for Paid

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Growth Chart */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6">New Shop Signups (30 Days)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                minTickGap={30}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-background)', 
                  borderColor: 'var(--color-border)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="var(--color-primary)" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2 }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Subscription Distribution</h3>
        <div className="h-[300px] w-full flex items-center justify-center">
            {planData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ 
                      backgroundColor: 'var(--color-background)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: '12px' 
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="text-muted-foreground">No data available</div>
            )}
        </div>
      </div>
    </div>
  );
}
