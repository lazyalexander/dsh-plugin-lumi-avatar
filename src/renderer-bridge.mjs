const SAMPLE_STATES = ['explain', 'cute', 'joy', 'serious', 'surprise', 'idle'];

/** Accept a single parent-owned port after checking the configured host origin. */
export function connectAvatarEmbed(player) {
  const hostOrigin = new URLSearchParams(location.search).get('host_origin');
  if (!hostOrigin || new URL(hostOrigin).origin !== hostOrigin) throw Error('An exact host origin is required');
  let port;
  let closed = false;
  const hello = event => {
    if (closed || port || event.source !== parent || event.origin !== hostOrigin) return;
    if (event.data?.type !== 'lumi.connect' || event.data?.version !== 1 || event.ports.length !== 1) return;
    port = event.ports[0];
    port.onmessage = message => {
      const { id, type, payload } = message.data || {};
      if (typeof id !== 'string' || id.length > 100) return;
      try {
        let result;
        if (type === 'begin') result = player.beginTurn(payload.turn_id, 60);
        else if (type === 'cancel') { player.cancel(); result = { type: 'cancelled' }; }
        else if (type === 'react') {
          if (!SAMPLE_STATES.includes(payload?.gesture?.name) || (!SAMPLE_STATES.includes(payload?.emotion?.name) && payload?.emotion?.name !== 'neutral')) throw Error('Unsupported sample state');
          result = player.respond(payload);
        } else if (type === 'snapshot') {
          const state = player.snapshot();
          result = { state: state.state, gesture: state.gesture, emotion: state.emotion, command_id: state.command_id, speechActive: !!state.speech?.active };
        } else throw Error('Unsupported message');
        port.postMessage({ id, result });
      } catch (error) { port.postMessage({ id, error: String(error.message || error) }); }
    };
    port.start();
    port.postMessage({ type: 'ready', version: 1, states: SAMPLE_STATES });
    removeEventListener('message', hello);
  };
  addEventListener('message', hello);
  parent.postMessage({ type: 'lumi.available', version: 1 }, hostOrigin);
  const dispose = () => { closed = true; removeEventListener('message', hello); port?.close(); player.cancel(); };
  addEventListener('pagehide', dispose, { once: true });
  return dispose;
}
