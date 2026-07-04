import '@/styles/app.css';
import { mount } from 'svelte';
import App from '@/App.svelte';
import { initializeApp } from '@/app/bootstrap/initializeApp';

initializeApp();

const app = mount(App, {
  target: document.getElementById('app') as HTMLElement
});

export default app;
