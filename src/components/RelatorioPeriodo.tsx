import React, { useState, useEffect, useMemo } from 'react'; // Adicionado useMemo de volta, será usado para modalidadesUnicas
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
// import { useDataProcessor } from '../hooks/useDataProcessor'; // Removido por enquanto
import { ProcessedData } from '../types'; // Removido FilterState se não usado diretamente aqui
// Se houver componentes de UI customizados (ex: Select, Button, DatePicker), importe-os aqui
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Input } from "@/components/ui/input"; // Para datas, se não usar type="date"

// Removida MOCK_MODALIDADES, pois agora são extraídas de availableData (simulatedAllData)
// const MOCK_MODALIDADES = ['EAD', 'Presencial', 'Híbrido', 'Modular']; 

export const RelatorioPeriodo: React.FC = () => {
    const navigate = useNavigate();

    // Proteção de Rota: Apenas Admin
    useEffect(() => {
        const storedUserRole = localStorage.getItem('userRole');
        if (storedUserRole !== 'admin') {
            console.warn("[RelatorioPeriodo] Acesso não autorizado. Redirecionando...");
            navigate('/'); // Redireciona para a página inicial se não for admin
        }
    }, [navigate]);
    
    // O acesso ao allData real e à função processData será tratado em uma fase posterior
    // quando a estratégia de gerenciamento de estado global ou passagem de props for definida.
    // Por enquanto, o componente dependerá de dados simulados para a UI e lógica básica.
    
    // Simulação de allData - REMOVER QUANDO INTEGRAR COM DADOS REAIS
    const [simulatedAllData, setSimulatedAllData] = useState<ProcessedData[]>([
        { 
            Docente: 'Ana Silva', Disciplina: 'Mat I', Curso: 'EngComp', Modalidade: 'EAD', Semestre: '2023.1', Módulo: '1', Atividade: 'A1', 'Data Limite Construção': '10/03/2023', 'Entregue': '09/03/2023', 
            'Dias s/ Acesso': 0, Login: 'ana.silva', statusCalculado: 'Entregue no prazo', diasCalculado: -1, isPendente: false, isAtrasado: false, isEntregueNoPrazo: true, DataTerminoPrevisto: new Date(2023, 2, 10),
            Coordenador: 'Carlos Luz', email_coordenador: 'carlos.luz@example.com', email_docente: 'ana.silva@example.com' 
        },
        { 
            Docente: 'Bruno Costa', Disciplina: 'Fis I', Curso: 'EngCivil', Modalidade: 'Presencial', Semestre: '2023.1', Módulo: 'N/A', Atividade: 'P1', 'Data Limite Construção': '15/04/2023', 'Entregue': '', 
            'Dias s/ Acesso': 2, Login: 'bruno.costa', statusCalculado: 'Pendente', diasCalculado: 0, isPendente: true, isAtrasado: false, isEntregueNoPrazo: false, DataTerminoPrevisto: new Date(2023, 3, 15),
            Coordenador: 'Maria Rita', email_coordenador: 'maria.rita@example.com', email_docente: 'bruno.costa@example.com'
        },
        { 
            Docente: 'Carla Dias', Disciplina: 'Proj Software', Curso: 'EngComp', Modalidade: 'EAD', Semestre: '2023.1', Módulo: '2', Atividade: 'A2', 'Data Limite Construção': '20/05/2023', 'Entregue': '21/05/2023', 
            'Dias s/ Acesso': 1, Login: 'carla.dias', statusCalculado: 'Entregue com 1 dia(s) de atraso', diasCalculado: 1, isPendente: false, isAtrasado: true, isEntregueNoPrazo: false, DataTerminoPrevisto: new Date(2023, 4, 20),
            Coordenador: 'Carlos Luz', email_coordenador: 'carlos.luz@example.com', email_docente: 'carla.dias@example.com'
        },
        { 
            Docente: 'Daniel Faria', Disciplina: 'Algoritmos', Curso: 'EngComp', Modalidade: 'Modular', Semestre: '2023.M1', Módulo: '1', Atividade: 'A1', 'Data Limite Construção': '10/02/2023', 'Entregue': '', 
            'Dias s/ Acesso': 5, Login: 'daniel.faria', statusCalculado: 'Pendente', diasCalculado: 0, isPendente: true, isAtrasado: false, isEntregueNoPrazo: false, DataTerminoPrevisto: new Date(2023, 1, 10),
            Coordenador: 'Sofia Lima', email_coordenador: 'sofia.lima@example.com', email_docente: 'daniel.faria@example.com'
        },
    ]); 
    // useEffect para setSimulatedAllData foi removido, dados agora são parte do estado inicial.
    // Se precisar carregar de forma assíncrona no futuro, o useEffect pode voltar.

    const [dataInicio, setDataInicio] = useState<string>('');
    const [dataFim, setDataFim] = useState<string>('');
    const [modalidadeSelecionada, setModalidadeSelecionada] = useState<string>('Todas');
    const [relatorioGerado, setRelatorioGerado] = useState<ProcessedData[] | null>(null);

    // Idealmente, allData viria do contexto ou props, ou de um fetch centralizado.
    // Por ora, usaremos simulatedAllData
    const availableData = simulatedAllData; // Substituir por allData real quando integrado

    const modalidadesUnicas = useMemo(() => {
        // Extrai modalidades únicas dos dados disponíveis (simulados por enquanto)
        // Filtra valores vazios ou nulos de modalidade e ordena
        return [...new Set(availableData.map(item => item.Modalidade).filter(Boolean).sort())] as string[];
    }, [availableData]);

    const handleGerarRelatorio = () => {
        console.log("Gerando relatório com os seguintes filtros:");
        console.log("Data Início:", dataInicio);
        console.log("Data Fim:", dataFim);
        console.log("Modalidade:", modalidadeSelecionada);

        if (!dataInicio || !dataFim) {
            alert("Por favor, selecione Data Início e Data Fim.");
            return;
        }

        const dtInicio = new Date(dataInicio + "T00:00:00"); // Adiciona hora para evitar problemas de fuso
        const dtFim = new Date(dataFim + "T23:59:59"); // Adiciona hora para pegar o dia todo

        if (dtInicio > dtFim) {
            alert("Data Início não pode ser maior que Data Fim.");
            return;
        }
        
        const dadosFiltrados = availableData.filter(item => {
            if (!item.DataTerminoPrevisto) return false;
            const dataTerminoItem = item.DataTerminoPrevisto; // Já é Date

            const modalidadeMatch = modalidadeSelecionada === 'Todas' || item.Modalidade === modalidadeSelecionada;
            const dataMatch = dataTerminoItem >= dtInicio && dataTerminoItem <= dtFim;
            
            return modalidadeMatch && dataMatch;
        });

        console.log("Dados filtrados para o relatório:", dadosFiltrados);
        setRelatorioGerado(dadosFiltrados);
        // Aqui virão os cálculos e a formatação do relatório
    };
    
    // A função interna useDataProcessorNoFetch foi completamente removida 
    // para resolver erros de TypeScript e simplificar o componente nesta fase.
    // A integração com os dados reais e o processamento centralizado serão feitos posteriormente.

    return (
        <div className="p-6 lg:p-8 space-y-6 bg-gray-100 dark:bg-[#0f172a] text-slate-800 dark:text-gray-200 min-h-screen">
            <header className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Relatório do Período</h2>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                    Selecione o intervalo de datas e a modalidade para gerar o relatório consolidado.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                <div>
                    <label htmlFor="data-inicio" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Data Início:</label>
                    <input 
                        type="date" 
                        id="data-inicio"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="block w-full px-3 py-1.5 text-sm rounded-md shadow-sm bg-white border-gray-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:placeholder-gray-400 dark:focus:ring-cyan-600 dark:focus:border-cyan-600"
                    />
                </div>
                <div>
                    <label htmlFor="data-fim" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Data Fim:</label>
                    <input 
                        type="date" 
                        id="data-fim"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="block w-full px-3 py-1.5 text-sm rounded-md shadow-sm bg-white border-gray-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:placeholder-gray-400 dark:focus:ring-cyan-600 dark:focus:border-cyan-600"
                    />
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
                        <p className="text-slate-600 dark:text-gray-400">Nenhum dado encontrado para os filtros selecionados.</p>
                    )}
                </div>
            )}
        </div>
    );
};

// Export default para lazy loading na rota, se necessário
export default RelatorioPeriodo;
