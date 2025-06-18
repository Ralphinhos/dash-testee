
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
        if (dias > 10) return <span className="status-badge bg-red-500/20 text-red-300">Crítico</span>;
        if (dias >= 7) return <span className="status-badge bg-amber-500/20 text-amber-300">Atenção</span>;
        return <span className="status-badge bg-green-500/20 text-green-300">Em Dia</span>;
    };
   
    const shortenName = (name: string) => {
        const parts = (name || "").trim().split(/\s+/);
        return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
    }

    const toggleSort = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    return (
        <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Status de Acesso</h3>
            <div className="table-container overflow-y-auto">
                <table className="w-full text-left text-sm table-hover-effect">
                    <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
                        <tr>
                            <th className="p-3 font-semibold">Docente</th>
                            <th className="p-3 font-semibold">Curso</th>
                            <th className="p-3 font-semibold">Disciplina</th>
                            <th className="p-3 font-semibold text-center">Dias s/ Acesso</th>
                            <th className="p-3 font-semibold text-center">
                                <button 
                                    onClick={toggleSort}
                                    className="flex items-center gap-1 hover:text-[#00adc7] transition-colors"
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
                    <tbody className="divide-y divide-gray-800">
                        {sortedAccessData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-gray-400">
                                    Nenhum docente encontrado.
                                </td>
                            </tr>
                        ) : (
                            sortedAccessData.map(row => (
                                <tr key={`${row.Docente}-${row.Disciplina}`}>
                                    <td className="p-3">{shortenName(row.Docente)}</td>
                                    <td className="p-3">{row.Curso}</td>
                                    <td className="p-3">{row.Disciplina}</td>
                                    <td className="p-3 text-center">{row['Dias s/ Acesso']}</td>
                                    <td className="p-3 text-center">{getStatusBadge(row['Dias s/ Acesso'])}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
