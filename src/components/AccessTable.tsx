
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
            const dias = parseInt(row['Dias s/ Acesso'] || '0', 10);
            if (!accessMap.has(key) || dias > parseInt(accessMap.get(key)!['Dias s/ Acesso'] || '0', 10)) {
                accessMap.set(key, row);
            }
        });
        return Array.from(accessMap.values());
    }, [data]);

    const sortedAccessData = useMemo(() => {
        return [...allAccessData].sort((a, b) => {
            const diasA = parseInt(a['Dias s/ Acesso'] || '0', 10);
            const diasB = parseInt(b['Dias s/ Acesso'] || '0', 10);
            
            if (sortOrder === 'desc') {
                return diasB - diasA; // Crítico primeiro
            } else {
                return diasA - diasB; // Em dia primeiro
            }
        });
    }, [allAccessData, sortOrder]);
   
    const getStatusBadge = (diasStr: string) => {
        const dias = parseInt(diasStr || '0', 10);
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
    const thClasses = "p-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left";
    const tdClasses = "p-3 text-slate-700 dark:text-gray-300";
    const trHoverClasses = "hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors";

    return (
        <div className={cardClasses}>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-4">Status de Acesso</h3>
            <div className="table-container overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800/80 dark:backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 z-10">
                        <tr>
                            <th className={thClasses}>Docente</th>
                            <th className={thClasses}>Curso</th>
                            <th className={thClasses}>Disciplina</th>
                            <th className={`${thClasses} text-center`}>Dias s/ Acesso</th>
                            <th className={`${thClasses} text-center`}>
                                <button 
                                    onClick={toggleSort}
                                    className="flex items-center justify-center gap-1 w-full hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
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
                                <td colSpan={5} className="text-center p-8 text-slate-500 dark:text-gray-400">
                                    Nenhum docente encontrado.
                                </td>
                            </tr>
                        ) : (
                            sortedAccessData.map(row => (
                                <tr key={`${row.Docente}-${row.Disciplina}`} className={trHoverClasses}>
                                    <td className={tdClasses}>{shortenName(row.Docente)}</td>
                                    <td className={tdClasses}>{row.Curso}</td>
                                    <td className={tdClasses}>{row.Disciplina}</td>
                                    <td className={`${tdClasses} text-center`}>{row['Dias s/ Acesso']}</td>
                                    <td className={`${tdClasses} text-center`}>{getStatusBadge(row['Dias s/ Acesso'])}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
