// Fix: Defines the core data structures used throughout the application.
export type DriverStatus = 'Liberado' | 'Bloqueado' | 'Afastado' | 'Férias';

export interface DailyControl {
    id: string;
    driverName: string;
    date: string;
    status: DriverStatus;
    observation: string;
}
