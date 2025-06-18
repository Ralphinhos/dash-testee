import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProcessedData, FilterState } from '../types';

interface VisaoGeralProps {
    data: ProcessedData[];
    filtrosAtuais: FilterState;
}

export const VisaoGeral: React.FC<VisaoGeralProps> = ({ data, filtrosAtuais }) => {
    const [cursoFiltro, setCursoFiltro] = useState('Todos');

    // Filtra os dados com base na modalidade (do filtro principal) e no curso (deste componente)
    const dadosParaGrafico = useMemo(() => {
        if (!filtrosAtuais.modalidade || filtrosAtuais.modalidade === 'Todos') {
            return [];
        }

        return data.filter(item => 
            item.Modalidade === filtrosAtuais.modalidade &&
            (cursoFiltro === 'Todos' || item.Curso === cursoFiltro)
        );
    }, [data, filtrosAtuais.modalidade, cursoFiltro]);

    // Calcula os totais para o gráfico
    const totais = useMemo(() => {
        const resultado = {
            entregues: dadosParaGrafico.filter(d => d.isEntregueNoPrazo).length,
            pendentes: dadosParaGrafico.filter(d => d.isPendente).length,
            atrasadas: dadosParaGrafico.filter(d => d.isAtrasado).length,
        };
        return resultado;
    }, [dadosParaGrafico]);

    // Prepara os dados para o componente PieChart
    const chartData = [
        { name: 'Entregues no Prazo', value: totais.entregues, color: '#22c55e' },
        { name: 'Pendentes', value: totais.pendentes, color: '#f59e0b' },
        { name: 'Atrasadas', value: totais.atrasadas, color: '#ef4444' },
    ].filter(entry => entry.value > 0); // Mostra apenas se houver valor
    
    // Pega as opções de curso disponíveis para a modalidade selecionada
    const opcoesDeCurso = useMemo(() => {
        if (!filtrosAtuais.modalidade || filtrosAtuais.modalidade === 'Todos') return [];
        return [...new Set(data.filter(item => item.Modalidade === filtrosAtuais.modalidade && item.Curso).map(item => item.Curso))].sort();
    }, [data, filtrosAtuais.modalidade]);


    return (
        <div className="card p-6 mt-4">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-white">
                    Visão Geral de {filtrosAtuais.modalidade} {cursoFiltro !== 'Todos' ? `- ${cursoFiltro}` : ''}
                </h3>
                {/* Filtro de Curso */}
                <div className="flex items-center gap-2">
                    <label htmlFor="filtro-curso-geral" className="text-sm font-medium text-gray-400">Filtrar por Curso:</label>
                    <select 
                        id="filtro-curso-geral"
                        value={cursoFiltro} 
                        onChange={(e) => setCursoFiltro(e.target.value)}
                        className="filter-select"
                        disabled={opcoesDeCurso.length === 0}
                    >
                        <option value="Todos">Todos os Cursos</option>
                        {opcoesDeCurso.map(curso => <option key={curso} value={curso}>{curso}</option>)}
                    </select>
                </div>
            </div>

            {dadosParaGrafico.length > 0 ? (
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                return (
                                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                        {`${(percent * 100).toFixed(0)}%`}
                                    </text>
                                );
                            }}>
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} atividade(s)`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="text-gray-400 text-center py-10">
                    Selecione uma modalidade no filtro principal para visualizar o gráfico.
                </p>
            )}
        </div>
    );
};