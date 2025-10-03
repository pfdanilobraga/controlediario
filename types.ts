import { Timestamp } from 'firebase/firestore';

export interface DailyRecord {
    id: string;
    motorista: string;
    gestor: string;
    data: Date | Timestamp;
    placas?: string;
    status?: string;
    alteracaoStatus?: string;
    justificativaAlteracaoStatus?: string;
    statusViagem?: string;
    justificativaStatusViagem?: string;
    horaExtra?: string;
    justificativaHoraExtra?: string;
    alocado?: string;
    diasEmJornada?: string;
    funcao?: string;
    justificativaJornada?: string;
    retornoFerias?: string;
    dia?: string;
}
