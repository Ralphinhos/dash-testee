
import React, { useMemo, FC } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ProcessedData, DocenteStats } from '../types';

interface PerformanceAnalysisProps {
    data: ProcessedData[];
    onAnalysis: (prompt: string, title: string) => void;
    selectedDocente: string | null;
}

export const PerformanceAnalysis: FC<PerformanceAnalysisProps> = ({ data, onAnalysis, selectedDocente }) => {
    const { topPerformers, bottomPerformers, selectedDocenteStats } = useMemo(() => {
        const ranking = data.reduce((acc, row) => {
            if (!acc[row.Docente]) acc[row.Docente] = { entregue: 0, atrasado: 0, pendente: 0, total: 0, diasSemAcesso: 0 };
            acc[row.Docente].total++;
            if (row.isPendente) acc[row.Docente].pendente++;
            else if (row.isAtrasado) acc[row.Docente].atrasado++;
            else if (row.isEntregueNoPrazo) acc[row.Docente].entregue++;
           
            const dias = parseInt(row['Dias s/ Acesso'], 10) || 0;
            if (dias > acc[row.Docente].diasSemAcesso) {
                acc[row.Docente].diasSemAcesso = dias;
            }
            return acc;
        }, {} as Record<string, any>);

        const comScore: DocenteStats[] = Object.entries(ranking).map(([docente, stats]) => ({
            docente,
            stats,
            score: stats.total > 0 ? (stats.entregue / stats.total) * 100 : 0,
            criticality: stats.atrasado * 2 + stats.pendente
        }));

        const top = comScore.filter(d => d.score >= 60).sort((a, b) => b.score - a.score).slice(0, 5);
        const bottom = comScore.filter(d => d.score < 60).sort((a, b) => b.criticality - a.criticality).slice(0, 5);
        
        const selectedStats = selectedDocente ? comScore.find(d => d.docente === selectedDocente) : null;

        return { topPerformers: top, bottomPerformers: bottom, selectedDocenteStats: selectedStats };
    }, [data, selectedDocente]);

    const handleSummary = (type: 'top' | 'bottom') => {
        const list = type === 'top' ? topPerformers : bottomPerformers;
        const title = type === 'top' ? 'Análise de Top Performers' : 'Análise de Pontos de Atenção';
        const prompt = `Como gestor acadêmico, elabore um resumo sobre o seguinte grupo de docentes: ${JSON.stringify(list.map(p => ({docente: p.docente, score: p.score, stats: p.stats})))}. Para os de alta performance, destaque os pontos positivos. Para os que requerem atenção, detalhe as pendências e atrasos de forma clara e objetiva.`;
        onAnalysis(prompt, title);
    };

    const renderPerfCard = (docenteData: DocenteStats) => {
        const { docente, stats, score } = docenteData;
        const total = stats.total;
        const pEntregue = total > 0 ? (stats.entregue / total) * 100 : 0;
        const pAtrasado = total > 0 ? (stats.atrasado / total) * 100 : 0;
        const pPendente = total > 0 ? (stats.pendente / total) * 100 : 0;
        const shortenName = (name: string) => { 
            const parts = (name || "").trim().split(/\s+/); 
            return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name; 
        };

        return (
            <div key={docente} className="p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <span className="font-bold">{shortenName(docente)}</span>
                    <span className={`font-bold ${score >= 80 ? 'text-green-400' : 'text-amber-400'}`}>
                        {score.toFixed(0)}% no Prazo
                    </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2 flex">
                    <div className="bg-green-500 h-2.5 rounded-l-full" style={{ width: `${pEntregue}%` }}></div>
                    <div className="bg-amber-500 h-2.5" style={{ width: `${pAtrasado}%` }}></div>
                    <div className="bg-red-500 h-2.5 rounded-r-full" style={{ width: `${pPendente}%` }}></div>
                </div>
            </div>
        );
    };

    const renderPieChart = (docenteData: DocenteStats) => {
        const { stats } = docenteData;
        const chartData = [
            { name: 'Entregue', value: stats.entregue, color: '#22c55e' },
            { name: 'Atrasado', value: stats.atrasado, color: '#f59e0b' },
            { name: 'Pendente', value: stats.pendente, color: '#ef4444' }
        ].filter(item => item.value > 0);

        const shortenName = (name: string) => {
            const parts = (name || "").trim().split(/\s+/);
            return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
        };

        const CustomTooltip = ({ active, payload }: any) => {
            if (active && payload && payload.length) {
                const data = payload[0];
                return (
                    <div className="bg-gray-800 p-2 rounded border border-gray-600">
                        <p className="text-white">{`${data.name}: ${data.value}`}</p>
                    </div>
                );
            }
            return null;
        };

        return (
            <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="text-center mb-3">
                    <h4 className="font-bold text-white">{shortenName(docenteData.docente)}</h4>
                    <p className="text-sm text-gray-400">Total: {stats.total} atividades</p>
                </div>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1">
                    {chartData.map(item => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: item.color }}
                                ></div>
                                <span className="text-gray-300">{item.name}</span>
                            </div>
                            <span className="text-white font-medium">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card performance-card flex flex-col p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top 5 - Análise de Performance</h3>
                <div className="flex-grow overflow-y-auto space-y-4">
                    {topPerformers.length > 0 ? (
                        topPerformers.map(renderPerfCard)
                    ) : (
                        <p className="text-gray-400 text-center py-10">Nenhum docente com performance {'≥'} 60%.</p>
                    )}
                </div>
                {topPerformers.length > 0 && (
                    <div className="mt-4 text-center">
                        <button onClick={() => handleSummary('top')} className="btn-ai">✨ Gerar Resumo de Performance</button>
                    </div>
                )}
            </div>

            <div className="card attention-card flex flex-col p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    {selectedDocente ? `Detalhes: ${selectedDocente.split(' ')[0]} ${selectedDocente.split(' ').slice(-1)[0]}` : 'Top 5 - Pontos de Atenção'}
                </h3>
                <div className="flex-grow overflow-y-auto space-y-4">
                    {selectedDocenteStats ? (
                        <div className="space-y-4">
                            {renderPieChart(selectedDocenteStats)}
                            <div className="p-4 bg-gray-800/30 rounded-lg">
                                <h5 className="font-semibold text-white mb-2">Estatísticas Detalhadas</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-400">Taxa de Entrega:</span>
                                        <span className="text-green-400 font-medium ml-2">
                                            {selectedDocenteStats.score.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Criticidade:</span>
                                        <span className="text-orange-400 font-medium ml-2">
                                            {selectedDocenteStats.criticality}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Dias s/ Acesso:</span>
                                        <span className="text-red-400 font-medium ml-2">
                                            {selectedDocenteStats.stats.diasSemAcesso}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : bottomPerformers.length > 0 ? (
                        bottomPerformers.map(renderPerfCard)
                    ) : (
                        <p className="text-gray-400 text-center py-10">Nenhum docente com performance {'<'} 60%.</p>
                    )}
                </div>
                {!selectedDocenteStats && bottomPerformers.length > 0 && (
                    <div className="mt-4 text-center">
                        <button onClick={() => handleSummary('bottom')} className="btn-ai">✨ Gerar Resumo de Atenção</button>
                    </div>
                )}
            </div>
        </div>
    );
};
