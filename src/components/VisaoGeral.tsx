// src/components/VisaoGeral.tsx

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { ProcessedData } from '../types';

interface VisaoGeralProps {
    data: ProcessedData[];
}

// ALTERAÇÃO 3: Rótulo agora exibe TODOS os valores maiores que 0, sem verificar o tamanho da barra.
const renderSmartLabel = (props: any) => {
    const { x, y, width, height, value, fill } = props;
    
    // A condição "height > 15" foi removida.
    if (value > 0) { 
        const labelFill = (fill === '#f59e0b') ? '#000000' : '#ffffff';
        // Ajustado o posicionamento vertical para um centro mais preciso.
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
    
    return (
        <div className="card p-6 mt-4">
            <h3 className="text-lg font-semibold text-white mb-4">
                Desempenho por Curso
            </h3>
            
            {dadosDoGrafico.length > 0 ? (
                <div style={{ width: '100%', height: '600px' }}> 
                    <ResponsiveContainer>
                        <BarChart
                            data={dadosDoGrafico}
                            margin={{ top: 20, right: 30, left: 20, bottom: 150 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            
                            <XAxis 
                                dataKey="curso" 
                                type="category"
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                tick={{ fontSize: 12, fill: '#d1d5db' }}
                            />
                            
                            {/* ALTERAÇÃO 2: Eixo Y (valores numéricos) agora está oculto */}
                            <YAxis 
                                type="number"
                                stroke="#9ca3af"
                                tick={{ fontSize: 12 }}
                                hide={true} 
                            />
                            
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}/>
                            
                            {/* ALTERAÇÃO 1: Legenda movida para o topo para evitar sobreposição */}
                            <Legend 
                                verticalAlign="top" 
                                align="right" 
                                wrapperStyle={{ top: -10 }} 
                            />

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