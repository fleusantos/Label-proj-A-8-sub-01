import { userDtoType } from '../types/userDtoType';
import { buildUserRepository } from '../repository';
import { hasher } from '../../../lib/hasher';
import { jwtSigner } from '../../../lib/jwtSigner';

export { userService };

const userService = {
  async login(user: userDtoType) {
    const userRepository = buildUserRepository();
    const storedUser = await userRepository.findByEmail(user.email);
    const isPasswordValid = await hasher.compare(
      user.password,
      storedUser.password,
    );
    if (!isPasswordValid) {
      throw new Error(
        `The received password does not match the stored one for ${user.email}`,
      );
    }
    const token = jwtSigner.sign(storedUser._id);
    return {
      token,
    };
  },
  async resetPasswordRequest(email: string) {
    const userRepository = buildUserRepository();
    const storedUser = await userRepository.findByEmail(email);
    const resetPasswordRequestToken = jwtSigner.sign(storedUser._id);
    // Here the mailer will be called to send to the user a link to reset his password
    console.log(resetPasswordRequestToken);
    return;
  },
};
