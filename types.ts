// Fix: Define the application's data structures to resolve type errors.
export interface DailyRecord {
  id: string;
  motorista: string;
  data: Date;
  gestor: string;
  placas: string;
  status: string;
  statusViagem: string;
  horaExtra: string;
  diasEmJornada: string;
  justificativaJornada: string;
}

export interface Gestor {
  id: string; // email do gestor
  nome: string;
  motoristas: string[]; // Nomes dos motoristas
}

export interface Motorista {
    id: string; // ID do documento no firestore
    nome: string;
    gestor: string; // email do gestor
}
