
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

    const cardClasses = "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-md p-6";
    const titleClasses = "text-lg font-semibold text-slate-700 dark:text-white mb-4";
    const placeholderTextClasses = "text-center p-8 text-slate-500 dark:text-gray-400";

    const docenteButtonBase = "w-full p-3 rounded-lg text-left transition-colors";
    const docenteButtonNormal = "bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-600/50 dark:border-slate-600";
    const docenteButtonSelected = "bg-cyan-500 text-white border border-cyan-500 dark:bg-[#2b466d] dark:text-white dark:border-cyan-400";
    
    const docenteNameClasses = "font-medium text-slate-700 dark:text-white";
    const badgeAtrasadasClasses = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-1 rounded text-xs";
    const badgePendentesClasses = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-2 py-1 rounded text-xs";

    const activityItemClasses = "p-3 rounded-lg bg-gray-50 border border-gray-200 dark:bg-slate-700/40 dark:border-slate-600";
    const activityTitleClasses = "font-medium text-slate-700 dark:text-white mb-1";
    const activitySubtitleClasses = "text-sm text-slate-500 dark:text-gray-400 mb-2";
    const activityDateClasses = "text-sm text-slate-600 dark:text-gray-300";


    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Docentes */}
            <div className={cardClasses}>
                <h3 className={titleClasses}>Docentes com Atividades Pendentes/Atrasadas</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {docentesData.length === 0 ? (
                        <p className={placeholderTextClasses}>Nenhuma atividade pendente ou atrasada.</p>
                    ) : (
                        docentesData.map(({ docente, pendentes, atrasadas }) => (
                            <button
                                key={docente}
                                onClick={() => onDocenteSelect(docente)}
                                className={`${docenteButtonBase} ${
                                    selectedDocente === docente 
                                        ? docenteButtonSelected
                                        : docenteButtonNormal
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className={docenteNameClasses}>{shortenName(docente)}</span>
                                    <div className="flex gap-2 text-sm">
                                        {atrasadas > 0 && (
                                            <span className={badgeAtrasadasClasses}>
                                                {atrasadas} atrasada{atrasadas > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {pendentes > 0 && (
                                            <span className={badgePendentesClasses}>
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
            <div className={cardClasses}>
                <h3 className={titleClasses}>
                    {selectedDocente ? `Atividades de ${shortenName(selectedDocente)}` : 'Selecione um docente'}
                </h3>
                <div className="max-h-96 overflow-y-auto">
                    {selectedDocenteActivities.length === 0 ? (
                        <p className={placeholderTextClasses}>
                            {selectedDocente ? 'Nenhuma atividade encontrada.' : 'Clique em um docente para ver suas atividades.'}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {selectedDocenteActivities.map((activity, index) => (
                                <div key={`${activity.Atividade}-${index}`} className={activityItemClasses}>
                                    <div className={activityTitleClasses}>{activity.Atividade}</div>
                                    <div className={activitySubtitleClasses}>{activity.Disciplina}</div>
                                    <div className="flex justify-between items-center">
                                        <span className={activityDateClasses}>
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
