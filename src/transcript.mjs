const states = new Set(['explain', 'cute', 'joy', 'serious', 'surprise', 'idle']);

/** Read a completed reply and its successfully executed same-turn presentation. */
export function readPresentation(chat) {
  if (!chat) return null;
  const nodes = chat.order.slice(-80).map(key => chat.nodes.get(key));
  const succeeded = new Set();
  for (const node of nodes) {
    const result = node?.data?.root;
    if (node?.kind === 'tool-call' && result?.kind === 'tool-result' && result.name === 'lumi_react' && result.isError === false) {
      succeeded.add(String(result.callId));
    }
  }
  const selections = new Map();
  let latest = null;
  for (const node of nodes) {
    const data = node?.data;
    if (node?.kind !== 'assistant-step' || data?.status !== 'settled' || data.finalNode?.interrupted) continue;
    for (const block of data.blocks) {
      if (block.kind !== 'tool-call' || block.name !== 'lumi_react' || !succeeded.has(String(block.callId))) continue;
      try {
        const value = JSON.parse(block.argsRaw);
        if (states.has(value.state) && Number.isFinite(value.intensity) && value.intensity >= 0 && value.intensity <= .85) selections.set(data.turn, value);
      } catch { /* Invalid tool arguments cannot drive the avatar. */ }
    }
    const text = data.blocks.filter(block => block.kind === 'text').map(block => block.text).join('\n');
    if (text.trim()) latest = {
      id: String(data.finalNode?.seq ?? `${data.turn}-${data.step}`), turn: data.turn,
      text, reaction: selections.get(data.turn) || { state: 'idle', intensity: .2 },
      selected: selections.has(data.turn),
    };
  }
  return latest;
}
