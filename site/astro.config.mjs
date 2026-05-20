import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://benjamincassidymetro.github.io',
  base: '/media-tracker-api',
  integrations: [tailwind()],
})
