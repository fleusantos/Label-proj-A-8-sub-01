import { generatorType } from '../../../types';
import { idModule } from '../../id';
import { documentType } from '../documentType';

export { documentGenerator };

const documentGenerator: generatorType<documentType> = {
  generate: ({
    creationDate,
    decisionMetadata,
    documentNumber,
    externalId,
    _id,
    importer,
    loss,
    priority,
    publicationCategory,
    reviewStatus,
    route,
    source,
    status,
    title,
    text,
    updateDate,
  } = {}) => ({
    creationDate: creationDate ? creationDate : new Date().getTime(),
    decisionMetadata: decisionMetadata
      ? decisionMetadata
      : {
          additionalTermsToAnnotate: '',
          appealNumber: '',
          boundDecisionDocumentNumbers: [],
          categoriesToOmit: [],
          chamberName: '',
          civilCaseCode: '',
          civilMatterCode: '',
          criminalCaseCode: '',
          date: new Date().getTime(),
          jurisdiction: '',
          NACCode: '',
          endCaseCode: '',
          occultationBlock: undefined,
          parties: [],
          session: '',
          solution: '',
        },
    documentNumber: documentNumber ?? Math.floor(Math.random() * 1000000),
    externalId: externalId ?? `EXTERNAL_ID_${Math.random()}`,
    _id: _id ? idModule.lib.buildId(_id) : idModule.lib.buildId(),
    importer: importer ?? 'default',
    loss: loss,
    priority: priority !== undefined ? priority : 0,
    publicationCategory: publicationCategory ? publicationCategory : [],
    reviewStatus: reviewStatus || { hasBeenAmended: false, viewerNames: [] },
    route: route || 'default',
    source: source ?? `SOURCE_${Math.random()}`,
    status: status ?? 'free',
    title: title ?? `TITLE_${Math.random()}`,
    text: text ?? `TEXT_${Math.random()}`,
    updateDate: updateDate ?? new Date().getTime(),
  }),
};
