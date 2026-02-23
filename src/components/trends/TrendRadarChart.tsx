/**
 * @file TrendRadarChart.tsx
 * @description Interactive radar chart for visualizing domain distribution in trend analysis.
 *
 * This component renders a Recharts radar chart that displays:
 * - Domain distribution as a filled polygon
 * - Clickable axis labels for exploring references
 * - Responsive design with tooltip support
 */

import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

/**
 * Props for the TrendRadarChart component.
 */
interface Props {
    /** Map of domain names to paper counts (e.g., { "NLP": 45, "CV": 30 }). */
    data: Record<string, number>;
    /** Callback fired when a domain axis is clicked. */
    onAxisClick: (domain: string) => void;
}

/**
 * Helper function to truncate long domain labels for cleaner chart display.
 *
 * @param value - The domain name to format
 * @returns Truncated label if longer than 15 characters, otherwise the original value
 */
const formatAxisLabel = (value: string) => {
    if (value.length > 15) return `${value.substring(0, 12)}...`;
    return value;
};

/**
 * TrendRadarChart component displays domain distribution as an interactive radar chart.
 *
 * Features:
 * - **Interactive Axes**: Click on domain labels or the radar area to view references
 * - **Responsive Design**: Adapts to container size with ResponsiveContainer
 * - **Visual Polish**: Custom grid styling, tooltips, and click handlers
 *
 * @param props - Component props
 * @param props.data - Domain distribution data
 * @param props.onAxisClick - Callback for axis click events
 *
 * @returns The TrendRadarChart JSX
 *
 * @example
 * ```tsx
 * <TrendRadarChart
 *   data={{ "NLP": 45, "CV": 30, "Robotics": 10 }}
 *   onAxisClick={(domain) => setSelectedDomain(domain)}
 * />
 * ```
 */
export const TrendRadarChart: React.FC<Props> = ({ data, onAxisClick }) => {
    const chartData = Object.entries(data).map(([domain, count]) => ({
        subject: domain,
        A: count,
        fullMark: Math.max(...Object.values(data)) + 2,
    }));

    return (
        <div className="w-full h-[500px] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-inner overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartData}>
                    <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tickFormatter={formatAxisLabel}
                        onClick={(data) => data && onAxisClick(data.value)}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar
                        name="Papers"
                        dataKey="A"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="#3b82f6"
                        fillOpacity={0.3}
                        onClick={(data: any) => {
                            if (data && data.payload && data.payload.subject) {
                                onAxisClick(data.payload.subject);
                            }
                        }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '16px', backgroundColor: '#1e293b', border: 'none', color: '#fff' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};