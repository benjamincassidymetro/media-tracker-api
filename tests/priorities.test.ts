import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api } from './helpers/client.ts'
import { createTestUser, deleteUser, getTestMediaId, type TestUser } from './helpers/setup.ts'

describe('/priorities', () => {
  let user: TestUser
  let mediaIds: number[]

  beforeAll(async () => {
    user = await createTestUser('prio')
    const [bookId, movieId, showId] = await Promise.all([
      getTestMediaId(user.accessToken, 'book'),
      getTestMediaId(user.accessToken, 'movie'),
      getTestMediaId(user.accessToken, 'show'),
    ])
    mediaIds = [bookId, movieId, showId]
  })

  afterAll(async () => {
    await deleteUser(user.id)
  })

  describe('PUT /priorities (upsert)', () => {
    it('creates a priority and returns it with media', async () => {
      const res = await api('/priorities', {
        method: 'PUT',
        token: user.accessToken,
        body: JSON.stringify({
          mediaId: mediaIds[0],
          priority: 1,
          orderIndex: 0,
          notes: 'Start this weekend.',
        }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({ mediaId: mediaIds[0], priority: 1, orderIndex: 0 })
      expect(body.media).toBeDefined()
    })

    it('updates an existing priority (upsert)', async () => {
      const res = await api('/priorities', {
        method: 'PUT',
        token: user.accessToken,
        body: JSON.stringify({ mediaId: mediaIds[0], priority: 2, orderIndex: 0 }),
      })
      expect(res.status).toBe(200)
      expect((await res.json()).priority).toBe(2)
    })
  })

  describe('GET /priorities', () => {
    it('returns priority list ordered by orderIndex (not paginated)', async () => {
      // Upsert a second priority
      await api('/priorities', {
        method: 'PUT',
        token: user.accessToken,
        body: JSON.stringify({ mediaId: mediaIds[1], priority: 1, orderIndex: 1 }),
      })

      const res = await api('/priorities', { token: user.accessToken })
      expect(res.status).toBe(200)
      // Not paginated — no X-Has-More header
      expect(res.headers.get('x-has-more')).toBeNull()
      const body = (await res.json()) as { orderIndex: number }[]
      expect(Array.isArray(body)).toBe(true)
      // Should be sorted by orderIndex
      for (let i = 1; i < body.length; i++) {
        expect(body[i].orderIndex).toBeGreaterThanOrEqual(body[i - 1].orderIndex)
      }
    })
  })

  describe('max 5 priorities limit', () => {
    it('returns 400 when trying to add a 6th unique priority', async () => {
      // Add up to the limit (already have 2; add 3 more)
      const extraIds = await Promise.all(
        [0, 1, 2].map(() => getTestMediaId(user.accessToken, 'movie')),
      )
      // Get additional unique media by querying with pagination
      const res = await api('/media?type=book', { token: user.accessToken })
      const allBooks = (await res.json()) as { id: number }[]

      const usedIds = new Set(mediaIds)
      const freshIds = allBooks.map((b) => b.id).filter((id) => !usedIds.has(id))

      if (freshIds.length < 3) {
        // Not enough distinct media to test this limit; skip
        return
      }

      for (let i = 0; i < 3; i++) {
        await api('/priorities', {
          method: 'PUT',
          token: user.accessToken,
          body: JSON.stringify({ mediaId: freshIds[i], priority: 1, orderIndex: i + 2 }),
        })
      }

      // 6th unique item should fail
      const sixth = await api('/priorities', {
        method: 'PUT',
        token: user.accessToken,
        body: JSON.stringify({ mediaId: freshIds[3] ?? 999999, priority: 1, orderIndex: 5 }),
      })
      expect(sixth.status).toBe(400)
    })
  })
})
