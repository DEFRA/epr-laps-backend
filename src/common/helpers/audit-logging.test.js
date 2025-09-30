import { expect } from 'vitest'
import { writeAuditLog } from './audit-logging.js'
import { audit } from '@defra/cdp-auditing'

vi.mock('@defra/cdp-auditing')
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('unique-id')
}))

describe('#writeAuditLog', () => {
  test('Should call cdp audit library with right parameters', () => {
    const mockRequest = {
      auth: {
        credentials: {
          sub: 'user-id',
          email: 'test@testy.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Chief Executive Officer',
          currentOrganisation: 'Test Authority'
        }
      },
      logger: { debug: vi.fn() }
    }
    const action = 'TestAction'
    const outcome = 'Success'

    writeAuditLog(mockRequest, action, outcome)

    expect(mockRequest.logger.debug).toHaveBeenCalled()
    expect(audit).toHaveBeenCalledWith({
      log_id: 'unique-id',
      user_id: 'user-id',
      user_email: 'test@testy.com',
      user_first_name: 'John',
      user_last_name: 'Doe',
      user_role: 'Chief Executive Officer',
      local_authority_name: 'Test Authority',
      action_kind: 'TestAction',
      outcome: 'Success'
    })
  })
})
