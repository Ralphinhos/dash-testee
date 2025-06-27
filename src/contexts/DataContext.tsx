import React, { createContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { ProcessedData, RawData } from '../types'; // Adicionado RawData
import { useDataProcessor } from '../hooks/useDataProcessor'; // Importar o hook

// Interface para descrever os dados e funções que o contexto fornecerá
export interface IDataContextProps {
  allData: ProcessedData[];
  isLoading: boolean;
  error: string | null;
  fetchData?: () => Promise<void>; // Função opcional para recarregar os dados, se necessário
}

// Criar o Contexto com um valor padrão undefined, pois será inicializado no Provider
// O tipo do contexto pode ser IDataContextProps ou undefined se ainda não estiver dentro de um Provider
export const DataContext = createContext<IDataContextProps | undefined>(undefined);

// Hook customizado para facilitar o uso do DataContext e garantir que ele não seja undefined
export const useDataContext = () => {
  const context = React.useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext deve ser usado dentro de um DataProvider');
  }
  return context;
};

// Props para o DataProvider
interface DataProviderProps {
  children: ReactNode;
}

// Componente Provider
export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [allData, setAllData] = useState<ProcessedData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { processData } = useDataProcessor();
  const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  const fetchData = useCallback(async () => {
    console.log("[DataContext] Iniciando fetchData...");
    setIsLoading(true);
    setError(null);

    if (!window.Papa) {
        console.error("[DataContext] PapaParse não está carregado.");
        setError("Erro crítico: Biblioteca de parsing não carregada.");
        setIsLoading(false);
        return;
    }
    if (!GOOGLE_SHEET_URL) {
        console.error("[DataContext] URL da planilha não configurada.");
        setError("Erro crítico: URL da planilha não configurada.");
        setIsLoading(false);
        return;
    }

    try {
      window.Papa.parse(GOOGLE_SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results: { data: RawData[] }) => {
          console.log("[DataContext] Dados brutos recebidos:", results.data.length, "linhas");
          const mainApplicationData = results.data.filter((r: any) => r.Docente && r.Docente.trim());
          if (mainApplicationData.length === 0) {
            console.warn("[DataContext] Nenhum dado válido (com Docente) encontrado após filtro inicial.");
          }
          const processed = processData(mainApplicationData);
          setAllData(processed);
          console.log("[DataContext] Dados processados e armazenados:", processed.length, "linhas");
          setIsLoading(false);
        },
        error: (err: any) => {
          console.error("[DataContext] Erro ao carregar/parsear dados da planilha:", err);
          setError(err.message || "Erro ao buscar dados da planilha.");
          setIsLoading(false);
        }
      });
    } catch (err) {
      console.error("[DataContext] Erro inesperado em fetchData:", err);
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  }, [processData, GOOGLE_SHEET_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const contextValue: IDataContextProps = {
    allData,
    isLoading,
    error,
    fetchData, // Pode ser omitido se não for exposto para recarregamento manual
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};
