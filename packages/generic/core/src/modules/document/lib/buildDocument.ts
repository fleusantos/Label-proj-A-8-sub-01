import { omitMongoIdType } from "../../../types";
import { buildMongoId } from "../../../utils";
import { documentType } from "../documentType";

export { buildDocument };

function buildDocument(
  documentFields: omitMongoIdType<documentType>
): documentType {
  return {
    ...documentFields,
    _id: buildMongoId(),
  };
}