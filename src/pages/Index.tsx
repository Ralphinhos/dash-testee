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
import { ProcessedData, FilterState, KPIData, Coordinator } from '../types'; // Adicionado Coordinator a types
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import { LogOut, Sun, Moon } from 'lucide-react'; // Importar ícones
import { ThemeSwitcher } from '../components/ThemeSwitcher'; // Importar ThemeSwitcher
import useIdleTimer from '../hooks/useIdleTimer'; // Importar useIdleTimer

export default function Index() {
    const navigate = useNavigate(); // Hook para navegação
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("Carregando dependências...");
    const [allData, setAllData] = useState<ProcessedData[]>([]);
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [filteredData, setFilteredData] = useState<ProcessedData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState('');
    const [filters, setFilters] = useState<FilterState>({ semestre: 'Todos', modalidade: 'Todos', modulo: 'Todos', curso: 'Todos' });
    const [selectedDocente, setSelectedDocente] = useState<string | null>(null);
    
    const { processData } = useDataProcessor();
    const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
    const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    // Removida a lógica de carregamento de PapaParse e dados de coordenadores daqui,
    // pois foi movida para App.tsx para garantir que 'coordinatorsData' esteja no localStorage
    // antes que Login.tsx ou Index.tsx precisem dele.

    useEffect(() => {
        // Este useEffect agora foca em carregar os dados principais da aplicação (disciplinas, etc.)
        // Ele assume que PapaParse já foi carregado por App.tsx e que 'coordinatorsData' pode já estar no localStorage.

        // Verifica se PapaParse está disponível (deve ter sido carregado por App.tsx)
        if (!window.Papa) {
            setLoadingMessage("Aguardando dependências principais (PapaParse)...");
            // Poderia ter um timeout ou um listener para quando PapaParse estiver pronto,
            // mas App.tsx deve lidar com o erro crítico se PapaParse não carregar.
            // Se App.tsx falhar em carregar PapaParse, Index.tsx não deveria nem ser renderizado.
            console.warn("[Index.tsx] PapaParse não encontrado. App.tsx deveria ter carregado.");
            // setIsLoading(false); // Considerar se deve parar o loading ou esperar
            return;
        }

        setLoadingMessage("Carregando dados da aplicação...");
        console.log("[Index.tsx] Buscando dados principais da aplicação da planilha...");

        window.Papa.parse(GOOGLE_SHEET_URL, {
            download: true, header: true, skipEmptyLines: true,
            complete: (results: any) => {
                console.log("[Index.tsx] Dados principais da planilha recebidos.");
                const rawData = results.data;
                const mainApplicationData = rawData.filter((r: any) => r.Docente && r.Docente.trim());
                const processedMainData = processData(mainApplicationData);
                setAllData(processedMainData);
                setIsLoading(false);
                console.log("[Index.tsx] Dados principais da aplicação processados e definidos.");
            },
            error: (err: any) => {
                console.error("[Index.tsx] Erro ao carregar dados principais da aplicação:", err);
                setLoadingMessage("Erro ao carregar dados da aplicação. Verifique o console.");
                setIsLoading(false);
            }
        });
        // Não é mais necessário adicionar/remover o script PapaParse aqui.
    }, [processData]);

    // Memoize os dados base do coordenador
    const dataForCoordinator = useMemo(() => {
        const loggedInCoordinatorUsername = localStorage.getItem('loggedInCoordinatorUsername');
        const coordinatorCoursesStr = localStorage.getItem('coordinatorCourses');

        // Adicionado console.log para depuração
        // console.log("[Index.tsx] dataForCoordinator - Username:", loggedInCoordinatorUsername);
        // console.log("[Index.tsx] dataForCoordinator - Courses Str:", coordinatorCoursesStr);
        // console.log("[Index.tsx] dataForCoordinator - AllData length:", allData.length);

        if (!loggedInCoordinatorUsername || !coordinatorCoursesStr) {
            console.warn("[Index.tsx] dataForCoordinator: Username ou courses não encontrados no localStorage.");
            return []; // Retorna vazio se não houver info do coordenador
        }

        let coordinatorCourses: string[] = [];
        try {
            coordinatorCourses = JSON.parse(coordinatorCoursesStr);
        } catch (e) {
            console.error("[Index.tsx] dataForCoordinator: Erro ao parsear coordinatorCourses.", e);
            return [];
        }

        if (coordinatorCourses.length === 0) {
            // console.log("[Index.tsx] dataForCoordinator: Coordenador logado mas sem cursos atribuídos.");
            return [];
        }

        const filtered = allData.filter(row => {
            // A coluna 'Login' na planilha principal (allData) deve corresponder ao username salvo.
            // E o curso da linha deve estar na lista de cursos do coordenador.
            const matchesLogin = row.Login === loggedInCoordinatorUsername;
            const matchesCourse = coordinatorCourses.includes(row.Curso);
            return matchesLogin && matchesCourse;
        });

        // console.log("[Index.tsx] dataForCoordinator - Filtered data length:", filtered.length);
        return filtered;
    }, [allData]); // Adicionar loggedInCoordinatorUsername e coordinatorCoursesStr como dependências se eles fossem estados do React, mas são de localStorage. allData é a dependência correta aqui.

    // useEffect para aplicar filtros da UI sobre os dados do coordenador
    useEffect(() => {
        const noUiFiltersApplied = filters.semestre === 'Todos' &&
                                 filters.modalidade === 'Todos' &&
                                 filters.modulo === 'Todos' &&
                                 filters.curso === 'Todos';

        if (noUiFiltersApplied) {
            setFilteredData(dataForCoordinator); // Mostra todos os dados do coordenador
        } else {
            const appliedFiltersResult = dataForCoordinator.filter(row =>
                (filters.semestre === 'Todos' || row.Semestre === filters.semestre) &&
                (filters.modalidade === 'Todos' || row.Modalidade === filters.modalidade) &&
                (filters.modulo === 'Todos' || row['Módulo'] === filters.modulo) &&
                (filters.curso === 'Todos' || row.Curso === filters.curso)
            );
            setFilteredData(appliedFiltersResult);
        }
        setSelectedDocente(null);
    }, [filters, dataForCoordinator]);

    // filterOptions agora deriva dos dados específicos do coordenador
    const filterOptions = useMemo(() => {
        const semestres = [...new Set(dataForCoordinator.map(item => item.Semestre).filter(Boolean))].sort();
        const modalidades = [...new Set(dataForCoordinator.map(item => item.Modalidade).filter(Boolean))].sort();

        let modulos: string[] = [];
        let cursos: string[] = [];

        // Se uma modalidade específica for selecionada, filtre módulos e cursos baseados nessa modalidade DENTRO dos dados do coordenador
        const baseParaModulosECursos = filters.modalidade === 'Todos'
            ? dataForCoordinator
            : dataForCoordinator.filter(item => item.Modalidade === filters.modalidade);

        modulos = [...new Set(baseParaModulosECursos.map(item => item['Módulo']).filter(Boolean))].sort();
        // A lista de cursos no filtro deve ser apenas os cursos do coordenador que pertencem à modalidade selecionada (se houver)
        cursos = [...new Set(baseParaModulosECursos.map(item => item.Curso).filter(Boolean))].sort();

        return { semestres, modalidades, modulos, cursos };
    }, [dataForCoordinator, filters.modalidade]);

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value, ...(key === 'modalidade' && { modulo: 'Todos', curso: 'Todos'}) }));
    };

    const handleDocenteSelect = (docente: string) => {
        setSelectedDocente(selectedDocente === docente ? null : docente);
    };
   
 // Substitua a função handleNotification no Index.tsx por esta versão corrigida:

const handleNotification = async (action: string) => {
    if (filteredData.length === 0) {
        alert('Nenhum dado selecionado. Por favor, aplique os filtros de Semestre e Modalidade primeiro.');
        return;
    }

    setIsModalOpen(true);
    setModalTitle('Enviando Notificação');
    setModalContent('Processando e enviando e-mails...');

    try {
        // Preparar os dados para envio
        const dadosParaEnvio = {
            action: action,
            dadosDetalhados: filteredData
        };

        // Fazer requisição POST em vez de GET
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosParaEnvio)
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        setModalContent(`✅ ${result.message}`);
        
    } catch (error: any) {
        console.error('Erro ao enviar notificação:', error);
        setModalContent(`❌ Erro ao enviar notificação:\n\n${error.message}`);
    }
};

    const kpis = useMemo(() => {
        if (filteredData.length === 0) {
            return { pendentes: 0, atrasadas: 0, maiorAtrasoDocente: '', maiorAtrasoDias: 0 };
        }
        const pendentes = filteredData.filter(r => r.isPendente).length;
        const atrasadas = filteredData.filter(r => r.isAtrasado).length;
        const maiorAtraso = filteredData.filter(r => r.diasCalculado > 0 && (r.isAtrasado || r.isPendente))
            .reduce((max, row) => row.diasCalculado > max.dias ? { docente: row.Docente, dias: row.diasCalculado } : max, { docente: '', dias: 0 });
        return { pendentes, atrasadas, maiorAtrasoDocente: maiorAtraso.docente, maiorAtrasoDias: maiorAtraso.dias };
    }, [filteredData]);

    if (isLoading) {
        return <LoadingScreen message={loadingMessage} />;
    }

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loggedInCoordinator');
        localStorage.removeItem('coordinatorCourses');
        localStorage.removeItem('loggedInCoordinatorUsername'); // Adicionado para limpar o username
        navigate('/login');
    };

    // Configurar o timer de inatividade
    const IDLE_TIMEOUT = 20 * 60 * 1000; // 20 minutos
    useIdleTimer(IDLE_TIMEOUT, handleLogout);

    return (
        // O div principal mantém seu fundo escuro, pois a Sidebar é sempre escura.
        // A classe 'dark' no elemento <html> controlará os estilos dark: nos filhos.
        <div className="flex h-screen bg-[#0f172a] font-sans overflow-hidden">
            <style>{`
                :root { 
                    --scrollbar-thumb: #475569; 
                    --scrollbar-track: transparent; 
                }
                html.dark {
                    --scrollbar-thumb: #374151; // Exemplo de cor de scrollbar para tema escuro
                }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: var(--scrollbar-track); }
                ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #64748b; }
                html.dark ::-webkit-scrollbar-thumb:hover { background: #4b5563; }

                /* Estilos de .card, .btn, etc., serão aplicados com classes Tailwind diretamente nos elementos */
                /* ou definidos em index.css se forem globais e precisarem de variantes dark */

                .table-container { height: calc(30vh); min-height: 200px; }
                /* .table-hover-effect tr:hover agora será com classes Tailwind */
                
                /* .filter-select-glowing será ajustado ou substituído por classes Tailwind */

                .status-badge { font-size: 0.75rem; line-height: 1rem; font-weight: 500; padding: 0.25rem 0.625rem; border-radius: 9999px; white-space: nowrap; }
            `}</style>
            <Sidebar kpis={kpis} onNotification={handleNotification} />
            {/* Conteúdo principal com fundo e texto que mudam com o tema */}
            <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto bg-gray-100 dark:bg-[#0f172a] text-slate-800 dark:text-gray-200"> {/* Cor do tema escuro ajustada */}
                <header className="space-y-4">
                    {/* Linha 1: Título e Controles (Tema, Sair) */}
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
                    {/* Linha 2: Filtros */}
                    <div>
                        <FilterControls filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} />
                    </div>
                </header>
                <Tabs defaultValue="detalhado" className="w-full">
                    <TabsList className="bg-transparent p-0 gap-4">
                        {/* TabsTrigger precisarão de estilos para tema claro/escuro */}
                        <TabsTrigger 
                            value="detalhado" 
                            className="px-4 py-2 rounded-md text-sm font-medium transition-all 
                                       text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 
                                       hover:bg-slate-100 dark:hover:bg-slate-800
                                       data-[state=active]:bg-cyan-500 dark:data-[state=active]:bg-cyan-600 
                                       data-[state=active]:text-white dark:data-[state=active]:text-white 
                                       data-[state=active]:border-cyan-500 dark:data-[state=active]:border-cyan-600"
                                       // Removido: data-[state=active]:shadow-md dark:data-[state=active]:shadow-[0_0_10px_rgba(0,173,199,0.3)]
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
                                       // Removido: data-[state=active]:shadow-md dark:data-[state=active]:shadow-[0_0_10px_rgba(0,173,199,0.3)]
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
                                onAnalysis={() => {}} // A função de AI foi removida para simplificar
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