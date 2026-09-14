import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Image as ImageIcon,
  RotateCw,
  Radio,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Friend, ShowAndTellBeam } from '../types';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';

interface ShowAndTellModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend;
  onBeamImage: (beam: ShowAndTellBeam) => void;
  theme?: 'light' | 'dark';
}

export const ShowAndTellModal: React.FC<ShowAndTellModalProps> = ({
  isOpen,
  onClose,
  friend,
  onBeamImage,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lensEffect, setLensEffect] = useState<'fisheye' | 'clean'>('fisheye');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start real webcam/phone camera with fallback
  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    soundEngine.unlockAudio();
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser.');
        return;
      }

      let stream: MediaStream;
      try {
        // Attempt with facingMode and ideal resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
      } catch (errFacing) {
        console.warn('Requested facingMode failed, falling back to basic video', errFacing);
        // Fallback for laptops and desktops that lack environment camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      setSelectedImage(null);
    } catch (e) {
      console.warn('Camera access unavailable:', e);
      setCameraError('Camera permission blocked or unavailable. You can click Upload Photo to share an image.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Flip between front (user) and back (environment) camera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Capture current frame from live camera
  const captureFrame = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth, video.videoHeight, 640);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Center crop to 1:1 square for optical peephole
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setSelectedImage(dataUrl);
    return dataUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const url = reader.result as string;
          setSelectedImage(url);
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBeamNow = () => {
    soundEngine.unlockAudio();
    soundEngine.playBeamChime();
    nativeBridge.haptic('success');

    let imageToBeam = selectedImage;
    if (!imageToBeam && isCameraActive) {
      imageToBeam = captureFrame();
    }

    if (!imageToBeam) {
      alert('Please turn on your camera or select a photo to beam.');
      return;
    }

    const newBeam: ShowAndTellBeam = {
      id: `beam-${Date.now()}`,
      senderId: 'self',
      senderName: 'You',
      senderAvatar: '🚪',
      imageUrl: imageToBeam,
      caption: caption.trim() || undefined,
      timestamp: new Date(),
      active: true,
    };

    onBeamImage(newBeam);
    stopCamera();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setSelectedImage(null);
      setCaption('');
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className={`w-full max-w-sm rounded-3xl p-4 sm:p-5 flex flex-col shadow-2xl relative border ${
          isLight ? 'bg-white border-neutral-200 text-neutral-900' : 'bg-neutral-900 border-neutral-800 text-white'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition z-20 ${
            isLight ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-start mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold mb-1">
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            <span>Live Camera Beam</span>
          </div>
          <h3 className="text-base font-bold tracking-tight">
            Beam Your Camera to {friend.name}
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
            Displays your live camera perspective right on {friend.name}'s optical peephole in real time.
          </p>
        </div>

        {/* Optical Viewport / Peephole Display */}
        <div className="relative w-full aspect-square max-h-60 rounded-2xl overflow-hidden bg-neutral-950 border-2 border-neutral-700/80 shadow-inner flex items-center justify-center mb-3 group">
          {isCameraActive ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
                style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
              />

              {/* Live Optical Bezel Overlay */}
              {lensEffect === 'fisheye' && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none bg-radial from-transparent via-black/10 to-black/75 border-[6px] border-neutral-900" />
              )}

              {/* Status Badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-emerald-400 flex items-center gap-1 z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE FEED</span>
              </div>

              {/* Camera Switch button if camera is active */}
              <button
                onClick={toggleCameraFacing}
                title="Switch Camera"
                className="absolute top-2 right-2 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition z-10"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Snapshot Button Overlay */}
              <button
                onClick={captureFrame}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-white text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 z-10"
              >
                <Camera className="w-3.5 h-3.5 text-neutral-950" />
                <span>Freeze Frame</span>
              </button>
            </div>
          ) : selectedImage ? (
            <div className="relative w-full h-full">
              <img
                src={selectedImage}
                alt="Captured beam perspective"
                className={`w-full h-full object-cover transition-all duration-300 ${
                  lensEffect === 'fisheye'
                    ? 'filter contrast-115 saturate-110 scale-105'
                    : ''
                }`}
              />

              {/* Optical fish-eye peephole vignette overlay */}
              {lensEffect === 'fisheye' && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none bg-radial from-transparent via-black/10 to-black/75 border-[6px] border-neutral-900" />
              )}

              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-amber-400 flex items-center gap-1 z-10">
                <Camera className="w-3 h-3 text-amber-400" />
                <span>PHOTO READY</span>
              </div>

              {/* Resume live camera button */}
              <button
                onClick={() => startCamera()}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white border border-white/30 font-semibold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 z-10"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
                <span>Return to Live Cam</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 gap-2">
              {cameraError ? (
                <>
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <span className="text-xs text-neutral-300 font-medium">{cameraError}</span>
                  <button
                    onClick={() => startCamera()}
                    className="mt-2 px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-white border border-neutral-700 font-medium"
                  >
                    Retry Camera
                  </button>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-neutral-500 animate-pulse" />
                  <span className="text-xs">Starting camera stream...</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Source Switchers: Live Cam / Upload */}
        <div className="flex items-center gap-2 mb-2.5">
          <button
            onClick={() => {
              if (isCameraActive) stopCamera();
              else startCamera();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
              isCameraActive
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50'
                : isLight
                ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isCameraActive ? 'Camera Active' : 'Start Camera'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
              isLight
                ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Caption Input */}
        <div className="mb-3">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption: e.g., 'Look outside my window!'"
            maxLength={75}
            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition ${
              isLight
                ? 'bg-neutral-100 border-neutral-300 text-neutral-900 focus:border-amber-500'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-100 focus:border-amber-400'
            }`}
          />
        </div>

        {/* Action Beam Button */}
        <button
          id="trigger-beam-to-door-btn"
          onClick={handleBeamNow}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-neutral-950 font-bold text-sm shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2"
        >
          <Radio className="w-4 h-4 animate-pulse text-neutral-950" />
          <span>Beam Real Camera to {friend.name}'s Door</span>
        </button>

        <span className="text-[10px] text-center text-neutral-500 mt-2">
          Streams your live snapshot to their door peephole instantly.
        </span>
      </motion.div>
    </div>
  );
};
