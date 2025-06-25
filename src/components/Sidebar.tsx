
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

  // A classe .card da tag <style> em Index.tsx tem: background-color: rgba(30, 41, 59, 0.7); border: 1px solid rgba(55, 65, 81, 0.5); backdrop-filter: blur(12px); border-radius: 1rem;
  // Vamos adicionar text-center e um rounded-xl para os cards de KPI.
  const kpiCardClasses = "bg-[rgba(30,41,59,0.7)] border border-[rgba(55,65,81,0.5)] backdrop-blur-md p-4 text-center rounded-xl";
  // O card de nome do coordenador pode manter o estilo original ou ser ajustado similarmente.
  const coordinatorCardClasses = "bg-[rgba(30,41,59,0.5)] border border-[rgba(55,65,81,0.5)] backdrop-blur-md p-3 text-center mb-2 rounded-xl";
  // O card de Ações de Comunicação
  const actionsCardClasses = "bg-[rgba(30,41,59,0.7)] border border-[rgba(55,65,81,0.5)] backdrop-blur-md p-4 flex-grow flex flex-col rounded-xl";


  return (
    <aside className="w-72 bg-[#020617] border-r border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto"> {/* Largura ajustada para w-72 */}
      <div className="flex items-center justify-center mb-4">
        <img
          src="/logo_branca.png"
          alt="logo_unifenas"
          className="h-20 w-auto"
        />
      </div>

      {loggedInCoordinatorName && (
        <div className={coordinatorCardClasses}>
          <p className="text-sm text-cyan-400">Coordenador(a):</p>
          <p className="text-md font-semibold text-white">{shortenName(loggedInCoordinatorName)}</p>
        </div>
      )}

      <div className={kpiCardClasses}>
        <p className="text-sm text-gray-400">Total de Atividades Pendentes</p>
        <p className="text-3xl font-bold text-[#ef4444]">{kpis.pendentes ?? '-'}</p>
      </div>
      <div className={kpiCardClasses}>
        <p className="text-sm text-gray-400">Total de Atividades Atrasadas</p>
        <p className="text-3xl font-bold text-[#f59e0b]">{kpis.atrasadas ?? '-'}</p>
      </div>
      <div className={kpiCardClasses}>
        <p className="text-sm text-gray-400">Docente com Maior Atraso</p>
        <p className="text-lg font-semibold text-orange-400">{kpis.maiorAtrasoDocente ? shortenName(kpis.maiorAtrasoDocente) : '-'}</p>
        <p className="text-2xl font-bold text-orange-400">{kpis.maiorAtrasoDias > 0 ? `${kpis.maiorAtrasoDias} dia(s)` : '-'}</p>
      </div>
      <div className={actionsCardClasses}>
        <h3 className="text-md font-semibold text-white mb-3 text-center">Ações de Comunicação</h3> {/* Centralizado título também */}
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
