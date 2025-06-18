import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { ProcessedData } from '../types';

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
                    {payload.slice().reverse().map((entry: any) => ( // Inverte para mostrar Atrasadas > Pendentes > Entregues
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
                <div style={{ width: '100%', height: 500 }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={dadosDoGrafico}
                            layout="vertical"
                            // AJUSTE 1: Aumenta o espaçamento entre as barras
                            barCategoryGap="30%"
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            
                            {/* AJUSTE 2: Eixo X (numérico) removido */}
                            <XAxis type="number" hide={true} />
                            
                            <YAxis 
                                type="category" 
                                dataKey="curso" 
                                stroke="#9ca3af" 
                                width={200}
                                // AJUSTE 3: Diminui a fonte dos nomes dos cursos
                                tick={{ fontSize: 12 }} 
                            />
                            
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}/>
                            <Legend />

                            <Bar dataKey="entregues" name="Entregues no Prazo" stackId="a" fill="#22c55e" />
                            <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill="#f59e0b" />
                            <Bar dataKey="atrasadas" name="Atrasadas" stackId="a" fill="#ef4444">
                                {/* AJUSTE 4: Rótulo com o total de atividades na barra */}
                                <LabelList 
                                    dataKey="total" 
                                    position="right" 
                                    style={{ fill: 'white', fontSize: 12, fontWeight: 'bold' }} 
                                />
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