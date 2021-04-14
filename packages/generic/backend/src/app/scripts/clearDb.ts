import { buildAnnotationReportRepository } from '../../modules/annotationReport';
import { buildAssignationRepository } from '../../modules/assignation';
import { buildDocumentRepository } from '../../modules/document';
import { buildMonitoringEntryRepository } from '../../modules/monitoringEntry';
import { buildProblemReportRepository } from '../../modules/problemReport';
import { buildStatisticRepository } from '../../modules/statistic';
import { buildTreatmentRepository } from '../../modules/treatment';
import { buildUserRepository } from '../../modules/user';

export { clearDb };

async function clearDb({
  annotation = true,
  assignation = true,
  document = true,
  monitoringEntry = true,
  problemReport = true,
  statistic = true,
  treatment = true,
  user = true,
}: {
  annotation?: boolean;
  assignation?: boolean;
  document?: boolean;
  monitoringEntry?: boolean;
  problemReport?: boolean;
  statistic?: boolean;
  treatment?: boolean;
  user?: boolean;
}) {
  const repositories = [
    {
      shouldClear: annotation,
      buildRepository: buildAnnotationReportRepository,
    },
    {
      shouldClear: assignation,
      buildRepository: buildAssignationRepository,
    },
    {
      shouldClear: document,
      buildRepository: buildDocumentRepository,
    },
    {
      shouldClear: monitoringEntry,
      buildRepository: buildMonitoringEntryRepository,
    },
    {
      shouldClear: problemReport,
      buildRepository: buildProblemReportRepository,
    },
    {
      shouldClear: statistic,
      buildRepository: buildStatisticRepository,
    },
    {
      shouldClear: treatment,
      buildRepository: buildTreatmentRepository,
    },
    {
      shouldClear: user,
      buildRepository: buildUserRepository,
    },
  ]
    .filter(({ shouldClear }) => shouldClear)
    .map(({ buildRepository }) => buildRepository());

  await Promise.all(repositories.map((repository) => repository.clear()));
}
