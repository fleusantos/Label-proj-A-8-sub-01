import { graphQLQueryType } from './graphQLTypes';

export { graphQLQuery };

const graphQLQuery = {
  annotations: {
    type: {
      kind: 'list',
      type: {
        kind: 'custom',
        type: 'annotation',
      },
    },
    args: {
      documentId: {
        kind: 'primitive',
        type: 'string',
      },
    },
  },
  document: {
    type: {
      kind: 'custom',
      type: 'document',
    },
    args: {
      documentIdsToExclude: {
        kind: 'list',
        type: {
          kind: 'primitive',
          type: 'id',
        },
      },
    },
  },
  documents: {
    type: {
      kind: 'list',
      type: {
        kind: 'custom',
        type: 'document',
      },
    },
  },
  problemReports: {
    type: {
      kind: 'list',
      type: {
        kind: 'custom',
        type: 'problemReport',
      },
    },
  },
  settings: {
    type: {
      kind: 'custom',
      type: 'settings',
    },
  },
} as const;

// We need this line for type checking
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeCheck: graphQLQueryType = graphQLQuery;
