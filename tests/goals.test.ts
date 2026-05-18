import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api } from './helpers/client.ts'
import { createTestUser, deleteUser, type TestUser } from './helpers/setup.ts'

describe('/goals', () => {
  let user: TestUser

  beforeAll(async () => {
    user = await createTestUser('goals')
  })

  afterAll(async () => {
    await deleteUser(user.id)
  })

  describe('POST /goals', () => {
    it('creates a goal and returns it with currentCount', async () => {
      const res = await api('/goals', {
        method: 'POST',
        token: user.accessToken,
        body: JSON.stringify({ year: 2026, mediaType: 'book', targetCount: 24 }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({
        year: 2026,
        mediaType: 'book',
        targetCount: 24,
        currentCount: 0,
      })
    })

    it('returns 409 on duplicate (same user + year + mediaType)', async () => {
      const res = await api('/goals', {
        method: 'POST',
        token: user.accessToken,
        body: JSON.stringify({ year: 2026, mediaType: 'book', targetCount: 12 }),
      })
      expect(res.status).toBe(409)
    })

    it('allows different mediaType for same year', async () => {
      const res = await api('/goals', {
        method: 'POST',
        token: user.accessToken,
        body: JSON.stringify({ year: 2026, mediaType: 'movie', targetCount: 50 }),
      })
      expect(res.status).toBe(201)
    })
  })

  describe('GET /goals', () => {
    it('returns all goals as an array (not paginated)', async () => {
      const res = await api('/goals', { token: user.accessToken })
      expect(res.status).toBe(200)
      // Not paginated — no X-Has-More header
      expect(res.headers.get('x-has-more')).toBeNull()
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThanOrEqual(2)
    })

    it('filters by ?year=', async () => {
      const res = await api('/goals?year=2026', { token: user.accessToken })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { year: number }[]
      body.forEach((g) => expect(g.year).toBe(2026))
    })
  })
})
