import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../contexts/DataContext'; // Importar useDataContext
import { ProcessedData, DocentePerformance, IKpisPeriodo, CursoPerformance, DisciplinaPerformance } from '../types'; // Importar DisciplinaPerformance
import { LoadingScreen } from './LoadingScreen'; // Importar LoadingScreen
import { KpiCard } from './ui/KpiCard'; // Importar KpiCard
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Input } from "@/components/ui/input"; // Para datas, se não usar type="date"

// Removida MOCK_MODALIDADES, pois agora são extraídas de availableData (simulatedAllData)
// const MOCK_MODALIDADES = ['EAD', 'Presencial', 'Híbrido', 'Modular']; 

export const RelatorioPeriodo: React.FC = () => {
    const navigate = useNavigate();
    const { allData, isLoading, error: dataError } = useDataContext(); // Consumir DataContext

    // Proteção de Rota: Apenas Admin
    useEffect(() => {
        const storedUserRole = localStorage.getItem('userRole');
        if (storedUserRole !== 'admin') {
            console.warn("[RelatorioPeriodo] Acesso não autorizado. Redirecionando...");
            navigate('/'); // Redireciona para a página inicial se não for admin
        }
    }, [navigate]);
    
    // Estados locais para os filtros e resultados do relatório
    const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString()); // Default para o ano atual
    const [semestreFiltro, setSemestreFiltro] = useState<string>('0'); // '0' para Ambos, '1' para 1º, '2' para 2º
    const [modalidadeSelecionada, setModalidadeSelecionada] = useState<string>('Todas');
    const [relatorioGerado, setRelatorioGerado] = useState<ProcessedData[] | null>(null); // Dados brutos filtrados
    const [topDocentesMelhorPerformance, setTopDocentesMelhorPerformance] = useState<DocentePerformance[]>([]);
    const [topDocentesPontosAtencao, setTopDocentesPontosAtencao] = useState<DocentePerformance[]>([]);
    const [kpisPeriodo, setKpisPeriodo] = useState<IKpisPeriodo | null>(null); // Estado para os KPIs gerais
    const [topCursosMelhorPerformance, setTopCursosMelhorPerformance] = useState<CursoPerformance[]>([]);
    const [topCursosPontosAtencao, setTopCursosPontosAtencao] = useState<CursoPerformance[]>([]);
    const [topDisciplinasProblematicas, setTopDisciplinasProblematicas] = useState<DisciplinaPerformance[]>([]);

    // Usar allData do contexto.
    const availableData = allData; 

    const modalidadesUnicas = useMemo(() => {
        // Extrai modalidades únicas dos dados reais (allData)
        // Filtra valores vazios ou nulos de modalidade e ordena
        return [...new Set(availableData.map(item => item.Modalidade).filter(Boolean).sort())] as string[];
    }, [availableData]);

    const handleGerarRelatorio = () => {
        console.log("Gerando relatório com os seguintes filtros:");
        console.log("Ano Selecionado:", anoSelecionado);
        console.log("Filtro de Semestre:", semestreFiltro); // "0" para Ambos, "1" para 1º, "2" para 2º
        console.log("Modalidade:", modalidadeSelecionada);

        if (!anoSelecionado) {
            alert("Por favor, informe o Ano.");
            return;
        }
        
        const dadosFiltrados = availableData.filter(item => {
            const modalidadeMatch = modalidadeSelecionada === 'Todas' || item.Modalidade === modalidadeSelecionada;
            
            let semestreMatch = false;
            if (item.Semestre) { // Verificar se item.Semestre existe
                if (semestreFiltro === '0') { // Ambos os semestres
                    semestreMatch = item.Semestre.startsWith(`${anoSelecionado}_`);
                } else { // 1º ou 2º semestre específico
                    semestreMatch = item.Semestre === `${anoSelecionado}_${semestreFiltro}`;
                }
            }
            
            return modalidadeMatch && semestreMatch;
        });

        console.log("Dados filtrados para o relatório (Ano/Semestre):", dadosFiltrados);
        setRelatorioGerado(dadosFiltrados); // Mantém os dados brutos filtrados, se necessário para outros fins

        if (dadosFiltrados.length > 0) {
            const performances = calcularPerformanceDocentes(dadosFiltrados);

            // Top 5 Melhor Performance (menor % de atraso)
            // Ordena por porcentagemAtraso ascendente, depois por totalAtividades descendente (para desempate, mais atividades é melhor)
            const melhores = [...performances].sort((a, b) => {
                if (a.porcentagemAtraso !== b.porcentagemAtraso) {
                    return a.porcentagemAtraso - b.porcentagemAtraso;
                }
                return b.totalAtividades - a.totalAtividades; // Maior número de atividades como desempate positivo
            }).slice(0, 5);
            setTopDocentesMelhorPerformance(melhores);

            // Top 5 Pontos de Atenção (maior % de atraso)
            // Ordena por porcentagemAtraso descendente, depois por totalAtividades descendente (para desempate)
            // Considerar apenas docentes com um número mínimo de atividades para este ranking pode ser útil no futuro.
            const pontosAtencao = [...performances].sort((a, b) => {
                if (b.porcentagemAtraso !== a.porcentagemAtraso) {
                    return b.porcentagemAtraso - a.porcentagemAtraso;
                }
                return b.totalAtividades - a.totalAtividades; // Maior número de atividades como desempate (mais impacto)
            }).slice(0, 5);
            setTopDocentesPontosAtencao(pontosAtencao);

            console.log("Top 5 Melhores:", melhores);
            console.log("Top 5 Atenção:", pontosAtencao);

            // Calcular e setar KPIs gerais do período
            const kpisCalculados = calcularKpisGerais(dadosFiltrados);
            setKpisPeriodo(kpisCalculados);
            console.log("KPIs do Período Calculados:", kpisCalculados);

            // Calcular e setar rankings de Cursos
            const performancesCursos = calcularPerformanceCursos(dadosFiltrados);

            const melhoresCursos = [...performancesCursos].sort((a, b) => {
                if (a.porcentagemAtrasoCurso !== b.porcentagemAtrasoCurso) {
                    return a.porcentagemAtrasoCurso - b.porcentagemAtrasoCurso;
                }
                return b.totalAtividadesCurso - a.totalAtividadesCurso; // Desempate: mais atividades é melhor
            }).slice(0, 5);
            setTopCursosMelhorPerformance(melhoresCursos);

            const pontosAtencaoCursos = [...performancesCursos].sort((a, b) => {
                if (b.porcentagemAtrasoCurso !== a.porcentagemAtrasoCurso) {
                    return b.porcentagemAtrasoCurso - a.porcentagemAtrasoCurso;
                }
                return b.totalAtividadesCurso - a.totalAtividadesCurso; // Desempate: mais atividades é mais impacto
            }).slice(0, 5);
            setTopCursosPontosAtencao(pontosAtencaoCursos);

            console.log("Top 5 Cursos Melhores:", melhoresCursos);
            console.log("Top 5 Cursos Atenção:", pontosAtencaoCursos);

            // Calcular e setar ranking de Disciplinas Problemáticas
            const performanceDisciplinas = calcularPerformanceDisciplinas(dadosFiltrados);
            const problematicasDisciplinas = [...performanceDisciplinas].sort((a, b) => {
                // Ordenar por totalProblematicas descendente
                if (b.totalProblematicas !== a.totalProblematicas) {
                    return b.totalProblematicas - a.totalProblematicas;
                }
                // Desempate: maior porcentagem problemática primeiro
                if (b.porcentagemProblematicas !== a.porcentagemProblematicas) {
                    return b.porcentagemProblematicas - a.porcentagemProblematicas;
                }
                // Desempate final: maior número total de atividades na disciplina
                return b.totalAtividadesDisciplina - a.totalAtividadesDisciplina;
            }).slice(0, 5);
            setTopDisciplinasProblematicas(problematicasDisciplinas);
            console.log("Top 5 Disciplinas Problemáticas:", problematicasDisciplinas);

        } else {
            // Limpar rankings e KPIs se não houver dados filtrados
            setTopDocentesMelhorPerformance([]);
            setTopDocentesPontosAtencao([]);
            setKpisPeriodo(null);
            setTopCursosMelhorPerformance([]); 
            setTopCursosPontosAtencao([]);
            setTopDisciplinasProblematicas([]); 
        }
    };

    const calcularPerformanceDocentes = (dados: ProcessedData[]): DocentePerformance[] => {
        if (!dados || dados.length === 0) {
            return [];
        }

        const performanceMap: Map<string, { totalAtividades: number, totalAtrasadas: number }> = new Map();

        dados.forEach(item => {
            if (!item.Docente) return; // Pular se não houver docente

            const docenteStats = performanceMap.get(item.Docente) || { totalAtividades: 0, totalAtrasadas: 0 };
            
            docenteStats.totalAtividades += 1;
            if (item.isAtrasado) {
                docenteStats.totalAtrasadas += 1;
            }
            performanceMap.set(item.Docente, docenteStats);
        });

        const performances: DocentePerformance[] = [];
        performanceMap.forEach((stats, nomeDocente) => {
            const porcentagemAtraso = stats.totalAtividades > 0 ? (stats.totalAtrasadas / stats.totalAtividades) * 100 : 0;
            performances.push({
                nomeDocente,
                totalAtividades: stats.totalAtividades,
                totalAtrasadas: stats.totalAtrasadas,
                porcentagemAtraso,
            });
        });

        return performances;
    };

    const calcularKpisGerais = (dados: ProcessedData[]): IKpisPeriodo | null => {
        if (!dados || dados.length === 0) {
            return null;
        }

        const totalAtividadesConsideradas = dados.length;
        let totalEntreguesNoPrazo = 0;
        let totalEntreguesComAtraso = 0;
        let totalPendentes = 0;
        let somaDiasAtraso = 0;
        let countAtividadesRealmenteAtrasadasParaMedia = 0;

        dados.forEach(item => {
            if (item.isEntregueNoPrazo) {
                totalEntreguesNoPrazo++;
            }
            if (item.isAtrasado && !item.isPendente) { // Considera apenas entregues com atraso para esta contagem
                totalEntreguesComAtraso++;
            }
            if (item.isPendente) {
                totalPendentes++;
            }
            // Para a média de dias de atraso, consideramos apenas atividades entregues com atraso
            // e que tenham um valor de diasCalculado positivo.
            // Ou, se pendentes e atrasadas, também podem contribuir para uma "média de dias de pendência/atraso".
            // Vamos focar em 'entregues com atraso' por enquanto para mediaDiasAtraso.
            if (item.isAtrasado && !item.isPendente && item.diasCalculado && item.diasCalculado > 0) {
                somaDiasAtraso += item.diasCalculado;
                countAtividadesRealmenteAtrasadasParaMedia++;
            }
        });

        const porcentagemEntreguesNoPrazo = totalAtividadesConsideradas > 0 ? (totalEntreguesNoPrazo / totalAtividadesConsideradas) * 100 : 0;
        const porcentagemComAtraso = totalAtividadesConsideradas > 0 ? (totalEntreguesComAtraso / totalAtividadesConsideradas) * 100 : 0;
        const porcentagemPendentes = totalAtividadesConsideradas > 0 ? (totalPendentes / totalAtividadesConsideradas) * 100 : 0;
        const mediaDiasAtraso = countAtividadesRealmenteAtrasadasParaMedia > 0 ? somaDiasAtraso / countAtividadesRealmenteAtrasadasParaMedia : 0;

        return {
            totalAtividadesConsideradas,
            totalEntreguesNoPrazo,
            totalEntreguesComAtraso,
            totalPendentes,
            porcentagemEntreguesNoPrazo,
            porcentagemComAtraso,
            porcentagemPendentes,
            mediaDiasAtraso,
        };
    };

    const calcularPerformanceCursos = (dados: ProcessedData[]): CursoPerformance[] => {
        if (!dados || dados.length === 0) {
            return [];
        }

        const performanceMap: Map<string, { totalAtividadesCurso: number, totalAtrasadasCurso: number }> = new Map();

        dados.forEach(item => {
            if (!item.Curso) return; // Pular se não houver curso no item

            const cursoStats = performanceMap.get(item.Curso) || { totalAtividadesCurso: 0, totalAtrasadasCurso: 0 };
            
            cursoStats.totalAtividadesCurso += 1;
            if (item.isAtrasado) {
                cursoStats.totalAtrasadasCurso += 1;
            }
            performanceMap.set(item.Curso, cursoStats);
        });

        const performances: CursoPerformance[] = [];
        performanceMap.forEach((stats, nomeCurso) => {
            const porcentagemAtrasoCurso = stats.totalAtividadesCurso > 0 ? (stats.totalAtrasadasCurso / stats.totalAtividadesCurso) * 100 : 0;
            performances.push({
                nomeCurso,
                totalAtividadesCurso: stats.totalAtividadesCurso,
                totalAtrasadasCurso: stats.totalAtrasadasCurso,
                porcentagemAtrasoCurso,
            });
        });

        return performances;
    };

    const calcularPerformanceDisciplinas = (dados: ProcessedData[]): DisciplinaPerformance[] => {
        if (!dados || dados.length === 0) {
            return [];
        }

        const performanceMap: Map<string, { 
            totalAtividadesDisciplina: number; 
            totalPendentes: number; 
            totalEntreguesComAtraso: number;
        }> = new Map();

        dados.forEach(item => {
            if (!item.Disciplina) return; 

            const disciplinaStats = performanceMap.get(item.Disciplina) || { 
                totalAtividadesDisciplina: 0, 
                totalPendentes: 0,
                totalEntreguesComAtraso: 0,
            };
            
            disciplinaStats.totalAtividadesDisciplina += 1;
            if (item.isPendente) {
                disciplinaStats.totalPendentes += 1;
            } else if (item.isAtrasado) { // Se não é pendente, mas é atrasado, então foi entregue com atraso
                disciplinaStats.totalEntreguesComAtraso += 1;
            }
            // Nota: Uma atividade pendente que também está atrasada (isPendente && isAtrasado)
            // é contada em totalPendentes. Não a contamos duplamente em totalEntreguesComAtraso.
            performanceMap.set(item.Disciplina, disciplinaStats);
        });

        const performances: DisciplinaPerformance[] = [];
        performanceMap.forEach((stats, nomeDisciplina) => {
            const totalProblematicas = stats.totalPendentes + stats.totalEntreguesComAtraso;
            const porcentagemProblematicas = stats.totalAtividadesDisciplina > 0 
                ? (totalProblematicas / stats.totalAtividadesDisciplina) * 100 
                : 0;
            
            performances.push({
                nomeDisciplina,
                totalAtividadesDisciplina: stats.totalAtividadesDisciplina,
                totalPendentes: stats.totalPendentes,
                totalEntreguesComAtraso: stats.totalEntreguesComAtraso,
                totalProblematicas,
                porcentagemProblematicas,
            });
        });

        return performances;
    };
    
    // A função interna useDataProcessorNoFetch foi completamente removida 
    // para resolver erros de TypeScript e simplificar o componente nesta fase.
    // A integração com os dados reais e o processamento centralizado serão feitos posteriormente.

    if (isLoading) {
        return <LoadingScreen message="Carregando dados para o relatório..." />;
    }

    if (dataError) {
        return (
            <div className="flex items-center justify-center h-screen bg-red-100 text-red-700 p-4">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Erro ao Carregar Dados para o Relatório</h1>
                    <p className="mb-4">{dataError}</p>
                    <p>Verifique se os dados principais da aplicação foram carregados corretamente.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6 bg-gray-100 dark:bg-[#0f172a] text-slate-800 dark:text-gray-200 min-h-screen">
            <header className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Relatório do Período</h2>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                    Selecione o intervalo de datas e a modalidade para gerar o relatório consolidado.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                <div>
                    <label htmlFor="ano-relatorio" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Ano:</label>
                    <input 
                        type="number" // Usar type="number" para melhor UX, mas tratar como string no estado
                        id="ano-relatorio"
                        placeholder="Ex: 2024"
                        value={anoSelecionado}
                        onChange={(e) => setAnoSelecionado(e.target.value)}
                        className="block w-full px-3 py-1.5 text-sm rounded-md shadow-sm bg-white border-gray-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:placeholder-gray-400 dark:focus:ring-cyan-600 dark:focus:border-cyan-600"
                    />
                </div>
                <div>
                    <label htmlFor="semestre-relatorio" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Semestre:</label>
                    <select 
                        id="semestre-relatorio"
                        value={semestreFiltro}
                        onChange={(e) => setSemestreFiltro(e.target.value)}
                        className="block w-full px-3 py-1.5 text-sm rounded-md shadow-sm bg-white border-gray-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:placeholder-gray-400 dark:focus:ring-cyan-600 dark:focus:border-cyan-600"
                    >
                        <option value="0">Ambos os Semestres</option>
                        <option value="1">1º Semestre</option>
                        <option value="2">2º Semestre</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="modalidade-relatorio" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Modalidade:</label>
                    <select 
                        id="modalidade-relatorio"
                        value={modalidadeSelecionada}
                        onChange={(e) => setModalidadeSelecionada(e.target.value)}
                        className="block w-full px-3 py-1.5 text-sm rounded-md shadow-sm bg-white border-gray-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:placeholder-gray-400 dark:focus:ring-cyan-600 dark:focus:border-cyan-600"
                    >
                        <option value="Todas">Todas as Modalidades</option>
                        {modalidadesUnicas.map(mod => (
                            <option key={mod} value={mod}>{mod}</option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={handleGerarRelatorio}
                    className="w-full md:w-auto px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                >
                    Gerar Relatório
                </button>
            </div>

            {/* KPIs Gerais do Período */}
            {kpisPeriodo && (
            <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Resumo Geral do Período</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <KpiCard 
                        titulo="Total de Atividades" 
                        valor={kpisPeriodo.totalAtividadesConsideradas} 
                    />
                    <KpiCard 
                        titulo="% Entregues no Prazo" 
                        valor={kpisPeriodo.porcentagemEntreguesNoPrazo.toFixed(1)}
                        unidade="%"
                        corValor={kpisPeriodo.porcentagemEntreguesNoPrazo >= 70 ? 'text-green-500 dark:text-green-400' : kpisPeriodo.porcentagemEntreguesNoPrazo >= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}
                        descricao={`${kpisPeriodo.totalEntreguesNoPrazo} atividades`}
                    />
                    <KpiCard 
                        titulo="% Entregues com Atraso" 
                        valor={kpisPeriodo.porcentagemComAtraso.toFixed(1)}
                        unidade="%"
                        corValor={kpisPeriodo.porcentagemComAtraso > 20 ? 'text-red-500 dark:text-red-400' : kpisPeriodo.porcentagemComAtraso > 10 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-700 dark:text-white'}
                        descricao={`${kpisPeriodo.totalEntreguesComAtraso} atividades`}
                    />
                    <KpiCard 
                        titulo="% Pendentes" 
                        valor={kpisPeriodo.porcentagemPendentes.toFixed(1)}
                        unidade="%"
                        corValor={kpisPeriodo.porcentagemPendentes > 15 ? 'text-red-500 dark:text-red-400' : kpisPeriodo.porcentagemPendentes > 5 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-700 dark:text-white'}
                        descricao={`${kpisPeriodo.totalPendentes} atividades`}
                    />
                     <KpiCard 
                        titulo="Média Dias de Atraso" 
                        valor={kpisPeriodo.mediaDiasAtraso.toFixed(1)}
                        unidade="dias"
                        descricao="Para atividades entregues com atraso"
                        corValor={kpisPeriodo.mediaDiasAtraso > 7 ? 'text-red-500 dark:text-red-400' : kpisPeriodo.mediaDiasAtraso > 3 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-700 dark:text-white'}
                    />
                </div>
            </div>
            )}

            {/* Bloco de exibição do JSON bruto comentado */}
            {/* {relatorioGerado && (
                <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Resultado do Relatório Bruto (JSON)</h3>
                    {relatorioGerado.length > 0 ? (
                        <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-sm overflow-x-auto">
                            {JSON.stringify(relatorioGerado, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-slate-600 dark:text-gray-400">Nenhum dado encontrado para os filtros selecionados para o relatório bruto.</p>
                    )}
                </div>
            )} */}

            {/* Seção de Rankings */}
            {/* A condição para mostrar os rankings também depende de relatorioGerado, o que é bom. */}
            {relatorioGerado && relatorioGerado.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top 5 Melhor Performance */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Docentes (Menor % de Atraso)</h4>
                        {topDocentesMelhorPerformance.length > 0 ? (
                            <ul className="space-y-2">
                                {topDocentesMelhorPerformance.map((doc, index) => (
                                    <li key={index} className="text-sm text-slate-600 dark:text-gray-300 p-2 rounded bg-slate-50 dark:bg-slate-700/50">
                                        <span className="font-medium">{doc.nomeDocente}:</span> {doc.porcentagemAtraso.toFixed(2)}% de atraso 
                                        <span className="text-xs text-slate-500 dark:text-gray-400"> ({doc.totalAtrasadas}/{doc.totalAtividades} atividades)</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-gray-400">Não há dados suficientes para este ranking ou nenhum docente com atividades no período.</p>
                        )}
                    </div>

                    {/* Top 5 Pontos de Atenção */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Docentes (Maior % de Atraso)</h4>
                        {topDocentesPontosAtencao.length > 0 ? (
                            <ul className="space-y-2">
                                {topDocentesPontosAtencao.map((doc, index) => (
                                    <li key={index} className="text-sm text-slate-600 dark:text-gray-300 p-2 rounded bg-slate-50 dark:bg-slate-700/50">
                                        <span className="font-medium">{doc.nomeDocente}:</span> {doc.porcentagemAtraso.toFixed(2)}% de atraso
                                        <span className="text-xs text-slate-500 dark:text-gray-400"> ({doc.totalAtrasadas}/{doc.totalAtividades} atividades)</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-gray-400">Não há dados suficientes para este ranking ou nenhum docente com atividades no período.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Seção de Rankings de Cursos */}
            {relatorioGerado && relatorioGerado.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top 5 Cursos (Melhor Performance) */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Cursos (Menor % de Atraso)</h4>
                        {topCursosMelhorPerformance.length > 0 ? (
                            <ul className="space-y-2">
                                {topCursosMelhorPerformance.map((curso, index) => (
                                    <li key={index} className="text-sm text-slate-600 dark:text-gray-300 p-2 rounded bg-slate-50 dark:bg-slate-700/50">
                                        <span className="font-medium">{curso.nomeCurso}:</span> {curso.porcentagemAtrasoCurso.toFixed(2)}% de atraso
                                        <span className="text-xs text-slate-500 dark:text-gray-400"> ({curso.totalAtrasadasCurso}/{curso.totalAtividadesCurso} atividades)</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-gray-400">Não há dados suficientes para este ranking ou nenhum curso com atividades no período.</p>
                        )}
                    </div>

                    {/* Top 5 Cursos (Pontos de Atenção) */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Cursos (Maior % de Atraso)</h4>
                        {topCursosPontosAtencao.length > 0 ? (
                            <ul className="space-y-2">
                                {topCursosPontosAtencao.map((curso, index) => (
                                    <li key={index} className="text-sm text-slate-600 dark:text-gray-300 p-2 rounded bg-slate-50 dark:bg-slate-700/50">
                                        <span className="font-medium">{curso.nomeCurso}:</span> {curso.porcentagemAtrasoCurso.toFixed(2)}% de atraso
                                        <span className="text-xs text-slate-500 dark:text-gray-400"> ({curso.totalAtrasadasCurso}/{curso.totalAtividadesCurso} atividades)</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-gray-400">Não há dados suficientes para este ranking ou nenhum curso com atividades no período.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Seção de Ranking de Disciplinas Problemáticas */}
            {relatorioGerado && relatorioGerado.length > 0 && topDisciplinasProblematicas.length > 0 && (
                 <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Disciplinas (Mais Atividades Problemáticas)</h4>
                    <ul className="space-y-2">
                        {topDisciplinasProblematicas.map((disciplina, index) => (
                            <li key={index} className="text-sm text-slate-600 dark:text-gray-300 p-2 rounded bg-slate-50 dark:bg-slate-700/50">
                                <span className="font-medium">{disciplina.nomeDisciplina}:</span> {disciplina.totalProblematicas} atividades problemáticas 
                                <span className="text-xs text-slate-500 dark:text-gray-400"> ({disciplina.porcentagemProblematicas.toFixed(1)}% de {disciplina.totalAtividadesDisciplina} atividades)</span>
                                <br />
                                <span className="text-xs text-slate-500 dark:text-gray-400 ml-2">↳ Pendentes: {disciplina.totalPendentes}, Entregues com Atraso: {disciplina.totalEntreguesComAtraso}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
             {relatorioGerado && relatorioGerado.length > 0 && topDisciplinasProblematicas.length === 0 && (
                 <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-3">Top 5 Disciplinas (Mais Atividades Problemáticas)</h4>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Nenhuma disciplina com atividades problemáticas encontradas ou dados insuficientes.</p>
                </div>
            )}

        </div>
    );
};

// Export default para lazy loading na rota, se necessário
export default RelatorioPeriodo;
