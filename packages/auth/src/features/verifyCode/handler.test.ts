/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors located at https://github.com/opencrvs/opencrvs-core/blob/master/AUTHORS.
 */
import { createProductionEnvironmentServer } from '@auth/tests/util'

describe('authenticate handler receives a request', () => {
  let server: any

  beforeEach(async () => {
    server = await createProductionEnvironmentServer()
  })

  describe('user management service says credentials are valid', () => {
    it('verifies a code and generates a token', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const codeService = require('./service')

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const authService = require('../authenticate/service')
      const codeSpy = jest.spyOn(codeService, 'sendVerificationCode')
      jest.spyOn(authService, 'authenticate').mockReturnValue({
        name: [
          {
            use: 'en',
            family: 'Anik',
            given: ['Sadman']
          }
        ],
        userId: '1',
        scope: ['admin'],
        status: 'active',
        mobile: '+345345343',
        email: 'test@test.org'
      })

      const authRes = await server.server.inject({
        method: 'POST',
        url: '/authenticate',
        payload: {
          username: '+345345343',
          password: '2r23432'
        }
      })
      const authCode = codeSpy.mock.calls[0][0]
      const res = await server.server.inject({
        method: 'POST',
        url: '/verifyCode',
        payload: {
          nonce: authRes.result.nonce,
          code: authCode
        }
      })
      expect(res.result.token.split('.')).toHaveLength(3)
      const [, payload] = res.result.token.split('.')
      const body = JSON.parse(Buffer.from(payload, 'base64').toString())
      expect(body.scope).toEqual(['admin'])
      expect(body.sub).toBe('1')
    })
  })
  describe('user auth service says credentials are invalid', () => {
    it('returns a 401 if the code is bad', async () => {
      // eslint-disable-next-line
      const authService = require('../authenticate/service')
      jest.spyOn(authService, 'authenticate').mockReturnValue({
        userId: '1',
        scope: ['admin'],
        status: 'active',
        mobile: '+345345343'
      })
      const authRes = await server.server.inject({
        method: 'POST',
        url: '/authenticate',
        payload: {
          mobile: '+345345343',
          password: '2r23432'
        }
      })
      const badCode = '1'
      const res = await server.server.inject({
        method: 'POST',
        url: '/verifyCode',
        payload: {
          nonce: authRes.result.nonce,
          code: badCode
        }
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
