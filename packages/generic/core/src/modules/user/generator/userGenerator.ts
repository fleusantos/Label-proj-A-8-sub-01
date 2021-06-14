import { generatorType } from '../../../types';
import { idModule } from '../../id';
import { userType } from '../userType';

export { userGenerator };

const userGenerator: generatorType<userType> = {
  generate: ({ email, hashedPassword, _id, isActivated, name, role } = {}) => ({
    email: email ? email : 'EMAIL',
    hashedPassword: hashedPassword ? hashedPassword : 'HASHED_PASSWORD',
    _id: _id ? idModule.lib.buildId(_id) : idModule.lib.buildId(),
    isActivated: isActivated !== undefined ? isActivated : true,
    name: name ? name : 'NAME',
    role: role ? role : 'annotator',
  }),
};
