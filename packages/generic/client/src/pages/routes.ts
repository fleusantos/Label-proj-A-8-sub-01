export { defaultRoutes, routes };

const routes = {
  ADMIN: { getPath: () => '/label/admin' },
  ADMIN_MAIN: { getPath: () => '/label/admin/main/' },
  WORKING_USERS: { getPath: () => '/label/admin/main/working-users' },
  ANNOTATION: { getPath: () => '/label/annotation' },
  ANONYMIZED_DOCUMENT: {
    getPath: (documentId?: string) => `/label/anonymized-document/${documentId || ':documentId'}`,
  },
  DEFAULT: { getPath: () => '/label/' },
  DOCUMENT: { getPath: (documentId?: string) => `/label/admin/document/${documentId || ':documentId'}` },
  LOGIN: { getPath: () => '/label/login' },
  PROBLEM_REPORTS: { getPath: () => '/label/admin/main/problem-reports' },
  RESET_PASSWORD: { getPath: () => '/label/reset-password' },
  PUBLISHABLE_DOCUMENTS: { getPath: () => '/label/publishable-documents' },
  STATISTICS: { getPath: () => '/label/admin/main/statistics' },
  TREATED_DOCUMENTS: { getPath: () => '/label/admin/main/treated-documents' },
  UNTREATED_DOCUMENT: { getPath: () => '/label/admin/main/untreated-documents' },
};

const defaultRoutes = {
  admin: routes.STATISTICS.getPath(),
  annotator: routes.ANNOTATION.getPath(),
  scrutator: routes.STATISTICS.getPath(),
  publicator: routes.PUBLISHABLE_DOCUMENTS.getPath(),
};
