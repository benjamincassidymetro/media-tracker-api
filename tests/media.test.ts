import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api } from './helpers/client.ts'
import { createTestUser, deleteUser, type TestUser } from './helpers/setup.ts'

describe('/media', () => {
  let user: TestUser
  let firstMediaId: number

  beforeAll(async () => {
    user = await createTestUser('media')
    const res = await api('/media', { token: user.accessToken })
    const items = (await res.json()) as { id: number }[]
    firstMediaId = items[0]?.id ?? 1
  })

  afterAll(async () => {
    await deleteUser(user.id)
  })

  describe('GET /media', () => {
    it('returns an array with X-Has-More header', async () => {
      const res = await api('/media', { token: user.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
      expect(Array.isArray(await res.json())).toBe(true)
    })

    it('filters by ?query=', async () => {
      const res = await api('/media?query=Test', { token: user.accessToken })
      expect(res.status).toBe(200)
      const items = (await res.json()) as { title: string }[]
      // All results should contain the search term (case-insensitive)
      items.forEach((item) => expect(item.title.toLowerCase()).toContain('test'))
    })

    it('filters by ?type=book', async () => {
      const res = await api('/media?type=book', { token: user.accessToken })
      expect(res.status).toBe(200)
      const items = (await res.json()) as { mediaType: string }[]
      items.forEach((item) => expect(item.mediaType).toBe('book'))
    })

    it('filters by ?type=movie', async () => {
      const res = await api('/media?type=movie', { token: user.accessToken })
      expect(res.status).toBe(200)
      const items = (await res.json()) as { mediaType: string }[]
      items.forEach((item) => expect(item.mediaType).toBe('movie'))
    })

    it('filters by ?genre=Action', async () => {
      const res = await api('/media?genre=Action', { token: user.accessToken })
      expect(res.status).toBe(200)
      const items = (await res.json()) as { genres: string[] }[]
      items.forEach((item) => expect(item.genres).toContain('Action'))
    })

    it('supports cursor pagination via ?after=', async () => {
      const first = await api('/media', { token: user.accessToken })
      const cursor = first.headers.get('x-next-cursor')
      if (!cursor) return // only one page of data, skip

      const second = await api(`/media?after=${cursor}`, { token: user.accessToken })
      expect(second.status).toBe(200)
      expect(second.headers.get('x-has-more')).toMatch(/true|false/)
    })

    it('returns 401 without auth token', async () => {
      const res = await api('/media')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /media/{id}', () => {
    it('returns full MediaDetail for a valid id', async () => {
      const res = await api(`/media/${firstMediaId}`, { token: user.accessToken })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({
        id: firstMediaId,
        mediaType: expect.any(String),
        title: expect.any(String),
        genres: expect.any(Array),
        averageRating: expect.any(Number),
      })
      // MediaDetail fields
      expect(body).toHaveProperty('description')
      expect(body).toHaveProperty('reviewCount')
    })

    it('returns 404 for unknown id', async () => {
      const res = await api('/media/999999', { token: user.accessToken })
      expect(res.status).toBe(404)
    })
  })
})
