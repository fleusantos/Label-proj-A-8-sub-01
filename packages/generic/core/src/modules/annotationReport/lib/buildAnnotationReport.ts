import { omitMongoIdType } from "../../../types";
import { buildMongoId } from "../../../utils";
import { annotationReportType } from "../annotationReportType";

export { buildAnnotationReport };

function buildAnnotationReport(
  annotationReportFields: omitMongoIdType<annotationReportType>
): annotationReportType {
  return {
    ...annotationReportFields,
    _id: buildMongoId(),
  };
}