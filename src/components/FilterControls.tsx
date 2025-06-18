
import React, { FC } from 'react';
import { FilterState } from '../types';

interface FilterControlsProps {
    filters: FilterState;
    filterOptions: {
        semestres: string[];
        modalidades: string[];
        modulos: string[];
        cursos: string[];
    };
    onFilterChange: (key: keyof FilterState, value: string) => void;
}

export const FilterControls: FC<FilterControlsProps> = ({ filters, filterOptions, onFilterChange }) => {
    return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label htmlFor="filtro-semestre" className="text-sm font-medium text-gray-400">Semestre:</label>
        <select 
            id="filtro-semestre" 
            className="filter-select filter-select-glowing" 
            value={filters.semestre} 
            onChange={(e) => onFilterChange('semestre', e.target.value)}
        >
          <option value="Todos">Selecione...</option>
          {filterOptions.semestres.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="filtro-modalidade" className="text-sm font-medium text-gray-400">Modalidade:</label>
        <select 
            id="filtro-modalidade" 
            className="filter-select filter-select-glowing" 
            value={filters.modalidade} 
            onChange={(e) => onFilterChange('modalidade', e.target.value)}
        >
          <option value="Todos">Selecione...</option>
          {filterOptions.modalidades.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="filtro-curso" className="text-sm font-medium text-gray-400">Curso:</label>
        <select
            id="filtro-curso"
            className="filter-select filter-select-glowing"
            value={filters.curso}
            onChange={(e) => onFilterChange('curso', e.target.value)}
            disabled={filters.modalidade === 'Todos' || filterOptions.cursos.length === 0}
        >
          <option value="Todos">Todos</option>
          {filterOptions.cursos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="filtro-modulo" className="text-sm font-medium text-gray-400">Módulo:</label>
        <select
            id="filtro-modulo"
            className="filter-select filter-select-glowing"
            value={filters.modulo}
            onChange={(e) => onFilterChange('modulo', e.target.value)}
            disabled={filters.modalidade === 'Todos' || filterOptions.modulos.length === 0}
        >
          <option value="Todos">Todos</option>
          {filterOptions.modulos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
    );
};
