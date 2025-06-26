// src/types/index.ts

// --- TYPESCRIPT DECLARATIONS & TYPES ---
declare global {
    interface Window {
        Papa: any;
    }
}

export interface RawData {
  Docente: string;
  Disciplina: string;
  Curso: string;
  Modalidade: string;
  Semestre: string;
  Módulo: string;
  Atividade: string;
  'Data Limite Construção': string;
  'Entregue': string;
  'Dias s/ Acesso': string;
  Coordenador: string;
  email_coordenador: string;
  email_docente: string;
}

export interface ProcessedData extends Omit<RawData, 'Dias s/ Acesso'> { // Omitir a string original
  'Dias s/ Acesso': number; // Redefinir como number
  Login: string;
  statusCalculado: string;
  diasCalculado: number;
  isPendente: boolean;
  isAtrasado: boolean;
  isEntregueNoPrazo: boolean;
  DataTerminoPrevisto?: Date | null; // Adicionado para o relatório do período
}

export interface KPIData {
  // KPIs que dependem da seleção de modalidade
  totalPendentesModalidade: number;
  totalAtrasadasModalidade: number;
  docenteMaiorMediaAtraso: { nome: string; mediaDias: number; } | null;
  docenteMaisPendencias: { nome: string; quantidade: number; } | null;
  docenteMenosAcesso: { 
    nome: string; 
    mediaDiasSemAcesso: number; 
    disciplinaDestaque: string; 
    diasDisciplinaDestaque: number; 
  } | null;
  // Mantidos para possível uso futuro ou como fallback se a lógica mudar, mas os novos acima são prioritários
  pendentes: number; // Pode ser o total geral, independente de modalidade, se necessário
  atrasadas: number; // Pode ser o total geral, independente de modalidade, se necessário
}

// Definição para os dados do Coordenador
  export interface Coordinator {
    username: string; // e.g., ana.tomaz (da coluna 'Login')
    fullName: string; // e.g., Ana Clara Tomaz (da coluna 'Coordenador')
    courses: string[];
    password?: string;
  }

export interface DocenteStats {
    docente: string;
    stats: {
        entregue: number;
        atrasado: number;
        pendente: number;
        total: number;
        diasSemAcesso: number;
    };
    score: number;
    criticality: number;
}

export interface FilterState {
  semestre: string;
  modalidade: string;
  modulo: string;
  curso: string;
}