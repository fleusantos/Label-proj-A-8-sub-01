import { documentType } from '../documentType';
import { publicationHandler } from './publicationHandler';

export { getNextStatus };

function getNextStatus({
  publicationCategory,
  status,
  route,
}: Pick<documentType, 'status' | 'publicationCategory' | 'route'>): documentType['status'] {
  switch (status) {
    case 'loaded':
      return 'nlpAnnotating';
    case 'nlpAnnotating':
      if (route === 'automatic') {
        return 'done';
      } else {
        return 'free';
      }
    case 'free':
      return 'pending';
    case 'pending':
      return 'saved';
    case 'saved':
      return publicationHandler.mustBePublished(publicationCategory) ? 'toBePublished' : 'done';
    case 'rejected':
      return publicationHandler.mustBePublished(publicationCategory) ? 'toBePublished' : 'done';
    case 'toBePublished':
      return 'done';
    default:
      return status;
  }
}
