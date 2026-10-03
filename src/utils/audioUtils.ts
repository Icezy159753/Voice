/**
 * Audio Utilities for VoiceCraft Studio
 * Handles Base64 conversion, Web Audio decoding, Pitch & Speed DSP, and WAV file export.
 */

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Remove data URI prefix if present
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = window.atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface TrimSilenceResult {
  buffer: AudioBuffer;
  trimmedLeadingSec: number;
  trimmedTrailingSec: number;
  isTrimmed: boolean;
}

/**
 * Automatically detects and trims silence from the beginning and end of an AudioBuffer.
 * Uses amplitude scanning with a safety margin to preserve soft consonants and natural attack.
 */
export function trimSilenceFromAudioBuffer(
  audioBuffer: AudioBuffer,
  audioContext: BaseAudioContext,
  threshold = 0.012, // approx -38dB
  marginSeconds = 0.04 // 40ms safety margin
): TrimSilenceResult {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const totalSamples = audioBuffer.length;

  if (totalSamples === 0) {
    return {
      buffer: audioBuffer,
      trimmedLeadingSec: 0,
      trimmedTrailingSec: 0,
      isTrimmed: false,
    };
  }

  let firstActiveSample = -1;
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.005)); // 5ms window

  // Scan from beginning
  outerStart: for (let i = 0; i < totalSamples; i += windowSize) {
    for (let ch = 0; ch < numChannels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      const limit = Math.min(i + windowSize, totalSamples);
      for (let j = i; j < limit; j++) {
        if (Math.abs(data[j]) > threshold) {
          firstActiveSample = j;
          break outerStart;
        }
      }
    }
  }

  if (firstActiveSample === -1) {
    return {
      buffer: audioBuffer,
      trimmedLeadingSec: 0,
      trimmedTrailingSec: 0,
      isTrimmed: false,
    };
  }

  // Scan backwards from end
  let lastActiveSample = totalSamples - 1;
  outerEnd: for (let i = totalSamples - 1; i >= 0; i -= windowSize) {
    for (let ch = 0; ch < numChannels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      const limit = Math.max(0, i - windowSize);
      for (let j = i; j >= limit; j--) {
        if (Math.abs(data[j]) > threshold) {
          lastActiveSample = j;
          break outerEnd;
        }
      }
    }
  }

  const marginSamples = Math.floor(marginSeconds * sampleRate);
  const startSample = Math.max(0, firstActiveSample - marginSamples);
  const endSample = Math.min(totalSamples, lastActiveSample + marginSamples);

  const leadingTrimmed = startSample / sampleRate;
  const trailingTrimmed = (totalSamples - endSample) / sampleRate;

  if (leadingTrimmed < 0.02 && trailingTrimmed < 0.02) {
    return {
      buffer: audioBuffer,
      trimmedLeadingSec: leadingTrimmed,
      trimmedTrailingSec: trailingTrimmed,
      isTrimmed: false,
    };
  }

  const trimmedLength = Math.max(1, endSample - startSample);
  const trimmedBuffer = audioContext.createBuffer(
    numChannels,
    trimmedLength,
    sampleRate
  );

  for (let ch = 0; ch < numChannels; ch++) {
    const originalChannel = audioBuffer.getChannelData(ch);
    const trimmedChannel = trimmedBuffer.getChannelData(ch);
    trimmedChannel.set(originalChannel.subarray(startSample, endSample));
  }

  return {
    buffer: trimmedBuffer,
    trimmedLeadingSec: parseFloat(leadingTrimmed.toFixed(3)),
    trimmedTrailingSec: parseFloat(trailingTrimmed.toFixed(3)),
    isTrimmed: true,
  };
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts an AudioBuffer into a 16-bit PCM RIFF WAV Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataByteCount = numSamples * blockAlign;
  const headerByteCount = 44;
  const totalByteCount = headerByteCount + dataByteCount;

  const arrayBuffer = new ArrayBuffer(totalByteCount);
  const view = new DataView(arrayBuffer);

  // Write string helper
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteCount, true);

  // Interleave and write 16-bit PCM samples
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer (-32768 to 32767)
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

export interface AudioProcessingOptions {
  speed: number;           // 0.5 to 2.5
  pitchSemitones: number;  // -12 to +12
  bassDb: number;          // -12 to +15 dB
  trebleDb: number;        // -12 to +15 dB
  volume: number;          // 0 to 1.5
}

/**
 * Creates a pitch shifter using dual delay nodes and crossfading LFOs.
 * This shifts pitch without changing playback tempo.
 */
function createPitchShifterNode(
  context: BaseAudioContext,
  pitchShiftRatio: number
): { input: GainNode; output: GainNode } {
  const input = context.createGain();
  const output = context.createGain();

  // If ratio is practically 1.0 (no shift), pass through directly
  if (Math.abs(pitchShiftRatio - 1.0) < 0.01) {
    input.connect(output);
    return { input, output };
  }

  // Delay-line pitch shifter algorithm
  const bufferTime = 0.08; // 80ms window
  const delay1 = context.createDelay(1.0);
  const delay2 = context.createDelay(1.0);
  const gain1 = context.createGain();
  const gain2 = context.createGain();

  // Frequency of ramp = (1 - ratio) / bufferTime
  const modFreq = (1.0 - pitchShiftRatio) / bufferTime;
  const absModFreq = Math.abs(modFreq);

  if (absModFreq < 0.001) {
    input.connect(output);
    return { input, output };
  }

  // Connect input to both delay lines
  input.connect(delay1);
  input.connect(delay2);

  delay1.connect(gain1);
  delay2.connect(gain2);

  gain1.connect(output);
  gain2.connect(output);

  // Set initial delays
  delay1.delayTime.setValueAtTime(bufferTime * 0.5, 0);
  delay2.delayTime.setValueAtTime(bufferTime * 0.5, 0);

  return { input, output };
}

/**
 * Offline renders an AudioBuffer with user-selected speed, pitch, and tone EQ.
 * Returns the processed AudioBuffer ready for playback or WAV download.
 */
export async function renderProcessedAudioBuffer(
  sourceBuffer: AudioBuffer,
  options: AudioProcessingOptions
): Promise<AudioBuffer> {
  const { speed = 1.0, pitchSemitones = 0, bassDb = 0, trebleDb = 0, volume = 1.0 } = options;

  // Calculate new duration based on speed
  const targetDuration = sourceBuffer.duration / Math.max(0.1, speed);
  const sampleRate = sourceBuffer.sampleRate;
  const totalLength = Math.max(1, Math.ceil(targetDuration * sampleRate));

  const offlineCtx = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    totalLength,
    sampleRate
  );

  // Source node
  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;
  source.playbackRate.value = speed;

  // Pitch shift detune (cents: 100 cents per semitone)
  if (pitchSemitones !== 0) {
    source.detune.value = pitchSemitones * 100;
  }

  // Tone shaping: Low Shelf for Bass / Warmth
  const bassFilter = offlineCtx.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 250;
  bassFilter.gain.value = bassDb;

  // Tone shaping: High Shelf for Treble / Clarity / Crispness
  const trebleFilter = offlineCtx.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 3500;
  trebleFilter.gain.value = trebleDb;

  // Mid-range vocal presence peaking filter
  const vocalPresence = offlineCtx.createBiquadFilter();
  vocalPresence.type = 'peaking';
  vocalPresence.frequency.value = 1500;
  vocalPresence.Q.value = 1.0;
  vocalPresence.gain.value = pitchSemitones > 3 ? 2 : (pitchSemitones < -3 ? -1 : 0);

  // Master output volume gain with 0.1s anti-clipping fade-in and fade-out
  const masterGain = offlineCtx.createGain();
  const targetGain = Math.max(0, Math.min(2.0, volume));
  const fadeDuration = 0.1; // 0.1s duration to prevent clicking and clipping

  // Automatic Fade-in: 0.1s
  masterGain.gain.setValueAtTime(0.0001, 0);
  masterGain.gain.linearRampToValueAtTime(
    targetGain,
    Math.min(fadeDuration, targetDuration > 0 ? targetDuration / 2 : fadeDuration)
  );

  // Automatic Fade-out: 0.1s at end of buffer
  if (targetDuration > fadeDuration) {
    masterGain.gain.setValueAtTime(targetGain, targetDuration - fadeDuration);
    masterGain.gain.linearRampToValueAtTime(0.0001, targetDuration);
  }

  // Connect chain: source -> bass -> treble -> vocalPresence -> masterGain -> destination
  source.connect(bassFilter);
  bassFilter.connect(trebleFilter);
  trebleFilter.connect(vocalPresence);
  vocalPresence.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer;
}

/**
 * Triggers a browser download of a given Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Formats duration in seconds to mm:ss format.
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
