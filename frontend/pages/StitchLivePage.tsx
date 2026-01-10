
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Implementation of manual base64 helpers as per requirements
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const StitchLivePage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Ready to consult Stitch');
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);

  const stopSession = () => {
    setIsActive(false);
    setStatus('Consultation ended');
    if (sessionRef.current) {
        sessionRef.current.then((session: any) => session.close());
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    
    // Stop all audio sources
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
  };

  const startSession = async () => {
    setIsActive(true);
    setStatus('Stitch is booting up...');
    setTranscript([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Get API key from environment (Vite exposes env vars with VITE_ prefix)
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
      }
      const ai = new GoogleGenAI({ apiKey });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Stitch is watching and listening...');
            
            // Audio input streaming (Raw PCM)
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            // Video frame streaming (Image capture)
            intervalRef.current = window.setInterval(() => {
              if (canvasRef.current && videoRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  canvasRef.current.width = 320;
                  canvasRef.current.height = 240;
                  ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                  canvasRef.current.toBlob(async (blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Data = (reader.result as string).split(',')[1];
                        sessionPromise.then(session => session.sendRealtimeInput({
                          media: { data: base64Data, mimeType: 'image/jpeg' }
                        }));
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', 0.6);
                }
              }
            }, 1500); // Send context frame every 1.5s
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle output transcription
            if (message.serverContent?.outputTranscription) {
               const text = message.serverContent.outputTranscription.text;
               setTranscript(prev => [...prev.slice(-4), `Stitch: ${text}`]);
            }

            // Handle model audio output (Raw PCM)
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
            }

            // Handle interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
              console.error('Stitch Connection Error:', e);
              setStatus('Error in signal...');
          },
          onclose: () => {
              setStatus('Signal closed');
              setIsActive(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are the YardFront Stitch Advisor. You see through the users camera. Help them find high-value items at garage sales. When you see something valuable like vintage electronics, mid-century furniture, or collectibles, point it out and give a rough neighborhood market estimate. Be friendly, energetic, and act like a treasure hunting expert. If you see something that looks like junk, suggest it for the free pile.',
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          outputAudioTranscription: {},
        }
      });
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      setStatus('Failed to access camera/mic');
      setIsActive(false);
    }
  };

  useEffect(() => {
    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        sourcesRef.current.forEach(s => s.stop());
    };
  }, []);

  return (
    <div className="flex-grow flex flex-col bg-slate-950 text-white relative overflow-hidden">
      {/* Visual Ambiance */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-blue-900/20 pointer-events-none"></div>
      
      {/* Top Bar */}
      <div className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-xl">
         <div className="flex items-center gap-4">
            <div className="size-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/20">
               <span className="material-symbols-outlined !text-2xl text-white">magic_button</span>
            </div>
            <div>
               <h1 className="text-xl font-black tracking-tight">Stitch Live Hub</h1>
               <div className="flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{status}</p>
               </div>
            </div>
         </div>
         <button onClick={() => window.history.back()} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">close</span>
         </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative flex flex-col">
         <div className="flex-1 bg-black relative overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-all duration-1000 ${isActive ? 'opacity-100 scale-100' : 'opacity-20 scale-110'}`} 
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* HUD Overlay */}
            {isActive && (
              <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute top-10 left-10 p-4 border-l-2 border-t-2 border-orange-500/50 w-24 h-24"></div>
                 <div className="absolute bottom-10 right-10 p-4 border-r-2 border-b-2 border-orange-500/50 w-24 h-24"></div>
                 
                 {/* Live Transcript Stream */}
                 <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 flex flex-col items-center gap-3">
                    {transcript.map((t, i) => (
                      <div key={i} className="bg-black/60 backdrop-blur-md border border-white/10 text-white font-medium text-sm px-6 py-3 rounded-3xl shadow-2xl animate-fadeInUp w-fit">
                         {t}
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {!isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-10">
                 <div className="size-32 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center animate-spin-slow">
                    <span className="material-symbols-outlined !text-6xl text-slate-800">lens_blur</span>
                 </div>
                 <div className="max-w-md space-y-4">
                    <h2 className="text-4xl font-black tracking-tight">Connect Live to Stitch</h2>
                    <p className="text-slate-400 font-medium text-lg leading-relaxed">
                      Point your camera at the yard sale treasures. Stitch identifies value and scouts market trends using your real-time signal.
                    </p>
                 </div>
                 <button 
                  onClick={startSession}
                  className="px-12 py-5 bg-orange-500 text-white rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-orange-500/40 hover:bg-orange-600 transition-all hover:scale-105 active:scale-95"
                 >
                   Open Live Stream
                 </button>
              </div>
            )}
         </div>
      </div>

      {/* Controls Bar */}
      {isActive && (
        <div className="relative z-10 p-10 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex flex-col items-center gap-8">
           <div className="flex items-center gap-12">
              <button className="size-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/10">
                 <span className="material-symbols-outlined text-white !text-3xl">videocam</span>
              </button>
              <button 
                onClick={stopSession}
                className="size-24 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-500/40 hover:scale-110 active:scale-90 transition-all"
              >
                 <span className="material-symbols-outlined !text-5xl">call_end</span>
              </button>
              <button className="size-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/10">
                 <span className="material-symbols-outlined text-white !text-3xl">mic</span>
              </button>
           </div>
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Stitch AI Signal Active</p>
        </div>
      )}
    </div>
  );
};

export default StitchLivePage;
