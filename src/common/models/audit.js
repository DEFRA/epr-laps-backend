import { audit } from '@defra/cdp-auditing'

/**
 * @typedef AuditLog
 * @property {string} user_id
 * @property {string} user_email
 * @property {string} user_first_name
 * @property {string} user_last_name
 * @property {string} user_role
 * @property {string} local_authority_name
 * @property {string} actionkind
 * @property {Outcome} outcome
 * @property {Object} action
 */

/**
 * @typedef Outcome
 * @property {string} Success - Success status
 * @property {string} Failure - Failure status
 */

/**
 * Outcome object with Success and Failure properties
 */
export const Outcome = {
  Success: 'Success',
  Failure: 'Failure'
}

export const ActionKind = {
  BankDetailsConfirmed: 'BankDetailsConfirmed',
}

export const writeAuditLog = (decodedToken) => {
  audit({
    user_id: decodedToken.sub,
    user_email: decodedToken.email,
    user_first_name: decodedToken.firstName,
    user_last_name: decodedToken.lastName,
    user_role: decodedToken.role,
    //local_authority_name?
});
}