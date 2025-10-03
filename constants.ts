// Fix: Defines constants used across the application, such as status options and database collection names.
import { DriverStatus } from './types';

export const DRIVER_STATUSES: DriverStatus[] = ['Liberado', 'Bloqueado', 'Afastado', 'Férias'];

export const FIRESTORE_COLLECTION = 'dailyControls';
