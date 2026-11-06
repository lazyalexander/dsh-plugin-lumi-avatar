import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { LumiAvatarClient } from './avatar-client.mjs';
import { AvatarPlayback } from './playback.mjs';
import { readPresentation } from './transcript.mjs';

/** One DSH session owns one avatar connection and one current reply. */
export function LumiDock({ sessionId, useSession, useConversation, avatarUrl }) {
  const frame = useRef(null);
  const playback = useRef(null);
  const seen = useRef(null);
  const initialized = useRef(false);
  const [presentation, setPresentation] = useState({ status: 'loading', state: 'idle', reply: '', selected: false });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const running = useSession(state => state.running);
  const openState = useSession(state => state.openState);
  const serialized = useConversation(snapshot => JSON.stringify(readPresentation(snapshot.views.get('chat'))));
  const latest = useMemo(() => JSON.parse(serialized), [serialized]);

  useEffect(() => {
    let alive = true;
    setReady(false); setError('');
    initialized.current = false; seen.current = null;
    setPresentation({ status: 'loading', state: 'idle', reply: '', selected: false });
    const client = new LumiAvatarClient(frame.current, avatarUrl);
    const controller = new AvatarPlayback(client,
      update => { if (alive) setPresentation(previous => ({ ...previous, ...update })); },
      reason => { if (alive) setError(reason.message); });
    playback.current = controller;
    client.connect().then(() => { if (alive) setReady(true); }).catch(reason => { if (alive) setError(reason.message); });
    return () => { alive = false; controller.dispose(); playback.current = null; };
  }, [sessionId, avatarUrl]);

  useEffect(() => {
    if (!ready) return;
    if (running) { setError(''); void playback.current.wait(); }
    else void playback.current.rest();
  }, [ready, running]);

  useEffect(() => {
    if (openState !== 'open') return;
    if (!initialized.current) {
      initialized.current = true; seen.current = latest?.id ?? null;
      return;
    }
    if (!ready || running || !latest || latest.id === seen.current) return;
    seen.current = latest.id;
    setError('');
    void playback.current.play(latest);
  }, [ready, running, openState, latest]);

  return createElement('section', {
    style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
    'aria-label': 'Lumi 人偶', 'data-lumi-status': presentation.status,
    'data-lumi-state': presentation.state, 'data-lumi-reply': presentation.reply,
    'data-lumi-selected': String(presentation.selected),
  },
  createElement('iframe', { ref: frame, title: 'Lumi', style: { width: '100%', height: '100%', minHeight: 0, flex: 1, border: 0, display: 'block' } }),
  error ? createElement('p', { role: 'status' }, error) : null);
}

/** Session-scoped entry point; the native sidebar owns resizing and collapse. */
export function LumiSidebarButton({ sessionId, openAvatar, autoOpened }) {
  useEffect(() => {
    if (autoOpened.has(sessionId) || !matchMedia('(min-width: 1100px)').matches) return;
    autoOpened.add(sessionId);
    openAvatar();
  }, [sessionId, openAvatar, autoOpened]);
  return createElement('button', {
    type: 'button', onClick: openAvatar, title: '打开 Lumi 侧栏',
    'aria-label': '打开 Lumi 侧栏',
    style: { border: '1px solid #dce2ea', borderRadius: 8, padding: '5px 10px', background: 'transparent', color: 'inherit', cursor: 'pointer' },
  }, 'Lumi');
}

export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight'];

/** Register a native right sidebar page and its conversation toolbar entry. */
export function apply(ctx, config = {}) {
  const avatarUrl = config.avatarUrl || 'http://127.0.0.1:8798/runtime/interaction/';
  const autoOpened = new Set();
  const openAvatar = () => ctx.sidebarRight.openTab('lumi-avatar');
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: 'lumi-avatar', kind: 'lumi-avatar', priority: 'builtin', title: () => 'Lumi',
  }));
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: 'lumi-avatar',
    inject: () => ({ avatarUrl }),
  }, LumiDock));
  for (const name of ['conversation.session.header.utilities', 'conversation.hero.options']) {
    ctx.slots.inject(name, () => ctx.slots.register({
      name, id: 'lumi-avatar', order: 30,
      inject: () => ({ openAvatar, autoOpened }),
    }, LumiSidebarButton));
  }
}
