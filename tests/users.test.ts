import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api, CLIENT_ID, CLIENT_SECRET } from './helpers/client.ts'
import { createTestUser, deleteUser, type TestUser } from './helpers/setup.ts'

describe('/users', () => {
  let alice: TestUser
  let bob: TestUser

  beforeAll(async () => {
    alice = await createTestUser('alice')
    bob = await createTestUser('bob')
  })

  afterAll(async () => {
    await deleteUser(alice.id)
    await deleteUser(bob.id)
  })

  describe('POST /users', () => {
    it('returns 201 with UserProfile on successful registration', async () => {
      const email = `reg-${Date.now()}@test.invalid`
      const res = await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Testing123!',
          username: `newuser${Date.now()}`,
          displayName: 'New User',
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({
        id: expect.any(String),
        email,
        username: expect.any(String),
        displayName: 'New User',
        followerCount: 0,
        followingCount: 0,
        trackedCount: 0,
      })
      // Clean up
      await deleteUser(body.id)
    })

    it('returns 409 on duplicate email', async () => {
      const res = await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: alice.email,
          password: 'Testing123!',
          username: `dup${Date.now()}`,
          displayName: 'Dup',
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(409)
    })

    it('returns 409 on duplicate username', async () => {
      const res = await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: `unique-${Date.now()}@test.invalid`,
          password: 'Testing123!',
          username: alice.username,
          displayName: 'Dup',
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      })
      expect(res.status).toBe(409)
    })

    it('returns 401 on bad client credentials', async () => {
      const res = await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: `newreg-${Date.now()}@test.invalid`,
          password: 'Testing123!',
          username: `newreg${Date.now()}`,
          displayName: 'X',
          clientId: CLIENT_ID,
          clientSecret: 'wrong',
        }),
      })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /users/me', () => {
    it('returns own profile without isFollowing field', async () => {
      const res = await api('/users/me', { token: alice.accessToken })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({ id: alice.id, email: alice.email })
      expect(body).not.toHaveProperty('isFollowing')
    })

    it('returns 401 without auth', async () => {
      const res = await api('/users/me')
      expect(res.status).toBe(401)
    })
  })

  describe('PUT /users/me', () => {
    it('updates displayName and bio', async () => {
      const res = await api('/users/me', {
        method: 'PUT',
        token: alice.accessToken,
        body: JSON.stringify({ displayName: 'Alice Updated', bio: 'Test bio' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({ displayName: 'Alice Updated', bio: 'Test bio' })
    })
  })

  describe('GET /users/search', () => {
    it('returns matching users with pagination headers', async () => {
      const res = await api(`/users/search?query=${alice.username}`, {
        token: alice.accessToken,
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    })
  })

  describe('GET /users/{id}', () => {
    it('returns profile with isFollowing field', async () => {
      const res = await api(`/users/${bob.id}`, { token: alice.accessToken })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({ id: bob.id })
      expect(body).toHaveProperty('isFollowing')
    })

    it('returns 404 for unknown user', async () => {
      const res = await api('/users/00000000-0000-0000-0000-000000000000', {
        token: alice.accessToken,
      })
      expect(res.status).toBe(404)
    })
  })

  describe('POST/DELETE /users/{id}/following', () => {
    it('returns 204 when following a user', async () => {
      const res = await api(`/users/${bob.id}/following`, {
        method: 'POST',
        token: alice.accessToken,
      })
      expect(res.status).toBe(204)
    })

    it('returns 409 when already following', async () => {
      const res = await api(`/users/${bob.id}/following`, {
        method: 'POST',
        token: alice.accessToken,
      })
      expect(res.status).toBe(409)
    })

    it('returns 400 on self-follow', async () => {
      const res = await api(`/users/${alice.id}/following`, {
        method: 'POST',
        token: alice.accessToken,
      })
      expect(res.status).toBe(400)
    })

    it('returns 204 when unfollowing', async () => {
      const res = await api(`/users/${bob.id}/following`, {
        method: 'DELETE',
        token: alice.accessToken,
      })
      expect(res.status).toBe(204)
    })
  })

  describe('GET /users/{id}/followers and /following', () => {
    it('returns followers list with pagination headers', async () => {
      const res = await api(`/users/${bob.id}/followers`, { token: alice.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
      expect(Array.isArray(await res.json())).toBe(true)
    })

    it('returns following list with pagination headers', async () => {
      const res = await api(`/users/${alice.id}/following`, { token: alice.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
      expect(Array.isArray(await res.json())).toBe(true)
    })
  })

  describe('GET /users/{id}/activity and /library', () => {
    it('returns activity list with pagination headers', async () => {
      const res = await api(`/users/${alice.id}/activity`, { token: alice.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
    })

    it('returns library list with pagination headers', async () => {
      const res = await api(`/users/${alice.id}/library`, { token: alice.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
    })
  })
})
