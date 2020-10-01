import { dependencyManager } from '../../../utils';
import { buildAnnotationRepository } from './buildAnnotationRepository';
import { buildFakeAnnotationRepository } from './buildFakeAnnotationRepository';

export { buildRepository as buildAnnotationRepository };

const buildRepository = dependencyManager.inject({
  forLocal: buildAnnotationRepository,
  forProd: buildAnnotationRepository,
  forTest: buildFakeAnnotationRepository,
});