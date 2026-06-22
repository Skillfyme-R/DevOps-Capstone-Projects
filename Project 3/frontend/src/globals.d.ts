declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_API_BASE_URL?: string;
    REACT_APP_PATIENTS_URL?: string;
    REACT_APP_APPOINTMENTS_URL?: string;
    REACT_APP_ANALYTICS_URL?: string;
    REACT_APP_FHIR_BASE_URL?: string;
    [key: string]: string | undefined;
  };
};
