import daisyui from 'daisyui';
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{svelte,ts}'],
  theme: {
    extend: {
      colors: {
        rvAccent: 'var(--rvc-accent)'
      }
    }
  },
  plugins: [daisyui],
  daisyui: {
    themes: false
  }
} satisfies Config;
