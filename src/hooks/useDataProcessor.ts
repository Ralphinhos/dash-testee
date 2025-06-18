
import { RawData, ProcessedData } from '../types';

export const useDataProcessor = () => {
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return null;
    const [day, month, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const processData = (data: RawData[]): ProcessedData[] => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return data.map(row => {
      const dataLimite = parseDate(row['Data Limite Construção']);
      const dataEntrega = parseDate(row['Entregue']);
     
      let statusCalculado = 'Pendente';
      let diasCalculado = 0;
      let isPendente = false;
      let isAtrasado = false;
      let isEntregueNoPrazo = false;

      if (dataEntrega) {
        if (dataLimite && dataEntrega > dataLimite) {
          isAtrasado = true;
          diasCalculado = Math.ceil((dataEntrega.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24));
          statusCalculado = `Entregue com ${diasCalculado} dia(s) de atraso`;
        } else {
          isEntregueNoPrazo = true;
          statusCalculado = 'Entregue no prazo';
        }
      } else if (dataLimite) {
        isPendente = true;
        if (hoje > dataLimite) {
          diasCalculado = Math.ceil((hoje.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24));
          statusCalculado = `Pendente há ${diasCalculado} dia(s)`;
        }
      }

      return {
        ...row,
        statusCalculado,
        diasCalculado,
        isPendente,
        isAtrasado,
        isEntregueNoPrazo
      };
    });
  };

  return { processData };
};
