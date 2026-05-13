export interface FileUploadVm {
  isLoaded: boolean;
  fileName: string;
  duration: number;
  error: string | null;
}

export interface PlayerControlsVm {
  isPlaying: boolean;
  fileName: string;
  disabled: boolean;
}

export interface SeekBarVm {
  position: number;
  duration: number;
  disabled: boolean;
}

export interface SpeedControlVm {
  speed: number;     // ratio: 0.5 = 50%, 1.0 = 100%
  disabled: boolean;
}

export interface LoopRegionVm {
  loopEnabled: boolean;
  loopStart: number;   // seconds
  loopEnd: number;     // seconds
  duration: number;    // seconds
}

export interface WaveformVm {
  audioBuffer: AudioBuffer | null;
  position: number;
  duration: number;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
}
