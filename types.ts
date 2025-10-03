export enum DriverGeneralStatus {
    JORNADA = 'JORNADA',
    FOLGA_NA_ESTRADA = 'FOLGA NA ESTRADA',
    FOLGA_EM_CASA = 'FOLGA EM CASA',
    FERIAS = 'FÉRIAS',
    ATESTADO = 'ATESTADO',
    FALTA = 'FALTA',
    SUSPENSAO = 'SUSPENSÃO',
    LICENCA_PATERNIDADE = 'LICENÇA PATERNIDADE',
    LICENCA_LUTO = 'LICENÇA LUTO',
    DESLIGADO = 'DESLIGADO',
    AFASTADO = 'AFASTADO'
}

export enum TripStatus {
    EM_VIAGEM = 'EM VIAGEM',
    EM_CARREGAMENTO = 'EM CARREGAMENTO',
    EM_DESCARGA = 'EM DESCARGA'
}

export enum OvertimeStatus {
    AUTORIZADO = 'AUTORIZADO',
    NAO_AUTORIZADO = 'NÃO AUTORIZADO'
}

export interface Driver {
    id: string;
    motorista: string;
    gestor: string;
    data: Date;
    status: DriverGeneralStatus | string;
    alteracaoStatus: DriverGeneralStatus | string;
    justificativaAlteracaoStatus: string;
    statusViagem: TripStatus | string;
    justificativaStatusViagem: string;
    horaExtra: OvertimeStatus | string;
    justificativaHoraExtra: string;
}