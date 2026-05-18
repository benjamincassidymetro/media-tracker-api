import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { api } from './helpers/client.ts'
import { createTestUser, deleteUser, getTestMediaId, type TestUser } from './helpers/setup.ts'

describe('/quotes', () => {
  let alice: TestUser
  let bob: TestUser
  let mediaId: number
  let quoteId: number

  beforeAll(async () => {
    ;[alice, bob] = await Promise.all([
      createTestUser('qt-alice'),
      createTestUser('qt-bob'),
    ])
    mediaId = await getTestMediaId(alice.accessToken, 'book')
  })

  afterAll(async () => {
    await Promise.all([deleteUser(alice.id), deleteUser(bob.id)])
  })

  describe('POST /quotes', () => {
    it('creates a quote and returns it', async () => {
      const res = await api('/quotes', {
        method: 'POST',
        token: alice.accessToken,
        body: JSON.stringify({
          mediaId,
          quoteText: 'In the beginning was the Word.',
          pageNumber: 1,
          isPublic: true,
        }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({
        mediaId,
        quoteText: 'In the beginning was the Word.',
        isPublic: true,
        likeCount: 0,
      })
      quoteId = body.id
    })
  })

  describe('GET /quotes', () => {
    it('returns own quotes', async () => {
      const res = await api('/quotes', { token: alice.accessToken })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-has-more')).toMatch(/true|false/)
      const items = (await res.json()) as { userId: string }[]
      items.forEach((q) => expect(q.userId).toBe(alice.id))
    })

    it('returns public quotes with ?public=true', async () => {
      const res = await api('/quotes?public=true', { token: alice.accessToken })
      expect(res.status).toBe(200)
      const items = (await res.json()) as { isPublic: boolean }[]
      items.forEach((q) => expect(q.isPublic).toBe(true))
    })
  })

  describe('PUT /quotes/{id}', () => {
    it('updates the quote as the author', async () => {
      const res = await api(`/quotes/${quoteId}`, {
        method: 'PUT',
        token: alice.accessToken,
        body: JSON.stringify({ isPublic: false }),
      })
      expect(res.status).toBe(200)
      expect((await res.json()).isPublic).toBe(false)
    })

    it('returns 403 when not the author', async () => {
      const res = await api(`/quotes/${quoteId}`, {
        method: 'PUT',
        token: bob.accessToken,
        body: JSON.stringify({ isPublic: true }),
      })
      expect(res.status).toBe(403)
    })
  })

  describe('POST/DELETE /quotes/{id}/likes', () => {
    it('likes a quote and returns 204', async () => {
      const res = await api(`/quotes/${quoteId}/likes`, {
        method: 'POST',
        token: bob.accessToken,
      })
      expect(res.status).toBe(204)
    })

    it('returns 409 on duplicate like', async () => {
      const res = await api(`/quotes/${quoteId}/likes`, {
        method: 'POST',
        token: bob.accessToken,
      })
      expect(res.status).toBe(409)
    })

    it('unlikes a quote and returns 204', async () => {
      const res = await api(`/quotes/${quoteId}/likes`, {
        method: 'DELETE',
        token: bob.accessToken,
      })
      expect(res.status).toBe(204)
    })
  })

  describe('DELETE /quotes/{id}', () => {
    it('returns 403 when not the author', async () => {
      const res = await api(`/quotes/${quoteId}`, {
        method: 'DELETE',
        token: bob.accessToken,
      })
      expect(res.status).toBe(403)
    })

    it('deletes the quote and returns 204 as the author', async () => {
      const res = await api(`/quotes/${quoteId}`, {
        method: 'DELETE',
        token: alice.accessToken,
      })
      expect(res.status).toBe(204)
    })
  })
})
