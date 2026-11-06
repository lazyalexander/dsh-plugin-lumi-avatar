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
    'aria-label': 'Lumi 人偶', 'data-lumi-status': presentation.status,
    'data-lumi-state': presentation.state, 'data-lumi-reply': presentation.reply,
    'data-lumi-selected': String(presentation.selected),
  },
  createElement('iframe', { ref: frame, title: 'Lumi', style: { width: '100%', height: '360px', border: 0 } }),
  error ? createElement('p', { role: 'status' }, error) : null);
}

export const inject = ['slots'];

/** Register Lumi in the active DSH conversation. */
export function apply(ctx, config = {}) {
  const avatarUrl = config.avatarUrl || 'http://127.0.0.1:8798/runtime/interaction/';
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock', id: 'lumi-avatar', order: 30,
    inject: () => ({ avatarUrl }),
  }, LumiDock));
}
