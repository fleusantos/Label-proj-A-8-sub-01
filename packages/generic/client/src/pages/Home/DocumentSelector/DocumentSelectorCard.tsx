import React, { useState } from 'react';
import { groupBy, orderBy } from 'lodash';
import { annotationType, fetchedDocumentType, settingsType } from '@label/core';
import { customThemeType, useCustomTheme } from '../../../styles';
import { ButtonWithIcon, CategoryIcon, ComponentsList, PublicationCategoryBadge, Text } from '../../../components';
import { wordings } from '../../../wordings';
import { computeGenericDocumentInfoEntries } from './computeGenericDocumentInfoEntries';
import { computeSpecificDocumentInfoEntries } from './computeSpecificDocumentInfoEntries';

export { DocumentSelectorCard };

const SPECIFIC_DOCUMENT_INFO_ENTRIES = ['chamberName', 'decisionNumber'] as const;
const GENERIC_DOCUMENT_INFO_ENTRIES = ['wordCount', 'annotations', 'linkedEntities', 'entities'] as const;
const CARD_WIDTH = 400;
const CATEGORY_ICON_SIZE = 32;
const MAX_CATEGORIES_SHOWN = 8;

function DocumentSelectorCard(props: {
  choice: { annotations: annotationType[]; document: fetchedDocumentType };
  onSelect: (choice: { document: fetchedDocumentType; annotations: annotationType[] }) => Promise<void>;
  settings: settingsType;
}) {
  const theme = useCustomTheme();
  const [isSelecting, setIsSelecting] = useState(false);
  const styles = buildStyles(theme);
  const specificDocumentInfoEntries = computeSpecificDocumentInfoEntries(props.choice.document);
  const genericDocumentInfoEntries = computeGenericDocumentInfoEntries(
    props.choice.document.text,
    props.choice.annotations,
  );

  const categoryIconsByAnnotation = computeCategoryIconNamesByEntitiesCount(props.choice.annotations);
  const isDocumentPublished = props.choice.document.publicationCategory.length > 0;
  return isDocumentPublished ? (
    <div style={styles.publishedDocumentCardContainer}>
      <div style={styles.publishedDocumentTitleContainer}>
        <PublicationCategoryBadge publicationCategoryLetter={props.choice.document.publicationCategory[0]} />
        <Text variant="h2" weight="bold" style={styles.publishedDocumentTitle}>
          {wordings.homePage.documentSelector.publishedDocumentTitle}
        </Text>
      </div>
      {renderCard()}
    </div>
  ) : (
    renderCard()
  );

  function renderCard() {
    return (
      <div style={styles.card}>
        <Text style={styles.title} variant="h2" weight="bold">
          {props.choice.document.decisionMetadata.juridiction || wordings.homePage.documentSelector.unknownJuridiction}
        </Text>

        <div style={styles.specificDocumentInfoEntryTable}>
          {SPECIFIC_DOCUMENT_INFO_ENTRIES.map((documentInfoEntry) => (
            <div key={documentInfoEntry} style={styles.documentInfoEntryRow}>
              <div style={styles.documentLabelContainer}>
                <Text>{wordings.homePage.documentSelector.specificDocumentInfoEntries[documentInfoEntry]}</Text>
              </div>
              <div style={styles.documentValueContainer}>
                <Text variant="h2" weight="bold">
                  {specificDocumentInfoEntries[documentInfoEntry]}
                </Text>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.genericDocumentInfoEntryTable}>
          {GENERIC_DOCUMENT_INFO_ENTRIES.map((documentInfoEntry) => (
            <div key={documentInfoEntry} style={styles.documentInfoEntryRow}>
              <div style={styles.documentLabelContainer}>
                <Text style={styles.documentLabelText}>
                  {wordings.homePage.documentSelector.genericDocumentInfoEntries[documentInfoEntry]}
                </Text>
              </div>
              <div style={styles.documentValueContainer}>
                <Text variant="h2" weight="bold">
                  {genericDocumentInfoEntries[documentInfoEntry]}
                </Text>
              </div>
            </div>
          ))}
        </div>
        <div style={styles.categoryIconsContainer}>
          <ComponentsList
            components={categoryIconsByAnnotation.map(({ category, entitiesCount }) => (
              <div style={styles.categoryContainer}>
                <div style={styles.categoryIconContainer}>
                  <CategoryIcon category={category} iconSize={CATEGORY_ICON_SIZE} settings={props.settings} />
                </div>
                <div>
                  <Text>{entitiesCount} </Text>
                </div>
              </div>
            ))}
            spaceBetweenComponents={theme.spacing * 3}
          />
        </div>
        <ButtonWithIcon
          iconName="clock"
          color="primary"
          isLoading={isSelecting}
          onClick={onSelect}
          text={wordings.homePage.documentSelector.start}
        />
      </div>
    );

    async function onSelect() {
      setIsSelecting(true);
      try {
        await props.onSelect(props.choice);
      } finally {
        setIsSelecting(false);
      }
    }
  }

  function computeCategoryIconNamesByEntitiesCount(annotations: annotationType[]) {
    return orderBy(
      Object.entries(groupBy(annotations, (annotation) => annotation.category)).map(
        ([category, grouppedAnnotations]) => ({
          entitiesCount: Object.keys(groupBy(grouppedAnnotations, (annotation) => annotation.entityId)).length,
          category,
        }),
      ),
      'entitiesCount',
      'desc',
    ).slice(0, MAX_CATEGORIES_SHOWN);
  }
}

function buildStyles(theme: customThemeType) {
  return {
    publishedDocumentCardContainer: {
      backgroundColor: theme.colors.primary.background,
      borderRadius: theme.shape.borderRadius.m,
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing,
    },
    publishedDocumentTitleContainer: {
      display: 'flex',
      alignItems: 'center',
      paddingLeft: theme.spacing * 2,
      paddingBottom: theme.spacing * 2,
      paddingTop: theme.spacing,
    },
    publishedDocumentTitle: {
      paddingLeft: theme.spacing * 2,
    },
    card: {
      borderRadius: theme.shape.borderRadius.m,
      padding: theme.spacing * 4,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: theme.boxShadow.major.out,
      width: `${CARD_WIDTH}px`,
      backgroundColor: theme.colors.background,
    },
    categoryIconsContainer: {
      display: 'flex',
      flex: 1,
      marginBottom: theme.spacing * 7,
    },
    categoryContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    categoryIconContainer: {
      marginBottom: theme.spacing,
    },
    title: {
      marginBottom: theme.spacing * 4,
    },
    specificDocumentInfoEntryTable: {
      display: 'flex',
      width: '100%',
      flexDirection: 'column',
      marginBottom: theme.spacing * 3,
    },
    genericDocumentInfoEntryTable: {
      display: 'flex',
      width: '100%',
      flexDirection: 'column',
      marginBottom: theme.spacing * 7,
    },
    documentInfoEntryRow: {
      display: 'flex',
      flex: 1,
      alignItems: 'center',
    },
    documentLabelContainer: {
      flex: 1,
      display: 'flex',
      justifyContent: 'flex-end',
      paddingRight: theme.spacing,
    },
    documentValueContainer: {
      flex: 1,
      paddingLeft: theme.spacing,
    },
    documentLabelText: {
      textAlign: 'right',
    },
  } as const;
}
