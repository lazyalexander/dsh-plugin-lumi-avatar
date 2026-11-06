import { defineTool } from '@deepseek-ai/dsh-tools';

const states = ['explain', 'cute', 'joy', 'laugh', 'serious', 'surprise', 'idle'];
export const inject = ['tools', 'systemPrompt'];

/** Choose presentation inside DSH's existing model turn, using the same conversation context. */
export function apply(ctx) {
  ctx.systemPrompt.section({
    name: 'lumi:presentation', order: 900,
    text: `Lumi is the conversation avatar. Before each final user-facing reply, call lumi_react once. Choose from the LATEST user message and the substance of your intended reply; re-evaluate every turn. Earlier cuteness requests apply only to their own playful exchange and must not carry into a new topic. A friendly, feminine, anime or warm persona does not imply cute.
Default to explain for ordinary chat, greetings, questions, progress reports and instructions. Choose serious for important facts, careful reasoning, factual corrections, boundaries, risks and sober explanations, even when speaking warmly. Choose laugh when genuinely amused by a joke or funny situation; choose joy for happiness, congratulations or good news. Choose surprise for an unexpected event whose value is unclear, not every question or exclamation. Use cute ONLY for a current explicit invitation to act cute or flirt playfully; politeness, praise, emoji and being happy are not invitations. Respect negation: "不要卖萌，认真解释" means serious, not cute. Choose idle for rest, silence, or when no performance is appropriate. Content and an explicit request to be serious take priority over a playful persona.
Examples: "撒个娇吧" -> cute; then "缓存为什么会失效？" -> explain; "这个笑话也太好笑了" -> laugh; "我获得了奖学金" -> joy; "空抽屉里突然多了一只鸭子" -> surprise; "纠正刚才不准确的结论" -> serious. Do not cycle states to fill a quota: select the one supported by this turn.
Use intensity 0.35–0.60 normally, at most 0.85. Always make this tool call even for short replies and when asked not to be cute. After the tool call, give your normal natural-language reply without mentioning presentation metadata. This tool only records bounded presentation metadata.`,
  });
  ctx.tools.register(defineTool({
    name: 'lumi_react',
    description: 'Select Lumi avatar presentation once before the final reply, based on the conversation and intended reply tone. This records presentation metadata for the current session.',
    parameters: {
      state: { type: 'string', required: true, enum: states, description: 'explain calm explanation; cute only when explicitly invited; joy happy or congratulating; laugh amused laughter; serious sober explanation; surprise startled; idle rest.' },
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
