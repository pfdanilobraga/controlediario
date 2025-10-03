// types.ts
export interface DailyRecord {
  id: string;
  motorista: string;
  data: Date;
  gestor: string;
  placas?: string;
  status: string;
  statusViagem: string;
  horaExtra: string;
  diasEmJornada?: string;
  justificativaJornada?: string;
}

export interface Gestor {
  id: string; // email do gestor
  nome: string;
  motoristas: string[];
}

export interface Motorista {
  id: string;
  nome: string;
  gestor: string; // nome do gestor
}
