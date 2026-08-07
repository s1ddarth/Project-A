import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const NAVY = '#1E2A56';

// Past-performance bar chart for the KIID preview: navy bars, -20..20 axis.
export default function PerformanceChart({ years }) {
  const data = (years || [])
    .filter((y) => y && (y.year || y.year === 0))
    .map((y) => ({ name: String(y.year), value: Number(y.value) || 0 }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[150px] text-xs text-muted-foreground italic border border-dashed rounded">
        No performance data
      </div>
    );
  }

  // Fixed-height wrapper keeps Recharts measurable when cloned into the
  // print iframe (ResponsiveContainer alone can collapse in print engines).
  return (
    <div className="kiid-perf-chart">
      <ResponsiveContainer width="100%" height={150} minWidth={0} debounce={1}>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 2, left: -22 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9 }}
            angle={-90}
            textAnchor="end"
            height={36}
            interval={0}
          />
          <YAxis
            domain={[-20, 20]}
            ticks={[-20, -15, -10, -5, 0, 5, 10, 15, 20]}
            tick={{ fontSize: 9 }}
            tickFormatter={(v) => `${v}%`}
          />
          <ReferenceLine y={0} stroke="#9aa0a6" />
          <Bar dataKey="value" maxBarSize={20}>
            {data.map((d, i) => (
              <Cell key={i} fill={NAVY} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}