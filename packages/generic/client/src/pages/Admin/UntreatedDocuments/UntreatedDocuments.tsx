import React, { useState } from 'react';
import { uniq, flatten } from 'lodash';
import { apiRouteOutType, keysOf, userType, documentType } from '@label/core';
import { customThemeType, useCustomTheme } from 'pelta-design-system';
import { DocumentsTableHeader } from '../../../components';
import { localStorage, untreatedDocumentFilterType } from '../../../services/localStorage';
import { filtersType } from '../../../services/filters';
import { heights, widths } from '../../../styles';
import { UntreatedDocumentsTable } from './UntreatedDocumentsTable';

export { UntreatedDocuments };

function UntreatedDocuments(props: {
  untreatedDocuments: apiRouteOutType<'get', 'untreatedDocuments'>;
  users: Array<Pick<userType, '_id' | 'name'>>;
  refetch: () => void;
  isLoading: boolean;
}) {
  const INITIAL_FILTER_VALUES = localStorage.untreatedDocumentsStateHandler.getFilters();
  const INITIAL_SEARCHED_DOCUMENT_NUMBER = localStorage.untreatedDocumentsStateHandler.getSearchedDocumentNumber();
  const [filterValues, setFilterValues] = useState<untreatedDocumentFilterType>(INITIAL_FILTER_VALUES);
  const [searchedDocumentNumber, setSearchedDocumentNumber] = useState<number | undefined>(
    INITIAL_SEARCHED_DOCUMENT_NUMBER,
  );
  const theme = useCustomTheme();
  const styles = buildStyles(theme);

  const filterInfo = extractFilterInfoFromDocuments(props.untreatedDocuments);
  const filteredUntreatedDocuments = searchedDocumentNumber
    ? filterSearchedDocuments(props.untreatedDocuments, searchedDocumentNumber)
    : getFilteredUntreatedDocuments(props.untreatedDocuments, filterValues);

  const filters = buildFilters();
  return (
    <div style={styles.table}>
      <DocumentsTableHeader
        filters={filters}
        resultsCount={filteredUntreatedDocuments.length}
        searchedDocumentNumber={searchedDocumentNumber}
        setSearchedDocumentNumber={setAndStoreSearchedDocumentNumber}
        refetch={props.refetch}
        isLoading={props.isLoading}
      />
      <div style={styles.tableContentContainer}>
        <UntreatedDocumentsTable
          users={props.users}
          untreatedDocuments={filteredUntreatedDocuments}
          refetch={props.refetch}
        />
      </div>
    </div>
  );

  function buildFilters(): Partial<filtersType> {
    return {
      source: {
        value: filterValues.source,
        possibleValues: filterInfo.sources,
        setValue: (source: documentType['source'] | undefined) => setAndStoreFilterValues({ ...filterValues, source }),
      },
      publicationCategoryLetter: {
        value: filterValues.publicationCategoryLetter,
        possibleValues: filterInfo.publicationCategoryLetters,
        setValue: (publicationCategoryLetter: documentType['publicationCategory'][number] | undefined) =>
          setAndStoreFilterValues({ ...filterValues, publicationCategoryLetter }),
      },
      documentCreationDate: {
        value: { startDate: filterValues.documentCreationStartDate, endDate: filterValues.documentCreationEndDate },
        extremumValues: { min: filterInfo.minDocumentCreationDate, max: filterInfo.maxDocumentCreationDate },
        setValue: ({ startDate, endDate }: { startDate: Date | undefined; endDate: Date | undefined }) =>
          setAndStoreFilterValues({
            ...filterValues,
            documentCreationStartDate: startDate,
            documentCreationEndDate: endDate,
          }),
      },
      route: {
        value: filterValues.route,
        setValue: (route: documentType['route'] | undefined) => setAndStoreFilterValues({ ...filterValues, route }),
      },
      jurisdiction: {
        value: filterValues.jurisdiction,
        possibleValues: filterInfo.jurisdictions,
        setValue: (jurisdiction: documentType['decisionMetadata']['jurisdiction'] | undefined) =>
          setAndStoreFilterValues({ ...filterValues, jurisdiction }),
      },
    };
  }

  function setAndStoreFilterValues(filterValues: untreatedDocumentFilterType) {
    localStorage.untreatedDocumentsStateHandler.setFilters(filterValues);
    setFilterValues(filterValues);
  }

  function setAndStoreSearchedDocumentNumber(searchedDocumentNumber: number | undefined) {
    localStorage.untreatedDocumentsStateHandler.setSearchedDocumentNumber(searchedDocumentNumber);
    setSearchedDocumentNumber(searchedDocumentNumber);
  }

  function getFilteredUntreatedDocuments(
    untreatedDocuments: apiRouteOutType<'get', 'untreatedDocuments'>,
    filterValues: untreatedDocumentFilterType,
  ) {
    return untreatedDocuments.filter((untreatedDocument) => {
      return keysOf(filterValues).reduce((accumulator, currentFilterKey) => {
        if (currentFilterKey === 'publicationCategoryLetter' && !!filterValues.publicationCategoryLetter) {
          return (
            accumulator &&
            untreatedDocument.document.publicationCategory.includes(filterValues.publicationCategoryLetter)
          );
        }
        if (currentFilterKey === 'source' && !!filterValues.source) {
          return accumulator && untreatedDocument.document.source === filterValues.source;
        }
        if (currentFilterKey === 'route' && !!filterValues.route) {
          return accumulator && untreatedDocument.document.route === filterValues.route;
        }
        if (currentFilterKey === 'jurisdiction' && !!filterValues.jurisdiction) {
          return accumulator && untreatedDocument.document.jurisdiction === filterValues.jurisdiction;
        }
        if (currentFilterKey === 'documentCreationStartDate' && !!filterValues.documentCreationStartDate) {
          return (
            accumulator &&
            !!untreatedDocument.document.creationDate &&
            untreatedDocument.document.creationDate >= filterValues.documentCreationStartDate.getTime()
          );
        }
        if (currentFilterKey === 'documentCreationEndDate' && !!filterValues.documentCreationEndDate) {
          return (
            accumulator &&
            !!untreatedDocument.document.creationDate &&
            untreatedDocument.document.creationDate <= filterValues.documentCreationEndDate.getTime()
          );
        }
        return accumulator;
      }, true as boolean);
    });
  }

  function filterSearchedDocuments(
    untreatedDocuments: apiRouteOutType<'get', 'untreatedDocuments'>,
    searchedDocumentNumber: number,
  ) {
    return untreatedDocuments.filter((untreatedDocument) =>
      untreatedDocument.document.documentNumber.toString().includes(searchedDocumentNumber.toString()),
    );
  }

  function extractFilterInfoFromDocuments(untreatedDocuments: apiRouteOutType<'get', 'untreatedDocuments'>) {
    const publicationCategoryLetters = uniq(
      flatten(untreatedDocuments.map((untreatedDocument) => untreatedDocument.document.publicationCategory)),
    );
    const sources = uniq(untreatedDocuments.map((untreatedDocument) => untreatedDocument.document.source));
    const jurisdictions = uniq(untreatedDocuments.map((untreatedDocument) => untreatedDocument.document.jurisdiction));
    const creationDates = untreatedDocuments
      .filter(({ document }) => !!document.creationDate)
      .map((untreatedDocument) => untreatedDocument.document.creationDate as number);
    const maxDocumentCreationDate = creationDates.length > 0 ? Math.max(...creationDates) : undefined;
    const minDocumentCreationDate = creationDates.length > 0 ? Math.min(...creationDates) : undefined;
    return {
      publicationCategoryLetters,
      sources,
      jurisdictions,
      minDocumentCreationDate,
      maxDocumentCreationDate,
    };
  }

  function buildStyles(theme: customThemeType) {
    return {
      tableHeaderContainer: {
        height: heights.adminTreatmentsTableHeader,
      },
      tableHeader: {
        paddingTop: theme.spacing * 2,
        paddingRight: theme.spacing * 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      tableRightHeader: {
        display: 'flex',
      },
      searchTextInputContainer: {
        marginRight: theme.spacing * 2,
      },
      tableContentContainer: {
        height: heights.adminTreatmentsTable,
        overflowY: 'auto',
      },
      table: {
        width: widths.adminContent,
        paddingLeft: theme.spacing * 3,
        paddingRight: theme.spacing * 2,
      },
    } as const;
  }
}
