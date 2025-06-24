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

export interface ProcessedData extends RawData {
  statusCalculado: string;
  diasCalculado: number;
  isPendente: boolean;
  isAtrasado: boolean;
  isEntregueNoPrazo: boolean;
}

export interface KPIData {
  pendentes: number;
  atrasadas: number;
  maiorAtrasoDocente: string;
  maiorAtrasoDias: number;
}

  // Definição para os dados do Coordenador
 export interface Coordinator {
  username: string; // Login formatado, ex: ana.tomaz
  fullName: string; // Nome completo, ex: Ana Clara Tomaz
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