
import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPIData } from '../types';

interface SidebarProps {
  // onNotification: (action: string) => void; // Removido, pois as ações de comunicação serão removidas
  kpis: KPIData;
}

// export const Sidebar: FC<SidebarProps> = ({ onNotification, kpis }) => { // onNotification removido das props
export const Sidebar: FC<SidebarProps> = ({ kpis }) => {
  const navigate = useNavigate();
  const [loggedInCoordinatorName, setLoggedInCoordinatorName] = useState<string | null>(null);
  const [coordinatorCourses, setCoordinatorCourses] = useState<string[]>([]);

  useEffect(() => {
    const name = localStorage.getItem('loggedInCoordinator');
    setLoggedInCoordinatorName(name);

    const coursesStr = localStorage.getItem('coordinatorCourses');
    if (coursesStr) {
      try {
        const coursesArray = JSON.parse(coursesStr);
        if (Array.isArray(coursesArray)) {
          setCoordinatorCourses(coursesArray);
        }
      } catch (error) {
        console.error("Erro ao parsear cursos do coordenador:", error);
        setCoordinatorCourses([]);
      }
    }
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
  const actionsCardClasses = "bg-[rgba(30,41,59,0.7)] border border-[rgba(55,65,81,0.5)] backdrop-blur-md p-3 flex-grow flex flex-col rounded-xl"; // p-4 para p-3


  return (
    <aside className="w-72 bg-[#020617] border-r border-gray-800 p-4 flex flex-col space-y-4 overflow-y-auto"> {/* p-6 para p-4, space-y-6 para space-y-4 */}
      <div className="flex items-center justify-center mb-2"> {/* mb-4 para mb-2 */}
        <img
          src="/logo_branca.png"
          alt="logo_unifenas"
          className="h-16 w-auto" // h-20 para h-16
        />
      </div>

      {loggedInCoordinatorName && (
        <div className={coordinatorCardClasses}> {/* coordinatorCardClasses já tem p-3 */}
          <p className="text-xs text-cyan-400">Coordenador(a):</p> {/* text-sm para text-xs */}
          <p className="text-sm font-semibold text-white">{shortenName(loggedInCoordinatorName)}</p> {/* text-md para text-sm */}
        </div>
      )}

      {/* KPI Cards com padding ajustado para p-3 e texto menor */}
      <div className={`${kpiCardClasses.replace('p-4', 'p-3')}`}> {/* Ajusta p-4 para p-3 se kpiCardClasses for usado */}
        <p className="text-xs text-gray-400">Total de Atividades Pendentes</p> {/* text-sm para text-xs */}
        <p className="text-2xl font-bold text-[#ef4444]">{kpis.pendentes ?? '-'}</p> {/* text-3xl para text-2xl */}
      </div>
      <div className={`${kpiCardClasses.replace('p-4', 'p-3')}`}>
        <p className="text-xs text-gray-400">Total de Atividades Atrasadas</p> {/* text-sm para text-xs */}
        <p className="text-2xl font-bold text-[#f59e0b]">{kpis.atrasadas ?? '-'}</p> {/* text-3xl para text-2xl */}
      </div>
      <div className={`${kpiCardClasses.replace('p-4', 'p-3')}`}>
        <p className="text-xs text-gray-400">Docente com Maior Atraso</p> {/* text-sm para text-xs */}
        <p className="text-base font-semibold text-orange-400">{kpis.maiorAtrasoDocente ? shortenName(kpis.maiorAtrasoDocente) : '-'}</p> {/* text-lg para text-base */}
        <p className="text-xl font-bold text-orange-400">{kpis.maiorAtrasoDias > 0 ? `${kpis.maiorAtrasoDias} dia(s)` : '-'}</p> {/* text-2xl para text-xl */}
      </div>
      
      {/* Seção de Ações de Comunicação REMOVIDA */}

      {/* Novo Card: Cursos do Coordenador */}
      {coordinatorCourses.length > 0 && (
        <div className={actionsCardClasses.replace('flex-grow', '')}> {/* Reutilizando actionsCardClasses para consistência, removendo flex-grow se não for necessário */}
          <h3 className="text-sm font-semibold text-white mb-2 text-center">Meus Cursos</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto"> {/* Adicionado max-h e overflow-y-auto para o caso de muitos cursos */}
            {coordinatorCourses.map(course => (
              <p key={course} className="text-xs text-gray-300 bg-slate-700 p-1 rounded-md text-center">
                {course}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Botão Sair removido daqui */}
    </aside>
  );
};
