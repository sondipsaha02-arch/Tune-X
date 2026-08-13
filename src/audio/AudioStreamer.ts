/**
 * AudioStreamer handles recording from the user's microphone,
 * downsampling native sample rates to 16kHz, and encoding the
 * raw audio to PCM16 base64 format for the Gemini Live API.
 */
export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private speechEqFilter: BiquadFilterNode | null = null;
  
  private onAudioDataCallback: ((base64: string) => void) | null = null;
  private onVolumeCallback: ((volume: number) => void) | null = null;
  private isRecording: boolean = false;

  // Crowded situation & adaptive noise suppression state
  private crowdedMode: boolean = false;
  private ambientNoiseFloor: number = 0.005;
  private speechHangoverCounter: number = 0; // Holds gate open for ~600ms after last speech frame
  private onNoiseStatusCallback: ((status: { noiseFloor: number; isSpeech: boolean; crowdedMode: boolean }) => void) | null = null;

  constructor() {}

  /**
   * Toggles or sets Crowded Situation Noise Isolation mode
   */
  public setCrowdedMode(enabled: boolean): void {
    this.crowdedMode = enabled;
    console.log(`🎙️ AudioStreamer Crowded Mode set to: ${enabled}`);
  }

  public getCrowdedMode(): boolean {
    return this.crowdedMode;
  }

  public setNoiseStatusCallback(cb: (status: { noiseFloor: number; isSpeech: boolean; crowdedMode: boolean }) => void): void {
    this.onNoiseStatusCallback = cb;
  }

  public resumeIfSuspended(): void {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Starts recording audio from the user's microphone.
   * @param onAudioData Callback that receives the base64 encoded PCM16 audio chunks.
   * @param onVolume Callback that receives real-time audio volume (0.0 to 1.0).
   */
  async start(
    onAudioData: (base64: string) => void,
    onVolume?: (volume: number) => void
  ): Promise<void> {
    if (this.isRecording) return;

    this.onAudioDataCallback = onAudioData;
    if (onVolume) this.onVolumeCallback = onVolume;

    try {
      // 1. Request microphone stream with advanced processing flags, fallback to basic if constraints fail
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: { ideal: 48000 },
            sampleSize: 16,
            googNoiseSuppression: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googHighpassFilter: true,
            googAudioMirroring: false,
            googNoiseSuppression2: true,
            googEchoCancellation2: true,
          } as any,
        });
      } catch (constraintErr) {
        console.warn("⚠️ Advanced audio constraints failed, falling back to standard audio stream:", constraintErr);
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      // Initialize Web Audio API context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      const sampleRate = this.audioContext.sampleRate;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 2. Build DSP Noise Reduction Filter Chain
      // A) High-Pass Filter (70Hz): Cuts out low-frequency sub-rumble while preserving full human voice fundamentals
      this.highPassFilter = this.audioContext.createBiquadFilter();
      this.highPassFilter.type = "highpass";
      this.highPassFilter.frequency.value = 70;
      this.highPassFilter.Q.value = 0.5;

      // B) Low-Pass Filter (7950Hz): Preserves full speech spectrum, consonants, sibilants, and fricatives for STT engine
      this.lowPassFilter = this.audioContext.createBiquadFilter();
      this.lowPassFilter.type = "lowpass";
      this.lowPassFilter.frequency.value = 7950;
      this.lowPassFilter.Q.value = 0.5;

      // C) Formant Boost Peaking EQ (2200Hz): +3.0dB presence boost for maximum human voice speech intelligibility
      this.speechEqFilter = this.audioContext.createBiquadFilter();
      this.speechEqFilter.type = "peaking";
      this.speechEqFilter.frequency.value = 2200;
      this.speechEqFilter.gain.value = 3.0;
      this.speechEqFilter.Q.value = 0.8;

      // ScriptProcessorNode for wide cross-browser buffer handling (2048 samples ~ 42ms @ 48kHz)
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      // Connect Node Graph: Source -> HighPass -> LowPass -> SpeechEQ -> Processor -> Destination
      this.sourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.lowPassFilter);
      this.lowPassFilter.connect(this.speechEqFilter);
      this.speechEqFilter.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputBuffer = e.inputBuffer.getChannelData(0);
        const bufferLength = inputBuffer.length;
        
        // 1. Calculate RMS energy of filtered audio stream
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += inputBuffer[i] * inputBuffer[i];
        }
        const rms = Math.sqrt(sum / bufferLength);

        // 2. Adaptive Ambient Noise Floor Estimation
        // Slowly track background crowd noise when audio level is low
        if (rms < this.ambientNoiseFloor * 2.0 || rms < 0.02) {
          this.ambientNoiseFloor = this.ambientNoiseFloor * 0.96 + rms * 0.04;
        }

        // 3. Dynamic Voice Activity Detection & Adaptive Noise Gate
        // Ultra-sensitive threshold so soft speech or Bengali speech nuances aren't missed
        const speechThreshold = Math.max(0.0012, this.ambientNoiseFloor * 1.15);
        const rawSpeechDetected = rms >= speechThreshold;

        // Apply a ~1.2s hangover window (30 frames @ ~42ms/frame) so inter-word pauses and Bengali speech nuances aren't chopped off
        if (rawSpeechDetected) {
          this.speechHangoverCounter = 30;
        } else if (this.speechHangoverCounter > 0) {
          this.speechHangoverCounter--;
        }

        const isSpeechActive = this.speechHangoverCounter > 0;

        if (this.onNoiseStatusCallback) {
          this.onNoiseStatusCallback({
            noiseFloor: this.ambientNoiseFloor,
            isSpeech: isSpeechActive,
            crowdedMode: this.crowdedMode,
          });
        }

        // Create a processed buffer copy with 1.35x soft gain boost for high speech recognition clarity
        const processedBuffer = new Float32Array(bufferLength);

        if (this.crowdedMode) {
          if (!isSpeechActive) {
            // Apply smooth background attenuation (suppress background crowd chatter by ~65% without cutting off speech tails)
            for (let i = 0; i < bufferLength; i++) {
              processedBuffer[i] = inputBuffer[i] * 0.35;
            }
          } else {
            // Speech active: pass audio at full boosted natural amplitude
            for (let i = 0; i < bufferLength; i++) {
              processedBuffer[i] = Math.max(-1.0, Math.min(1.0, inputBuffer[i] * 1.35));
            }
          }
        } else {
          // Standard mode with gentle clarity gain boost
          for (let i = 0; i < bufferLength; i++) {
            processedBuffer[i] = Math.max(-1.0, Math.min(1.0, inputBuffer[i] * 1.35));
          }
        }

        // 4. Map RMS volume to logarithmic scale for UI visualizers
        const volume = Math.min(1.0, (isSpeechActive ? rms : rms * 0.3) * 5.0);
        if (this.onVolumeCallback) {
          this.onVolumeCallback(volume);
        }

        // 5. Downsample filtered Float32 buffer to target 16kHz PCM16 for Gemini
        const downsampled = this.downsample(processedBuffer, sampleRate, 16000);

        // 6. Convert Float32 buffer to PCM16 Int16Array
        const pcm16 = this.float32ToInt16(downsampled);

        // 7. Convert Int16Array buffer to Base64 string
        const base64 = this.int16ToBase64(pcm16);

        if (this.onAudioDataCallback && base64) {
          this.onAudioDataCallback(base64);
        }
      };

      this.isRecording = true;
      console.log(`🎙️ AudioStreamer started recording with DSP Noise Gate & Crowded Mode (native: ${sampleRate}Hz -> target: 16000Hz)`);
    } catch (err) {
      console.error("Failed to start audio recording:", err);
      this.stop();
      throw err;
    }
  }

  /**
   * Stops recording and cleans up resources.
   */
  stop(): void {
    this.isRecording = false;
    this.onAudioDataCallback = null;
    this.onVolumeCallback = null;
    this.onNoiseStatusCallback = null;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.speechEqFilter) {
      this.speechEqFilter.disconnect();
      this.speechEqFilter = null;
    }

    if (this.lowPassFilter) {
      this.lowPassFilter.disconnect();
      this.lowPassFilter = null;
    }

    if (this.highPassFilter) {
      this.highPassFilter.disconnect();
      this.highPassFilter = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      if (this.audioContext.state !== "closed") {
        this.audioContext.close();
      }
      this.audioContext = null;
    }

    console.log("🎙️ AudioStreamer stopped and cleaned up");
  }

  /**
   * Downsamples a Float32Array audio buffer to a target sample rate.
   */
  private downsample(
    buffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array {
    if (inputSampleRate === outputSampleRate) {
      return buffer;
    }

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  /**
   * Converts Float32Array values [-1.0, 1.0] to PCM16 Int16Array values [-32768, 32767].
   */
  private float32ToInt16(buffer: Float32Array): Int16Array {
    const l = buffer.length;
    const int16Array = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1.0, Math.min(1.0, buffer[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Converts an Int16Array to a base64 string.
   */
  private int16ToBase64(int16Array: Int16Array): string {
    const buffer = int16Array.buffer;
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
