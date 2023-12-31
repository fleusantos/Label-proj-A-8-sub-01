import { userModule, userType } from '@label/core';
import {
  buildFakeRepositoryBuilder,
  projectFakeObjects,
} from '../../../repository';
import { customUserRepositoryType } from './customUserRepositoryType';

export { buildFakeUserRepository };

const buildFakeUserRepository = buildFakeRepositoryBuilder<
  userType,
  customUserRepositoryType
>({
  collectionName: 'users',
  buildCustomFakeRepository: (collection) => ({
    async findAllWithNoDeletionDateProjection(projection) {
      return collection
        .filter((user) => !user.deletionDate)
        .map((user) => projectFakeObjects(user, projection));
    },
    async findByEmail(email) {
      const formattedEmail = userModule.lib.formatEmail(email);
      const result = collection.find((user) => user.email === formattedEmail);
      if (!result) {
        throw new Error(`No matching user for email ${email}`);
      }
      return result;
    },
    async updateHashedPassword(userId, hashedPassword) {
      const storedUserIndex = collection.findIndex(({ _id }) => _id === userId);
      if (storedUserIndex === -1) {
        return { success: false };
      }
      collection[storedUserIndex] = {
        ...collection[storedUserIndex],
        passwordLastUpdateDate: Date.now(),
        hashedPassword,
      };
      return { success: true };
    },
  }),
});
