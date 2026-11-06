import { defineTool } from '@deepseek-ai/dsh-tools';

const states = ['explain', 'cute', 'joy', 'serious', 'surprise', 'idle'];
export const inject = ['tools', 'systemPrompt'];

/** Choose presentation inside DSH's existing model turn, using the same conversation context. */
export function apply(ctx) {
  ctx.systemPrompt.section({
    name: 'lumi:presentation', order: 900,
    text: 'Lumi is the conversation avatar. Before each final user-facing reply, call lumi_react once to select its presentation from the current conversation. Use explain for calm explanations, cute for invited playful cuteness, joy for unexpected good news, serious for important facts or sober explanations, surprise for unexpected events whose value is unclear, and idle for quiet rest. Distinguish surprise from positive joy and respect negation and topic changes. Use intensity 0.35–0.60 normally, at most 0.85. After the tool call, give your normal natural-language reply without mentioning the presentation metadata. Call lumi_react with idle even when the user asks to rest, stop performing, or be quiet. This selects a silent resting face and body. Select idle when no gesture is appropriate. The tool only records bounded presentation metadata.',
  });
  ctx.tools.register(defineTool({
    name: 'lumi_react',
    description: 'Select Lumi avatar presentation once before the final reply, based on the conversation and intended reply tone. This records presentation metadata for the current session.',
    parameters: {
      state: { type: 'string', required: true, enum: states, description: 'explain calm explanation; cute playful; joy delighted surprise; serious sober explanation; surprise startled; idle rest.' },
      intensity: { type: 'number', required: true, description: 'Presentation strength from 0 to 0.85, normally 0.35 to 0.60.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: {
        state: { type: 'string', required: true, enum: states },
        intensity: { type: 'number', required: true },
      } },
      render: (_args, value) => [{ type: 'text', text: `Lumi presentation selected: ${value.state}. Continue with the normal reply.` }],
    },
    async execute(args, execution) {
      if (!execution.agent) throw Error('lumi_react requires an owning session');
      if (!states.includes(args.state) || !Number.isFinite(args.intensity) || args.intensity < 0 || args.intensity > .85) throw Error('Invalid Lumi presentation');
      return { state: args.state, intensity: args.intensity };
    },
    presentCall: args => ({ card: 'generic', title: 'Lumi 表现', kind: 'other', rawInput: args }),
  }));
}
