import * as admin from 'firebase-admin';
admin.initializeApp();

export { onSafetyCutoffSchedule } from './safetyCutoff';
export { onScheduleWorkerSchedule } from './scheduleWorker';

