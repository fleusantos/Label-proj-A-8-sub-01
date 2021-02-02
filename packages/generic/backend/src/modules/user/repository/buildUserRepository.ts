import { userType } from '@label/core';
import { buildRepositoryBuilder } from '../../../repository';
import { customUserRepositoryType } from './customUserRepositoryType';

export { buildUserRepository };

const buildUserRepository = buildRepositoryBuilder<
  userType,
  customUserRepositoryType
>({
  collectionName: 'users',
  buildCustomRepository: (collection) => ({
    async findByEmail(email) {
      const formattedEmail = email.trim().toLowerCase();
      const result = await collection.findOne({ email: formattedEmail });
      if (!result) {
        throw new Error(`No matching user for email ${email}`);
      }
      return result;
    },
    async updatePassword(user, password) {
      const { result } = await collection.updateOne(
        { _id: user._id },
        { $set: { password } },
      );
      return {
        success: result.ok === 1,
      };
    },
  }),
});
