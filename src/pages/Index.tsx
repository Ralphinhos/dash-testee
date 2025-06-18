import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
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
import { ProcessedData, FilterState, KPIData } from '../types';

export default function Index() {
    // ... (todo o seu código de state e functions continua igual até o return)
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("Carregando dependências...");
    const [allData, setAllData] = useState<ProcessedData[]>([]);
    const [filteredData, setFilteredData] = useState<ProcessedData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState('');
    const [filters, setFilters] = useState<FilterState>({ semestre: 'Todos', modalidade: 'Todos', modulo: 'Todos', curso: 'Todos' });
    const [selectedDocente, setSelectedDocente] = useState<string | null>(null);
    
    const { processData } = useDataProcessor();
    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQi0wysCxkjRT22UXrc026UnG4nbjcFR3fRQ-xazmK8Gkpc6xDUoLG7poXVk77O5uhJX9MgEe3-I3B_/pub?gid=670498862&single=true&output=csv';
    
    const GOOGLE_APPS_SCRIPT_URL = 'SUA_URL_AQUI'; // Lembre-se de colocar sua URL real aqui

    useEffect(() => {
        if (window.Papa && allData.length > 0) {
            setIsLoading(false);
            return;
        }
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js";
        script.async = true;
        script.onload = () => {
             setLoadingMessage("Carregando dados da planilha...");
             window.Papa.parse(GOOGLE_SHEET_URL, {
                download: true, header: true, skipEmptyLines: true,
                complete: (results: any) => {
                    const rawData = results.data;
                    const processed = processData(rawData.filter((r: any) => r.Docente && r.Docente.trim()));
                    setAllData(processed);
                    setIsLoading(false);
                },
                error: (err: any) => { console.error("Erro ao carregar dados da planilha:", err); setLoadingMessage("Erro ao carregar dados.");}
            });
        };
        script.onerror = () => { console.error("Falha ao carregar o script do PapaParse."); setLoadingMessage("Erro ao carregar dependências."); };
        document.body.appendChild(script);

        return () => { if(document.body.contains(script)){ document.body.removeChild(script); } }
    }, [allData.length, processData]);
   
    const filterOptions = useMemo(() => {
        const semestres = [...new Set(allData.map(item => item.Semestre).filter(Boolean))].sort();
        const modalidades = [...new Set(allData.map(item => item.Modalidade).filter(Boolean))].sort();
        let modulos: string[] = [];
        let cursos: string[] = [];
        
        if (filters.modalidade && filters.modalidade !== 'Todos') {
            modulos = [...new Set(
                allData
                    .filter(item => item.Modalidade === filters.modalidade && item['Módulo'])
                    .map(item => item['Módulo'])
            )].sort();
            
            cursos = [...new Set(
                allData
                    .filter(item => item.Modalidade === filters.modalidade && item.Curso)
                    .map(item => item.Curso)
            )].sort();
        }
        return { semestres, modalidades, modulos, cursos };
    }, [allData, filters.modalidade]);

    useEffect(() => {
        if (filters.semestre === 'Todos' || filters.modalidade === 'Todos') {
          setFilteredData([]);
          setSelectedDocente(null);
          return;
        }
        const filtered = allData.filter(row =>
          row.Semestre === filters.semestre &&
          row.Modalidade === filters.modalidade &&
          (filters.modulo === 'Todos' || row['Módulo'] === filters.modulo) &&
          (filters.curso === 'Todos' || row.Curso === filters.curso)
        );
        setFilteredData(filtered);
        setSelectedDocente(null);
    }, [filters, allData]);

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value, ...(key === 'modalidade' && { modulo: 'Todos', curso: 'Todos'}) }));
    };

    const handleDocenteSelect = (docente: string) => {
        setSelectedDocente(selectedDocente === docente ? null : docente);
    };
   
    const handleAnalysis = async (prompt: string, title: string) => {
        //... (código da função handleAnalysis continua igual)
    };
   
    const handleNotification = async (action: string) => {
        //... (código da função handleNotification continua igual)
    };

    const kpis: KPIData = useMemo(() => {
        //... (código da função kpis continua igual)
    }, [filteredData]);

    if (isLoading) {
        return <LoadingScreen message={loadingMessage} />;
    }

    return (
        <div className="flex h-screen bg-[#0f172a] text-gray-200 font-sans overflow-hidden">
            <style>{`:root { /* ...seu css customizado... */ }`}</style>
            <Sidebar kpis={kpis} onNotification={handleNotification} />
            <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto">
                <header className="flex flex-wrap justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">Acompanhamento de Disciplinas - Docente</h2>
                    <FilterControls filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} />
                </header>

                {/* AJUSTE 5: Estilização dos botões de abas */}
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
                            Visão Geral da Modalidade
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
                                onAnalysis={handleAnalysis}
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

// Nota: O código de algumas funções (handleAnalysis, handleNotification, kpis)
// foi omitido aqui para brevidade, mas você deve mantê-lo como está no seu arquivo original.