import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api } from './helpers/client.ts'
import { createTestUser, deleteUser, getTestMediaId, type TestUser } from './helpers/setup.ts'

describe('/activity', () => {
  let alice: TestUser
  let bob: TestUser

  beforeAll(async () => {
    alice = await createTestUser('act-alice')
    bob = await createTestUser('act-bob')

    // alice follows bob so bob's activity appears in alice's feed
    await api(`/users/${bob.id}/following`, { method: 'POST', token: alice.accessToken })

    // bob adds a book so there's activity in the feed
    const mediaId = await getTestMediaId(bob.accessToken, 'book')
    await api('/library', {
      method: 'POST',
      token: bob.accessToken,
      body: JSON.stringify({ mediaId, status: 'finished' }),
    })
  })

  afterAll(async () => {
    await Promise.all([deleteUser(alice.id), deleteUser(bob.id)])
  })

  describe('GET /activity', () => {
    it('returns an array with X-Has-More header', async () => {
      const res = await api('/activity', { token: alice.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
      expect(Array.isArray(await res.json())).toBe(true)
    })

    it('activity items include user and media', async () => {
      const res = await api('/activity', { token: alice.accessToken })
      const items = (await res.json()) as {
        activityType: string
        user: object
        media: object
      }[]
      if (items.length > 0) {
        expect(items[0]).toHaveProperty('activityType')
        expect(items[0]).toHaveProperty('user')
        expect(items[0]).toHaveProperty('media')
      }
    })

    it('supports cursor pagination via ?after=', async () => {
      const first = await api('/activity', { token: alice.accessToken })
      const cursor = first.headers.get('x-next-cursor')
      if (!cursor) return // only one page, nothing to test

      const second = await api(`/activity?after=${cursor}`, { token: alice.accessToken })
      expect(second.status).toBe(200)
      expect(second.headers.get('x-has-more')).toMatch(/true|false/)
    })

    it('returns 401 without auth', async () => {
      expect((await api('/activity')).status).toBe(401)
    })
  })
})
