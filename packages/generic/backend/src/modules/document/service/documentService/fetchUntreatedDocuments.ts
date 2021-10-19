import { flatten } from 'lodash';
import { idModule } from '@label/core';
import { assignationService } from '../../../assignation';
import { userService } from '../../../user';
import { buildDocumentRepository } from '../../repository';

export { fetchUntreatedDocuments };

async function fetchUntreatedDocuments() {
  const documentRepository = buildDocumentRepository();
  const untreatedDocuments = await documentRepository.findAllByStatusProjection(
    ['free', 'pending', 'saved', 'rejected'],
    [
      '_id',
      'creationDate',
      'decisionMetadata',
      'documentNumber',
      'publicationCategory',
      'source',
      'status',
    ],
  );
  const assignedDocumentIds = untreatedDocuments
    .filter((document) =>
      ['pending', 'saved', 'rejected'].includes(document.status),
    )
    .map((document) => document._id);
  const assignationsByDocumentId = await assignationService.fetchAssignationsByDocumentIds(
    assignedDocumentIds,
    { assertEveryDocumentIsAssigned: true },
  );
  const allAssignations = flatten(Object.values(assignationsByDocumentId));
  const usersByAssignationId = await userService.fetchUsersByAssignations(
    allAssignations,
  );
  return untreatedDocuments.map((untreatedDocument) => {
    const assignationsForDocument =
      assignationsByDocumentId[
        idModule.lib.convertToString(untreatedDocument._id)
      ];
    const userNames = assignationsForDocument
      ? assignationsForDocument.map(
          (assignation) =>
            usersByAssignationId[idModule.lib.convertToString(assignation._id)]
              .name,
        )
      : [];

    return {
      document: {
        _id: untreatedDocument._id,
        decisionDate: untreatedDocument.decisionMetadata.date,
        documentNumber: untreatedDocument.documentNumber,
        occultationBlock: untreatedDocument.decisionMetadata.occultationBlock,
        jurisdiction: untreatedDocument.decisionMetadata.jurisdiction,
        publicationCategory: untreatedDocument.publicationCategory,
        source: untreatedDocument.source,
        status: untreatedDocument.status,
      },
      userNames,
    };
  });
}
