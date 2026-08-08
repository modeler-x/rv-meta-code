import '@/styles/app.css';
import { mount } from 'svelte';
import App from '@/App.svelte';
import { initializeApp } from '@/app/bootstrap/initializeApp';

// DB もビルドも無しで画面を見るための差し替え。VITE_RV_STUB=1 のときだけ読み込むので、
// 本番のバンドルにはフィクスチャもスタブも入らない。
if (import.meta.env.VITE_RV_STUB) {
  const { installStubIpc } = await import('@/dev/stubIpc');
  installStubIpc();
}

initializeApp();

const app = mount(App, {
  target: document.getElementById('app') as HTMLElement
});

export default app;
