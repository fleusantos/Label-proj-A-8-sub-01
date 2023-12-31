import { dateBuilder, documentType, idModule, timeOperator } from '@label/core';
import {
  buildDocumentRepository,
  documentService,
} from '../../modules/document';
import { logger } from '../../utils';
import { connectorConfigType } from './connectorConfigType';

export { buildConnector };

function buildConnector(connectorConfig: connectorConfigType) {
  return {
    autoImportDocumentsFromSder,
    importChainedDocumentsFromSder,
    importSpecificDocument,
    importNewDocuments,
    importJuricaDocuments,
    importJuritjDocuments,
    importDocumentsByJurisdictionBetween,
    importDocumentsSince,
    importDocumentsSinceDateCreation,
    importTestDocumentsSince,
    resetDocument,
    resetAllDocumentsSince,
    deleteDocumentsOlderThan,
    resetAllLockedDocuments,
  };

  async function autoImportDocumentsFromSder(
    threshold: number,
    documentsCount: number,
  ) {
    logger.log(`autoImportDocumentsFromSder: ${threshold}`);

    const documentRepository = buildDocumentRepository();

    const documentsToTreat = await documentRepository.findAllByStatusProjection(
      ['loaded', 'nlpAnnotating', 'free'],
      ['_id'],
    );

    if (documentsToTreat.length > threshold) {
      return;
    }
    const daysStep = 30;

    await importNewDocuments(documentsCount, daysStep);
  }

  async function importChainedDocumentsFromSder(
    threshold: number,
    documentsCount: number,
  ) {
    logger.log(`importChainedDocumentsFromSder: ${threshold}`);

    const documentRepository = buildDocumentRepository();

    const documentsToTreat = await documentRepository.findAllByStatusProjection(
      ['loaded', 'nlpAnnotating', 'free'],
      ['_id'],
    );

    if (documentsToTreat.length > threshold) {
      return;
    }
    const daysStep = 30;

    await importChainedDocuments(documentsCount, daysStep);
  }

  async function importJuricaDocuments(documentsCount: number) {
    logger.log(`importJuricaDocuments: ${documentsCount}`);

    logger.log(`Fetching ${connectorConfig.name} documents...`);
    let daysAgo = 0;
    let step = 0;
    const daysStep = 10;
    const MAX_STEP = 120;

    const newDocuments: documentType[] = [];
    while (newDocuments.length < documentsCount && step < MAX_STEP) {
      const startDate = new Date(dateBuilder.daysAgo(daysAgo + daysStep));
      const endDate = new Date(dateBuilder.daysAgo(daysAgo));
      const newCourtDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetween(
        {
          source: 'jurica',
          startDate,
          endDate,
        },
      );
      logger.log(
        `${newCourtDecisions.length} ${
          connectorConfig.name
        } court decisions fetched between ${timeOperator.convertTimestampToReadableDate(
          startDate.getTime(),
        )} and ${timeOperator.convertTimestampToReadableDate(
          endDate.getTime(),
        )}!`,
      );
      for (const courtDecision of newCourtDecisions) {
        newDocuments.push(
          await connectorConfig.mapCourtDecisionToDocument(
            courtDecision,
            'recent',
          ),
        );
      }
      daysAgo += daysStep;
      step++;
    }

    logger.log(
      `Insertion ${newDocuments.length} documents into the database...`,
    );
    await insertDocuments(newDocuments);
    logger.log(`Insertion done!`);

    logger.log(`Send documents have been loaded...`);
    await connectorConfig.updateDocumentsLoadedStatus(newDocuments);
    logger.log(`DONE`);
  }

  async function importJuritjDocuments(documentsCount: number) {
    logger.log(`importJuritjDocuments: ${documentsCount}`);

    logger.log(`Fetching ${connectorConfig.name} documents...`);
    let daysAgo = 0;
    let step = 0;
    const daysStep = 10;
    const MAX_STEP = 120;

    const newDocuments: documentType[] = [];
    while (newDocuments.length < documentsCount && step < MAX_STEP) {
      const startDate = new Date(dateBuilder.daysAgo(daysAgo + daysStep));
      const endDate = new Date(dateBuilder.daysAgo(daysAgo));
      const newCourtDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetween(
        {
          source: 'juritj',
          startDate,
          endDate,
        },
      );
      logger.log(
        `${newCourtDecisions.length} ${
          connectorConfig.name
        } court decisions fetched between ${timeOperator.convertTimestampToReadableDate(
          startDate.getTime(),
        )} and ${timeOperator.convertTimestampToReadableDate(
          endDate.getTime(),
        )}!`,
      );
      for (const courtDecision of newCourtDecisions) {
        newDocuments.push(
          await connectorConfig.mapCourtDecisionToDocument(
            courtDecision,
            'recent',
          ),
        );
      }
      daysAgo += daysStep;
      step++;
    }

    logger.log(
      `Insertion ${newDocuments.length} documents into the database...`,
    );
    await insertDocuments(newDocuments);
    logger.log(`Insertion done!`);

    logger.log(`Send documents have been loaded...`);
    await connectorConfig.updateDocumentsLoadedStatus(newDocuments);
    logger.log(`DONE`);
  }

  async function importSpecificDocument({
    documentNumber,
    source,
    lowPriority,
  }: {
    documentNumber: number;
    source: string;
    lowPriority: boolean;
  }) {
    logger.log(
      `importSpecificDocument: ${documentNumber} - ${source}, lowPriority: ${lowPriority}`,
    );

    const courtDecision = await connectorConfig.fetchCourtDecisionBySourceIdAndSourceName(
      {
        sourceId: documentNumber,
        sourceName: source,
      },
    );

    if (!courtDecision) {
      logger.log(
        `No court decision found for specified documentNumber and source`,
      );
      return;
    }

    logger.log(
      `Court decision found. labelStatus: ${courtDecision.labelStatus}, ${
        !!courtDecision.pseudoText ? 'already' : 'never'
      } pseudonymised`,
    );
    const document = await connectorConfig.mapCourtDecisionToDocument(
      courtDecision,
      'manual',
    );
    logger.log(`Court decision converted. Inserting document into database...`);
    if (lowPriority) {
      await insertDocument({ ...document });
    } else {
      await insertDocument({ ...document, route: 'request', priority: 4 });
    }
    logger.log(`Insertion done`);

    logger.log(`Send document has been loaded...`);
    await connectorConfig.updateDocumentsLoadedStatus([document]);
    logger.log(`DONE`);
  }

  async function importNewDocuments(documentCount: number, daysStep?: number) {
    const DEFAULT_DAYS_STEP = 30;
    const MAX_STEP = 300;
    logger.log(
      `importNewDocuments: ${documentCount} - ${daysStep || DEFAULT_DAYS_STEP}`,
    );

    logger.log(`Fetching ${connectorConfig.name} documents...`);
    let daysAgo = 0;
    let step = 0;
    let newDocuments: documentType[] = [];
    while (newDocuments.length < documentCount && step < MAX_STEP) {
      const startDate = new Date(
        dateBuilder.daysAgo(daysAgo + (daysStep || DEFAULT_DAYS_STEP)),
      );
      const endDate = new Date(dateBuilder.daysAgo(daysAgo));
      const newJurinetDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetween(
        {
          startDate,
          endDate,
          source: 'jurinet',
        },
      );
      const newJuricaDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetween(
        {
          startDate,
          endDate,
          source: 'jurica',
        },
      );
      const newJuritjDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetween(
        {
          startDate,
          endDate,
          source: 'juritj',
        },
      );
      const newCourtDecisions = [
        ...newJurinetDecisions,
        ...newJuricaDecisions,
        ...newJuritjDecisions,
      ];

      logger.log(
        `${newCourtDecisions.length} ${
          connectorConfig.name
        } court decisions fetched between ${timeOperator.convertTimestampToReadableDate(
          startDate.getTime(),
        )} and ${timeOperator.convertTimestampToReadableDate(
          endDate.getTime(),
        )}!`,
      );
      for (const courtDecision of newCourtDecisions) {
        newDocuments.push(
          await connectorConfig.mapCourtDecisionToDocument(
            courtDecision,
            'filler',
          ),
        );
      }
      daysAgo += daysStep || DEFAULT_DAYS_STEP;
      step++;
    }

    newDocuments = newDocuments.slice(0, documentCount);

    logger.log(
      `Insertion ${newDocuments.length} documents into the database...`,
    );
    await insertDocuments(newDocuments);
    logger.log(`Insertion done!`);

    logger.log(`Send documents have been loaded...`);
    await connectorConfig.updateDocumentsLoadedStatus(newDocuments);
    logger.log(`DONE`);
    return newDocuments.length;
  }

  async function importChainedDocuments(
    documentCount: number,
    daysStep?: number,
  ) {
    const DEFAULT_DAYS_STEP = 30;
    const MAX_STEP = 300;
    logger.log(
      `importChainedDocuments: ${documentCount} - ${
        daysStep || DEFAULT_DAYS_STEP
      }`,
    );

    logger.log(`Fetching ${connectorConfig.name} documents...`);
    let daysAgo = 0;
    let step = 0;
    let newDocuments: documentType[] = [];
    let importedDocuments: documentType[] = [];
    while (importedDocuments.length < documentCount && step < MAX_STEP) {
      const startDate = new Date(
        dateBuilder.daysAgo(daysAgo + (daysStep || DEFAULT_DAYS_STEP)),
      );
      const endDate = new Date(dateBuilder.daysAgo(daysAgo));
      const newCourtDecisions = await connectorConfig.fetchChainedJuricaDecisionsToPseudonymiseBetween(
        {
          startDate,
          endDate,
        },
      );
      logger.log(
        `${newCourtDecisions.length} ${
          connectorConfig.name
        } court decisions fetched between ${timeOperator.convertTimestampToReadableDate(
          startDate.getTime(),
        )} and ${timeOperator.convertTimestampToReadableDate(
          endDate.getTime(),
        )}!`,
      );
      for (const courtDecision of newCourtDecisions) {
        newDocuments.push(
          await connectorConfig.mapCourtDecisionToDocument(
            courtDecision,
            'chained',
          ),
        );
      }

      newDocuments = newDocuments.slice(0, documentCount);

      logger.log(
        `Insertion ${newDocuments.length} documents into the database...`,
      );
      await insertDocuments(newDocuments);
      logger.log(`Insertion done!`);

      logger.log(`Send documents have been loaded...`);
      await connectorConfig.updateDocumentsLoadedStatus(newDocuments);

      importedDocuments = [...importedDocuments, ...newDocuments];
      newDocuments = [];
      daysAgo += daysStep || DEFAULT_DAYS_STEP;
      step++;
    }

    logger.log(`DONE`);
    return importedDocuments.length;
  }

  async function importDocumentsSince(days: number) {
    logger.log(`importDocumentsSince ${days}`);

    logger.log(`Fetching ${connectorConfig.name} jurinet documents...`);
    const newJurinetCourtDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetween(
      {
        startDate: new Date(dateBuilder.daysAgo(days)),
        endDate: new Date(),
        source: 'jurinet',
      },
    );
    logger.log(
      `${newJurinetCourtDecisions.length} ${connectorConfig.name} court decisions fetched from jurinet!`,
    );
    const newJuricaCourtDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetween(
      {
        startDate: new Date(dateBuilder.daysAgo(days)),
        endDate: new Date(),
        source: 'jurica',
      },
    );
    logger.log(
      `${newJuricaCourtDecisions.length} ${connectorConfig.name} court decisions fetched from juritj!`,
    );
    const newJuritjCourtDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetween(
      {
        startDate: new Date(dateBuilder.daysAgo(days)),
        endDate: new Date(),
        source: 'juritj',
      },
    );
    logger.log(
      `${newJuritjCourtDecisions.length} ${connectorConfig.name} court decisions fetched from juritj!`,
    );
    const newCourtDecisions = [
      ...newJurinetCourtDecisions,
      ...newJuricaCourtDecisions,
      ...newJuritjCourtDecisions,
    ];
    const documents = [] as documentType[];
    for (const courtDecision of newCourtDecisions) {
      documents.push(
        await connectorConfig.mapCourtDecisionToDocument(
          courtDecision,
          'recent',
        ),
      );
    }

    logger.log(`Insertion ${documents.length} documents into the database...`);
    await insertDocuments(documents);
    logger.log(`Insertion done!`);

    logger.log(`Send documents have been loaded...`);
    await connectorConfig.updateDocumentsLoadedStatus(documents);
    logger.log(`DONE`);
  }

  async function importDocumentsSinceDateCreation(days: number) {
    logger.log(`importDocumentsSinceDateCreation ${days}`);

    logger.log(`Fetching ${connectorConfig.name} jurinet documents...`);
    const newJurinetCourtDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetweenDateCreation(
      {
        startDate: new Date(dateBuilder.daysAgo(days)),
        endDate: new Date(),
        source: 'jurinet',
      },
    );
    logger.log(
      `${newJurinetCourtDecisions.length} ${connectorConfig.name} court decisions fetched from jurinet!`,
    );
    const newJuricaCourtDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetweenDateCreation(
      {
        startDate: new Date(dateBuilder.daysAgo(days)),
        endDate: new Date(),
        source: 'jurica',
      },
    );
    logger.log(
      `${newJuricaCourtDecisions.length} ${connectorConfig.name} court decisions fetched from jurica!`,
    );
    const newJuritjCourtDecisions = await connectorConfig.fetchDecisionsToPseudonymiseBetweenDateCreation(
      {
        startDate: new Date(dateBuilder.daysAgo(days)),
        endDate: new Date(),
        source: 'juritj',
      },
    );
    logger.log(
      `${newJuritjCourtDecisions.length} ${connectorConfig.name} court decisions fetched from juritj!`,
    );
    const newCourtDecisions = [
      ...newJurinetCourtDecisions,
      ...newJuricaCourtDecisions,
      ...newJuritjCourtDecisions,
    ];
    const documents = [] as documentType[];
    for (const courtDecision of newCourtDecisions) {
      documents.push(
        await connectorConfig.mapCourtDecisionToDocument(
          courtDecision,
          'recent',
        ),
      );
    }

    logger.log(`Insertion ${documents.length} documents into the database...`);
    await insertDocuments(documents);
    logger.log(`Insertion done!`);

    logger.log(`Send documents have been loaded...`);
    await connectorConfig.updateDocumentsLoadedStatus(documents);

    logger.log(`DONE`);
  }

  async function importDocumentsByJurisdictionBetween(
    from: Date,
    to: Date,
    jurisdictions: string[],
    chambers: string[],
  ) {
    logger.log(
      `importDocumentsByJurisdictionBetween from:${from} to:${to} with jurisdiction=${jurisdictions.join(
        ',',
      )} & chambers=${chambers.join(',')}`,
    );

    logger.log(`Fetching ${connectorConfig.name} jurinet documents...`);
    const newJurinetCourtDecisions = await connectorConfig.fetchAllDecisionsBySourceAndJurisdictionsAndChambersBetween(
      {
        startDate: from,
        endDate: to,
        source: 'jurinet',
        jurisdictions,
        chambers,
      },
    );
    logger.log(
      `${newJurinetCourtDecisions.length} ${connectorConfig.name} court decisions fetched from jurinet!`,
    );
    const newJuricaCourtDecisions = await connectorConfig.fetchAllDecisionsBySourceAndJurisdictionsAndChambersBetween(
      {
        startDate: from,
        endDate: to,
        source: 'jurica',
        jurisdictions,
        chambers,
      },
    );
    logger.log(
      `${newJuricaCourtDecisions.length} ${connectorConfig.name} court decisions fetched from jurica!`,
    );
    const newJuritjCourtDecisions = await connectorConfig.fetchAllDecisionsBySourceAndJurisdictionsAndChambersBetween(
      {
        startDate: from,
        endDate: to,
        source: 'juritj',
        jurisdictions,
        chambers,
      },
    );
    logger.log(
      `${newJuritjCourtDecisions.length} ${connectorConfig.name} court decisions fetched from juritj!`,
    );
    const newCourtDecisions = [
      ...newJurinetCourtDecisions,
      ...newJuricaCourtDecisions,
      ...newJuritjCourtDecisions,
    ];
    const documents = [] as documentType[];
    for (const courtDecision of newCourtDecisions) {
      documents.push(
        await connectorConfig.mapCourtDecisionToDocument(
          courtDecision,
          'manual',
        ),
      );
    }

    logger.log(`Insertion ${documents.length} documents into the database...`);
    await insertDocuments(documents);
    logger.log(`Insertion done!`);

    logger.log(`Send documents have been loaded...`);
    await connectorConfig.updateDocumentsLoadedStatus(documents);
    logger.log(`DONE`);
  }

  async function importTestDocumentsSince(days: number) {
    logger.log(`importTestDocumentsSince ${days}`);

    const jurisdictionsToImport = [
      "Cour d'appel de Dijon",
      "Cour d'appel de Bordeaux",
    ];

    const chambersToImport = [''];

    logger.log(`Fetching ${connectorConfig.name} documents...`);
    const newCourtDecisions = await connectorConfig.fetchPublicDecisionsBySourceAndJurisdictionsAndChambersBetween(
      {
        source: 'jurica',
        jurisdictions: jurisdictionsToImport,
        chambers: chambersToImport,
        startDate: new Date(dateBuilder.daysAgo(days)),
        endDate: new Date(),
      },
    );
    logger.log(
      `${newCourtDecisions.length} ${connectorConfig.name} court decisions fetched!`,
    );
    const documents = [] as documentType[];
    for (const courtDecision of newCourtDecisions) {
      documents.push(
        await connectorConfig.mapCourtDecisionToDocument(
          courtDecision,
          'manual',
        ),
      );
    }

    logger.log(`Insertion ${documents.length} documents into the database...`);
    await insertDocuments(documents);
    logger.log(`Insertion done!`);

    logger.log(`Send documents have been loaded...`);
    await connectorConfig.updateDocumentsLoadedStatus(documents);
    logger.log(`DONE`);
  }

  async function deleteDocumentsOlderThan({
    days,
    source,
  }: {
    days: number;
    source: string;
  }) {
    logger.log(`deleteDocumentsOlderThan: days ${days}, source ${source}`);
    const documentRepository = buildDocumentRepository();
    const documents = await documentRepository.findAll();
    logger.log(`Found ${documents.length} documents. Filtering...`);
    const filteredDocuments = documents.filter(
      (document) =>
        document.source === source &&
        document.creationDate &&
        document.creationDate < dateBuilder.daysAgo(days),
    );
    logger.log(
      `Found ${filteredDocuments} to reset. Resetting their status in SDER...`,
    );
    await connectorConfig.updateDocumentsToBeTreatedStatus(filteredDocuments);
    logger.log(
      'Documents status updated! Deleting the documents in the database...',
    );
    for (let i = 0, l = filteredDocuments.length; i < l; i++) {
      logger.log(`Deleting document ${i + 1}/${l}...`);
      try {
        await documentService.deleteDocument(filteredDocuments[i]._id);
      } catch (error) {
        logger.error(`An error happened while deleting the document`);
        logger.error(error);
      }
    }
    logger.log(`DONE deleteDocumentsOlderThan`);
  }

  async function resetAllDocumentsSince(days: number) {
    const documentRepository = buildDocumentRepository();

    const documents = await documentRepository.findAll();
    logger.log(
      `Found ${documents.length} in the DB. Filtering the documents to reset...`,
    );

    const documentsToReset = documents.filter(
      (document) =>
        document.creationDate &&
        document.creationDate >= dateBuilder.daysAgo(days) &&
        document.status !== 'done' &&
        document.status !== 'toBePublished',
    );
    logger.log(
      `Found ${documentsToReset.length} in the DB. Updating their status to toBeTreated in SDER DB...`,
    );

    await connectorConfig.updateDocumentsToBeTreatedStatus(documentsToReset);
    logger.log(
      'Documents status updated! Deleting the documents in the Database...',
    );

    for (let i = 0, l = documentsToReset.length; i < l; i++) {
      try {
        const documentIdToReset = documentsToReset[i]._id;
        logger.log(
          `Deleting document ${idModule.lib.convertToString(
            documentIdToReset,
          )}: ${i + 1}/${l}...`,
        );
        await documentService.deleteDocument(documentIdToReset);
      } catch (error) {
        logger.error(`An error happened while deleting the document`);
      }
    }
  }

  async function resetAllLockedDocuments() {
    logger.log(`resetAllLockedDocuments`);

    const documentRepository = buildDocumentRepository();
    const lockedDocuments = await documentRepository.findAllByStatusProjection(
      ['locked'],
      ['_id'],
    );

    logger.log(`Reseting ${lockedDocuments.length} locked documents...`);

    const lockedDocumentIds = lockedDocuments.map(({ _id }) => _id);
    for (let i = 0, length = lockedDocuments.length; i < length; i++) {
      await documentService.updateDocumentStatus(
        lockedDocumentIds[i],
        'loaded',
      );
    }

    logger.log(`DONE resetAllLockedDocuments`);
  }

  async function resetDocument({
    documentNumber,
    source,
  }: {
    documentNumber: documentType['documentNumber'];
    source: documentType['source'];
  }) {
    const documentRepository = buildDocumentRepository();

    const document = await documentRepository.findOneByDocumentNumberAndSource({
      documentNumber,
      source,
    });
    if (!document) {
      logger.log(
        `Could not find document ${documentNumber} from source "${source}"`,
      );
      return;
    }
    logger.log(
      `Document found in the DB. Resetting the status to "toBeTreated"`,
    );

    await connectorConfig.updateDocumentsToBeTreatedStatus([document]);
    logger.log(
      'Documents status updated! Deleting the document in the Database...',
    );

    try {
      await documentService.deleteDocument(document._id);
    } catch (error) {
      logger.error(`An error happened while deleting the document`);
    }
    logger.log(
      `Document deleted. Importing the new version of the document...`,
    );

    await importSpecificDocument({
      documentNumber,
      source,
      lowPriority: true,
    });
  }
}

async function insertDocuments(documents: documentType[]) {
  const documentRepository = buildDocumentRepository();

  for await (const document of documents) {
    await documentRepository.insert(document);
  }
}

function insertDocument(document: documentType) {
  const documentRepository = buildDocumentRepository();

  return documentRepository.insert(document);
}
