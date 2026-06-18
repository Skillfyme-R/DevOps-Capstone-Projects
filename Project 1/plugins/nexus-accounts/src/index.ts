/**
 * @nexusfinance/plugin-accounts
 *
 * Standalone plugin for account management.
 * This plugin can be installed independently in other services
 * or used as part of the full NexusFinance platform.
 *
 * Exports:
 *   - accountRoutes()    Backend route handler
 *   - Account types      TypeScript interfaces
 *   - Account utilities  Helpers (account number generation, interest calc)
 */

export { accountRoutes } from './routes';
export type {
  Account,
  AccountType,
  CreateAccountRequest,
  AccountListResponse,
} from './types';
export { generateAccountNumber, getInterestRate, formatAccountBalance } from './utils';
