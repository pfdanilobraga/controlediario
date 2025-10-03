// types.ts
import { Timestamp } from 'firebase/firestore';

export interface DailyRecord {
  id: string;
  motorista: string;
  data: Date; // Usaremos Date no frontend
  gestor: string;
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
  alocado?: string;
  lastModifiedBy?: string;
}

export interface Gestor {
  id: string; // email do gestor
  nome: string;
}

export interface Motorista {
  id: string;
  nome: string;
  gestor: string; // nome do gestor
  statusEmprego: 'ATIVO' | 'DESLIGADO';
  dataAdmissao?: Date | null;
  dataDemissao?: Date | null;
  feriasInicio?: Date | null;
  feriasFim?: Date | null;
  observacoes?: string;
}
