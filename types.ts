// types.ts

// Representa a estrutura de um documento na coleção 'gestores'
export interface Gestor {
  id: string; // O ID do documento (que é o email do gestor)
  nome: string;
  email: string;
}

// Representa a estrutura de um documento na coleção 'motoristas' (lista mestra)
export interface Motorista {
  id: string;
  nome: string;
  statusEmprego: 'ATIVO' | 'DESLIGADO';
  dataAdmissao?: Date | null;
  dataDemissao?: Date | null;
  dataInicioFerias?: Date | null;
  dataFimFerias?: Date | null;
  observacoes?: string;
}

// Representa a estrutura de um documento na coleção 'daily_records'
export interface DailyRecord {
  id: string;
  motorista: string;
  gestor: string; // Nome do gestor, ex: "MARCOS"
  data: Date;
  
  // Campos importados e editáveis
  placas?: string;
  status: string;
  alteracaoStatus?: string;
  justificativaAlteracaoStatus?: string;

  statusViagem: string;
  justificativaStatusViagem?: string;
  
  horaExtra: string;
  justificativaHoraExtra?: string;

  diasEmJornada?: string;
  justificativaJornada?: string;

  // Campos de controle
  alocado?: string;
  dia?: string;
  funcao?: string;
  retornoFerias?: string;

  // Auditoria
  lastModifiedBy?: string; // Email de quem modificou por último
}
