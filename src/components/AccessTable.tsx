
import React, { useMemo, useState, FC } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ProcessedData } from '../types';

interface AccessTableProps {
  data: ProcessedData[];
}

export const AccessTable: FC<AccessTableProps> = ({ data }) => {
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // desc = crítico primeiro
    
    const allAccessData = useMemo(() => {
        const accessMap = new Map<string, ProcessedData>();
        data.forEach(row => {
            const key = `${row.Docente}-${row.Disciplina}`;
            // 'Dias s/ Acesso' já é number a partir de ProcessedData
            const dias = Number(row['Dias s/ Acesso']) || 0; 
            const existingEntry = accessMap.get(key);
            const existingDias = existingEntry ? (Number(existingEntry['Dias s/ Acesso']) || 0) : -1;

            if (!existingEntry || dias > existingDias) {
                accessMap.set(key, row);
            }
        });
        return Array.from(accessMap.values());
    }, [data]);

    const sortedAccessData = useMemo(() => {
        return [...allAccessData].sort((a, b) => {
            // 'Dias s/ Acesso' já é number
            const diasA = Number(a['Dias s/ Acesso']) || 0;
            const diasB = Number(b['Dias s/ Acesso']) || 0;
            
            if (sortOrder === 'desc') {
                return diasB - diasA; // Crítico primeiro
            } else {
                return diasA - diasB; // Em dia primeiro
            }
        });
    }, [allAccessData, sortOrder]);
   
    const getStatusBadge = (diasNum: number) => { // Parâmetro agora é number
        const dias = diasNum; // Já é número
        if (dias > 10) return <span className="status-badge bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">Crítico</span>;
        if (dias >= 7) return <span className="status-badge bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Atenção</span>;
        return <span className="status-badge bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">Em Dia</span>;
    };
   
    const shortenName = (name: string) => {
        const parts = (name || "").trim().split(/\s+/);
        return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
    }

    const toggleSort = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const cardClasses = "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-md p-6";
    const thClasses = "p-3 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider text-left"; // Ajustado para text-gray-600
    const tdClasses = "p-3 text-slate-700 dark:text-gray-300";
    const trHoverClasses = "hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors";
    const placeholderTextClasses = "text-center p-8 text-slate-600 dark:text-gray-400"; // Definido para placeholder

    return (
        <div className={cardClasses}>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-4">Status de Acesso</h3>
            <div className="table-container overflow-y-auto">
                <table className="w-full text-left text-sm">
                    {/* Aplicando fundo mais escuro ao thead */}
                    <thead className="sticky top-0 bg-slate-200 dark:bg-slate-700 border-b border-gray-300 dark:border-slate-600 z-10">
                        <tr>
                            <th className={thClasses}>Docente</th>
                            <th className={thClasses}>Curso</th>
                            <th className={thClasses}>Disciplina</th>
                            <th className={`${thClasses} text-center`}>Dias s/ Acesso</th>
                            <th className={`${thClasses} text-center`}>
                                <button 
                                    onClick={toggleSort}
                                    className="flex items-center justify-center gap-1 w-full hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-gray-600 dark:text-gray-400" // Adicionado cor ao botão
                                >
                                    Status
                                    {sortOrder === 'desc' ? 
                                        <ChevronDown className="w-4 h-4" /> : 
                                        <ChevronUp className="w-4 h-4" />
                                    }
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {sortedAccessData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={placeholderTextClasses}>
                                    Nenhum docente encontrado.
                                </td>
                            </tr>
                        ) : (
                            sortedAccessData.map(row => (
                                <tr key={`${row.Docente}-${row.Disciplina}`} className={trHoverClasses}>
                                    <td className={tdClasses}>{shortenName(row.Docente)}</td>
                                    <td className={tdClasses}>{row.Curso}</td>
                                    <td className={tdClasses}>{row.Disciplina}</td>
                                    {/* 'Dias s/ Acesso' é number, será convertido para string automaticamente na renderização */}
                                    <td className={`${tdClasses} text-center`}>{row['Dias s/ Acesso']}</td>
                                    {/* Passando o número diretamente para getStatusBadge */}
                                    <td className={`${tdClasses} text-center`}>{getStatusBadge(Number(row['Dias s/ Acesso']) || 0)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
