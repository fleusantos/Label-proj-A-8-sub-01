import { httpRequester } from '@label/core';
import {
  nlpEngineApiType,
  nlpEngineCourtDecisionAnnotationsType,
} from './nlpEngineApiType';

export { nlpEngineApi };

const NLP_API_BASE_URL = 'TO_BE_DEFINED';

const nlpEngineApi: nlpEngineApiType = {
  async fetchNlpEngineAnnotations(courtDecision) {
    const response = await httpRequester.request({
      data: { courtDecision },
      headers: {},
      method: 'post',
      url: `${NLP_API_BASE_URL}/ner`,
    });

    return response.data as nlpEngineCourtDecisionAnnotationsType;
  },
};