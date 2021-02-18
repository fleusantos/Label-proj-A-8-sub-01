import React from 'react';
import { apiRouteOutType, idModule } from '@label/core';
import { apiCaller } from '../../../../api';
import { ProblemReportIcon, Table, tableRowFieldType, Text } from '../../../../components';
import { timeOperator } from '../../../../services/timeOperator';
import { wordings } from '../../../../wordings';

export { ProblemReportsTable };

const PROBLEM_REPORT_ICON_SIZE = 24;

function ProblemReportsTable(props: {
  problemReportsWithDetails: apiRouteOutType<'get', 'problemReportsWithDetails'>;
}) {
  const optionItems = buildOptionItems();
  return (
    <Table
      isHeaderSticky
      data={props.problemReportsWithDetails}
      fields={problemReportsFields}
      header={problemReportsFields.map(({ id, title, canBeSorted }) => ({
        id,
        canBeSorted,
        content: <Text variant="h3">{title}</Text>,
      }))}
      optionItems={optionItems}
    />
  );
}

function buildOptionItems() {
  return [
    {
      text: wordings.problemReportsPage.table.optionItems.reinjectIntoStream,
      onClick: (problemReportWithDetails: apiRouteOutType<'get', 'problemReportsWithDetails'>[number]) => {
        apiCaller.post<'updateAssignationDocumentStatus'>('updateAssignationDocumentStatus', {
          assignationId: idModule.lib.buildId(problemReportWithDetails.problemReport.assignationId),
          status: 'free',
        });
      },
    },
    {
      text: wordings.problemReportsPage.table.optionItems.reassignToAgent,
      onClick: (problemReportWithDetails: apiRouteOutType<'get', 'problemReportsWithDetails'>[number]) => {
        apiCaller.post<'updateAssignationDocumentStatus'>('updateAssignationDocumentStatus', {
          assignationId: idModule.lib.buildId(problemReportWithDetails.problemReport.assignationId),
          status: 'pending',
        });
      },
    },
  ];
}

const problemReportsFields: Array<tableRowFieldType<apiRouteOutType<'get', 'problemReportsWithDetails'>[number]>> = [
  {
    id: '_id',
    title: wordings.problemReportsPage.table.columnTitles.number,
    canBeSorted: true,
    extractor: (problemReportWithDetails) => idModule.lib.convertToString(problemReportWithDetails.problemReport._id),
  },
  {
    id: 'userName',
    title: wordings.problemReportsPage.table.columnTitles.agent,
    canBeSorted: true,
    extractor: (problemReportWithDetails) => problemReportWithDetails.userName,
  },
  {
    id: 'type',
    canBeSorted: true,
    title: wordings.problemReportsPage.table.columnTitles.type,
    extractor: (problemReportWithDetails) => (
      <ProblemReportIcon type={problemReportWithDetails.problemReport.type} iconSize={PROBLEM_REPORT_ICON_SIZE} />
    ),
  },
  {
    id: 'date',
    title: wordings.problemReportsPage.table.columnTitles.date,
    canBeSorted: true,
    extractor: (problemReportWithDetails) =>
      timeOperator.convertTimestampToReadableDate(problemReportWithDetails.problemReport.date),
  },
  {
    id: 'text',
    canBeSorted: true,
    title: wordings.problemReportsPage.table.columnTitles.text,
    extractor: (problemReportWithDetails) => problemReportWithDetails.problemReport.text,
  },
];
