import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ProcessedData } from '../types';

interface VisaoGeralProps {
    data: ProcessedData[];
}

export const VisaoGeral: React.FC<VisaoGeralProps> = ({ data }) => {

    // Agrega os dados por curso para montar o gráfico
    const dadosDoGrafico = useMemo(() => {
        if (!data || data.length === 0) {
            return [];
        }

        const dadosAgregados = data.reduce((acc, item) => {
            const curso = item.Curso || 'Não especificado';

            if (!acc[curso]) {
                acc[curso] = {
                    curso: curso,
                    entregues: 0,
                    pendentes: 0,
                    atrasadas: 0,
                };
            }

            if (item.isEntregueNoPrazo) acc[curso].entregues++;
            else if (item.isPendente) acc[curso].pendentes++;
            else if (item.isAtrasado) acc[curso].atrasadas++;

            return acc;
        }, {} as Record<string, { curso: string; entregues: number; pendentes: number; atrasadas: number }>);

        return Object.values(dadosAgregados);

    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-800 p-3 rounded border border-gray-600 shadow-lg text-sm">
                    <p className="font-bold text-white mb-2">{label}</p>
                    {payload.map((entry: any) => (
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
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={dadosDoGrafico}
                            layout="vertical" // Gráfico de barras horizontais, melhor para nomes longos de curso
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis type="number" stroke="#9ca3af" />
                            <YAxis type="category" dataKey="curso" stroke="#9ca3af" width={150} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}/>
                            <Legend />
                            <Bar dataKey="entregues" name="Entregues no Prazo" stackId="a" fill="#22c55e" />
                            <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill="#f59e0b" />
                            <Bar dataKey="atrasadas" name="Atrasadas" stackId="a" fill="#ef4444" />
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