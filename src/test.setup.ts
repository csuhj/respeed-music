// AudioWorkletNode is not available in jsdom; stub it so @soundtouchjs/audio-worklet
// can be imported without error during tests.
(globalThis as any).AudioWorkletNode = class AudioWorkletNode {
  connect() {}
  disconnect() {}
};
