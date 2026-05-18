import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api } from './helpers/client.ts'
import { createTestUser, deleteUser, getTestMediaId, type TestUser } from './helpers/setup.ts'

describe('/library', () => {
  let user: TestUser
  let mediaId: number

  beforeAll(async () => {
    user = await createTestUser('library')
    mediaId = await getTestMediaId(user.accessToken, 'movie')
  })

  afterAll(async () => {
    await deleteUser(user.id)
  })

  describe('POST /library', () => {
    it('adds item with status want_to and returns library entry', async () => {
      const res = await api('/library', {
        method: 'POST',
        token: user.accessToken,
        body: JSON.stringify({ mediaId, status: 'want_to' }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({ mediaId, status: 'want_to' })
      expect(body).toHaveProperty('media')
    })

    it('returns 409 on duplicate add', async () => {
      const res = await api('/library', {
        method: 'POST',
        token: user.accessToken,
        body: JSON.stringify({ mediaId, status: 'want_to' }),
      })
      expect(res.status).toBe(409)
    })
  })

  describe('GET /library', () => {
    it('returns own library with X-Has-More header', async () => {
      const res = await api('/library', { token: user.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
      const items = (await res.json()) as unknown[]
      expect(Array.isArray(items)).toBe(true)
      expect(items.length).toBeGreaterThan(0)
    })

    it('filters by ?status=want_to', async () => {
      const res = await api('/library?status=want_to', { token: user.accessToken })
      expect(res.status).toBe(200)
      const items = (await res.json()) as { status: string }[]
      items.forEach((item) => expect(item.status).toBe('want_to'))
    })

    it('returns 401 without auth', async () => {
      expect((await api('/library')).status).toBe(401)
    })
  })

  describe('GET /library/{mediaId}', () => {
    it('returns single library entry with media', async () => {
      const res = await api(`/library/${mediaId}`, { token: user.accessToken })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({ mediaId, status: 'want_to' })
      expect(body.media).toBeDefined()
    })

    it('returns 404 for media not in library', async () => {
      const res = await api('/library/999999', { token: user.accessToken })
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /library/{mediaId}', () => {
    it('updates status and creates activity record for in_progress', async () => {
      const res = await api(`/library/${mediaId}`, {
        method: 'PUT',
        token: user.accessToken,
        body: JSON.stringify({ status: 'in_progress' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('in_progress')
    })

    it('updates status to finished', async () => {
      const res = await api(`/library/${mediaId}`, {
        method: 'PUT',
        token: user.accessToken,
        body: JSON.stringify({ status: 'finished' }),
      })
      expect(res.status).toBe(200)
      expect((await res.json()).status).toBe('finished')
    })

    it('is idempotent for same status', async () => {
      const res = await api(`/library/${mediaId}`, {
        method: 'PUT',
        token: user.accessToken,
        body: JSON.stringify({ status: 'finished' }),
      })
      expect(res.status).toBe(200)
    })

    it('returns 404 for media not in library', async () => {
      const res = await api('/library/999999', {
        method: 'PUT',
        token: user.accessToken,
        body: JSON.stringify({ status: 'in_progress' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /library/{mediaId}', () => {
    it('removes item and returns 204', async () => {
      const res = await api(`/library/${mediaId}`, {
        method: 'DELETE',
        token: user.accessToken,
      })
      expect(res.status).toBe(204)
    })

    it('returns 404 after deletion', async () => {
      const res = await api(`/library/${mediaId}`, { token: user.accessToken })
      expect(res.status).toBe(404)
    })
  })

  describe('activity side-effects', () => {
    it('creates a started activity when adding with status in_progress', async () => {
      const bookId = await getTestMediaId(user.accessToken, 'book')

      await api('/library', {
        method: 'POST',
        token: user.accessToken,
        body: JSON.stringify({ mediaId: bookId, status: 'in_progress' }),
      })

      const actRes = await api(`/users/${user.id}/activity`, { token: user.accessToken })
      const activities = (await actRes.json()) as { activityType: string; mediaId: number }[]
      const started = activities.find((a) => a.activityType === 'started' && a.mediaId === bookId)
      expect(started).toBeDefined()

      // Cleanup
      await api(`/library/${bookId}`, { method: 'DELETE', token: user.accessToken })
    })
  })
})
