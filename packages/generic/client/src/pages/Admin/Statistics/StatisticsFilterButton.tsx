import React from 'react';
import format from 'string-template';
import { apiRouteOutType, idModule, ressourceFilterType, timeOperator, userType } from '@label/core';
import { Chip, FilterButton, filterType } from '../../../components';
import { wordings } from '../../../wordings';
import { customThemeType, useCustomTheme } from '../../../styles';

export { StatisticsFilterButton };

function StatisticsFilterButton(props: {
  availableStatisticFilters: apiRouteOutType<'get', 'availableStatisticFilters'>;
  users: Omit<userType, 'hashedPassword'>[];
  refetch: (ressourceFilter: ressourceFilterType) => void;
  ressourceFilter: ressourceFilterType;
}) {
  const theme = useCustomTheme();
  const styles = buildStyles(theme);
  const filters = buildFilters();

  return (
    <div style={styles.container}>
      <FilterButton filters={filters} />
      <div style={styles.chipsContainer}>{filters.map(renderFilterChip)}</div>
    </div>
  );

  function buildFilters() {
    const mustHaveAddedAnnotationsFilter = buildMustHaveAddedAnnotationsFilter();
    const mustHaveDeletedAnnotationsFilter = buildMustHaveDeletedAnnotationsFilter();
    const mustHaveModifiedAnnotationsFilter = buildMustHaveModifiedAnnotationsFilter();
    const mustHaveNoModificationsFilter = buildMustHaveNoModificationsFilter();
    const mustHaveResizedBiggerAnnotationsFilter = buildMustHaveResizedBiggerAnnotationsFilter();
    const mustHaveResizedSmallerAnnotationsFilter = buildMustHaveResizedSmallerAnnotationsFilter();
    const publicationCategoryFilter = buildPublicationCategoryFilter();
    const dateIntervalFilter = buildDateIntervalFilter();
    const sourceFilter = buildSourceFilter();
    const userFilter = buildUserFilter();

    return [
      dateIntervalFilter,
      userFilter,
      sourceFilter,
      publicationCategoryFilter,
      mustHaveNoModificationsFilter,
      mustHaveAddedAnnotationsFilter,
      mustHaveResizedBiggerAnnotationsFilter,
      mustHaveDeletedAnnotationsFilter,
      mustHaveResizedSmallerAnnotationsFilter,
      mustHaveModifiedAnnotationsFilter,
    ];

    function buildMustHaveAddedAnnotationsFilter() {
      return {
        kind: 'boolean' as const,
        name: 'mustHaveAddedAnnotations',
        label: wordings.statisticsPage.filter.fields.mustHaveAddedAnnotations,
        checked: props.ressourceFilter.mustHaveAddedAnnotations,
        chipLabel: wordings.business.filters.chips.mustHaveAddedAnnotations,
        onToggle: () => {
          props.refetch({
            ...props.ressourceFilter,
            mustHaveAddedAnnotations: !props.ressourceFilter.mustHaveAddedAnnotations,
          });
        },
      };
    }

    function buildMustHaveDeletedAnnotationsFilter() {
      return {
        kind: 'boolean' as const,
        name: 'mustHaveDeletedAnnotations',
        label: wordings.statisticsPage.filter.fields.mustHaveDeletedAnnotations,
        checked: props.ressourceFilter.mustHaveDeletedAnnotations,
        chipLabel: wordings.business.filters.chips.mustHaveDeletedAnnotations,
        onToggle: () => {
          props.refetch({
            ...props.ressourceFilter,
            mustHaveDeletedAnnotations: !props.ressourceFilter.mustHaveDeletedAnnotations,
          });
        },
      };
    }

    function buildMustHaveModifiedAnnotationsFilter() {
      return {
        kind: 'boolean' as const,
        name: 'mustHaveModifiedAnnotations',
        label: wordings.statisticsPage.filter.fields.mustHaveModifiedAnnotations,
        checked: props.ressourceFilter.mustHaveModifiedAnnotations,
        chipLabel: wordings.business.filters.chips.mustHaveModifiedAnnotations,
        onToggle: () => {
          props.refetch({
            ...props.ressourceFilter,
            mustHaveModifiedAnnotations: !props.ressourceFilter.mustHaveModifiedAnnotations,
          });
        },
      };
    }

    function buildMustHaveNoModificationsFilter() {
      return {
        kind: 'boolean' as const,
        name: 'mustHaveNoModifications',
        label: wordings.statisticsPage.filter.fields.mustHaveNoModifications,
        checked: props.ressourceFilter.mustHaveNoModifications,
        chipLabel: wordings.business.filters.chips.mustHaveNoModifications,
        onToggle: () => {
          props.refetch({
            ...props.ressourceFilter,
            mustHaveNoModifications: !props.ressourceFilter.mustHaveNoModifications,
          });
        },
      };
    }

    function buildMustHaveResizedBiggerAnnotationsFilter() {
      return {
        kind: 'boolean' as const,
        name: 'mustHaveResizedBiggerAnnotations',
        label: wordings.statisticsPage.filter.fields.mustHaveResizedBiggerAnnotations,
        checked: props.ressourceFilter.mustHaveResizedBiggerAnnotations,
        chipLabel: wordings.business.filters.chips.mustHaveResizedBiggerAnnotations,
        onToggle: () => {
          props.refetch({
            ...props.ressourceFilter,
            mustHaveResizedBiggerAnnotations: !props.ressourceFilter.mustHaveResizedBiggerAnnotations,
          });
        },
      };
    }

    function buildMustHaveResizedSmallerAnnotationsFilter() {
      return {
        kind: 'boolean' as const,
        name: 'mustHaveResizedSmallerAnnotations',
        label: wordings.statisticsPage.filter.fields.mustHaveResizedSmallerAnnotations,
        checked: props.ressourceFilter.mustHaveResizedSmallerAnnotations,
        chipLabel: wordings.business.filters.chips.mustHaveResizedSmallerAnnotations,
        onToggle: () => {
          props.refetch({
            ...props.ressourceFilter,
            mustHaveResizedSmallerAnnotations: !props.ressourceFilter.mustHaveResizedSmallerAnnotations,
          });
        },
      };
    }

    function buildPublicationCategoryFilter() {
      return {
        kind: 'dropdown' as const,
        name: 'publicationCategory',
        label: wordings.statisticsPage.filter.fields.publicationCategory,
        possibleValues: props.availableStatisticFilters.publicationCategories,
        value: props.ressourceFilter.publicationCategory,
        onChange: (newPublicationCategory: string | undefined) => {
          if (newPublicationCategory !== undefined) {
            props.refetch({ ...props.ressourceFilter, publicationCategory: newPublicationCategory });
          }
        },
      };
    }

    function buildDateIntervalFilter() {
      return {
        kind: 'dateInterval' as const,
        name: 'dateInterval',
        value: {
          startDate: props.ressourceFilter.startDate ? new Date(props.ressourceFilter.startDate) : undefined,
          endDate: props.ressourceFilter.endDate ? new Date(props.ressourceFilter.endDate) : undefined,
        },
        onChange: (value: { startDate: Date | undefined; endDate: Date | undefined }) => {
          props.refetch({
            ...props.ressourceFilter,
            startDate: value.startDate ? value.startDate.getTime() : undefined,
            endDate: value.endDate ? value.endDate.getTime() : undefined,
          });
        },
      };
    }

    function buildSourceFilter() {
      return {
        kind: 'dropdown' as const,
        name: 'source',
        label: wordings.statisticsPage.filter.fields.source,
        possibleValues: props.availableStatisticFilters.sources,
        value: props.ressourceFilter.source,
        onChange: (newSource: string | undefined) => {
          if (newSource !== undefined) {
            props.refetch({ ...props.ressourceFilter, source: newSource });
          }
        },
      };
    }

    function buildUserFilter() {
      const userName = props.ressourceFilter.userId && findUserNameByUserId(props.ressourceFilter.userId);

      return {
        kind: 'dropdown' as const,
        name: 'user',
        label: wordings.statisticsPage.filter.fields.agents,
        possibleValues: props.users.map(({ name }) => name),
        value: userName,
        onChange: (userName: string | undefined) => {
          if (!userName) {
            return props.refetch({ ...props.ressourceFilter, userId: undefined });
          }
          const userId = findUserIdByUserName(userName);
          if (!!userId) {
            props.refetch({ ...props.ressourceFilter, userId });
          }
        },
      };
    }
  }

  function findUserIdByUserName(userName: userType['name']) {
    const user = props.users.find(({ name }) => name === userName);
    if (user) {
      return user._id;
    }
  }

  function findUserNameByUserId(userId: userType['_id']) {
    const user = props.users.find(({ _id }) => idModule.lib.equalId(userId, _id));
    if (user) {
      return user.name;
    }
  }

  function renderFilterChip(filter: filterType) {
    switch (filter.kind) {
      case 'dropdown':
        if (!filter.value) {
          return undefined;
        }
        return (
          <div style={styles.chipContainer}>
            <Chip label={filter.value} onClose={() => filter.onChange(undefined)} />
          </div>
        );
      case 'boolean':
        if (!filter.checked) {
          return undefined;
        }
        return (
          <div style={styles.chipContainer}>
            <Chip label={filter.chipLabel} onClose={filter.onToggle} />
          </div>
        );
      case 'dateInterval':
        const label = computeDateIntervalChipLabel(filter.value.startDate, filter.value.endDate);
        if (!label) {
          return undefined;
        }
        return (
          <div style={styles.chipContainer}>
            <Chip
              label={label}
              onClose={() => {
                filter.onChange({ startDate: undefined, endDate: undefined });
              }}
            />
          </div>
        );
    }
  }
}

function computeDateIntervalChipLabel(startDate: Date | undefined, endDate: Date | undefined) {
  if (!startDate && endDate) {
    return format(wordings.shared.intervalDate.endDate, {
      endDate: timeOperator.convertTimestampToReadableDate(endDate.getTime(), false),
    });
  }
  if (startDate && !endDate) {
    return format(wordings.shared.intervalDate.startDate, {
      startDate: timeOperator.convertTimestampToReadableDate(startDate.getTime(), false),
    });
  }
  if (startDate && endDate) {
    return format(wordings.shared.intervalDate.both, {
      startDate: timeOperator.convertTimestampToReadableDate(startDate.getTime(), false),
      endDate: timeOperator.convertTimestampToReadableDate(endDate.getTime(), false),
    });
  }
  return undefined;
}

function buildStyles(theme: customThemeType) {
  return {
    container: {
      display: 'flex',
    },
    chipsContainer: {
      paddingLeft: theme.spacing,
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    chipContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing,
    },
  } as const;
}