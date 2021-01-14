import { annotationDataModelField, annotationType } from './annotationType';
import { annotationGenerator } from './generator';
import { annotationLinker, annotationUpdater, buildAnnotation, entityIdHandler } from './lib';

export { annotationModule };

export type { annotationType };

const annotationModule = {
  dataModelField: annotationDataModelField,
  generator: annotationGenerator,
  lib: {
    annotationLinker,
    annotationUpdater,
    buildAnnotation,
    entityIdHandler,
  },
};
