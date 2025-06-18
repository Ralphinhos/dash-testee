
import React, { useMemo, FC } from 'react';
import { ProcessedData } from '../types';

interface ActivitiesTableProps {
    data: ProcessedData[];
    onDocenteSelect: (docente: string) => void;
    selectedDocente: string | null;
}

export const ActivitiesTable: FC<ActivitiesTableProps> = ({ data, onDocenteSelect, selectedDocente }) => {
    const { docentesData, selectedDocenteActivities } = useMemo(() => {
        const filteredData = data.filter(row => row.isPendente || row.isAtrasado);
        
        // Agrupa por docente
        const docentesMap = new Map<string, { pendentes: number; atrasadas: number; activities: ProcessedData[] }>();
        
        filteredData.forEach(row => {
            if (!docentesMap.has(row.Docente)) {
                docentesMap.set(row.Docente, { pendentes: 0, atrasadas: 0, activities: [] });
            }
            const docenteData = docentesMap.get(row.Docente)!;
            docenteData.activities.push(row);
            
            if (row.isPendente) docenteData.pendentes++;
            if (row.isAtrasado) docenteData.atrasadas++;
        });

        const docentesArray = Array.from(docentesMap.entries()).map(([docente, stats]) => ({
            docente,
            ...stats,
            criticality: stats.atrasadas * 2 + stats.pendentes // Atrasos têm peso maior
        })).sort((a, b) => b.criticality - a.criticality);

        const selectedActivities = selectedDocente && docentesMap.has(selectedDocente) 
            ? docentesMap.get(selectedDocente)!.activities 
            : [];

        return { 
            docentesData: docentesArray,
            selectedDocenteActivities: selectedActivities
        };
    }, [data, selectedDocente]);

    const shortenName = (name: string) => {
        const parts = (name || "").trim().split(/\s+/);
        return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
    }

    const getStatusBadge = (statusCalculado: string) => {
        if (statusCalculado.includes('Pendente')) return <span className="status-badge bg-red-500/20 text-red-300">{statusCalculado}</span>;
        if (statusCalculado.includes('atraso')) return <span className="status-badge bg-amber-500/20 text-amber-300">{statusCalculado.replace('Entregue com ', '')}</span>;
        return <span>-</span>;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Docentes */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Docentes com Atividades Pendentes/Atrasadas</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {docentesData.length === 0 ? (
                        <p className="text-center p-8 text-gray-400">Nenhuma atividade pendente ou atrasada.</p>
                    ) : (
                        docentesData.map(({ docente, pendentes, atrasadas }) => (
                            <button
                                key={docente}
                                onClick={() => onDocenteSelect(docente)}
                                className={`w-full p-3 rounded-lg text-left transition-colors ${
                                    selectedDocente === docente 
                                        ? 'bg-[#2b466d] border border-cyan-400' 
                                        : 'bg-gray-800/50 hover:bg-gray-700/50'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-white">{shortenName(docente)}</span>
                                    <div className="flex gap-2 text-sm">
                                        {atrasadas > 0 && (
                                            <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                                                {atrasadas} atrasada{atrasadas > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {pendentes > 0 && (
                                            <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded">
                                                {pendentes} pendente{pendentes > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Detalhes do Docente Selecionado */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    {selectedDocente ? `Atividades de ${shortenName(selectedDocente)}` : 'Selecione um docente'}
                </h3>
                <div className="max-h-96 overflow-y-auto">
                    {selectedDocenteActivities.length === 0 ? (
                        <p className="text-center p-8 text-gray-400">
                            {selectedDocente ? 'Nenhuma atividade encontrada.' : 'Clique em um docente para ver suas atividades.'}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {selectedDocenteActivities.map((activity, index) => (
                                <div key={`${activity.Atividade}-${index}`} className="p-3 bg-gray-800/30 rounded-lg">
                                    <div className="font-medium text-white mb-1">{activity.Atividade}</div>
                                    <div className="text-sm text-gray-400 mb-2">{activity.Disciplina}</div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-300">
                                            Prazo: {activity['Data Limite Construção']}
                                        </span>
                                        {getStatusBadge(activity.statusCalculado)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
