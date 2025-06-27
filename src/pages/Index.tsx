import React, { useState, useEffect, useMemo } from 'react';
import { useDataContext } from '../contexts/DataContext'; // Importar useDataContext
// import { useDataProcessor } from '../hooks/useDataProcessor'; // Será removido se processData não for mais usado
import { LoadingScreen } from '../components/LoadingScreen';
import { AIModal } from '../components/AIModal';
import { Sidebar } from '../components/Sidebar';
import { FilterControls } from '../components/FilterControls';
import { AccessTable } from '../components/AccessTable';
import { ActivitiesTable } from '../components/ActivitiesTable';
import { PerformanceAnalysis } from '../components/PerformanceAnalysis';
import { VisaoGeral } from '../components/VisaoGeral';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessedData, FilterState, KPIData, Coordinator } from '../types';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, FileText } from 'lucide-react'; // Adicionado FileText
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import useIdleTimer from '../hooks/useIdleTimer';

export default function Index() {
    // 1. Hooks e Contexto
    const navigate = useNavigate();
    const { allData, isLoading, error: dataError } = useDataContext(); // Consumir DataContext
    // const { processData } = useDataProcessor(); // Removido, pois o fetch está no DataProvider
    const [userRole, setUserRole] = useState<string | null>(null);

    // 2. Definições de estado local (filtros, UI)
    const [filteredData, setFilteredData] = useState<ProcessedData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState('');
    const [filters, setFilters] = useState<FilterState>({ semestre: 'Todos', modalidade: 'Todos', modulo: 'Todos', curso: 'Todos' });
    const [selectedDocente, setSelectedDocente] = useState<string | null>(null);
    
    // GOOGLE_SHEET_URL removido, pois o fetch é feito no DataProvider
    const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        setUserRole(role);
    }, []);

    // 3. Definições de callbacks estáveis
    const handleLogout = React.useCallback(() => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loggedInCoordinator');
        localStorage.removeItem('coordinatorCourses');
        localStorage.removeItem('loggedInCoordinatorUsername');
        localStorage.removeItem('userRole'); // Adicionado para limpar userRole
        navigate('/login');
    }, [navigate]);

    // 4. Hooks que podem depender de callbacks ou estados (como useIdleTimer)
    const IDLE_TIMEOUT = 1 * 60 * 1000; // 1 minuto
    useIdleTimer(IDLE_TIMEOUT, handleLogout);

    // useEffect para carregar dados foi removido, pois agora é gerenciado pelo DataProvider.
    // O GOOGLE_SHEET_URL e useDataProcessor() também foram removidos das definições do componente.

    // Este useEffect agora reage a mudanças em `allData` do contexto para inicializar `filteredData`
    // ou quando os filtros são aplicados.
    useEffect(() => {
        if (!isLoading && allData.length > 0) {
            // Se os filtros estiverem no estado inicial ("Todos"),
            // e a modalidade for "Todos", filteredData deve ser vazio para aguardar seleção.
            // Caso contrário, se houver dados e não houver modalidade selecionada,
            // podemos popular filteredData com allData para que baseDataForView funcione,
            // e o useEffect de filtros subsequente cuidará de limpar se necessário.
            // No entanto, a lógica atual de filtros já define filteredData como [] se modalidade for 'Todos'.
            // Vamos garantir que, se não houver modalidade selecionada, filteredData comece vazio.
             if (filters.modalidade === 'Todos') {
                setFilteredData([]);
            } else {
                // Se uma modalidade já estiver selecionada (ex: vinda de um estado persistido ou default diferente de 'Todos')
                // e os dados carregaram, o useEffect de filtros abaixo irá processar.
                // Para uma carga inicial onde filtros podem não ter sido aplicados ainda pela UI,
                // e allData acabou de chegar, precisamos de uma base para baseDataForView.
                // A lógica de filtro subsequente é a principal fonte da verdade para filteredData.
                // Este bloco pode ser simplificado ou removido se o useEffect de filtros for suficiente.
                // Por ora, vamos deixar que o próximo useEffect lide com a população de filteredData.
            }
        } else if (!isLoading && allData.length === 0 && !dataError) {
            // Dados carregados, mas vazios e sem erro (pode ser uma planilha vazia)
            setFilteredData([]);
        }
    }, [allData, isLoading, dataError, filters.modalidade]);


    const baseDataForView = useMemo(() => {
        if (userRole === 'admin') {
            return allData;
        }
        // Para coordenador, ou se userRole ainda não estiver definido (fallback seguro)
        const loggedInCoordinatorUsername = localStorage.getItem('loggedInCoordinatorUsername');
        const coordinatorCoursesStr = localStorage.getItem('coordinatorCourses');
        if (!loggedInCoordinatorUsername || !coordinatorCoursesStr) return [];
        
        let coordinatorCourses: string[] = [];
        try {
            coordinatorCourses = JSON.parse(coordinatorCoursesStr);
        } catch (e) {
            console.error("Erro ao parsear coordinatorCourses em Index.tsx:", e);
            return [];
        }
        if (coordinatorCourses.length === 0) return [];

        return allData.filter(row => 
            row.Login === loggedInCoordinatorUsername && coordinatorCourses.includes(row.Curso)
        );
    }, [allData, userRole]);

    useEffect(() => {
        // Modificado para que os dados só sejam filtrados se uma modalidade for selecionada.
        if (filters.modalidade === 'Todos') {
            setFilteredData([]); // Nenhum dado se nenhuma modalidade específica for selecionada
        } else {
            // Se uma modalidade foi selecionada, então aplicamos os outros filtros.
            // O filtro de semestre ainda precisa ser considerado. Se "Todos" para semestre, não filtra por semestre.
            const appliedFiltersResult = baseDataForView.filter(row =>
                (filters.semestre === 'Todos' || row.Semestre === filters.semestre) &&
                (row.Modalidade === filters.modalidade) && // Modalidade já é específica aqui
                (filters.modulo === 'Todos' || row['Módulo'] === filters.modulo) &&
                (filters.curso === 'Todos' || row.Curso === filters.curso)
            );
            setFilteredData(appliedFiltersResult);
        }
        setSelectedDocente(null);
    }, [filters, baseDataForView, userRole]);

    const filterOptions = useMemo(() => {
        // As opções de filtro são sempre baseadas em baseDataForView, que já considera o userRole
        const semestres = [...new Set(baseDataForView.map(item => item.Semestre).filter(Boolean))].sort();
        const modalidades = [...new Set(baseDataForView.map(item => item.Modalidade).filter(Boolean))].sort();
        let modulos: string[] = [];
        let cursos: string[] = [];
        const baseParaModulosECursos = filters.modalidade === 'Todos'
            ? baseDataForView
            : baseDataForView.filter(item => item.Modalidade === filters.modalidade);
        modulos = [...new Set(baseParaModulosECursos.map(item => item['Módulo']).filter(Boolean))].sort();
        cursos = [...new Set(baseParaModulosECursos.map(item => item.Curso).filter(Boolean))].sort();
        return { semestres, modalidades, modulos, cursos };
    }, [baseDataForView, filters.modalidade]);

    const kpis = useMemo((): KPIData => {
        const initialKpiState: KPIData = {
            totalPendentesModalidade: 0,
            totalAtrasadasModalidade: 0,
            docenteMaiorMediaAtraso: null,
            docenteMaisPendencias: null,
            docenteMenosAcesso: null,
            pendentes: 0, // Fallback/geral - pode ser removido se não usado
            atrasadas: 0, // Fallback/geral - pode ser removido se não usado
        };

        if (filters.modalidade === 'Todos' || filteredData.length === 0) {
            // Se "Todas as Modalidades" ou não há dados filtrados, retorna KPIs zerados/nulos
            // Os KPIs gerais de pendentes/atrasadas podem ser calculados sobre baseDataForView aqui se desejado,
            // mas a instrução é que todos os 5 principais dependem de uma modalidade específica.
            // Para manter simples, vamos zerar tudo se não houver modalidade específica.
            // Se quiser mostrar totais gerais de 'pendentes' e 'atrasadas' mesmo com "Todas Modalidades",
            // eles seriam calculados sobre 'baseDataForView' e colocados em 'pendentes' e 'atrasadas'.
            // Por ora, seguindo a regra de depender da modalidade para os 5 KPIs:
            return initialKpiState;
        }

        // Declarar variáveis locais com nomes correspondentes às chaves de KPIData
        let totalPendentesModalidade = 0;
        let totalAtrasadasModalidade = 0;
        let docenteMaiorMediaAtraso: KPIData['docenteMaiorMediaAtraso'] = null;
        let docenteMaisPendencias: KPIData['docenteMaisPendencias'] = null;
        let docenteMenosAcesso: KPIData['docenteMenosAcesso'] = null;

        // Cálculos principais
        // 1. Total Pendentes Modalidade
        totalPendentesModalidade = filteredData.filter(r => r.isPendente).length;

        // 2. Total Atrasadas Modalidade
        totalAtrasadasModalidade = filteredData.filter(r => r.isAtrasado).length;
        
        // 3. Docente com Maior Média de Atraso
        const atividadesAtrasadas = filteredData.filter(r => r.isAtrasado && r.diasCalculado > 0);
        if (atividadesAtrasadas.length > 0) {
            const docentesComAtraso: Record<string, { totalDiasAtraso: number; countAtrasos: number }> = 
                atividadesAtrasadas.reduce((acc, curr) => {
                    acc[curr.Docente] = acc[curr.Docente] || { totalDiasAtraso: 0, countAtrasos: 0 };
                    acc[curr.Docente].totalDiasAtraso += curr.diasCalculado;
                    acc[curr.Docente].countAtrasos += 1;
                    return acc;
                }, {} as Record<string, { totalDiasAtraso: number; countAtrasos: number }>);

            let maiorMedia = -1;
            let nomeDocenteComMaiorMedia = null; // Renomeado para clareza

            for (const nomeDocenteKey in docentesComAtraso) { // Usar nomeDocenteKey para evitar conflito
                const mediaDocente = docentesComAtraso[nomeDocenteKey].totalDiasAtraso / docentesComAtraso[nomeDocenteKey].countAtrasos;
                if (mediaDocente > maiorMedia) {
                    maiorMedia = mediaDocente;
                    nomeDocenteComMaiorMedia = nomeDocenteKey;
                }
            }
            if (nomeDocenteComMaiorMedia) {
                docenteMaiorMediaAtraso = { nome: nomeDocenteComMaiorMedia, mediaDias: Math.round(maiorMedia) };
            }
        }
        
        // 4. Docente com Mais Pendências
        const atividadesPendentes = filteredData.filter(r => r.isPendente);
        if (atividadesPendentes.length > 0) {
            const pendenciasPorDocente: Record<string, number> = atividadesPendentes.reduce((acc, curr) => {
                acc[curr.Docente] = (acc[curr.Docente] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            let maxPendenciasCount = 0; // Renomeado
            let nomeDocenteComMaisPend = null; // Renomeado
            for (const nomeDocenteKey in pendenciasPorDocente) { // Usar nomeDocenteKey
                if (pendenciasPorDocente[nomeDocenteKey] > maxPendenciasCount) {
                    maxPendenciasCount = pendenciasPorDocente[nomeDocenteKey];
                    nomeDocenteComMaisPend = nomeDocenteKey;
                }
            }
            if (nomeDocenteComMaisPend) {
                docenteMaisPendencias = { nome: nomeDocenteComMaisPend, quantidade: maxPendenciasCount };
            }
        }

        // 5. Docente com Menos Acesso
        if (filteredData.length > 0) {
            const dadosDiasAcesso: Record<string, { totalDias: number; countEntradas: number; maxDiasIndividual: number; disciplinaDestaque: string }> = {};

            filteredData.forEach(row => {
                const diasAcesso = row['Dias s/ Acesso'];
                if (typeof diasAcesso === 'number') {
                    dadosDiasAcesso[row.Docente] = dadosDiasAcesso[row.Docente] || { 
                        totalDias: 0, 
                        countEntradas: 0, 
                        maxDiasIndividual: -1, 
                        disciplinaDestaque: '' 
                    };
                    dadosDiasAcesso[row.Docente].totalDias += diasAcesso;
                    dadosDiasAcesso[row.Docente].countEntradas += 1;
                    if (diasAcesso > dadosDiasAcesso[row.Docente].maxDiasIndividual) {
                        dadosDiasAcesso[row.Docente].maxDiasIndividual = diasAcesso;
                        dadosDiasAcesso[row.Docente].disciplinaDestaque = row.Disciplina;
                    }
                }
            });

            let nomeDocenteMenosAcessoGlobal: string | null = null; // Renomeado
            let maiorMaxDiasIndividualGlobal = -1; // Renomeado

            for (const nomeDocenteKey in dadosDiasAcesso) { // Usar nomeDocenteKey
                if (dadosDiasAcesso[nomeDocenteKey].maxDiasIndividual > maiorMaxDiasIndividualGlobal) {
                    maiorMaxDiasIndividualGlobal = dadosDiasAcesso[nomeDocenteKey].maxDiasIndividual;
                    nomeDocenteMenosAcessoGlobal = nomeDocenteKey;
                }
            }

            if (nomeDocenteMenosAcessoGlobal && dadosDiasAcesso[nomeDocenteMenosAcessoGlobal]) {
                const infoDocente = dadosDiasAcesso[nomeDocenteMenosAcessoGlobal];
                const mediaDiasSemAcesso = infoDocente.countEntradas > 0 
                    ? Math.round(infoDocente.totalDias / infoDocente.countEntradas) 
                    : 0;
                // Atribuição à variável local correta
                docenteMenosAcesso = { 
                    nome: nomeDocenteMenosAcessoGlobal,
                    mediaDiasSemAcesso: mediaDiasSemAcesso,
                    disciplinaDestaque: infoDocente.disciplinaDestaque,
                    diasDisciplinaDestaque: Math.round(infoDocente.maxDiasIndividual)
                };
            }
        }

        return {
            totalPendentesModalidade: Math.round(totalPendentesModalidade),
            totalAtrasadasModalidade: Math.round(totalAtrasadasModalidade),
            docenteMaiorMediaAtraso, 
            docenteMaisPendencias,   
            docenteMenosAcesso,      
            pendentes: Math.round(totalPendentesModalidade),
            atrasadas: Math.round(totalAtrasadasModalidade),
        };
    }, [filteredData, filters.modalidade]);

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value, ...(key === 'modalidade' && { modulo: 'Todos', curso: 'Todos'}) }));
    };

    const handleDocenteSelect = (docente: string) => {
        setSelectedDocente(selectedDocente === docente ? null : docente);
    };
   
    const handleNotification = async (action: string) => {
        if (filteredData.length === 0) { // Usará o filteredData do useState, que pode estar vazio ou com allData
            alert('Nenhum dado selecionado. Por favor, aplique os filtros de Semestre e Modalidade primeiro.');
            return;
        }
        setIsModalOpen(true);
        setModalTitle('Enviando Notificação');
        setModalContent('Processando e enviando e-mails...');
        try {
            const dadosParaEnvio = { action: action, dadosDetalhados: filteredData };
            const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify(dadosParaEnvio)
            });
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            const result = await response.json();
            setModalContent(`✅ ${result.message}`);
        } catch (error: any) {
            console.error('Erro ao enviar notificação:', error);
            setModalContent(`❌ Erro ao enviar notificação:\n\n${error.message}`);
        }
    };

    if (isLoading) { // isLoading agora vem do DataContext
        return <LoadingScreen message="Carregando dados da aplicação..." />;
    }

    if (dataError) { // Tratar erro do DataContext
        return (
            <div className="flex items-center justify-center h-screen bg-red-100 text-red-700 p-4">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Erro ao Carregar Dados</h1>
                    <p className="mb-4">{dataError}</p>
                    <p>Por favor, verifique a URL da planilha e sua conexão, ou contate o suporte.</p>
                    {/* Opcionalmente, um botão para tentar recarregar, se fetchData for exposto pelo context */}
                    {/* {fetchData && <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Tentar Novamente</button>} */}
                </div>
            </div>
        );
    }

    // Se não está carregando e não há erro, mas allData está vazio (ex: planilha vazia ou filtro inicial muito restritivo)
    // Esta verificação pode ser mais específica dependendo do comportamento desejado
    // if (allData.length === 0 && !Object.values(filters).some(f => f !== 'Todos')) {
    // A lógica de filteredData já cuida de mostrar "Nenhum docente encontrado" nas tabelas se estiver vazio.
    // }


    return (
        <div className="flex h-screen bg-[#0f172a] font-sans overflow-hidden">
            <style>{`
                :root { 
                    --scrollbar-thumb: #475569; 
                    --scrollbar-track: transparent; 
                }
                html.dark {
                    --scrollbar-thumb: #374151;
                }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: var(--scrollbar-track); }
                ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #64748b; }
                html.dark ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
                .table-container { height: calc(30vh); min-height: 200px; }
                .status-badge { font-size: 0.75rem; line-height: 1rem; font-weight: 500; padding: 0.25rem 0.625rem; border-radius: 9999px; white-space: nowrap; }
            `}</style>
            <Sidebar kpis={kpis} userRole={userRole} onNotification={handleNotification} /> {/* Passando onNotification novamente */}
            <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto bg-gray-100 dark:bg-[#0f172a] text-slate-800 dark:text-gray-200">
                <header className="space-y-4">
                    <div className="flex justify-between items-center gap-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Acompanhamento de Disciplinas - Docente</h2>
                        <div className="flex items-center gap-2 md:gap-4">
                            {userRole === 'admin' && (
                                <button
                                    onClick={() => navigate('/relatorio-periodo')}
                                    title="Relatório do Período"
                                    className="p-2 rounded-md text-slate-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <FileText size={20} />
                                </button>
                            )}
                            <ThemeSwitcher />
                            <button
                                onClick={handleLogout}
                                title="Sair"
                                className="p-2 rounded-md text-slate-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <FilterControls filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} />
                    </div>
                </header>
                <Tabs defaultValue="detalhado" className="w-full">
                    <TabsList className="bg-transparent p-0 gap-4">
                        <TabsTrigger 
                            value="detalhado" 
                            className="px-4 py-2 rounded-md text-sm font-medium transition-all 
                                       text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 
                                       hover:bg-slate-100 dark:hover:bg-slate-800
                                       data-[state=active]:bg-cyan-500 dark:data-[state=active]:bg-cyan-600 
                                       data-[state=active]:text-white dark:data-[state=active]:text-white 
                                       data-[state=active]:border-cyan-500 dark:data-[state=active]:border-cyan-600"
                        >
                            Visão Detalhada
                        </TabsTrigger>
                        <TabsTrigger 
                            value="geral" 
                            className="px-4 py-2 rounded-md text-sm font-medium transition-all 
                                       text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 
                                       hover:bg-slate-100 dark:hover:bg-slate-800
                                       data-[state=active]:bg-cyan-500 dark:data-[state=active]:bg-cyan-600 
                                       data-[state=active]:text-white dark:data-[state=active]:text-white 
                                       data-[state=active]:border-cyan-500 dark:data-[state=active]:border-cyan-600"
                        >
                            Visão Geral
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="detalhado">
                        <div className="grid grid-cols-1 gap-6 mt-4">
                           <AccessTable data={filteredData} />
                            <ActivitiesTable 
                                data={filteredData} 
                                onDocenteSelect={handleDocenteSelect}
                                selectedDocente={selectedDocente}
                            />
                            <PerformanceAnalysis 
                                data={filteredData} 
                                onAnalysis={() => {}} 
                                selectedDocente={selectedDocente}
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="geral">
                        <VisaoGeral data={filteredData} />
                    </TabsContent>
                </Tabs>
            </main>
            <AIModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle} content={modalContent} />
        </div>
    );
}