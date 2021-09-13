import { logger } from '../../../utils';
import { cleanAssignations } from './cleanAssignations';
import { cleanAssignedDocuments } from './cleanAssignedDocuments';
import { cleanFreeDocuments } from './cleanFreeDocuments';
import { cleanLoadedDocuments } from './cleanLoadedDocuments';
import { cleanTreatments } from './cleanTreatments';

export { cleanDocuments };

async function cleanDocuments() {
  logger.log(`cleanDocuments`);

  await cleanLoadedDocuments();

  await cleanAssignedDocuments();

  await cleanFreeDocuments();

  await cleanTreatments();

  await cleanAssignations();

  logger.log(`cleanDocuments done!`);
}
