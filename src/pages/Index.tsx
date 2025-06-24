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

export default function Index() {
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

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js";
        script.async = true;
        script.onload = () => {
            setLoadingMessage("Carregando dados da planilha...");
            window.Papa.parse(GOOGLE_SHEET_URL, { 
                download: true, header: true, skipEmptyLines: true,
                complete: (results: any) => {
                    const rawData = results.data;
                    
                    const processedCoordinatorsMap: Record<string, { fullName: string, courses: string[], password?: string }> = {};
                    rawData.forEach((row: any) => {
                        const loginUsername = row['Login']?.trim(); 
                        const coordinatorFullName = row['Coordenador']?.trim(); 
                        const course = row['Curso']?.trim();
                        const password = row['Senha']?.trim(); 

                        if (loginUsername && coordinatorFullName) { 
                            if (!processedCoordinatorsMap[loginUsername]) {
                                processedCoordinatorsMap[loginUsername] = { 
                                    fullName: coordinatorFullName, 
                                    courses: [], 
                                    password: password 
                                };
                            } else {
                                if (password && !processedCoordinatorsMap[loginUsername].password) {
                                    processedCoordinatorsMap[loginUsername].password = password;
                                }
                                if (coordinatorFullName && !processedCoordinatorsMap[loginUsername].fullName) {
                                     processedCoordinatorsMap[loginUsername].fullName = coordinatorFullName;   
                                }
                            }
                            if (course && !processedCoordinatorsMap[loginUsername].courses.includes(course)) {
                                processedCoordinatorsMap[loginUsername].courses.push(course);
                            }
                        }
                    });

                    const coordinatorsArray: Coordinator[] = Object.entries(processedCoordinatorsMap)
                        .map(([username, data]) => ({
                            username,
                            fullName: data.fullName,
                            courses: data.courses,
                            password: data.password
                        }));
                    
                    setCoordinators(coordinatorsArray);
                    localStorage.setItem('coordinatorsData', JSON.stringify(coordinatorsArray)); 

                    const mainApplicationData = rawData.filter((r: any) => r.Docente && r.Docente.trim());
                    const processedMainData = processData(mainApplicationData);
                    setAllData(processedMainData);
                    
                    setIsLoading(false);
                },
                error: (err: any) => { 
                    console.error("Erro ao carregar dados da planilha:", err); 
                    setLoadingMessage("Erro ao carregar dados da planilha. Verifique o console.");
                    setIsLoading(false); 
                }
            });
        };
        script.onerror = () => { 
            console.error("Falha ao carregar PapaParse."); 
            setLoadingMessage("Erro crítico ao carregar dependências. Verifique o console."); 
            setIsLoading(false); 
        };
        document.body.appendChild(script);
        return () => { if(document.body.contains(script)){ document.body.removeChild(script); } }
    }, [processData]); 
   
    const filterOptions = useMemo(() => {
        const dataToFilter = filteredData.length > 0 ? filteredData : allData; 
        const semestres = [...new Set(dataToFilter.map(item => item.Semestre).filter(Boolean))].sort();
        const modalidades = [...new Set(dataToFilter.map(item => item.Modalidade).filter(Boolean))].sort();
        let modulos: string[] = [];
        let cursos: string[] = [];
        
        const baseParaModulosECursos = filters.modalidade === 'Todos' ? dataToFilter : dataToFilter.filter(item => item.Modalidade === filters.modalidade);

        if (filters.modalidade && filters.modalidade !== 'Todos') {
            modulos = [...new Set(baseParaModulosECursos.map(item => item['Módulo']).filter(Boolean))].sort();
            cursos = [...new Set(baseParaModulosECursos.map(item => item.Curso).filter(Boolean))].sort();
        } else {
            modulos = [...new Set(dataToFilter.map(item => item['Módulo']).filter(Boolean))].sort();
            cursos = [...new Set(dataToFilter.map(item => item.Curso).filter(Boolean))].sort();
        }
        return { semestres, modalidades, modulos, cursos };
    }, [filteredData, allData, filters.modalidade]);

    useEffect(() => {
        const loggedInCoordinatorFullName = localStorage.getItem('loggedInCoordinator'); // Agora armazena fullName
        const coordinatorCoursesStr = localStorage.getItem('coordinatorCourses');
        const coordinatorCourses = coordinatorCoursesStr ? JSON.parse(coordinatorCoursesStr) : [];

        let dataForFiltering = allData;

        // Se um coordenador está logado (identificado por loggedInCoordinatorFullName), filtramos os dados por seus cursos
        if (loggedInCoordinatorFullName && coordinatorCourses.length > 0) {
            dataForFiltering = allData.filter(row => coordinatorCourses.includes(row.Curso));
        } else if (loggedInCoordinatorFullName && coordinatorCourses.length === 0) {
            dataForFiltering = []; // Coordenador logado mas sem cursos associados
        }
        // Se nenhum coordenador estiver logado, dataForFiltering permanece como allData, 
        // e a exibição dependerá dos filtros de semestre/modalidade.

        // Lógica para exibir dados apenas se filtros principais estiverem selecionados OU se um coordenador estiver logado
        const hasActiveCoordinatorSession = !!loggedInCoordinatorFullName;
        const hasSelectedPrimaryFilters = filters.semestre !== 'Todos' && filters.modalidade !== 'Todos';

        if (!hasActiveCoordinatorSession && !hasSelectedPrimaryFilters) {
            // Nenhum coordenador logado E nenhum filtro principal selecionado = não mostrar nada
            setFilteredData([]);
            setSelectedDocente(null);
            return;
        } 

        if (hasActiveCoordinatorSession && filters.semestre === 'Todos' && filters.modalidade === 'Todos' && filters.modulo === 'Todos' && filters.curso === 'Todos'){
            // Coordenador logado, mas nenhum filtro adicional aplicado = mostrar todos os dados do coordenador
            setFilteredData(dataForFiltering);
            setSelectedDocente(null);
            return;
        }
        
        const appliedFilters = dataForFiltering.filter(row =>
          (filters.semestre === 'Todos' || row.Semestre === filters.semestre) &&
          (filters.modalidade === 'Todos' || row.Modalidade === filters.modalidade) &&
          (filters.modulo === 'Todos' || row['Módulo'] === filters.modulo) &&
          (filters.curso === 'Todos' || row.Curso === filters.curso) 
        );
        setFilteredData(appliedFilters);
        setSelectedDocente(null);
    }, [filters, allData]); // allData precisa estar aqui para re-filtrar quando os dados dos coordenadores mudarem o allData inicial

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ 
            ...prev, 
            [key]: value, 
            ...(key === 'modalidade' && { modulo: 'Todos', curso: 'Todos'}),
            ...(key === 'semestre' && { modalidade: 'Todos', modulo: 'Todos', curso: 'Todos'})
        }));
    };

    const handleDocenteSelect = (docente: string) => {
        setSelectedDocente(selectedDocente === docente ? null : docente);
    };
   
const handleNotification = async (action: string) => {
    if (filteredData.length === 0) {
        alert('Nenhum dado selecionado. Por favor, aplique os filtros de Semestre e Modalidade primeiro.');
        return;
    }

    setIsModalOpen(true);
    setModalTitle('Enviando Notificação');
    setModalContent('Processando e enviando e-mails...');

    try {
        const dadosParaEnvio = {
            action: action,
            dadosDetalhados: filteredData
        };

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

    return (
        <div className="flex h-screen bg-[#0f172a] text-gray-200 font-sans overflow-hidden">
            <style>{`:root { --scrollbar-thumb: #475569; --scrollbar-track: transparent; } ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-track { background: var(--scrollbar-track); } ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #64748b; } .card { background-color: rgba(30, 41, 59, 0.7); border: 1px solid rgba(55, 65, 81, 0.5); backdrop-filter: blur(12px); border-radius: 1rem; } .performance-card { border-color: #22c55e; box-shadow: 0 0 20px rgba(34, 197, 94, 0.2); } .attention-card { border-color: #f97316; box-shadow: 0 0 20px rgba(249, 115, 22, 0.2); } .table-container { height: calc(30vh); min-height: 200px; } .table-hover-effect tr:hover { background-color: rgba(55, 65, 81, 0.5); } .btn { background-color: #2b466d; color: white; transition: background-color 0.2s; font-weight: bold; padding: 0.5rem 1rem; border-radius: 0.5rem; } .btn:hover { background-color: #3c5f94; } .btn-secondary { background-color: transparent; border: 1px solid #2b466d; color: #adbbd1; padding: 0.5rem 1rem; border-radius: 0.5rem; } .btn-secondary:hover { background-color: rgba(43, 70, 109, 0.2); } .btn-tertiary { background-color: transparent; border: 1px solid #00adc7; color: #00adc7; padding: 0.5rem 1rem; border-radius: 0.5rem; } .btn-tertiary:hover { background-color: rgba(0, 173, 199, 0.1); } .btn-ai { background-color: transparent; border: 1px solid #00adc7; color: #00adc7; font-size: 0.875rem; padding: 0.5rem 1rem; border-radius: 0.5rem; } .btn-ai:hover { background-color: rgba(0, 173, 199, 0.1); } .filter-select { background-color: rgb(30 41 59 / var(--tw-bg-opacity)); border-color: rgb(55 65 81 / var(--tw-border-opacity)); border-radius: 0.375rem; font-size: 0.875rem; line-height: 1.25rem; padding-top: 0.375rem; padding-bottom: 0.375rem; padding-left: 0.5rem; padding-right: 0.5rem; } .filter-select:focus { border-color: #00adc7; --tw-ring-color: #00adc7; } .filter-select-glowing { border: 1px solid #00adc7; box-shadow: 0 0 10px rgba(0, 173, 199, 0.3); } .filter-select-glowing:focus { box-shadow: 0 0 20px rgba(0, 173, 199, 0.5); } .status-badge { font-size: 0.75rem; line-height: 1rem; font-weight: 500; padding: 0.25rem 0.625rem; border-radius: 9999px; white-space: nowrap; }`}</style>
            <Sidebar kpis={kpis} onNotification={handleNotification} />
            <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto">
                <header className="flex flex-wrap justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">Acompanhamento de Disciplinas</h2>
                    <FilterControls filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} />
                </header>
                <Tabs defaultValue="detalhado" className="w-full">
                    <TabsList className="bg-transparent p-0 gap-4">
                        <TabsTrigger 
                            value="detalhado" 
                            className="px-4 py-2 rounded-md text-sm font-medium transition-all text-slate-400 border border-slate-700 bg-transparent data-[state=active]:bg-slate-700/50 data-[state=active]:text-white data-[state=active]:border-cyan-400 data-[state=active]:shadow-[0_0_10px_rgba(0,173,199,0.3)]"
                        >
                            Visão Detalhada
                        </TabsTrigger>
                        <TabsTrigger 
                            value="geral" 
                            className="px-4 py-2 rounded-md text-sm font-medium transition-all text-slate-400 border border-slate-700 bg-transparent data-[state=active]:bg-slate-700/50 data-[state=active]:text-white data-[state=active]:border-cyan-400 data-[state=active]:shadow-[0_0_10px_rgba(0,173,199,0.3)]"
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