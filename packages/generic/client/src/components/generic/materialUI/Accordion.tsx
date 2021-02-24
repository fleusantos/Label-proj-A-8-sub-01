import React, { CSSProperties, ReactElement } from 'react';
import { Accordion as MuiAccordion, AccordionDetails, AccordionSummary, makeStyles } from '@material-ui/core';
import { customThemeType, useCustomTheme } from '../../../styles';

export { Accordion };

function Accordion(props: {
  headerStyle?: CSSProperties;
  header: ReactElement;
  body: ReactElement;
  onChange: (expanded: boolean) => void;
  style?: CSSProperties;
}): ReactElement {
  const theme = useCustomTheme();
  const accordionClasses = buildAccordionClasses(theme);
  const accordionHeaderClasses = buildAccordionHeaderClasses();

  return (
    <MuiAccordion
      classes={accordionClasses}
      onChange={(_event, expanded) => props.onChange(expanded)}
      style={props.style}
    >
      <AccordionSummary
        classes={{
          content: accordionHeaderClasses.content,
          expanded: accordionHeaderClasses.expanded,
        }}
        style={props.headerStyle}
      >
        {props.header}
      </AccordionSummary>
      <AccordionDetails>{props.body}</AccordionDetails>
    </MuiAccordion>
  );
}

function buildAccordionClasses(theme: customThemeType) {
  return makeStyles({
    rounded: {
      backgroundColor: theme.colors.default.background,
      borderRadius: theme.shape.borderRadius.m,
      '&:first-child': {
        borderRadius: theme.shape.borderRadius.m,
      },
      '&:last-child': {
        borderRadius: theme.shape.borderRadius.m,
      },
    },
  })();
}

function buildAccordionHeaderClasses() {
  return makeStyles({
    content: {
      margin: 0,
      '&$expanded': {
        margin: '0',
      },
    },
    expanded: {},
  })();
}
