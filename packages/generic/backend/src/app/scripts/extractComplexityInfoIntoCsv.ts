import {
  annotationLinkHandler,
  csvExtractor,
  documentModule,
  documentType,
  idModule,
  treatmentModule,
} from '@label/core';
import { promises as fs } from 'fs';
import { assignationService } from '../../modules/assignation';
import { treatmentService } from '../../modules/treatment';
import { userService } from '../../modules/user';
import { buildDocumentRepository } from '../../modules/document';
import { logger } from '../../utils';
import { sumBy } from 'lodash';

export { extractComplexityInfoIntoCsv };

type complexityInfoType = {
  documentId: documentType['_id'];
  documentNumber: documentType['documentNumber'];
  documentSource: documentType['source'];
  totalTreatmentDuration: number;
  userNames: string[];
  annotationsCount: number;
  linkedEntitiesCount: number;
  wordsCount: number;
};

async function extractComplexityInfoIntoCsv() {
  logger.log(`extractComplexityInfoIntoCsv`);

  const fileName = 'complexityInfo.csv';

  const documentRepository = buildDocumentRepository();

  const treatedDocuments = await documentRepository.findAllByStatusProjection(
    ['done', 'toBePublished'],
    ['_id', 'documentNumber', 'source', 'text'],
  );

  const documentIds = treatedDocuments.map(({ _id }) => _id);
  const assignationsByDocumentId = await assignationService.fetchAssignationsByDocumentIds(
    documentIds,
  );

  const usersByIds = await userService.fetchUsers();
  const treatmentsByDocumentId = await treatmentService.fetchTreatmentsByDocumentIds(
    documentIds,
  );

  const complexityInfos = treatedDocuments.map((treatedDocument) => {
    const documentIdString = idModule.lib.convertToString(treatedDocument._id);
    const assignations = assignationsByDocumentId[documentIdString];

    const treatments = treatmentsByDocumentId[documentIdString];
    const humanTreatments = treatmentModule.lib.extractHumanTreatments(
      treatments,
      assignations,
    );

    const nonHumanTreatments = treatments
      .filter(
        (treatment) =>
          treatment.source === 'NLP' || treatment.source === 'postProcess',
      )
      .sort((treatment1, treatment2) => treatment1.order - treatment2.order);

    const nonHumanAnnotations = treatmentModule.lib.computeAnnotations(
      nonHumanTreatments,
    );

    const linkedEntitiesCount = annotationLinkHandler.countLinkedEntities(
      nonHumanAnnotations,
    );
    if (humanTreatments.length === 0) {
      throw new Error(
        `No human treatment found for document ${documentIdString}`,
      );
    }
    const userNames = humanTreatments.map(
      ({ userId }) => usersByIds[idModule.lib.convertToString(userId)].name,
    );
    const totalTreatmentDuration = sumBy(
      humanTreatments,
      ({ treatment }) => treatment.duration,
    );

    return {
      documentId: treatedDocument._id,
      documentNumber: treatedDocument.documentNumber,
      documentSource: treatedDocument.source,
      totalTreatmentDuration,
      userNames,
      annotationsCount: nonHumanAnnotations.length,
      linkedEntitiesCount,
      wordsCount: documentModule.lib.countWords(treatedDocument),
    };
  });

  const csvContent = convertComplexityInfosToCsvContent(complexityInfos);

  try {
    await fs.writeFile(`./${fileName}`, csvContent);
  } catch (err) {
    logger.error(err);
  }
}

function convertComplexityInfosToCsvContent(
  complexityInfos: complexityInfoType[],
) {
  const CSV_FIELDS: Array<{
    title: string;
    extractor: (complexityInfo: complexityInfoType) => string;
  }> = [
    {
      title: 'ID document',
      extractor: (complexityInfo) =>
        idModule.lib.convertToString(complexityInfo.documentId),
    },
    {
      title: 'Source document',
      extractor: (complexityInfo) => complexityInfo.documentSource,
    },
    {
      title: 'Document number',
      extractor: (complexityInfo) => complexityInfo.documentNumber.toString(),
    },
    {
      title: 'Usernames',
      extractor: (complexityInfo) => complexityInfo.userNames.join(', '),
    },
    {
      title: 'Nombre de mots',
      extractor: (complexityInfo) => complexityInfo.wordsCount.toString(),
    },
    {
      title: "Nombre d'annotations",
      extractor: (complexityInfo) => complexityInfo.annotationsCount.toString(),
    },
    {
      title: "Nombre d'entités",
      extractor: (complexityInfo) =>
        complexityInfo.linkedEntitiesCount.toString(),
    },
    {
      title: 'Total duration',
      extractor: (complexityInfo) =>
        complexityInfo.totalTreatmentDuration.toString(),
    },
  ];
  return csvExtractor.convertDataToCsv(
    complexityInfos.filter(
      (complexityInfo) => complexityInfo.userNames.length === 1,
    ),
    CSV_FIELDS,
  );
}
