import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../contexts/DataContext'; // Importar useDataContext
import { ProcessedData, DocentePerformance } from '../types'; // Importar DocentePerformance
import { LoadingScreen } from './LoadingScreen'; // Importar LoadingScreen
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
        } else {
            // Limpar rankings se não houver dados filtrados
            setTopDocentesMelhorPerformance([]);
            setTopDocentesPontosAtencao([]);
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

            {relatorioGerado && (
                <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Resultado do Relatório</h3>
                    {relatorioGerado.length > 0 ? (
                        <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-sm overflow-x-auto">
                            {JSON.stringify(relatorioGerado, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-slate-600 dark:text-gray-400">Nenhum dado encontrado para os filtros selecionados para o relatório bruto.</p>
                    )}
                </div>
            )}

            {/* Seção de Rankings */}
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
        </div>
    );
};

// Export default para lazy loading na rota, se necessário
export default RelatorioPeriodo;
