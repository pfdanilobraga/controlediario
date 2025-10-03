import { Timestamp } from 'firebase/firestore';

export interface Driver {
    id: string;
    name: string;
    generalStatus: DriverGeneralStatus;
    tripStatus: TripStatus;
    overtime: OvertimeStatus;
    notes: string;
    createdAt: Timestamp;
}

export enum DriverGeneralStatus {
    Disponivel = 'Disponível',
    Indisponivel = 'Indisponível',
    EmViagem = 'Em Viagem',
    EmDescanso = 'Em Descanso',
}

export enum TripStatus {
    NaoIniciada = 'Não Iniciada',
    EmTransito = 'Em Trânsito',
    Concluida = 'Concluída',
    Cancelada = 'Cancelada',
}

export enum OvertimeStatus {
    NaoSeAplica = 'Não se aplica',
    Compensacao = 'Compensação',
    HoraExtra = 'Hora Extra',
}
