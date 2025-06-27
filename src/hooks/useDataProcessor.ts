import { useCallback } from 'react';
import { RawData, ProcessedData } from '../types';

// Função utilitária parseDate movida para fora do hook para estabilidade de referência
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return null;
  }
  const [day, month, year] = dateStr.split('/');
  const numMonth = parseInt(month, 10) - 1; 
  const numDay = parseInt(day, 10);
  const numYear = parseInt(year, 10);

  if (numMonth < 0 || numMonth > 11 || numDay < 1 || numDay > 31 || numYear < 1900 || numYear > 2100) {
    return null;
  }
  const dateObj = new Date(numYear, numMonth, numDay);
  if (dateObj.getFullYear() !== numYear || dateObj.getMonth() !== numMonth || dateObj.getDate() !== numDay) {
    return null;
  }
  return dateObj;
};

export const useDataProcessor = () => {
  const processData = useCallback((data: RawData[]): ProcessedData[] => {
    // console.log("[useDataProcessor] processData EXECUTADO com", data.length, "linhas."); // Descomente para depurar
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return data.map((row) => {
      // **CONFIRME OS NOMES DESTAS COLUNAS NA SUA PLANILHA**
      // Estes são os nomes que você usou no seu código original, mas confirme se são os corretos para a planilha principal
      const dataLimiteConstrucaoStr = row['Data Limite Construção']; 
      const dataEntregaStr = row['Entregue']; 
      
      const dataLimite = parseDate(dataLimiteConstrucaoStr);
      const dataEntrega = parseDate(dataEntregaStr);
     
      let statusCalculado = ''; // Será definido pela lógica abaixo
      let diasCalculado = 0; 
      let isPendente = false;
      let isAtrasado = false;
      let isEntregueNoPrazo = false;

      if (dataEntrega) { 
        isPendente = false; 
        if (dataLimite && dataEntrega > dataLimite) {
          isAtrasado = true;
          isEntregueNoPrazo = false;
          diasCalculado = Math.ceil((dataEntrega.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24));
          statusCalculado = `Entregue com ${diasCalculado} dia(s) de atraso`;
        } else {
          isAtrasado = false;
          isEntregueNoPrazo = true;
          statusCalculado = 'Entregue no prazo';
          if (dataLimite) {
             diasCalculado = Math.ceil((dataEntrega.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24));
             // diasCalculado será <= 0 se entregue no prazo ou adiantado
          }
        }
      } else if (dataLimite) { 
        isPendente = true;
        isAtrasado = false; 
        isEntregueNoPrazo = false;
        if (hoje > dataLimite) {
          isAtrasado = true; // Pendente E Atrasado
          diasCalculado = Math.ceil((hoje.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24));
          statusCalculado = `Pendente há ${diasCalculado} dia(s)`;
        } else {
          statusCalculado = 'Pendente'; // Pendente mas dentro do prazo
        }
      } else {
        // Sem data de entrega e sem data limite
        isPendente = true; 
        isAtrasado = false;
        isEntregueNoPrazo = false;
        statusCalculado = 'Pendente (sem data limite)'; // Ou apenas 'Pendente'
        diasCalculado = 0; 
      }

      // Converter 'Dias s/ Acesso' para número
      const diasSemAcessoStr = row['Dias s/ Acesso'];
      let diasSemAcessoNum = 0; // Valor padrão se não for um número ou estiver ausente
      if (diasSemAcessoStr && !isNaN(Number(diasSemAcessoStr))) {
        diasSemAcessoNum = parseInt(diasSemAcessoStr, 10);
      }

      // Processar DataTerminoPrevisto
      // Assumindo que o nome da coluna na RawData (planilha) seja 'DataTerminoPrevisto'
      const dataTerminoPrevistoStr = row['DataTerminoPrevisto'] as string | undefined; // Ajustado para ler de RawData
      const dataTerminoPrevisto = dataTerminoPrevistoStr ? parseDate(dataTerminoPrevistoStr) : null;

      // Processar DataInicioSemestre
      const dataInicioSemestreStr = row['DataInicioSemestre'] as string | undefined; // Ler da RawData
      const dataInicioSemestre = dataInicioSemestreStr ? parseDate(dataInicioSemestreStr) : null;
      
      return {
        ...row,
        'Dias s/ Acesso': diasSemAcessoNum, // Sobrescrever com o valor numérico
        DataTerminoPrevisto: dataTerminoPrevisto, // Adicionar o campo processado
        DataInicioSemestre: dataInicioSemestre, // Adicionar o novo campo processado
        statusCalculado,
        diasCalculado,
        isPendente,
        isAtrasado,
        isEntregueNoPrazo
      } as ProcessedData;
    });
  }, []); 

  return { processData };
};