import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
    data: Record<string, number>;
}

// Hàm hỗ trợ cắt ngắn nhãn quá dài để biểu đồ gọn gàng
const formatAxisLabel = (value: string) => {
    if (value.length > 15) return `${value.substring(0, 12)}...`;
    return value;
};

export const TrendRadarChart: React.FC<Props> = ({ data }) => {
    const chartData = Object.entries(data).map(([domain, count]) => ({
        subject: domain,
        A: count,
        fullMark: Math.max(...Object.values(data)) + 2,
    }));

    return (
        <div className="w-full h-[500px] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                    <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" />
                    <PolarAngleAxis 
                        dataKey="subject" 
                        tickFormatter={formatAxisLabel}
                        tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} 
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar
                        name="Research Intensity"
                        dataKey="A"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="#3b82f6"
                        fillOpacity={0.3}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '16px', 
                            backgroundColor: '#1e293b', 
                            color: '#f8fafc',
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)' 
                        }}
                        itemStyle={{ color: '#60a5fa' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};