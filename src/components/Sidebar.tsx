
import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPIData } from '../types';

interface SidebarProps {
  onNotification: (action: string) => void;
  kpis: KPIData;
}

export const Sidebar: FC<SidebarProps> = ({ onNotification, kpis }) => {
  const navigate = useNavigate();
  const [loggedInCoordinatorName, setLoggedInCoordinatorName] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem('loggedInCoordinator');
    setLoggedInCoordinatorName(name);
  }, []);

  const shortenName = (name: string) => {
    if (typeof name !== 'string' || !name) return '';
    const parts = name.trim().split(/\s+/);
    return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
  };

  return (
    <aside className="w-1/4 min-w-[320px] bg-[#020617] border-r border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto">
      <div className="flex items-center justify-center mb-4">
        <img
          src="/logo_branca.png"
          alt="logo_unifenas"
          className="h-20 w-auto"
        />
      </div>

      {loggedInCoordinatorName && (
        <div className="card bg-[rgba(30,41,59,0.5)] p-3 text-center mb-2">
          <p className="text-sm text-cyan-400">Coordenador(a):</p>
          <p className="text-md font-semibold text-white">{shortenName(loggedInCoordinatorName)}</p>
        </div>
      )}

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
        <div className="space-y-3">
          <button 
            onClick={() => onNotification('coordenadores')} 
            className="w-full text-sm py-2 px-4 bg-[#2b466d] text-white font-semibold rounded-md hover:bg-[#3c5f94] transition-colors"
          >
            Notificar Coordenadores
          </button>
          <button 
            onClick={() => onNotification('docentes')} 
            className="w-full text-sm py-2 px-4 bg-transparent border border-[#2b466d] text-[#adbbd1] hover:bg-[rgba(43,70,109,0.2)] font-semibold rounded-md transition-colors"
          >
            Notificar Docentes
          </button>
          <button 
            onClick={() => onNotification('cobrancaUas')} 
            className="w-full text-sm py-2 px-4 bg-transparent border border-[#00adc7] text-[#00adc7] hover:bg-[rgba(0,173,199,0.1)] font-semibold rounded-md transition-colors"
          >
            ✨ Cobrar UAs Pendentes
          </button>
        </div>
      </div>

      {/* Botão Sair removido daqui */}
    </aside>
  );
};
