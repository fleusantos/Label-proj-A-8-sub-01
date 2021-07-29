import { flatten, sumBy } from 'lodash';
import {
  documentType,
  idType,
  idModule,
  errorHandlers,
  buildAnonymizer,
  userType,
  documentModule,
  indexer,
  statisticModule,
  dateBuilder,
  treatmentModule,
  settingsType,
} from '@label/core';
import { settingsLoader } from '../../../lib/settingsLoader';
import { buildCallAttemptsRegulator } from '../../../lib/callAttemptsRegulator';
import { logger } from '../../../utils';
import { annotationReportService } from '../../annotationReport';
import { assignationService } from '../../assignation';
import { treatmentService } from '../../treatment';
import { monitoringEntryService } from '../../monitoringEntry';
import { userService } from '../../user';
import { buildDocumentRepository } from '../repository';

export { buildDocumentService, documentService };

const DELAY_BETWEEN_FETCH_DOCUMENT_ATTEMPTS_IN_SECONDS = 60 * 60 * 1000;

const MAX_FETCH_DOCUMENT_ATTEMPTS = 300;

const documentService = buildDocumentService();

function buildDocumentService() {
  const { checkCallAttempts } = buildCallAttemptsRegulator(
    MAX_FETCH_DOCUMENT_ATTEMPTS,
    DELAY_BETWEEN_FETCH_DOCUMENT_ATTEMPTS_IN_SECONDS,
  );

  return {
    assertDocumentIsPublishable,
    assertDocumentStatus,
    countDocumentsWithoutAnnotations,
    deleteDocument,
    fetchAllDocumentsByIds,
    fetchAllPublicationCategories,
    fetchAllSources,
    fetchAnonymizedDocumentText,
    fetchDoneDocuments,
    fetchFreeDocumentsIds,
    fetchSpecialDocuments,
    fetchTreatedDocuments,
    fetchUntreatedDocuments,
    fetchDocumentsReadyToExport,
    fetchDocumentWithoutAnnotations,
    fetchDocumentsForUser,
    fetchDocumentForUser,
    fetchDocument,
    updateDocumentStatus,
    updateReviewDocumentStatus,
  };

  async function assertDocumentIsPublishable(documentId: documentType['_id']) {
    const documentRepository = buildDocumentRepository();

    const document = await documentRepository.findById(documentId);
    const publishedPublicationCategoryLetters = documentModule.lib.publicationHandler.getPublishedPublicationCategory();
    if (document.status !== 'done' && document.status !== 'toBePublished') {
      throw errorHandlers.permissionErrorHandler.build(
        `The document is not publishable, because its current status is "${document.status}"`,
      );
    }

    if (
      !publishedPublicationCategoryLetters.some((publicationCategoryLetter) =>
        document.publicationCategory.includes(publicationCategoryLetter),
      )
    ) {
      throw errorHandlers.permissionErrorHandler.build(
        `The document is not publishable, because its publication category is "${document.publicationCategory.join(
          ', ',
        )}"`,
      );
    }
    return true;
  }

  async function assertDocumentStatus({
    documentId,
    status,
  }: {
    documentId: documentType['_id'];
    status: documentType['status'];
  }) {
    const documentRepository = buildDocumentRepository();

    const document = await documentRepository.findById(documentId);
    if (document.status !== status) {
      throw errorHandlers.serverErrorHandler.build(
        `The document status "${document.status}" does not match the following: "${status}"`,
      );
    }

    return true;
  }

  async function deleteDocument(id: documentType['_id']) {
    const documentRepository = buildDocumentRepository();

    await annotationReportService.deleteAnnotationReportsByDocumentId(id);
    await assignationService.deleteAssignationsByDocumentId(id);
    await monitoringEntryService.deleteMonitoringEntriesByDocumentId(id);
    await treatmentService.deleteTreatmentsByDocumentId(id);

    await documentRepository.deleteById(id);
  }

  async function fetchAllDocumentsByIds(documentIds: documentType['_id'][]) {
    const documentRepository = buildDocumentRepository();
    const documentsByIds = await documentRepository.findAllByIds(documentIds);

    indexer.assertEveryIdIsDefined(
      documentIds.map((documentId) => idModule.lib.convertToString(documentId)),
      documentsByIds,
      (_id) => `The document id ${_id} has no matching document`,
    );

    return documentsByIds;
  }

  async function fetchAllPublicationCategories() {
    const documentRepository = buildDocumentRepository();

    return documentRepository.findAllPublicationCategories();
  }

  async function fetchAllSources() {
    const documentRepository = buildDocumentRepository();

    return documentRepository.distinct('source');
  }

  async function fetchAnonymizedDocumentText(documentId: documentType['_id']) {
    const documentRepository = buildDocumentRepository();
    const document = await documentRepository.findById(documentId);

    const annotations = await treatmentService.fetchAnnotationsOfDocument(
      documentId,
    );
    const settings = settingsLoader.getSettings();
    const anonymizer = buildAnonymizer(settings);

    const anonymizedDocument = anonymizer.anonymizeDocument(
      document,
      annotations,
    );
    return anonymizedDocument.text;
  }

  async function fetchDoneDocuments() {
    const documentRepository = buildDocumentRepository();

    return documentRepository.findAllByStatus(['done', 'toBePublished']);
  }

  async function fetchFreeDocumentsIds() {
    const documentRepository = buildDocumentRepository();

    const documents = await documentRepository.findAllByStatusProjection(
      ['free'],
      ['_id'],
    );
    return documents.map(({ _id }) => _id);
  }

  async function fetchSpecialDocuments() {
    const documentRepository = buildDocumentRepository();
    return documentRepository.findAllByPublicationCategoryLettersProjection(
      documentModule.lib.publicationHandler.getPublishedPublicationCategory(),
      [
        '_id',
        'creationDate',
        'documentNumber',
        'publicationCategory',
        'status',
      ],
    );
  }

  async function fetchTreatedDocuments(settings: settingsType) {
    const documentRepository = buildDocumentRepository();

    const treatedDocuments = await documentRepository.findAllByStatusProjection(
      ['done', 'toBePublished'],
      [
        '_id',
        'documentNumber',
        'publicationCategory',
        'reviewStatus',
        'source',
      ],
    );

    const documentIds = treatedDocuments.map(({ _id }) => _id);
    const assignationsByDocumentId = await assignationService.fetchAssignationsByDocumentIds(
      documentIds,
    );
    const assignations = flatten(Object.values(assignationsByDocumentId));
    const usersByAssignationId = await userService.fetchUsersByAssignations(
      assignations,
    );
    const treatmentsByDocumentId = await treatmentService.fetchTreatmentsByDocumentIds(
      documentIds,
    );

    return treatedDocuments.map((treatedDocument) => {
      const documentIdString = idModule.lib.convertToString(
        treatedDocument._id,
      );
      const assignations = assignationsByDocumentId[documentIdString];
      const userNames = assignations.reduce((accumulator, assignation) => {
        const user =
          usersByAssignationId[idModule.lib.convertToString(assignation._id)];
        if (user.role !== 'annotator' || accumulator.includes(user.name)) {
          return accumulator;
        }
        return [...accumulator, user.name];
      }, [] as string[]);
      const treatments = treatmentsByDocumentId[documentIdString];
      const humanTreatments = treatmentModule.lib.extractHumanTreatments(
        treatments,
        assignations,
      );
      if (humanTreatments.length === 0) {
        throw errorHandlers.serverErrorHandler.build(
          `No human treatment found for document ${documentIdString}`,
        );
      }
      const totalTreatmentDuration = sumBy(
        humanTreatments,
        ({ treatment }) => treatment.duration,
      );
      const lastTreatmentDate =
        humanTreatments[humanTreatments.length - 1].treatment.lastUpdateDate;
      const statistic = statisticModule.lib.simplify(
        treatmentModule.lib.aggregate(
          humanTreatments.map(({ treatment }) => treatment),
          'annotator',
          settings,
        ),
      );
      return {
        document: {
          _id: treatedDocument._id,
          documentNumber: treatedDocument.documentNumber,
          publicationCategory: treatedDocument.publicationCategory,
          reviewStatus: treatedDocument.reviewStatus,
          source: treatedDocument.source,
        },
        totalTreatmentDuration,
        lastTreatmentDate,
        statistic,
        userNames,
      };
    });
  }

  async function fetchUntreatedDocuments() {
    const documentRepository = buildDocumentRepository();
    const untreatedDocuments = await documentRepository.findAllByStatusProjection(
      ['free', 'pending', 'saved'],
      [
        '_id',
        'creationDate',
        'documentNumber',
        'publicationCategory',
        'source',
        'status',
      ],
    );
    const assignedDocumentIds = untreatedDocuments
      .filter(
        (document) =>
          document.status === 'pending' || document.status === 'saved',
      )
      .map((document) => document._id);
    const assignationsByDocumentId = await assignationService.fetchAssignationsByDocumentIds(
      assignedDocumentIds,
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
              usersByAssignationId[
                idModule.lib.convertToString(assignation._id)
              ].name,
          )
        : [];

      return {
        document: {
          _id: untreatedDocument._id,
          creationDate: untreatedDocument.creationDate,
          publicationCategory: untreatedDocument.publicationCategory,
          documentNumber: untreatedDocument.documentNumber,
          source: untreatedDocument.source,
          status: untreatedDocument.status,
        },
        userNames,
      };
    });
  }

  async function fetchDocumentsReadyToExport(
    days: number,
  ): Promise<documentType[]> {
    const documentRepository = buildDocumentRepository();

    const documentsCompletelyTreated = await documentRepository.findAllByStatus(
      ['done'],
    );

    const documentsReadyToExport = documentsCompletelyTreated.filter(
      (document) => document.updateDate < dateBuilder.daysAgo(days),
    );

    return documentsReadyToExport;
  }

  async function fetchDocumentWithoutAnnotations(): Promise<
    documentType | undefined
  > {
    const documentRepository = buildDocumentRepository();

    const treatedDocumentIds = await treatmentService.fetchTreatedDocumentIds();
    let document: documentType | undefined;
    document = await documentRepository.findOneByStatusAndPriorityNotIn(
      { status: 'loaded', priority: 'high' },
      treatedDocumentIds,
    );
    if (document) {
      return document;
    }
    document = await documentRepository.findOneByStatusAndPriorityNotIn(
      { status: 'loaded', priority: 'medium' },
      treatedDocumentIds,
    );
    if (document) {
      return document;
    }
    document = await documentRepository.findOneByStatusAndPriorityNotIn(
      { status: 'loaded', priority: 'low' },
      treatedDocumentIds,
    );

    return document;
  }

  async function countDocumentsWithoutAnnotations(): Promise<number> {
    const documentRepository = buildDocumentRepository();

    const treatedDocumentIds = await treatmentService.fetchTreatedDocumentIds();
    return documentRepository.countNotIn(treatedDocumentIds);
  }

  async function fetchDocument(documentId: documentType['_id']) {
    const documentRepository = buildDocumentRepository();

    return documentRepository.findById(documentId);
  }

  async function fetchDocumentsForUser(
    userId: idType,
    documentsMaxCount: number,
  ) {
    const documents: documentType[] = [];
    const documentIdsToExclude: documentType['_id'][] = [];
    const documentIdsWithAnnotations = await treatmentService.fetchTreatedDocumentIds();
    const documentsAssignated = await fetchAlreadyAssignatedDocuments(userId);
    for (
      let i = 0;
      i < documentsAssignated.length && i < documentsMaxCount;
      i++
    ) {
      checkCallAttempts(idModule.lib.convertToString(userId));
      const assignatedDocument = documentsAssignated[i];
      documents.push(assignatedDocument);
      documentIdsToExclude.push(assignatedDocument._id);
    }

    if (documents.some(({ status }) => status === 'saved')) {
      return documents;
    }

    for (let i = documents.length; i < documentsMaxCount; i++) {
      try {
        const document = await fetchDocumentForUser(
          userId,
          documentIdsWithAnnotations,
        );
        documents.push(document);
        documentIdsToExclude.push(document._id);
      } catch (error) {
        logger.log(error);
      }
    }
    return documents;
  }

  async function fetchDocumentForUser(
    userId: idType,
    documentIdsToSearchIn: documentType['_id'][],
  ): Promise<documentType> {
    checkCallAttempts(idModule.lib.convertToString(userId));

    return assignNewDocument(documentIdsToSearchIn);

    async function assignNewDocument(
      documentIdsToSearchIn: documentType['_id'][],
    ) {
      let document: documentType | undefined;

      document = await assignDocumentByPriority('high', documentIdsToSearchIn);
      if (!document) {
        document = await assignDocumentByPriority(
          'medium',
          documentIdsToSearchIn,
        );
      }
      if (!document) {
        document = await assignDocumentByPriority('low', documentIdsToSearchIn);
      }
      if (!document) {
        throw new Error(`No free document available`);
      }

      await assignationService.createAssignation({
        userId,
        documentId: document._id,
      });

      return document;
    }
  }

  async function fetchAlreadyAssignatedDocuments(userId: userType['_id']) {
    const documentRepository = buildDocumentRepository();
    const documentIdsAssignated = await assignationService.fetchDocumentIdsAssignatedToUserId(
      userId,
    );

    const documentsById = await documentRepository.findAllByIds(
      documentIdsAssignated,
    );
    return Object.values(documentsById)
      .filter(
        (document) =>
          document.status === 'pending' || document.status === 'saved',
      )
      .sort((document1, document2) =>
        document1.status === 'saved'
          ? -1
          : document2.status === 'saved'
          ? 1
          : 0,
      );
  }

  async function assignDocumentByPriority(
    priority: documentType['priority'],
    documentIdsWithAnnotations: documentType['_id'][],
  ): Promise<documentType | undefined> {
    const documentRepository = buildDocumentRepository();

    const document = await documentRepository.findOneByStatusAndPriorityAmong(
      { priority, status: 'free' },
      documentIdsWithAnnotations,
    );

    if (!document) {
      return undefined;
    }

    const nextStatus = documentModule.lib.getNextStatus({
      status: document.status,
      publicationCategory: document.publicationCategory,
    });

    const updatedDocument = await documentRepository.updateOneStatusByIdAndStatus(
      { _id: document._id, status: 'free' },
      {
        status: nextStatus,
      },
    );
    if (updatedDocument?.status !== nextStatus) {
      return assignDocumentByPriority(priority, documentIdsWithAnnotations);
    }
    return updatedDocument;
  }

  async function updateDocumentStatus(
    _id: documentType['_id'],
    status: documentType['status'],
  ) {
    const documentRepository = buildDocumentRepository();
    const updatedDocument = await documentRepository.updateStatusById(
      _id,
      status,
    );
    if (!updatedDocument) {
      throw errorHandlers.notFoundErrorHandler.build(
        `The document ${idModule.lib.convertToString(
          _id,
        )} was not found in the document collection`,
      );
    }
    if (status === 'free') {
      await assignationService.deleteAssignationsByDocumentId(_id);
    }
    return updatedDocument;
  }

  async function updateReviewDocumentStatus(
    _id: documentType['_id'],
    reviewStatus: documentType['reviewStatus'],
  ) {
    const documentRepository = buildDocumentRepository();
    const updatedDocument = await documentRepository.updateOne(_id, {
      reviewStatus,
    });

    if (!updatedDocument) {
      throw errorHandlers.notFoundErrorHandler.build(
        `The document ${idModule.lib.convertToString(
          _id,
        )} was not found in the document collection`,
      );
    }

    return updatedDocument;
  }
}
