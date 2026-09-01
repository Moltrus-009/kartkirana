import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: ChartDataPoint[];
  height?: number;
}

export function SalesLineChart({ data, height = 200 }: LineChartProps) {
  const { t } = useLanguage();
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; label: string } | null>(null);

  if (data.length === 0) return <div className="text-center text-slate-400 py-10 font-bold">{t('no_data')}</div>;

  const maxVal = Math.max(...data.map(d => d.value), 1000);
  const minVal = 0;
  
  const width = 600;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Convert points to SVG coords
  const points = data.map((d, idx) => {
    const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, value: d.value, label: d.label };
  });

  // Construct SVG path string
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  // Path for fill gradient underneath
  let fillD = '';
  if (points.length > 0) {
    fillD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
  }

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + ratio * chartHeight;
          const labelVal = Math.round(maxVal - ratio * (maxVal - minVal));
          return (
            <g key={i} className="opacity-40 dark:opacity-20">
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="currentColor" 
                strokeDasharray="4 4" 
                strokeWidth={1} 
              />
              <text 
                x={paddingLeft - 8} 
                y={y + 4} 
                textAnchor="end" 
                className="text-[10px] font-black fill-slate-400 dark:fill-zinc-500"
              >
                ₹{labelVal}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {fillD && <path d={fillD} fill="url(#chartGradient)" />}

        {/* Plot path */}
        {pathD && (
          <path 
            d={pathD} 
            fill="none" 
            stroke="#10b981" 
            strokeWidth={3} 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}

        {/* X Axis Labels */}
        {data.map((d, idx) => {
          const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
          return (
            <text
              key={idx}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="text-[9px] font-extrabold fill-slate-400 dark:fill-zinc-500"
            >
              {d.label}
            </text>
          );
        })}

        {/* Data Circles */}
        {points.map((pt, idx) => (
          <circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r={hoveredPoint?.label === pt.label ? 6 : 4}
            className="fill-white stroke-[#10b981] stroke-[3px] transition-all cursor-pointer"
            onMouseEnter={() => setHoveredPoint({ x: pt.x, y: pt.y, val: pt.value, label: pt.label })}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredPoint && (
        <div 
          className="absolute z-20 bg-slate-900/90 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg pointer-events-none shadow-md backdrop-blur-xs flex flex-col items-center border border-white/10"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 45}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <span>{hoveredPoint.label}</span>
          <span className="text-emerald-400">₹{hoveredPoint.val}</span>
        </div>
      )}
    </div>
  );
}

export function CategoryBarChart({ data, height = 200 }: LineChartProps) {
  const { t } = useLanguage();
  if (data.length === 0) return <div className="text-center text-slate-400 py-10 font-bold">{t('no_data')}</div>;

  const maxVal = Math.max(...data.map(d => d.value), 10);
  const width = 500;
  const paddingLeft = 50;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const barWidth = Math.min(40, (chartWidth / data.length) * 0.5);
  const barGap = (chartWidth - barWidth * data.length) / (data.length - 1 || 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
      {/* Horizontal grid guide */}
      {[0, 0.5, 1].map((ratio, i) => {
        const y = paddingTop + ratio * chartHeight;
        const labelVal = Math.round(maxVal - ratio * maxVal);
        return (
          <g key={i} className="opacity-30 dark:opacity-10">
            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth={1} />
            <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[10px] font-black fill-slate-400 dark:fill-zinc-500">
              {labelVal}
            </text>
          </g>
        );
      })}

      {/* Render Bars */}
      {data.map((d, idx) => {
        const x = paddingLeft + idx * (barWidth + barGap);
        const barHeight = (d.value / maxVal) * chartHeight;
        const y = paddingTop + chartHeight - barHeight;

        return (
          <g key={idx} className="group">
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              className="fill-emerald-500 dark:fill-emerald-600 opacity-90 group-hover:opacity-100 transition-all cursor-pointer"
            />
            {/* Value on top of bar */}
            <text
              x={x + barWidth / 2}
              y={y - 5}
              textAnchor="middle"
              className="text-[9px] font-black fill-slate-600 dark:fill-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {d.value}
            </text>
            {/* Category label */}
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              className="text-[9px] font-extrabold fill-slate-400 dark:fill-zinc-500 capitalize"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function OrdersDonutChart({ data }: { data: ChartDataPoint[] }) {
  const { t } = useLanguage();
  if (data.length === 0) return <div className="text-center text-slate-400 py-10 font-bold">{t('no_data')}</div>;

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 50;
  const circ = 2 * Math.PI * radius;
  const center = 60;
  
  // Custom theme colors for categories
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      {/* SVG Donut Circle */}
      <svg className="w-32 h-32 transform -rotate-90 overflow-visible" viewBox="0 0 120 120">
        {data.map((d, idx) => {
          const percentage = d.value / total;
          const strokeLength = percentage * circ;
          const strokeOffset = circ - (accumulatedPercent * circ);
          accumulatedPercent += percentage;
          
          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={colors[idx % colors.length]}
              strokeWidth={14}
              strokeDasharray={`${strokeLength} ${circ}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-500 hover:stroke-[16px] cursor-pointer"
            />
          );
        })}
        {/* Center label */}
        <g className="transform rotate-90 origin-[60px_60px]">
          <text x={center} y={center - 2} textAnchor="middle" className="text-[10px] font-extrabold fill-slate-400 dark:fill-zinc-500">
            {t('total').toUpperCase()}
          </text>
          <text x={center} y={center + 12} textAnchor="middle" className="text-[15px] font-black fill-slate-800 dark:fill-zinc-100">
            {total}
          </text>
        </g>
      </svg>

      {/* Legends list */}
      <div className="space-y-1.5 text-left">
        {data.map((d, idx) => (
          <div key={idx} className="flex items-center gap-2.5">
            <span 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span className="text-[11px] font-black text-slate-700 dark:text-zinc-300 capitalize">{d.label}</span>
            <span className="text-[11px] font-bold text-slate-400">({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
