
import React, { FC } from 'react';
import { KPIData } from '../types';

interface SidebarProps {
  onNotification: (action: string) => void;
  kpis: KPIData;
}

export const Sidebar: FC<SidebarProps> = ({ onNotification, kpis }) => {
    const shortenName = (name: string) => {
        if (typeof name !== 'string' || !name) return '';
        const parts = name.trim().split(/\s+/);
        return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
    };

  return (
    <aside className="w-1/4 min-w-[320px] bg-[#020617] border-r border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto">
      <div className="flex items-center justify-center mb-4">
          <img src="logo_branca" alt="Logo UNIFENAS" className="h-20 w-auto" />
      </div>
      <div className="card bg-[rgba(30,41,59,0.7)] p-4">
        <p className="text-sm text-gray-400">Total de Atividades Pendentes</p>
        <p className="text-3xl font-bold text-[#ef4444]">{kpis.pendentes ?? '-'}</p>
      </div>
      <div className="card bg-[rgba(30,41,59,0.7)] p-4">
        <p className="text-sm text-gray-400">Total de Atividades Atrasadas</p>
        <p className="text-3xl font-bold text-[#f59e0b]">{kpis.atrasadas ?? '-'}</p>
      </div>
      <div className="card bg-[rgba(30,41,59,0.7)] p-4">
        <p className="text-sm text-gray-400">Docente com Maior Atraso</p>
        <p className="text-lg font-semibold text-orange-400">{kpis.maiorAtrasoDocente ? shortenName(kpis.maiorAtrasoDocente) : '-'}</p>
        <p className="text-2xl font-bold text-orange-400">{kpis.maiorAtrasoDias > 0 ? `${kpis.maiorAtrasoDias} dia(s)` : '-'}</p>
      </div>
      <div className="card bg-[rgba(30,41,59,0.7)] p-4 flex-grow flex flex-col">
        <h3 className="text-md font-semibold text-white mb-3">Ações de Comunicação</h3>
        <div className="space-y-4">
          <button onClick={() => onNotification('coordenadores')} className="btn bg-[#2b466d] w-full">Notificar Coordenadores</button>
          <button onClick={() => onNotification('docentes')} className="btn-secondary w-full">Notificar Docentes</button>
          <button onClick={() => onNotification('cobrancaUas')} className="btn-tertiary w-full">✨ Cobrar UAs Pendentes</button>
        </div>
      </div>
      <footer className="mt-auto text-center text-xs text-gray-600">
        <p>Desenvolvido por Raphael de Oliveira</p>
      </footer>
    </aside>
  );
};
