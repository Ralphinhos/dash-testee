import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../contexts/DataContext';
import { ProcessedData, DocentePerformance, IKpisPeriodo, CursoPerformance, DisciplinaPerformance } from '../types';
import { LoadingScreen } from './LoadingScreen';
import { KpiCard } from './ui/KpiCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'; // Removido Legend e Cell se não usados

// Definição de cores para os gráficos
const COR_GRAFICO_POSITIVO = "#22c55e"; // green-500
const COR_GRAFICO_NEGATIVO = "#ef4444"; // red-500
const COR_GRAFICO_ATENCAO = "#f59e0b";  // amber-500
// const COR_GRAFICO_NEUTRO = "#64748b"; // slate-500 - Não usado ainda

export const RelatorioPeriodo: React.FC = () => {
    const navigate = useNavigate();
    const { allData, isLoading, error: dataError } = useDataContext();

    useEffect(() => {
        const storedUserRole = localStorage.getItem('userRole');
        if (storedUserRole !== 'admin') {
            navigate('/');
        }
    }, [navigate]);
    
    const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString());
    const [semestreFiltro, setSemestreFiltro] = useState<string>('0');
    const [modalidadeSelecionada, setModalidadeSelecionada] = useState<string>('Todas');
    const [relatorioGerado, setRelatorioGerado] = useState<ProcessedData[] | null>(null);
    const [topDocentesMelhorPerformance, setTopDocentesMelhorPerformance] = useState<DocentePerformance[]>([]);
    const [topDocentesPontosAtencao, setTopDocentesPontosAtencao] = useState<DocentePerformance[]>([]);
    const [kpisPeriodo, setKpisPeriodo] = useState<IKpisPeriodo | null>(null);
    const [topCursosMelhorPerformance, setTopCursosMelhorPerformance] = useState<CursoPerformance[]>([]);
    const [topCursosPontosAtencao, setTopCursosPontosAtencao] = useState<CursoPerformance[]>([]);
    const [topDisciplinasProblematicas, setTopDisciplinasProblematicas] = useState<DisciplinaPerformance[]>([]);

    const availableData = allData; 

    const modalidadesUnicas = useMemo(() => {
        return [...new Set(availableData.map(item => item.Modalidade).filter(Boolean).sort())] as string[];
    }, [availableData]);

    // maxPorcentagemDocentesMelhor e maxPorcentagemCursosMelhor foram removidos pois o XAxis.domain 
    // para os gráficos de melhor performance agora é [0, 'auto'] para quantidades.

    const handleGerarRelatorio = () => {
        if (!anoSelecionado) {
            alert("Por favor, informe o Ano.");
            return;
        }
        
        const dadosFiltrados = availableData.filter(item => {
            const modalidadeMatch = modalidadeSelecionada === 'Todas' || item.Modalidade === modalidadeSelecionada;
            let semestreMatch = false;
            if (item.Semestre) {
                if (semestreFiltro === '0') {
                    semestreMatch = item.Semestre.startsWith(`${anoSelecionado}_`);
                } else {
                    semestreMatch = item.Semestre === `${anoSelecionado}_${semestreFiltro}`;
                }
            }
            return modalidadeMatch && semestreMatch;
        });

        setRelatorioGerado(dadosFiltrados);

        if (dadosFiltrados.length > 0) {
            const performancesDocentes = calcularPerformanceDocentes(dadosFiltrados);
            // Ordenar por porcentagemEntreguesNoPrazo DESCENDENTE, depois por totalAtividades DESCENDENTE
            const melhoresDocentes = [...performancesDocentes].sort((a, b) => {
                if (b.porcentagemEntreguesNoPrazo !== a.porcentagemEntreguesNoPrazo) {
                    return b.porcentagemEntreguesNoPrazo - a.porcentagemEntreguesNoPrazo;
                }
                return b.totalAtividades - a.totalAtividades;
            }).slice(0, 5);
            setTopDocentesMelhorPerformance(melhoresDocentes);

            // Ranking de pontos de atenção continua baseado em porcentagemAtraso ASCENDENTE (maior % de atraso é pior)
            const pontosAtencaoDocentes = [...performancesDocentes].sort((a, b) => {
                if (b.porcentagemAtraso !== a.porcentagemAtraso) {
                    return b.porcentagemAtraso - a.porcentagemAtraso;
                }
                return b.totalAtividades - a.totalAtividades; // Maior número de atividades como desempate (mais impacto)
            }).slice(0, 5);
            setTopDocentesPontosAtencao(pontosAtencaoDocentes);

            const kpis = calcularKpisGerais(dadosFiltrados);
            setKpisPeriodo(kpis);

            const performancesCursos = calcularPerformanceCursos(dadosFiltrados);
            // Ordenar por porcentagemEntreguesNoPrazoCurso DESCENDENTE, depois por totalAtividadesCurso DESCENDENTE
            const melhoresCursos = [...performancesCursos].sort((a, b) => {
                if (b.porcentagemEntreguesNoPrazoCurso !== a.porcentagemEntreguesNoPrazoCurso) {
                    return b.porcentagemEntreguesNoPrazoCurso - a.porcentagemEntreguesNoPrazoCurso;
                }
                return b.totalAtividadesCurso - a.totalAtividadesCurso;
            }).slice(0, 5);
            setTopCursosMelhorPerformance(melhoresCursos);

            // Ranking de pontos de atenção para cursos continua baseado em porcentagemAtrasoCurso ASCENDENTE
            const pontosAtencaoCursos = [...performancesCursos].sort((a, b) => {
                if (b.porcentagemAtrasoCurso !== a.porcentagemAtrasoCurso) {
                    return b.porcentagemAtrasoCurso - a.porcentagemAtrasoCurso;
                }
                return b.totalAtividadesCurso - a.totalAtividadesCurso; // Maior número de atividades como desempate (mais impacto)
            }).slice(0, 5);
            setTopCursosPontosAtencao(pontosAtencaoCursos);

            const performanceDisciplinas = calcularPerformanceDisciplinas(dadosFiltrados);
            const problematicasDisciplinas = [...performanceDisciplinas].sort((a, b) => (b.totalProblematicas - a.totalProblematicas) || (b.porcentagemProblematicas - a.porcentagemProblematicas) || (b.totalAtividadesDisciplina - a.totalAtividadesDisciplina)).slice(0, 5);
            setTopDisciplinasProblematicas(problematicasDisciplinas);
        } else {
            setTopDocentesMelhorPerformance([]);
            setTopDocentesPontosAtencao([]);
            setKpisPeriodo(null);
            setTopCursosMelhorPerformance([]); 
            setTopCursosPontosAtencao([]);
            setTopDisciplinasProblematicas([]); 
        }
    };

    const calcularPerformanceDocentes = (dados: ProcessedData[]): DocentePerformance[] => {
        if (!dados || dados.length === 0) return [];
        const performanceMap: Map<string, { 
            totalAtividades: number; 
            totalAtrasadas: number;
            totalEntreguesNoPrazo: number;
        }> = new Map();

        dados.forEach(item => {
            if (!item.Docente) return;
            const stats = performanceMap.get(item.Docente) || { 
                totalAtividades: 0, 
                totalAtrasadas: 0,
                totalEntreguesNoPrazo: 0 
            };
            stats.totalAtividades++;
            if (item.isAtrasado) { // Note: isAtrasado pode ser true mesmo se isPendente for true
                stats.totalAtrasadas++;
            }
            if (item.isEntregueNoPrazo) {
                stats.totalEntreguesNoPrazo++;
            }
            performanceMap.set(item.Docente, stats);
        });

        const performances: DocentePerformance[] = [];
        performanceMap.forEach((stats, nomeDocente) => {
            const porcentagemAtraso = stats.totalAtividades > 0 ? (stats.totalAtrasadas / stats.totalAtividades) * 100 : 0;
            const porcentagemEntreguesNoPrazo = stats.totalAtividades > 0 ? (stats.totalEntreguesNoPrazo / stats.totalAtividades) * 100 : 0;
            performances.push({
                nomeDocente,
                totalAtividades: stats.totalAtividades,
                totalAtrasadas: stats.totalAtrasadas,
                porcentagemAtraso,
                totalEntreguesNoPrazo: stats.totalEntreguesNoPrazo,
                porcentagemEntreguesNoPrazo,
            });
        });
        return performances;
    };

    const calcularKpisGerais = (dados: ProcessedData[]): IKpisPeriodo | null => {
        if (!dados || dados.length === 0) return null;
        const totalAtividadesConsideradas = dados.length;
        let totalEntreguesNoPrazo = 0, totalEntreguesComAtraso = 0, totalPendentes = 0, somaDiasAtraso = 0, countAtividadesRealmenteAtrasadasParaMedia = 0;
        dados.forEach(item => {
            if (item.isEntregueNoPrazo) totalEntreguesNoPrazo++;
            if (item.isAtrasado && !item.isPendente) totalEntreguesComAtraso++;
            if (item.isPendente) totalPendentes++;
            if (item.isAtrasado && !item.isPendente && item.diasCalculado && item.diasCalculado > 0) {
                somaDiasAtraso += item.diasCalculado;
                countAtividadesRealmenteAtrasadasParaMedia++;
            }
        });
        return {
            totalAtividadesConsideradas, totalEntreguesNoPrazo, totalEntreguesComAtraso, totalPendentes,
            porcentagemEntreguesNoPrazo: totalAtividadesConsideradas > 0 ? (totalEntreguesNoPrazo / totalAtividadesConsideradas) * 100 : 0,
            porcentagemComAtraso: totalAtividadesConsideradas > 0 ? (totalEntreguesComAtraso / totalAtividadesConsideradas) * 100 : 0,
            porcentagemPendentes: totalAtividadesConsideradas > 0 ? (totalPendentes / totalAtividadesConsideradas) * 100 : 0,
            mediaDiasAtraso: countAtividadesRealmenteAtrasadasParaMedia > 0 ? somaDiasAtraso / countAtividadesRealmenteAtrasadasParaMedia : 0,
        };
    };

    const calcularPerformanceCursos = (dados: ProcessedData[]): CursoPerformance[] => {
        if (!dados || dados.length === 0) return [];
        const performanceMap: Map<string, { 
            totalAtividadesCurso: number; 
            totalAtrasadasCurso: number;
            totalEntreguesNoPrazoCurso: number;
        }> = new Map();

        dados.forEach(item => {
            if (!item.Curso) return;
            const stats = performanceMap.get(item.Curso) || { 
                totalAtividadesCurso: 0, 
                totalAtrasadasCurso: 0,
                totalEntreguesNoPrazoCurso: 0 
            };
            stats.totalAtividadesCurso++;
            if (item.isAtrasado) {
                stats.totalAtrasadasCurso++;
            }
            if (item.isEntregueNoPrazo) {
                stats.totalEntreguesNoPrazoCurso++;
            }
            performanceMap.set(item.Curso, stats);
        });

        const performances: CursoPerformance[] = [];
        performanceMap.forEach((stats, nomeCurso) => {
            const porcentagemAtrasoCurso = stats.totalAtividadesCurso > 0 ? (stats.totalAtrasadasCurso / stats.totalAtividadesCurso) * 100 : 0;
            const porcentagemEntreguesNoPrazoCurso = stats.totalAtividadesCurso > 0 ? (stats.totalEntreguesNoPrazoCurso / stats.totalAtividadesCurso) * 100 : 0;
            performances.push({
                nomeCurso,
                totalAtividadesCurso: stats.totalAtividadesCurso,
                totalAtrasadasCurso: stats.totalAtrasadasCurso,
                porcentagemAtrasoCurso,
                totalEntreguesNoPrazoCurso: stats.totalEntreguesNoPrazoCurso,
                porcentagemEntreguesNoPrazoCurso,
            });
        });
        return performances;
    };

    const calcularPerformanceDisciplinas = (dados: ProcessedData[]): DisciplinaPerformance[] => {
        if (!dados || dados.length === 0) return [];
        const map: Map<string, { totalAtividadesDisciplina: number, totalPendentes: number, totalEntreguesComAtraso: number }> = new Map();
        dados.forEach(item => {
            if (!item.Disciplina) return;
            const stats = map.get(item.Disciplina) || { totalAtividadesDisciplina: 0, totalPendentes: 0, totalEntreguesComAtraso: 0 };
            stats.totalAtividadesDisciplina++;
            if (item.isPendente) stats.totalPendentes++;
            else if (item.isAtrasado) stats.totalEntreguesComAtraso++;
            map.set(item.Disciplina, stats);
        });
        const performances: DisciplinaPerformance[] = [];
        map.forEach((stats, nomeDisciplina) => {
            const totalProblematicas = stats.totalPendentes + stats.totalEntreguesComAtraso;
            performances.push({
                nomeDisciplina, ...stats, totalProblematicas,
                porcentagemProblematicas: stats.totalAtividadesDisciplina > 0 ? (totalProblematicas / stats.totalAtividadesDisciplina) * 100 : 0,
            });
        });
        return performances;
    };

    if (isLoading) return <LoadingScreen message="Carregando dados para o relatório..." />;
    if (dataError) return <div className="p-4 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-md">Erro ao carregar dados: {dataError}</div>;

    // JSX do componente
    return (
        <div className="p-6 lg:p-8 space-y-6 bg-gray-100 dark:bg-[#0f172a] text-slate-800 dark:text-gray-200 min-h-screen">
            <header className="space-y-2 mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Relatório do Período</h2>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-500 bg-cyan-100 dark:bg-cyan-700/30 rounded-md hover:bg-cyan-200 dark:hover:bg-cyan-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        &larr; Voltar ao Painel Principal
                    </button>
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                    Selecione o ano, semestre e modalidade para gerar o relatório consolidado.
                </p>
            </header>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                <div>
                    <label htmlFor="ano-relatorio" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Ano:</label>
                    <input type="number" id="ano-relatorio" placeholder="Ex: 2024" value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)}
                        className="block w-full px-3 py-1.5 text-sm rounded-md shadow-sm bg-white border-gray-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:placeholder-gray-400 dark:focus:ring-cyan-600 dark:focus:border-cyan-600" />
                </div>
                <div>
                    <label htmlFor="semestre-relatorio" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Semestre:</label>
                    <select id="semestre-relatorio" value={semestreFiltro} onChange={(e) => setSemestreFiltro(e.target.value)}
                        className="block w-full px-3 py-1.5 text-sm rounded-md shadow-sm bg-white border-gray-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:placeholder-gray-400 dark:focus:ring-cyan-600 dark:focus:border-cyan-600">
                        <option value="0">Ambos os Semestres</option>
                        <option value="1">1º Semestre</option>
                        <option value="2">2º Semestre</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="modalidade-relatorio" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Modalidade:</label>
                    <select id="modalidade-relatorio" value={modalidadeSelecionada} onChange={(e) => setModalidadeSelecionada(e.target.value)}
                        className="block w-full px-3 py-1.5 text-sm rounded-md shadow-sm bg-white border-gray-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:placeholder-gray-400 dark:focus:ring-cyan-600 dark:focus:border-cyan-600">
                        <option value="Todas">Todas as Modalidades</option>
                        {modalidadesUnicas.map(mod => (<option key={mod} value={mod}>{mod}</option>))}
                    </select>
                </div>
                <button onClick={handleGerarRelatorio}
                    className="w-full md:w-auto px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800">
                    Gerar Relatório
                </button>
            </div>

            {/* KPIs Gerais do Período */}
            {kpisPeriodo && (
            <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Resumo Geral do Período</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <KpiCard titulo="Total de Atividades" valor={kpisPeriodo.totalAtividadesConsideradas} />
                    <KpiCard titulo="% Entregues no Prazo" valor={kpisPeriodo.porcentagemEntreguesNoPrazo.toFixed(1)} unidade="%" corValor={kpisPeriodo.porcentagemEntreguesNoPrazo >= 70 ? 'text-green-500 dark:text-green-400' : kpisPeriodo.porcentagemEntreguesNoPrazo >= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'} descricao={`${kpisPeriodo.totalEntreguesNoPrazo} atividades`} />
                    <KpiCard titulo="% Entregues com Atraso" valor={kpisPeriodo.porcentagemComAtraso.toFixed(1)} unidade="%" corValor={kpisPeriodo.porcentagemComAtraso > 20 ? 'text-red-500 dark:text-red-400' : kpisPeriodo.porcentagemComAtraso > 10 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-700 dark:text-white'} descricao={`${kpisPeriodo.totalEntreguesComAtraso} atividades`} />
                    <KpiCard titulo="% Pendentes" valor={kpisPeriodo.porcentagemPendentes.toFixed(1)} unidade="%" corValor={kpisPeriodo.porcentagemPendentes > 15 ? 'text-red-500 dark:text-red-400' : kpisPeriodo.porcentagemPendentes > 5 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-700 dark:text-white'} descricao={`${kpisPeriodo.totalPendentes} atividades`} />
                    <KpiCard titulo="Média Dias de Atraso" valor={kpisPeriodo.mediaDiasAtraso.toFixed(1)} unidade="dias" descricao="Para atividades entregues com atraso" corValor={kpisPeriodo.mediaDiasAtraso > 7 ? 'text-red-500 dark:text-red-400' : kpisPeriodo.mediaDiasAtraso > 3 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-700 dark:text-white'} />
                </div>
            </div>
            )}

            {/* Rankings de Docentes */}
            {relatorioGerado && relatorioGerado.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow min-h-[300px]">
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Docentes (Mais Entregas no Prazo)</h4>
                        {topDocentesMelhorPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart layout="vertical" data={topDocentesMelhorPerformance} margin={{ top: 5, right: 35, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    {/* XAxis agora para quantidades, não porcentagem */}
                                    <XAxis type="number" domain={[0, 'auto']} tick={{ fill: '#475569', fontSize: 10 }} /> 
                                    <YAxis type="category" dataKey="nomeDocente" width={150} tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                                    <Tooltip 
                                        formatter={(value: number, name: string, props: any) => {
                                            if (name === 'totalEntreguesNoPrazo') {
                                                return [
                                                    `${value} Ent. no Prazo (${props.payload.porcentagemEntreguesNoPrazo.toFixed(1)}%)`,
                                                    `Total Atividades: ${props.payload.totalAtividades}`
                                                ];
                                            }
                                            return [value, name];
                                        }}
                                        labelFormatter={(label: string) => <span style={{ fontWeight: '600', color: '#334155' }}>{label}</span>} 
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="totalEntreguesNoPrazo" fill={COR_GRAFICO_POSITIVO} barSize={20}>
                                        <LabelList dataKey="totalEntreguesNoPrazo" position="right" style={{ fill: '#166534', fontSize: 10 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<p className="text-sm text-slate-500 dark:text-gray-400">Não há dados suficientes para este ranking...</p>)}
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow min-h-[300px]">
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Docentes (Maior % de Atraso)</h4>
                        {topDocentesPontosAtencao.length > 0 ? (
                             <ResponsiveContainer width="100%" height={250}>
                                <BarChart layout="vertical" data={topDocentesPontosAtencao} margin={{ top: 5, right: 35, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value.toFixed(0)}%`} tick={{ fill: '#475569', fontSize: 10 }} />
                                    <YAxis type="category" dataKey="nomeDocente" width={150} tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                                    <Tooltip formatter={(value: number, name: string, props: any) => [`${value.toFixed(1)}% de Atraso`, `Total Atividades: ${props.payload.totalAtividades}`, `Atrasadas: ${props.payload.totalAtrasadas}`]} labelFormatter={(label: string) => <span style={{ fontWeight: '600', color: '#334155' }}>{label}</span>} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}/>
                                    <Bar dataKey="porcentagemAtraso" fill={COR_GRAFICO_NEGATIVO} barSize={20}>
                                        <LabelList dataKey="porcentagemAtraso" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fill: '#fef2f2', fontSize: 10 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<p className="text-sm text-slate-500 dark:text-gray-400">Não há dados suficientes para este ranking...</p>)}
                    </div>
                </div>
            )}

            {/* Rankings de Cursos */}
            {relatorioGerado && relatorioGerado.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow min-h-[300px]">
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Cursos (Mais Entregas no Prazo)</h4>
                        {topCursosMelhorPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart layout="vertical" data={topCursosMelhorPerformance} margin={{ top: 5, right: 35, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    {/* XAxis agora para quantidades, não porcentagem */}
                                    <XAxis type="number" domain={[0, 'auto']} tick={{ fill: '#475569', fontSize: 10 }} />
                                    <YAxis type="category" dataKey="nomeCurso" width={150} tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                                    <Tooltip 
                                        formatter={(value: number, name: string, props: any) => {
                                            if (name === 'totalEntreguesNoPrazoCurso') {
                                                return [
                                                    `${value} Ent. no Prazo (${props.payload.porcentagemEntreguesNoPrazoCurso.toFixed(1)}%)`,
                                                    `Total Atividades: ${props.payload.totalAtividadesCurso}`
                                                ];
                                            }
                                            return [value, name];
                                        }}
                                        labelFormatter={(label: string) => <span style={{ fontWeight: '600', color: '#334155' }}>{label}</span>} 
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="totalEntreguesNoPrazoCurso" fill={COR_GRAFICO_POSITIVO} barSize={20}>
                                        <LabelList dataKey="totalEntreguesNoPrazoCurso" position="right" style={{ fill: '#166534', fontSize: 10 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<p className="text-sm text-slate-500 dark:text-gray-400">Não há dados suficientes para este ranking...</p>)}
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow min-h-[300px]">
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Cursos (Maior % de Atraso)</h4>
                        {topCursosPontosAtencao.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart layout="vertical" data={topCursosPontosAtencao} margin={{ top: 5, right: 35, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value.toFixed(0)}%`} tick={{ fill: '#475569', fontSize: 10 }} />
                                    <YAxis type="category" dataKey="nomeCurso" width={150} tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                                    <Tooltip formatter={(value: number, name: string, props: any) => [`${value.toFixed(1)}% de Atraso`, `Total Atividades: ${props.payload.totalAtividadesCurso}`, `Atrasadas: ${props.payload.totalAtrasadasCurso}`]} labelFormatter={(label: string) => <span style={{ fontWeight: '600', color: '#334155' }}>{label}</span>} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}/>
                                    <Bar dataKey="porcentagemAtrasoCurso" fill={COR_GRAFICO_NEGATIVO} barSize={20}>
                                        <LabelList dataKey="porcentagemAtrasoCurso" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fill: '#fef2f2', fontSize: 10 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<p className="text-sm text-slate-500 dark:text-gray-400">Não há dados suficientes para este ranking...</p>)}
                    </div>
                </div>
            )}

            {/* Ranking de Disciplinas Problemáticas */}
            {relatorioGerado && relatorioGerado.length > 0 && (
                 <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow md:col-span-2 min-h-[300px]"> 
                    <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Disciplinas (Mais Atividades Problemáticas)</h4>
                    {topDisciplinasProblematicas.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart layout="vertical" data={topDisciplinasProblematicas} margin={{ top: 5, right: 35, left: 100, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} />
                                <YAxis type="category" dataKey="nomeDisciplina" width={150} tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                                <Tooltip 
                                    formatter={(value: number, name: string, props: any) => {
                                        if (name === 'totalProblematicas') { 
                                            return [
                                                `${value} atividades (${props.payload.porcentagemProblematicas.toFixed(1)}%)`, 
                                                `Problemáticas (Pend: ${props.payload.totalPendentes}, Atras: ${props.payload.totalEntreguesComAtraso})`
                                            ];
                                        }
                                        return [value, name];
                                    }}
                                    labelFormatter={(label: string) => <span style={{ fontWeight: '600', color: '#334155' }}>{label}</span>}
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                        color: '#334155', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '0.5rem', 
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
                                    }}
                                />
                                <Bar dataKey="totalProblematicas" fill={COR_GRAFICO_ATENCAO} barSize={20}>
                                    <LabelList dataKey="totalProblematicas" position="right" style={{ fill: '#b45309', fontSize: 10 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-gray-400">Nenhuma disciplina com atividades problemáticas encontradas ou dados insuficientes.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default RelatorioPeriodo;
