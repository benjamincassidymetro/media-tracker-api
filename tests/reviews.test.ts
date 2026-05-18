import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api } from './helpers/client.ts'
import { createTestUser, deleteUser, getTestMediaId, type TestUser } from './helpers/setup.ts'

describe('/reviews', () => {
  let alice: TestUser
  let bob: TestUser
  let mediaId: number
  let reviewId: number

  beforeAll(async () => {
    ;[alice, bob] = await Promise.all([createTestUser('rev-alice'), createTestUser('rev-bob')])
    mediaId = await getTestMediaId(alice.accessToken, 'book')
  })

  afterAll(async () => {
    await Promise.all([deleteUser(alice.id), deleteUser(bob.id)])
  })

  describe('POST /reviews', () => {
    it('creates a review and returns it', async () => {
      const res = await api('/reviews', {
        method: 'POST',
        token: alice.accessToken,
        body: JSON.stringify({
          mediaId,
          rating: 4,
          reviewText: 'Great read!',
          shareToFeed: false,
        }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({ mediaId, rating: 4, reviewText: 'Great read!' })
      reviewId = body.id
    })

    it('returns 409 on duplicate review', async () => {
      const res = await api('/reviews', {
        method: 'POST',
        token: alice.accessToken,
        body: JSON.stringify({ mediaId, rating: 3, shareToFeed: false }),
      })
      expect(res.status).toBe(409)
    })

    it('creates an activity record when shareToFeed=true', async () => {
      const shareMediaId = await getTestMediaId(alice.accessToken, 'movie')
      await api('/reviews', {
        method: 'POST',
        token: alice.accessToken,
        body: JSON.stringify({ mediaId: shareMediaId, rating: 5, shareToFeed: true }),
      })

      const actRes = await api(`/users/${alice.id}/activity`, { token: alice.accessToken })
      const activities = (await actRes.json()) as { activityType: string; mediaId: number }[]
      const review = activities.find(
        (a) => a.activityType === 'review' && a.mediaId === shareMediaId,
      )
      expect(review).toBeDefined()
    })
  })

  describe('GET /reviews', () => {
    it('returns reviews filtered by ?mediaId= with pagination headers', async () => {
      const res = await api(`/reviews?mediaId=${mediaId}`, { token: alice.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
      const items = (await res.json()) as { mediaId: number }[]
      items.forEach((item) => expect(item.mediaId).toBe(mediaId))
    })

    it('returns reviews filtered by ?userId=', async () => {
      const res = await api(`/reviews?userId=${alice.id}`, { token: alice.accessToken })
      expect(res.status).toBe(200)
      const items = (await res.json()) as { userId: string }[]
      items.forEach((item) => expect(item.userId).toBe(alice.id))
    })
  })

  describe('PUT /reviews/{id}', () => {
    it('updates the review as the author', async () => {
      const res = await api(`/reviews/${reviewId}`, {
        method: 'PUT',
        token: alice.accessToken,
        body: JSON.stringify({ rating: 5, reviewText: 'Changed my mind, masterpiece.' }),
      })
      expect(res.status).toBe(200)
      expect((await res.json()).rating).toBe(5)
    })

    it('returns 403 when not the author', async () => {
      const res = await api(`/reviews/${reviewId}`, {
        method: 'PUT',
        token: bob.accessToken,
        body: JSON.stringify({ rating: 1 }),
      })
      expect(res.status).toBe(403)
    })

    it('returns 404 for unknown review id', async () => {
      const res = await api('/reviews/999999', {
        method: 'PUT',
        token: alice.accessToken,
        body: JSON.stringify({ rating: 3 }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /reviews/{id}', () => {
    it('returns 403 when not the author', async () => {
      const res = await api(`/reviews/${reviewId}`, {
        method: 'DELETE',
        token: bob.accessToken,
      })
      expect(res.status).toBe(403)
    })

    it('deletes the review and returns 204 as the author', async () => {
      const res = await api(`/reviews/${reviewId}`, {
        method: 'DELETE',
        token: alice.accessToken,
      })
      expect(res.status).toBe(204)
    })
  })
})
