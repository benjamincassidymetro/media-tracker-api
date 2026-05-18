import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api, CLIENT_ID, CLIENT_SECRET } from './helpers/client.ts'
import { createTestUser, deleteUser, type TestUser } from './helpers/setup.ts'

describe('POST /tokens', () => {
  let user: TestUser

  beforeAll(async () => {
    user = await createTestUser('auth')
  })

  afterAll(async () => {
    await deleteUser(user.id)
  })

  describe('password grant', () => {
    it('returns 200 with accessToken, refreshToken, and user on valid credentials', async () => {
      const res = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'password',
          email: user.email,
          password: user.password,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({ id: user.id, email: user.email }),
      })
    })

    it('returns 401 on wrong password', async () => {
      const res = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'password',
          email: user.email,
          password: 'WrongPassword!',
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(401)
    })

    it('returns 401 on unknown email', async () => {
      const res = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'password',
          email: 'nobody@test.invalid',
          password: 'Testing123!',
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(401)
    })

    it('returns 401 on invalid client credentials', async () => {
      const res = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'password',
          email: user.email,
          password: user.password,
          clientId: CLIENT_ID,
          clientSecret: 'wrong-secret',
        }),
      })
      expect(res.status).toBe(401)
    })

    it('returns 400 when email is missing', async () => {
      const res = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'password',
          password: user.password,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('refresh token grant', () => {
    it('returns 200 with new tokens on valid refresh token', async () => {
      const res = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'refreshToken',
          refreshToken: user.refreshToken,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      })
      // New tokens must differ from original
      expect(body.refreshToken).not.toBe(user.refreshToken)
    })

    it('returns 401 on already-used refresh token (rotation)', async () => {
      // Get a fresh token pair first
      const first = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'password',
          email: user.email,
          password: user.password,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      const { refreshToken } = await first.json()

      // Use it once
      await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'refreshToken',
          refreshToken,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })

      // Second use must be rejected
      const second = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'refreshToken',
          refreshToken,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(second.status).toBe(401)
    })

    it('returns 401 on invalid refresh token', async () => {
      const res = await api('/tokens', {
        method: 'POST',
        body: JSON.stringify({
          grantType: 'refreshToken',
          refreshToken: 'not-a-real-token',
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(401)
    })
  })

  it('returns 400 on unknown grantType', async () => {
    const res = await api('/tokens', {
      method: 'POST',
      body: JSON.stringify({
        grantType: 'client_credentials',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
      }),
    })
    expect(res.status).toBe(400)
  })
})
