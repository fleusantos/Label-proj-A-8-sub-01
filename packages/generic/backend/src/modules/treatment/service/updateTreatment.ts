import {
  annotationsDiffModule,
  annotationsDiffType,
  idModule,
  idType,
  settingsModule,
  settingsType,
  treatmentModule,
} from '@label/core';
import { assignationService } from '../../assignation';
import { documentService } from '../../document';
import { userService } from '../../user';
import { buildTreatmentRepository } from '../repository';

export { updateTreatment };

async function updateTreatment(
  {
    annotationsDiff,
    documentId,
    userId,
  }: {
    annotationsDiff: annotationsDiffType;
    documentId: idType;
    userId: idType;
  },
  settings: settingsType,
) {
  const treatmentRepository = buildTreatmentRepository();

  const DURATION_THRESHOLD_BETWEEN_TIMESTAMPS = 15 * 60 * 1000;
  const currentDate = new Date().getTime();

  const assignation = await assignationService.findOrCreateByDocumentIdAndUserId(
    { documentId, userId },
  );
  const userRole = await userService.fetchUserRole(userId);
  if (userRole === 'admin') {
    await documentService.updateDocumentReviewStatus(documentId, {
      hasBeenAmended: true,
    });
  }
  const treatments = await treatmentRepository.findAllByDocumentId(documentId);
  const sortedTreatments = treatmentModule.lib.sortInConsistentOrder(
    treatments,
  );

  const document = await documentService.fetchDocument(documentId);
  const settingsForDocument = settingsModule.lib.computeFilteredSettings(
    settings,
    document.decisionMetadata.categoriesToOmit,
    document.decisionMetadata.additionalTermsToAnnotate,
  );

  const actionToPerform = `update treatment for documentId ${idModule.lib.convertToString(
    documentId,
  )}`;
  const previousAnnotations = treatmentModule.lib.computeAnnotations(
    sortedTreatments,
  );
  const treatment = await treatmentRepository.findById(assignation.treatmentId);
  annotationsDiffModule.lib.assertAnnotationsDiffAreConsistent(
    annotationsDiff,
    {
      settings: settingsForDocument,
      previousAnnotations,
      treatmentSource: treatment.source,
    },
    actionToPerform,
  );

  const updatedTreatment = treatmentModule.lib.update(
    treatment,
    {
      annotationsDiff: annotationsDiffModule.lib.squash([
        treatment.annotationsDiff,
        annotationsDiff,
      ]),
      duration:
        currentDate - treatment.lastUpdateDate <
        DURATION_THRESHOLD_BETWEEN_TIMESTAMPS
          ? currentDate - treatment.lastUpdateDate + treatment.duration
          : treatment.duration,
    },
    settingsForDocument,
  );

  await treatmentRepository.updateOne(
    assignation.treatmentId,
    updatedTreatment,
  );
}
