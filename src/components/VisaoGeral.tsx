// src/components/VisaoGeral.tsx

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { ProcessedData } from '../types';

interface VisaoGeralProps {
    data: ProcessedData[];
}

// NOVIDADE 1: Componente customizado para quebrar o texto dos nomes dos cursos
const CustomizedYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const maxLineLength = 40; // Máximo de caracteres por linha
    const text = payload.value;

    if (text.length > maxLineLength) {
        // Divide o texto em múltiplas partes se for muito longo
        const parts = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        parts.forEach((part: string) => {
            if ((currentLine + ' ' + part).length > maxLineLength) {
                lines.push(currentLine);
                currentLine = part;
            } else {
                currentLine += (currentLine ? ' ' : '') + part;
            }
        });
        lines.push(currentLine);

        return (
            <g transform={`translate(${x},${y})`}>
                {lines.map((line, index) => (
                    <text key={index} x={0} y={index * 15} textAnchor="end" fill="#d1d5db" fontSize={12}>
                        {line}
                    </text>
                ))}
            </g>
        );
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} textAnchor="end" fill="#d1d5db" fontSize={12}>
                {text}
            </text>
        </g>
    );
};

// NOVIDADE 2: Rótulo inteligente que só aparece se houver espaço
const renderSmartLabel = (props: any) => {
    const { x, y, width, height, value, fill } = props;
    
    // Só renderiza o rótulo se o valor for maior que 0 e a barra tiver uma largura mínima
    if (value > 0 && width > 20) { 
        // Usa cor preta para fundos claros (amarelo) e branca para os outros
        const labelFill = (fill === '#f59e0b') ? '#000000' : '#ffffff';
        return (
            <text x={x + width / 2} y={y + height / 2} fill={labelFill} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight="bold">
                {value}
            </text>
        );
    }
    return null;
};


export const VisaoGeral: React.FC<VisaoGeralProps> = ({ data }) => {

    const dadosDoGrafico = useMemo(() => {
        if (!data || data.length === 0) return [];
        const dadosAgregados = data.reduce((acc, item) => {
            const curso = item.Curso || 'Não especificado';
            if (!acc[curso]) {
                acc[curso] = { curso: curso, entregues: 0, pendentes: 0, atrasadas: 0 };
            }
            if (item.isEntregueNoPrazo) acc[curso].entregues++;
            else if (item.isPendente) acc[curso].pendentes++;
            else if (item.isAtrasado) acc[curso].atrasadas++;
            return acc;
        }, {} as Record<string, { curso: string; entregues: number; pendentes: number; atrasadas: number;}>);
        return Object.values(dadosAgregados);
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-800 p-3 rounded border border-gray-600 shadow-lg text-sm">
                    <p className="font-bold text-white mb-2">{label}</p>
                    {payload.slice().reverse().map((entry: any) => (
                        <p key={entry.dataKey} style={{ color: entry.color }}>
                            {`${entry.name}: ${entry.value}`}
                        </p>
                    ))}
                    <p className="mt-2 pt-2 border-t border-gray-500 text-gray-300">
                        Total: {payload.reduce((sum: number, entry: any) => sum + entry.value, 0)} atividades
                    </p>
                </div>
            );
        }
        return null;
    };
    
    // NOVIDADE 3: Altura do gráfico calculada dinamicamente
    // 60px por barra + 80px para legendas e margens. Mínimo de 500px.
    const chartHeight = Math.max(500, dadosDoGrafico.length * 60 + 80);

    return (
        <div className="card p-6 mt-4">
            <h3 className="text-lg font-semibold text-white mb-4">
                Desempenho por Curso
            </h3>
            
            {dadosDoGrafico.length > 0 ? (
                // A altura agora é dinâmica
                <div style={{ width: '100%', height: chartHeight }}> 
                    <ResponsiveContainer>
                        <BarChart
                            data={dadosDoGrafico}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis type="number" hide={true} />
                            
                            <YAxis 
                                type="category" 
                                dataKey="curso" 
                                width={250} // Largura base para o eixo
                                tickLine={false}
                                axisLine={false}
                                // Usa nosso componente customizado para os nomes
                                tick={<CustomizedYAxisTick />} 
                            />
                            
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}/>
                            <Legend wrapperStyle={{ paddingTop: '30px' }} />

                            <Bar dataKey="entregues" name="Entregues no Prazo" stackId="a" fill="#22c55e">
                                <LabelList dataKey="entregues" content={renderSmartLabel} />
                            </Bar>

                            <Bar dataKey="atrasadas" name="Entregue com Atraso" stackId="a" fill="#f59e0b">
                                <LabelList dataKey="atrasadas" content={renderSmartLabel} />
                            </Bar>
                            
                            <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill="#ef4444">
                                <LabelList dataKey="pendentes" content={renderSmartLabel} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="text-gray-400 text-center py-10">
                    Selecione filtros de Semestre e Modalidade para visualizar os dados.
                </p>
            )}
        </div>
    );
};