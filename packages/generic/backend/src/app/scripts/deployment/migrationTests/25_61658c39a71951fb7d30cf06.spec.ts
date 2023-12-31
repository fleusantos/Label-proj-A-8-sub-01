import { omit } from 'lodash';
import { documentModule, documentType } from '@label/core';
import { buildDocumentRepository } from '../../../../modules/document';
import { up, down } from '../migrations/25_61658c39a71951fb7d30cf06';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
describe('add route in document model', () => {
  const documentsWithNewModel = [
    documentModule.generator.generate({
      route: 'exhaustive',
    }),
    documentModule.generator.generate({
      route: 'exhaustive',
    }),
    documentModule.generator.generate({
      route: 'exhaustive',
    }),
  ];
  const documentsWithOldModel = [
    omit(documentsWithNewModel[0], ['route']),
    omit(documentsWithNewModel[1], ['route']),
    omit(documentsWithNewModel[2], ['route']),
  ];

  it('should test up', async () => {
    const documentRepository = buildDocumentRepository();
    await Promise.all(
      ((documentsWithOldModel as any) as documentType[]).map(
        documentRepository.insert,
      ),
    );

    await up();

    const documentsAfterUpdateModel = await documentRepository.findAll();
    expect(documentsAfterUpdateModel.sort()).toEqual(
      documentsWithNewModel.sort(),
    );
  });

  it('should test down', async () => {
    const documentRepository = buildDocumentRepository();
    await Promise.all(documentsWithNewModel.map(documentRepository.insert));

    await down();

    const documentsAfterUpdateModel = await documentRepository.findAll();
    expect(documentsAfterUpdateModel.sort()).toEqual(
      documentsWithOldModel.sort(),
    );
  });
});
