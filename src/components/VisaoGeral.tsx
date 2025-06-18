// src/components/VisaoGeral.tsx

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { ProcessedData } from '../types';
s
interface VisaoGeralProps {
    data: ProcessedData[];
}

export const VisaoGeral: React.FC<VisaoGeralProps> = ({ data }) => {

    const dadosDoGrafico = useMemo(() => {
        if (!data || data.length === 0) {
            return [];
        }
        const dadosAgregados = data.reduce((acc, item) => {
            const curso = item.Curso || 'Não especificado';
            if (!acc[curso]) {
                acc[curso] = { curso: curso, entregues: 0, pendentes: 0, atrasadas: 0, total: 0 };
            }
            if (item.isEntregueNoPrazo) acc[curso].entregues++;
            else if (item.isPendente) acc[curso].pendentes++;
            else if (item.isAtrasado) acc[curso].atrasadas++;
            acc[curso].total++;
            return acc;
        }, {} as Record<string, { curso: string; entregues: number; pendentes: number; atrasadas: number; total: number }>);
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
    
    // ALTERAÇÃO 1: Componente para renderizar os rótulos apenas se o valor for > 0
    const renderCustomizedLabel = (props: any) => {
        const { x, y, width, height, value } = props;
        if (value > 0) {
            return (
                <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight="bold">
                    {value}
                </text>
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
                <div style={{ width: '100%', height: 500 }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={dadosDoGrafico}
                            layout="vertical"
                            barCategoryGap="30%"
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }} // Adiciona margem para os rótulos não cortarem
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis type="number" hide={true} />
                            
                            {/* ALTERAÇÃO 2: Aumentado o espaço para os nomes dos cursos */}
                            <YAxis 
                                type="category" 
                                dataKey="curso" 
                                stroke="#9ca3af" 
                                width={350} // Aumentado de 200 para 350
                                tick={{ fontSize: 12, fill: '#d1d5db' }} 
                            />
                            
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}/>
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            {/* ALTERAÇÃO 3: Adicionados rótulos individuais e trocadas as cores/nomes */}
                            <Bar dataKey="entregues" name="Entregues no Prazo" stackId="a" fill="#22c55e">
                                <LabelList dataKey="entregues" content={renderCustomizedLabel} />
                            </Bar>

                            <Bar dataKey="atrasadas" name="Entregue com Atraso" stackId="a" fill="#f59e0b">
                                <LabelList dataKey="atrasadas" content={renderCustomizedLabel} />
                            </Bar>
                            
                            <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill="#ef4444">
                                <LabelList dataKey="pendentes" content={renderCustomizedLabel} />
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