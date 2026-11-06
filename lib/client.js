window.__ModuleLoader__.load({id:"dsh-plugin-lumi-avatar",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.mjs
var client_exports = {};
__export(client_exports, {
  LumiDock: () => LumiDock,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");

// src/avatar-client.mjs
var LumiAvatarClient = class {
  constructor(frame, url) {
    this.frame = frame;
    this.url = new URL(url);
    if (!["http:", "https:"].includes(this.url.protocol)) throw Error("Use an HTTP avatar URL");
    this.pending = /* @__PURE__ */ new Map();
    this.sequence = 0;
    this.closed = false;
    this.port = null;
  }
  async connect() {
    if (this.closed || this.port) throw Error("Avatar connection is already used");
    this.url.searchParams.set("embed", "1");
    this.url.searchParams.set("host_origin", location.origin);
    const channel = new MessageChannel();
    this.port = channel.port1;
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.dispose();
        reject(Error("Avatar startup timed out"));
      }, 12e4);
      this.startup = { reject, timer };
      this.port.onmessage = (event) => {
        const message = event.data;
        if (message.type === "ready" && message.version === 1) {
          clearTimeout(timer);
          this.startup = null;
          resolve(message);
        } else {
          const call = this.pending.get(message.id);
          if (!call) return;
          this.pending.delete(message.id);
          clearTimeout(call.timer);
          if (message.error) call.reject(Error(message.error));
          else call.resolve(message.result);
        }
      };
    });
    this.onavailable = (event) => {
      if (this.closed || event.source !== this.frame.contentWindow || event.origin !== this.url.origin) return;
      if (event.data?.type !== "lumi.available" || event.data.version !== 1) return;
      removeEventListener("message", this.onavailable);
      this.frame.contentWindow.postMessage({ type: "lumi.connect", version: 1 }, this.url.origin, [channel.port2]);
    };
    addEventListener("message", this.onavailable);
    this.frame.src = this.url.href;
    return ready;
  }
  request(type, payload) {
    if (this.closed || !this.port || this.startup) return Promise.reject(Error("Avatar is not ready"));
    const id = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error("Avatar command timed out"));
      }, 5e3);
      this.pending.set(id, { resolve, reject, timer });
      this.port.postMessage({ id, type, payload });
    });
  }
  begin(turnId) {
    return this.request("begin", { turn_id: turnId });
  }
  react(turnId, commandId, state, text = "", intensity = 0.55) {
    return this.request("react", {
      turn_id: turnId,
      command_id: commandId,
      text: text || "\u6211\u5728\u3002",
      gesture: { name: state, intensity },
      emotion: { name: state === "idle" ? "neutral" : state, intensity },
      speak: !!text && state !== "idle"
    });
  }
  cancel() {
    return this.request("cancel");
  }
  dispose() {
    if (this.closed) return;
    this.closed = true;
    removeEventListener("message", this.onavailable);
    if (this.startup) {
      clearTimeout(this.startup.timer);
      this.startup.reject(Error("Avatar disposed"));
      this.startup = null;
    }
    this.port?.close();
    for (const call of this.pending.values()) {
      clearTimeout(call.timer);
      call.reject(Error("Avatar disposed"));
    }
    this.pending.clear();
    this.frame.src = "about:blank";
  }
};

// src/playback.mjs
var AvatarPlayback = class {
  constructor(client, changed, failed) {
    this.client = client;
    this.changed = changed;
    this.failed = failed;
    this.version = 0;
    this.closed = false;
    this.timer = null;
  }
  next() {
    this.version++;
    clearTimeout(this.timer);
    return this.version;
  }
  async wait() {
    const version = this.next();
    try {
      await this.client.begin("dsh-" + crypto.randomUUID());
      if (this.current(version)) this.changed({ status: "listening", state: "idle" });
    } catch (error) {
      this.report(version, error);
    }
  }
  async rest() {
    const version = this.next();
    try {
      await this.client.cancel();
      if (this.current(version)) this.changed({ status: "idle", state: "idle" });
    } catch (error) {
      this.report(version, error);
    }
  }
  async play(reply) {
    const version = this.next();
    const turn = "dsh-" + crypto.randomUUID();
    const command = "reply-" + reply.id;
    try {
      await this.client.begin(turn);
      if (!this.current(version)) return;
      const receipt = await this.client.react(turn, command, reply.reaction.state, reply.text.slice(0, 2e3), reply.reaction.intensity);
      if (!this.current(version)) return;
      if (receipt.type !== "started") throw Error("Avatar rejected the current reply");
      this.changed({ status: "playing", state: reply.reaction.state, reply: reply.id, selected: reply.selected });
      this.poll(version);
    } catch (error) {
      this.report(version, error);
    }
  }
  poll(version) {
    this.timer = setTimeout(async () => {
      if (!this.current(version)) return;
      try {
        const snapshot = await this.client.request("snapshot");
        if (!this.current(version)) return;
        if (snapshot.speechActive || snapshot.state === "acting") this.poll(version);
        else this.changed({ status: "idle", state: "idle" });
      } catch (error) {
        this.report(version, error);
      }
    }, 250);
  }
  current(version) {
    return !this.closed && version === this.version;
  }
  report(version, error) {
    if (!this.current(version)) return;
    this.failed(error);
    this.changed({ status: "error", state: "idle" });
    this.client.cancel().catch(() => {
    });
  }
  dispose() {
    if (this.closed) return;
    this.closed = true;
    this.next();
    this.client.dispose();
  }
};

// src/transcript.mjs
var states = /* @__PURE__ */ new Set(["explain", "cute", "joy", "serious", "surprise", "idle"]);
function readPresentation(chat) {
  if (!chat) return null;
  const nodes = chat.order.slice(-80).map((key) => chat.nodes.get(key));
  const succeeded = /* @__PURE__ */ new Set();
  for (const node of nodes) {
    const result = node?.data?.root;
    if (node?.kind === "tool-call" && result?.kind === "tool-result" && result.name === "lumi_react" && result.isError === false) {
      succeeded.add(String(result.callId));
    }
  }
  const selections = /* @__PURE__ */ new Map();
  let latest = null;
  for (const node of nodes) {
    const data = node?.data;
    if (node?.kind !== "assistant-step" || data?.status !== "settled" || data.finalNode?.interrupted) continue;
    for (const block of data.blocks) {
      if (block.kind !== "tool-call" || block.name !== "lumi_react" || !succeeded.has(String(block.callId))) continue;
      try {
        const value = JSON.parse(block.argsRaw);
        if (states.has(value.state) && Number.isFinite(value.intensity) && value.intensity >= 0 && value.intensity <= 0.85) selections.set(data.turn, value);
      } catch {
      }
    }
    const text = data.blocks.filter((block) => block.kind === "text").map((block) => block.text).join("\n");
    if (text.trim()) latest = {
      id: String(data.finalNode?.seq ?? `${data.turn}-${data.step}`),
      turn: data.turn,
      text,
      reaction: selections.get(data.turn) || { state: "idle", intensity: 0.2 },
      selected: selections.has(data.turn)
    };
  }
  return latest;
}

// src/client.mjs
function LumiDock({ sessionId, useSession, useConversation, avatarUrl }) {
  const frame = (0, import_react.useRef)(null);
  const playback = (0, import_react.useRef)(null);
  const seen = (0, import_react.useRef)(null);
  const initialized = (0, import_react.useRef)(false);
  const [presentation, setPresentation] = (0, import_react.useState)({ status: "loading", state: "idle", reply: "", selected: false });
  const [ready, setReady] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const running = useSession((state) => state.running);
  const openState = useSession((state) => state.openState);
  const serialized = useConversation((snapshot) => JSON.stringify(readPresentation(snapshot.views.get("chat"))));
  const latest = (0, import_react.useMemo)(() => JSON.parse(serialized), [serialized]);
  (0, import_react.useEffect)(() => {
    let alive = true;
    setReady(false);
    setError("");
    initialized.current = false;
    seen.current = null;
    setPresentation({ status: "loading", state: "idle", reply: "", selected: false });
    const client = new LumiAvatarClient(frame.current, avatarUrl);
    const controller = new AvatarPlayback(
      client,
      (update) => {
        if (alive) setPresentation((previous) => ({ ...previous, ...update }));
      },
      (reason) => {
        if (alive) setError(reason.message);
      }
    );
    playback.current = controller;
    client.connect().then(() => {
      if (alive) setReady(true);
    }).catch((reason) => {
      if (alive) setError(reason.message);
    });
    return () => {
      alive = false;
      controller.dispose();
      playback.current = null;
    };
  }, [sessionId, avatarUrl]);
  (0, import_react.useEffect)(() => {
    if (!ready) return;
    if (running) {
      setError("");
      void playback.current.wait();
    } else void playback.current.rest();
  }, [ready, running]);
  (0, import_react.useEffect)(() => {
    if (openState !== "open") return;
    if (!initialized.current) {
      initialized.current = true;
      seen.current = latest?.id ?? null;
      return;
    }
    if (!ready || running || !latest || latest.id === seen.current) return;
    seen.current = latest.id;
    setError("");
    void playback.current.play(latest);
  }, [ready, running, openState, latest]);
  return (0, import_react.createElement)(
    "section",
    {
      "aria-label": "Lumi \u4EBA\u5076",
      "data-lumi-status": presentation.status,
      "data-lumi-state": presentation.state,
      "data-lumi-reply": presentation.reply,
      "data-lumi-selected": String(presentation.selected)
    },
    (0, import_react.createElement)("iframe", { ref: frame, title: "Lumi", style: { width: "100%", height: "360px", border: 0 } }),
    error ? (0, import_react.createElement)("p", { role: "status" }, error) : null
  );
}
var inject = ["slots"];
function apply(ctx, config = {}) {
  const avatarUrl = config.avatarUrl || "http://127.0.0.1:8798/runtime/interaction/";
  ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
    name: "conversation.input.dock",
    id: "lumi-avatar",
    order: 30,
    inject: () => ({ avatarUrl })
  }, LumiDock));
}
return module.exports;}});
