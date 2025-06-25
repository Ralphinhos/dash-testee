import React, { useState, useEffect, useMemo } from 'react';
import { useDataProcessor } from '../hooks/useDataProcessor';
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
import { LogOut, Sun, Moon } from 'lucide-react';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import useIdleTimer from '../hooks/useIdleTimer';

export default function Index() {
    // 1. Hooks que não dependem de estado/props internos ou que fornecem funções básicas
    const navigate = useNavigate();
    const { processData } = useDataProcessor();

    // 2. Definições de estado
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("Carregando dependências...");
    const [allData, setAllData] = useState<ProcessedData[]>([]);
    const [filteredData, setFilteredData] = useState<ProcessedData[]>([]); // Mantido, mas seu setter principal está comentado
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState('');
    const [filters, setFilters] = useState<FilterState>({ semestre: 'Todos', modalidade: 'Todos', modulo: 'Todos', curso: 'Todos' });
    const [selectedDocente, setSelectedDocente] = useState<string | null>(null);
    
    const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
    const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    // 3. Definições de callbacks estáveis
    const handleLogout = React.useCallback(() => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loggedInCoordinator');
        localStorage.removeItem('coordinatorCourses');
        localStorage.removeItem('loggedInCoordinatorUsername');
        navigate('/login');
    }, [navigate]);

    // 4. Hooks que podem depender de callbacks ou estados (como useIdleTimer)
    const IDLE_TIMEOUT = 20 * 60 * 1000; // 20 minutos
    useIdleTimer(IDLE_TIMEOUT, handleLogout);

    // 5. useEffects e useMemos
    useEffect(() => {
        if (!window.Papa) {
            setLoadingMessage("Aguardando dependências principais (PapaParse)...");
            console.warn("[Index.tsx] PapaParse não encontrado. App.tsx deveria ter carregado.");
            return;
        }
        setLoadingMessage("Carregando dados da aplicação...");
        window.Papa.parse(GOOGLE_SHEET_URL, {
            download: true, header: true, skipEmptyLines: true,
            complete: (results: any) => {
                const rawData = results.data;
                const mainApplicationData = rawData.filter((r: any) => r.Docente && r.Docente.trim());
                const processedMainData = processData(mainApplicationData);
                setAllData(processedMainData);
                // Com o useEffect de filtros comentado, precisamos popular filteredData aqui minimamente
                // ou garantir que os componentes lidem com filteredData vazio.
                // Por enquanto, vamos setar para todos os dados processados para evitar quebras.
                setFilteredData(processedMainData); 
                setIsLoading(false);
            },
            error: (err: any) => {
                console.error("[Index.tsx] Erro ao carregar dados principais da aplicação:", err);
                setLoadingMessage("Erro ao carregar dados da aplicação. Verifique o console.");
                setIsLoading(false);
            }
        });
    }, [processData]); // A dependência processData vem de useDataProcessor, que usa useCallback, então é estável.

    // --- BLOCO DE HOOKS COMENTADOS PARA TESTE ---
    // const dataForCoordinator = useMemo(() => {
    //     const loggedInCoordinatorUsername = localStorage.getItem('loggedInCoordinatorUsername');
    //     const coordinatorCoursesStr = localStorage.getItem('coordinatorCourses');
    //     if (!loggedInCoordinatorUsername || !coordinatorCoursesStr) return [];
    //     let coordinatorCourses: string[] = [];
    //     try { coordinatorCourses = JSON.parse(coordinatorCoursesStr); } catch (e) { return []; }
    //     if (coordinatorCourses.length === 0) return [];
    //     return allData.filter(row => 
    //         row.Login === loggedInCoordinatorUsername && coordinatorCourses.includes(row.Curso)
    //     );
    // }, [allData]);

    // useEffect(() => {
    //     const noUiFiltersApplied = filters.semestre === 'Todos' &&
    //                              filters.modalidade === 'Todos' &&
    //                              filters.modulo === 'Todos' &&
    //                              filters.curso === 'Todos';
    //     if (noUiFiltersApplied) {
    //         setFilteredData(dataForCoordinator);
    //     } else {
    //         const appliedFiltersResult = dataForCoordinator.filter(row =>
    //             (filters.semestre === 'Todos' || row.Semestre === filters.semestre) &&
    //             (filters.modalidade === 'Todos' || row.Modalidade === filters.modalidade) &&
    //             (filters.modulo === 'Todos' || row['Módulo'] === filters.modulo) &&
    //             (filters.curso === 'Todos' || row.Curso === filters.curso)
    //         );
    //         setFilteredData(appliedFiltersResult);
    //     }
    //     setSelectedDocente(null);
    // }, [filters, dataForCoordinator]);

    // const filterOptions = useMemo(() => {
    //     const semestres = [...new Set(dataForCoordinator.map(item => item.Semestre).filter(Boolean))].sort();
    //     const modalidades = [...new Set(dataForCoordinator.map(item => item.Modalidade).filter(Boolean))].sort();
    //     let modulos: string[] = [];
    //     let cursos: string[] = [];
    //     const baseParaModulosECursos = filters.modalidade === 'Todos'
    //         ? dataForCoordinator
    //         : dataForCoordinator.filter(item => item.Modalidade === filters.modalidade);
    //     modulos = [...new Set(baseParaModulosECursos.map(item => item['Módulo']).filter(Boolean))].sort();
    //     cursos = [...new Set(baseParaModulosECursos.map(item => item.Curso).filter(Boolean))].sort();
    //     return { semestres, modalidades, modulos, cursos };
    // }, [dataForCoordinator, filters.modalidade]);

    // const kpis = useMemo(() => {
    //     if (filteredData.length === 0) return { pendentes: 0, atrasadas: 0, maiorAtrasoDocente: '', maiorAtrasoDias: 0 };
    //     const pendentes = filteredData.filter(r => r.isPendente).length;
    //     const atrasadas = filteredData.filter(r => r.isAtrasado).length;
    //     const maiorAtraso = filteredData.filter(r => r.diasCalculado > 0 && (r.isAtrasado || r.isPendente))
    //         .reduce((max, row) => row.diasCalculado > max.dias ? { docente: row.Docente, dias: row.diasCalculado } : max, { docente: '', dias: 0 });
    //     return { pendentes, atrasadas, maiorAtrasoDocente: maiorAtraso.docente, maiorAtrasoDias: maiorAtraso.dias };
    // }, [filteredData]);
    // --- FIM DO BLOCO DE HOOKS COMENTADOS ---

    // Mocks para as constantes que dependem dos hooks comentados:
    const dataForCoordinator: ProcessedData[] = useMemo(() => [], []); // Mock para evitar erro de não declaração
    const filterOptions = useMemo(() => ({ semestres: [], modalidades: [], modulos: [], cursos: [] }), []); // Mock
    const kpis: KPIData = useMemo(() => ({ pendentes: 0, atrasadas: 0, maiorAtrasoDocente: '', maiorAtrasoDias: 0 }), []); // Mock

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

    if (isLoading) {
        return <LoadingScreen message={loadingMessage} />;
    }

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
            <Sidebar kpis={kpis} onNotification={handleNotification} />
            <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto bg-gray-100 dark:bg-[#0f172a] text-slate-800 dark:text-gray-200">
                <header className="space-y-4">
                    <div className="flex justify-between items-center gap-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Acompanhamento de Disciplinas - Docente</h2>
                        <div className="flex items-center gap-2 md:gap-4">
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