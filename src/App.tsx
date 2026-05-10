import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Type, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Upload, 
  Layout, 
  X,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  Zap,
  GraduationCap,
  FileText,
  Volume2,
  Pause,
  Play,
  Mic,
  Square,
  Star,
  Trophy,
  ThumbsUp,
  Target,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { generateContent, generateImage, generateAudio, evaluateSpeech, EnglishLevel, EvaluationResult } from './services/geminiService';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

const BrandLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`${className} bg-white rounded-xl flex items-center justify-center p-1 shadow-sm`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Outer shield frame */}
      <path d="M50 10 L85 25 L85 60 C85 80 50 90 50 90 C50 90 15 80 15 60 L15 25 Z" fill="none" stroke="#00a84d" strokeWidth="4" />
      {/* Leaf details */}
      <path d="M10 30 Q5 35 10 40 M10 45 Q5 50 10 55 M10 60 Q5 65 10 70" fill="none" stroke="#00a84d" strokeWidth="2" strokeLinecap="round" />
      <path d="M90 30 Q95 35 90 40 M90 45 Q95 50 90 55 M90 60 Q95 65 90 70" fill="none" stroke="#00a84d" strokeWidth="2" strokeLinecap="round" />
      {/* People icon/logo center */}
      <circle cx="50" cy="40" r="4" fill="#d00" />
      <circle cx="42" cy="46" r="3" fill="#333" />
      <circle cx="58" cy="46" r="3" fill="#333" />
      <path d="M50 55 Q50 45 40 50 Q35 55 40 75 L60 75 Q65 55 60 50 Q50 45 50 55" fill="#333" />
      <path d="M50 55 L50 75" stroke="white" strokeWidth="2" />
    </svg>
  </div>
);

export default function App() {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<EnglishLevel>("Starters");
  const [apiKey, setApiKey] = useState(localStorage.getItem("GEMINI_API_KEY") || "");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:3");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [readingText, setReadingText] = useState<string | null>(null);
  const [translationText, setTranslationText] = useState<string | null>(null);
  const [vocabulary, setVocabulary] = useState<any[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [generatedTopicName, setGeneratedTopicName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<"generate" | "useInput" | "image">("generate");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  // API Key check on mount
  React.useEffect(() => {
    if (!apiKey) {
      setShowApiKeyModal(true);
    }
  }, []);

  const handleUpdateApiKey = (newKey: string) => {
    const trimmedKey = newKey.trim();
    setApiKey(trimmedKey);
    localStorage.setItem("GEMINI_API_KEY", trimmedKey);
    setShowApiKeyModal(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Image processing
    if (fileType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        if (contentMode === 'generate') setContentMode('useInput');
      };
      reader.readAsDataURL(file);
      return;
    }

    // Document processing
    setIsProcessingFile(true);
    setError(null);

    try {
      let extractedText = "";

      if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Better text extraction preserving line breaks based on Y-coordinates
          let lastY = -1;
          let pageText = "";
          
          for (const item of textContent.items as any[]) {
            const currentY = item.transform[5];
            if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
              pageText += "\n";
            } else if (lastY !== -1) {
              pageText += " ";
            }
            pageText += item.str;
            lastY = currentY;
          }
          
          fullText += pageText + "\n\n";
        }
        extractedText = fullText;
      } else if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (fileName.endsWith('.txt')) {
        extractedText = await file.text();
      } else {
        throw new Error("Định dạng file không hỗ trợ. Vui lòng tải lên PDF, DOCX, TXT hoặc Ảnh.");
      }

      if (extractedText.trim()) {
        setTopic(extractedText.trim());
        setContentMode('useInput');
      } else {
        throw new Error("Không thể trích xuất văn bản từ file này.");
      }
    } catch (err: any) {
      console.error("File processing error:", err);
      setError(err.message || "Lỗi khi xử lý file.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) processFile(file);
      }
    }
  };

  const handleGenerate = async () => {
    if (!topic && !imagePreview) {
      setError("Vui lòng nhập chủ đề hoặc tải ảnh lên.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setReadingText(null);

    try {
      // 1. Generate the optimized prompt and reading text
      const { prompt, readingText, topicName, translation, vocabulary } = await generateContent(
        topic || (contentMode === "useInput" ? "Extract text from image" : "A scene based on the provided image"), 
        level,
        contentMode,
        imagePreview || undefined
      );
      setGeneratedPrompt(prompt);
      setReadingText(readingText);
      setTranslationText(translation);
      setVocabulary(vocabulary);
      setGeneratedTopicName(topicName);
      setShowTranslation(false); // Reset translation toggle
      setAudioUrl(null); // Reset audio when new content is generated
      setEvaluation(null); // Reset evaluation

      // 2. Generate the image and audio in parallel for speed
      setIsAudioLoading(true);
      const [imageUrl, audioUrl] = await Promise.all([
        generateImage(prompt, aspectRatio),
        readingText ? generateAudio(readingText, level).catch(err => {
          console.error("Background audio generation failed", err);
          setError("Không thể tạo âm thanh bài đọc. Bạn vẫn có thể luyện nói bình thường.");
          return null;
        }) : Promise.resolve(null)
      ]);
      
      setGeneratedImage(imageUrl);
      if (audioUrl) {
        setAudioUrl(audioUrl);
      }
      setIsAudioLoading(false);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || String(err);
      if (errorMessage === "QUOTA_EXCEEDED") {
        setError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới hoặc thử lại sau.");
      } else if (errorMessage.includes("safety") || errorMessage.includes("Safety")) {
        setError("Nội dung hoặc hình ảnh bị chặn bởi bộ lọc an toàn. Vui lòng thử chủ đề khác.");
      } else if (errorMessage.includes("403") || errorMessage.includes("API key")) {
        setError("Lỗi xác thực (API Key). Vui lòng kiểm tra cấu hình Secrets.");
      } else if (errorMessage.includes("parsing") || errorMessage.includes("parse")) {
        setError("Lỗi xử lý dữ liệu từ AI. Vui lòng thử lại.");
      } else {
        setError(`Có lỗi xảy ra: ${errorMessage.substring(0, 50)}${errorMessage.length > 50 ? '...' : ''}. Vui lòng thử lại.`);
      }
      setIsAudioLoading(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [studentName, setStudentName] = useState('');
  const [teacherName, setTeacherName] = useState('Mrs. Dung');
  const [showCertificate, setShowCertificate] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const certificateRef = useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use a more generic type as MediaRecorder doesn't natively produce WAV in most browsers
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleEvaluate(audioBlob);
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setEvaluation(null);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      const isPermissionError = 
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        (err.message && err.message.toLowerCase().includes('permission denied'));

      if (isPermissionError) {
        setError("Không thể truy cập micro. Bạn vui lòng: \n1. Nhấn 'Cho phép' khi trình duyệt yêu cầu.\n2. Kiểm tra cài đặt quyền truy cập micro của trình duyệt.\n3. Nhấn nút 'Mở trong tab mới' (góc trên bên phải) để ứng dụng hoạt động tốt nhất.");
      } else {
        setError(`Lỗi micro: ${err.message || "Vui lòng kiểm tra lại thiết bị của bạn."}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Add a tiny delay before stopping to ensure the last words are captured
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 500);
    }
  };

  const handleEvaluate = async (audioBlob: Blob) => {
    if (!readingText) return;

    setIsEvaluating(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          const result = await evaluateSpeech(readingText, base64Audio, level);
          setEvaluation(result);
          setIsEvaluating(false);
        } catch (err: any) {
          console.error("Evaluation error:", err);
          if (err?.message === "QUOTA_EXCEEDED") {
            setError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới hoặc thử lại sau.");
          } else {
            setError("Có lỗi xảy ra khi chấm điểm. Vui lòng thử lại.");
          }
          setIsEvaluating(false);
        }
      };
    } catch (err: any) {
      console.error("Reader error:", err);
      setError("Có lỗi xảy ra khi xử lý audio.");
      setIsEvaluating(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!readingText) return;
    
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(err => {
          console.error("Playback error:", err);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
      return;
    }

    if (isAudioLoading) return;

    setIsPlaying(true);
    setIsAudioLoading(true);
    try {
      const url = await generateAudio(readingText, level);
      setAudioUrl(url);
    } catch (err) {
      console.error("Failed to generate audio", err);
      setError("Không thể tạo âm thanh. Vui lòng thử lại.");
      setIsPlaying(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  // Handle auto-play when audioUrl is first generated
  React.useEffect(() => {
    if (audioUrl && audioRef.current && isPlaying) {
      const audio = audioRef.current;
      audio.load(); // Force reload the new source
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Auto-play error:", err);
          setIsPlaying(false);
        });
      }
    }
  }, [audioUrl]);

  const downloadPoster = async () => {
    if (!posterRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      // Ensure all images are fully loaded before capturing
      const images = posterRef.current.querySelectorAll('img');
      const loadPromises = Array.from(images).map(img => {
        const image = img as HTMLImageElement;
        if (image.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
      });
      
      await Promise.all(loadPromises);
      // Give a delay to ensure layout and fonts are stable
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(posterRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: true, // Enable logging for troubleshooting
        imageTimeout: 15000,
        removeContainer: true,
        onclone: (clonedDoc) => {
          // Remove elements and styles that might crash html2canvas or look bad
          const container = clonedDoc.querySelector('[data-poster-container]') as HTMLElement;
          if (container) {
            container.style.backgroundImage = 'none';
            container.style.boxShadow = 'none';
            container.style.transform = 'none';
            container.style.transition = 'none';
          }
          
          // Remove backdrop-blur and other problematic filters
          const blurredElements = clonedDoc.querySelectorAll('.backdrop-blur-sm, .backdrop-blur-md, .backdrop-blur-lg');
          blurredElements.forEach((el: any) => {
            el.style.backdropFilter = 'none';
            el.style.background = 'rgba(255, 255, 255, 0.9)'; // Fallback to semi-opaque
          });

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
        ignoreElements: (element) => {
          return element.hasAttribute('data-html2canvas-ignore');
        }
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = dataUrl;
      link.download = `Mrs-Dung-Poster-${Date.now()}.png`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      }, 500);

    } catch (err: any) {
      console.error("Critical: Failed to download poster", err);
      // Fallback: If it's a CORS issue or similar, inform the user more specifically if possible
      const msg = err?.message || "";
      if (msg.includes("tainted") || msg.includes("CORS")) {
        setError("Lỗi bản quyền hình ảnh (CORS). Vui lòng thử lại hoặc chụp màn hình kết quả.");
      } else {
        setError("Không thể tải poster tự động. Bạn vui lòng chụp màn hình hoặc thử lại nhé.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certificateRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(certificateRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: true,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const container = clonedDoc.querySelector('[data-certificate-container]') as HTMLElement;
          if (container) {
            container.style.backgroundImage = 'none';
            container.style.boxShadow = 'none';
            container.style.transform = 'none';
          }
          
          const blurredElements = clonedDoc.querySelectorAll('.backdrop-blur-sm, .backdrop-blur-md, .backdrop-blur-lg');
          blurredElements.forEach((el: any) => {
            el.style.backdropFilter = 'none';
          });
        },
        ignoreElements: (element) => {
          return element.hasAttribute('data-html2canvas-ignore');
        }
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = dataUrl;
      link.download = `Certificate_${studentName.replace(/\s+/g, '_') || 'Student'}.png`;
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      }, 500);

    } catch (err) {
      console.error("Failed to download certificate", err);
      setError("Không thể tải giấy chứng nhận. Vui lòng thử lại hoặc chụp màn hình.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 text-[#1A1A1A] font-sans selection:bg-brand-green/10 relative overflow-hidden">
      {/* Decorative Background Icons */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.08] z-0">
        <Star className="absolute top-10 left-10 text-emerald-500" size={120} />
        <Sparkles className="absolute top-1/4 right-20 text-brand-green" size={100} />
        <GraduationCap className="absolute bottom-20 left-1/4 text-brand-green" size={150} />
        <Trophy className="absolute bottom-1/3 right-10 text-emerald-600" size={130} />
        <ImageIcon className="absolute top-1/2 left-10 text-emerald-500" size={80} />
        <Mic className="absolute top-20 right-1/3 text-emerald-600" size={110} />
        <Star className="absolute bottom-10 right-1/4 text-emerald-500" size={90} />
      </div>

      {/* Header */}
      <header className="bg-brand-green border-b border-brand-green-dark sticky top-0 z-50 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BrandLogo className="w-12 h-12" />
              <h1 className="text-2xl font-black tracking-tight text-brand-yellow uppercase">ENGLISH MRS. DUNG</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowApiKeyModal(true)}
                className="flex flex-col items-end group"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all border border-white/20">
                  <Zap size={16} className="text-brand-yellow" />
                  <span className="text-sm font-black text-white">Cài đặt API Key</span>
                </div>
                {!apiKey && (
                  <span className="text-[10px] font-bold text-red-500 mt-1 animate-pulse bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
                    Lấy API key để sử dụng app
                  </span>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-white/80">
                <span className="flex items-center gap-1.5 bg-brand-green-dark/40 px-3 py-1.5 rounded-full"><CheckCircle2 size={16} className="text-brand-yellow" /> HỌC BẰNG CẢ TRÁI TIM</span>
              </div>
            </div>
          </div>
      </header>

      {/* API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border-4 border-emerald-100"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-brand-green shadow-inner">
                  <Zap size={40} className="animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-brand-green-dark uppercase tracking-tight">Cài đặt Gemini API Key</h2>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">
                  Để sử dụng ứng dụng, bạn cần nhập Gemini API Key cá nhân. Điều này giúp bạn có thể sử dụng không giới hạn và hoàn toàn miễn phí.
                </p>
                
                <div className="w-full space-y-4">
                  <div className="text-left">
                    <label className="text-xs font-black text-brand-green uppercase tracking-widest block mb-2 px-1">Nhập API Key</label>
                    <input 
                      type="password"
                      placeholder="AIzaSyB..."
                      defaultValue={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-green/10 focus:border-brand-green transition-all font-mono text-sm"
                    />
                  </div>

                  <a 
                    href="https://aistudio.google.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-brand-green hover:text-brand-green-dark font-bold text-sm underline decoration-2 underline-offset-4 transition-all"
                  >
                    <Languages size={16} />
                    Nhấn vào đây để lấy API Key miễn phí
                  </a>

                  <button
                    onClick={() => handleUpdateApiKey(apiKey)}
                    className="w-full py-4 bg-brand-green hover:bg-brand-green-dark text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] uppercase tracking-widest mt-2"
                  >
                    Lưu và Bắt đầu
                  </button>
                  
                  {apiKey && (
                    <button 
                      onClick={() => setShowApiKeyModal(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest mt-2"
                    >
                      Bỏ qua
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Landing/Hero Section - From Sample Image */}
        <div className="mb-12 flex flex-col items-center justify-center text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <BrandLogo className="w-16 h-16 mb-4" />
            <h2 className="text-2xl md:text-3xl font-black text-brand-green-dark tracking-tighter uppercase mb-2">Master speaking with Mrs. Dung AI</h2>
          </motion.div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-100/50 p-2 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setContentMode("generate")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${contentMode === 'generate' ? 'bg-gradient-to-r from-emerald-500 to-brand-green text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              💡 Chủ đề
            </button>
            <button 
              onClick={() => setContentMode("image")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${contentMode === 'image' ? 'bg-gradient-to-r from-emerald-500 to-brand-green text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              🖼️ Hình ảnh
            </button>
            <button 
              onClick={() => setContentMode("useInput")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${contentMode === 'useInput' ? 'bg-gradient-to-r from-emerald-500 to-brand-green text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              📝 Văn bản
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-emerald-100 space-y-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-50 rounded-full opacity-40 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full opacity-40 blur-2xl" />
              
              <div className="relative z-10 space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-brand-green mb-3 uppercase tracking-wider">
                    {contentMode === "generate" && <><Type size={18} className="text-brand-green" /> Chủ đề hoặc Từ vựng</>}
                    {contentMode === "image" && <><ImageIcon size={18} className="text-brand-green" /> Tải ảnh lên</>}
                    {contentMode === "useInput" && <><FileText size={18} className="text-brand-green" /> Văn bản bài đọc</>}
                  </label>

                  {contentMode === "image" ? (
                    <div 
                      onClick={() => imageInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative w-full aspect-video rounded-2xl border-4 border-dashed transition-all flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden
                        ${isDragging ? 'border-brand-green bg-emerald-50/50' : 'border-emerald-100 bg-emerald-50/30 hover:border-emerald-300 hover:bg-emerald-50'}`}
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <div className="bg-white p-3 rounded-full text-brand-green shadow-xl">
                              <RefreshCw size={24} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                            <Upload size={32} />
                          </div>
                          <div className="text-center group">
                            <p className="font-black text-emerald-800 uppercase text-sm tracking-wide">Nhấn để chọn ảnh</p>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Hoặc kéo thả ảnh vào đây</p>
                          </div>
                        </>
                      )}
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  ) : (
                    <div 
                      className={`relative transition-all duration-200 ${isDragging ? 'scale-[1.02]' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onPaste={handlePaste}
                        placeholder={contentMode === "generate" 
                          ? "Ví dụ: Công viên, Bãi biển, Các bạn nhỏ đang chơi đùa..." 
                          : "Dán văn bản tiếng Anh của bạn vào đây, hoặc kéo thả file PDF, DOCX, TXT, Ảnh vào đây..."}
                        className={`w-full h-40 p-4 bg-emerald-50/30 border-2 rounded-2xl focus:ring-4 focus:ring-brand-green/20 focus:border-brand-green transition-all resize-none text-slate-900 placeholder:text-slate-400 font-semibold
                          ${isDragging ? 'border-brand-green bg-emerald-50' : 'border-slate-100'}`}
                      />
                      {isProcessingFile && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center gap-2 text-emerald-800 font-bold animate-pulse">
                          <RefreshCw className="animate-spin" size={16} />
                          Đang xử lý file...
                        </div>
                      )}
                      {isDragging && (
                        <div className="absolute inset-0 border-4 border-dashed border-emerald-400 bg-emerald-50/30 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none">
                          <Upload size={32} className="text-emerald-600 animate-bounce" />
                          <span className="font-black text-emerald-700 uppercase">Thả file vào đây</span>
                        </div>
                      )}
                    </div>
                  )}

                  {imagePreview && contentMode !== "image" && (
                    <div className="mt-3 flex items-center gap-2 p-2 bg-emerald-100/50 rounded-xl border border-emerald-200">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-emerald-200">
                        <img src={imagePreview} alt="Small preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-800 uppercase truncate">Hình ảnh đã sẵn sàng</span>
                      <button 
                        onClick={() => setImagePreview(null)}
                        className="ml-auto p-1.5 text-emerald-600 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {contentMode === "useInput" && (
                    <div className="mt-2 flex justify-end">
                      <button 
                        onClick={() => docFileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black hover:bg-emerald-200 transition-colors uppercase tracking-wider"
                      >
                        <FileText size={14} />
                        Tải file (PDF, DOCX, TXT, Ảnh)
                      </button>
                      <input 
                        type="file" 
                        ref={docFileInputRef} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processFile(file);
                        }}
                        accept=".pdf,.docx,.txt,image/*"
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-brand-green mb-3 uppercase tracking-wider">
                    <GraduationCap size={18} className="text-emerald-500" />
                    Trình độ Tiếng Anh
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["Starters", "Movers", "Flyers", "A1", "A2", "B1", "B2"] as EnglishLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLevel(lvl)}
                        className={`px-1 py-2 rounded-xl text-[10px] font-black border-2 transition-all
                          ${level === lvl 
                            ? 'bg-brand-green border-brand-green-dark text-white shadow-[0_4px_0_#064e3b] -translate-y-1' 
                            : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-300 hover:bg-emerald-50'}`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 text-lg
                    ${isGenerating 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-emerald-500 to-brand-green hover:from-emerald-600 hover:to-emerald-800 active:scale-[0.98] shadow-emerald-100 hover:shadow-emerald-200'}`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="animate-spin" size={24} />
                      Đang chuẩn bị...
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} className="animate-pulse" />
                      Bắt đầu học ngay!
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-sm font-medium">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="whitespace-pre-line">{error}</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-emerald-100 overflow-hidden min-h-[600px] flex flex-col relative">
              <div className="p-5 border-b-4 border-emerald-50 flex items-center justify-between bg-emerald-50/30">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Nội dung học tập siêu hấp dẫn</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white shadow-sm">
                      <ImageIcon size={16} />
                    </div>
                    <span className="text-sm font-black text-brand-green-dark uppercase tracking-widest">Góc Học Tập Của Bé</span>
                    {readingText && <span className="px-3 py-1 bg-emerald-200 text-emerald-900 text-[10px] font-black rounded-full shadow-sm uppercase">{level}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {generatedImage && (
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedImage;
                        link.download = `illustration-${Date.now()}.png`;
                        link.click();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <ImageIcon size={14} />
                      Tải ảnh
                    </button>
                  )}
                  {generatedImage && readingText && (
                    <button 
                      onClick={() => setShowTranslation(!showTranslation)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm
                        ${showTranslation 
                          ? 'bg-brand-green text-white' 
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Languages size={14} />
                      {showTranslation ? 'Ẩn dịch' : 'Hiện dịch'}
                    </button>
                  )}
                  {generatedImage && readingText && (
                    <button 
                      onClick={downloadPoster}
                      disabled={isDownloading}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-lg
                        ${isDownloading 
                          ? 'bg-emerald-400 cursor-not-allowed' 
                          : 'bg-brand-green hover:bg-emerald-700 shadow-emerald-100'}`}
                    >
                      {isDownloading ? (
                        <RefreshCw className="animate-spin" size={14} />
                      ) : (
                        <Download size={14} />
                      )}
                      {isDownloading ? 'Đang xử lý...' : 'Tải Poster (Ảnh + Chữ)'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center p-2 sm:p-6 bg-[#FAFAFA] overflow-auto">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
                      </div>
                      <p className="text-gray-500 font-medium animate-pulse">Gemini đang vẽ và soạn bài đọc cho bạn...</p>
                    </motion.div>
                  ) : (generatedImage && readingText) ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full flex flex-col items-center gap-4"
                    >
                      {/* The Poster to be captured */}
                      <div 
                        ref={posterRef}
                        data-poster-container
                        className="p-4 flex flex-col gap-4 relative overflow-hidden"
                        style={{ 
                          fontFamily: "'Libre Baskerville', serif",
                          backgroundColor: '#ffffff',
                          backgroundImage: 'radial-gradient(#f1f5f9 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                          color: '#1a1a1a',
                          borderRadius: '24px',
                          border: '2px solid #e2e8f0',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                          width: '100%',
                          maxWidth: '600px'
                        }}
                      >
                        {/* Image Section */}
                        <div className="w-full overflow-hidden" style={{ borderRadius: '12px', border: '4px solid #f8fafc', boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                          {generatedImage ? (
                            <img 
                              src={generatedImage} 
                              alt="Generated Illustration" 
                              className="w-full h-auto object-contain"
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full aspect-square flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
                              <ImageIcon style={{ color: '#e5e7eb' }} size={48} />
                            </div>
                          )}
                        </div>

                        {/* Text Section */}
                        <div className="flex-1 p-3" style={{ backgroundColor: '#ffffff', border: '3px solid #00a84d', borderRadius: '16px', boxShadow: '0 4px 0 #0d4023' }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText size={18} style={{ color: '#00a84d' }} />
                              <h2 className="text-base font-black" style={{ color: '#064e3b', margin: 0 }}>Mrs. Dung's Class</h2>
                            </div>
                            <div className="flex items-center gap-2" data-html2canvas-ignore>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayAudio();
                                }}
                                disabled={isAudioLoading && !audioUrl}
                                className="p-2 rounded-full transition-all"
                                style={{ 
                                  backgroundColor: isPlaying ? '#ecfdf5' : isAudioLoading ? '#f3f4f6' : '#f9fafb',
                                  color: isPlaying ? '#059669' : isAudioLoading ? '#d1d5db' : '#9ca3af'
                                }}
                                title={isPlaying ? "Dừng" : "Nghe bài đọc"}
                              >
                                {isAudioLoading && !audioUrl ? (
                                  <RefreshCw size={18} className="animate-spin" />
                                ) : isPlaying ? (
                                  <Pause size={18} />
                                ) : (
                                  <Volume2 size={18} />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Audio Player with Progress/Time - Moved outside text box for better UI and hidden from poster capture */}
                          {audioUrl && (
                            <div className="mb-2 px-2" data-html2canvas-ignore>
                              <audio 
                                ref={audioRef}
                                src={audioUrl}
                                onEnded={() => setIsPlaying(false)}
                                onPause={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                                controls
                                className="w-full h-8 scale-90 origin-left opacity-80 hover:opacity-100 transition-opacity"
                              />
                            </div>
                          )}

                          <div className="space-y-3">
                            {(generatedTopicName || (topic && topic.length < 50)) && (
                              <div className="text-center">
                                <h3 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: '#0369a1', lineHeight: '1.1' }}>
                                  {generatedTopicName || topic}
                                </h3>
                              </div>
                            )}
                            <div className="bg-white/40 p-4 md:p-8 rounded-[2rem] border-2 border-white shadow-lg backdrop-blur-sm mx-auto w-full max-w-[95%]">
                              <div className="text-[11px] font-black uppercase tracking-[0.4em] mb-4 text-center" style={{ color: '#0369a1', opacity: 0.5 }}>READING PASSAGE</div>
                              <div 
                                className="leading-[1.6] whitespace-pre-wrap font-bold text-left md:text-justify px-2" 
                                style={{ 
                                  color: '#1e293b', 
                                  fontSize: readingText && readingText.length > 500 ? '20px' : readingText && readingText.length > 300 ? '24px' : readingText && readingText.length > 150 ? '28px' : '32px',
                                  fontFamily: '"Outfit", sans-serif'
                                }}
                              >
                                {readingText}
                              </div>
                            </div>
                            
                            {showTranslation && translationText && (
                              <div 
                                className="space-y-2 pt-3" 
                                style={{ borderTop: '2px solid #fef3c7' }}
                              >
                                <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#d97706' }}>Tiếng Việt</div>
                                <div className="text-sm sm:text-lg leading-relaxed whitespace-pre-wrap font-bold italic" style={{ color: '#334155' }}>
                                  {translationText}
                                </div>
                              </div>
                            )}
                          </div>

                          {vocabulary && vocabulary.length > 0 && (
                            <div className="mt-6 pt-5" style={{ borderTop: '3px dashed #e2e8f0' }}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                  <Target size={18} />
                                </div>
                                <h3 className="text-base font-black uppercase tracking-widest" style={{ color: '#0369a1' }}>Word Bank</h3>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {vocabulary.map((item, idx) => (
                                  <div key={idx} className="p-4 rounded-2xl flex flex-col transition-all hover:scale-[1.02] shadow-sm hover:shadow-indigo-100 bg-white border-2 border-indigo-100/50">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                      <span className="font-black text-xl leading-tight" style={{ color: '#0c4a6e' }}>{item.word}</span>
                                      <span className="text-sm font-bold font-serif text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 shadow-sm shrink-0">
                                        {item.ipa}
                                      </span>
                                    </div>
                                    <span className="text-base font-medium italic text-slate-700 whitespace-normal leading-relaxed">
                                      {item.meaning}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer in Poster */}
                        <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9ca3af' }}>ENGLISH MRS. DUNG</span>
                          <span className="text-[10px] font-black" style={{ color: '#00a84d' }}>Level: {level}</span>
                        </div>
                      </div>

                      {/* AI Teacher Section - Moved OUTSIDE posterRef */}
                      <div className="w-full max-w-[600px] mt-1 space-y-2">
                        <div className="flex flex-col items-center gap-2 p-3 bg-emerald-50/20 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                            <Mic size={16} className="text-emerald-500" />
                            <span className="text-emerald-700">Mrs. Dung: Luyện nói cùng cô giáo</span>
                          </div>
                          
                          {!evaluation && !isEvaluating && (
                            <button
                              onClick={isRecording ? stopRecording : startRecording}
                              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-white transition-all shadow-xl text-base
                                ${isRecording 
                                  ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-105' 
                                  : 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-1'}`}
                              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            >
                              {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                              {isRecording ? 'Đang nghe bé nói...' : 'Bắt đầu luyện nói'}
                            </button>
                          )}

                          {isRecording && (
                            <p className="text-[10px] text-red-400 font-bold animate-pulse">
                              Mẹo: Sau khi đọc xong, bé chờ 1 giây rồi hãy nhấn nút dừng nhé!
                            </p>
                          )}

                          {isEvaluating && (
                            <div className="flex flex-col items-center gap-3 py-4 animate-pulse">
                              <RefreshCw className="animate-spin text-brand-green" size={32} />
                              <div className="text-center">
                                <p className="text-sm font-black text-brand-green">Cô Dung đang nghe và chấm điểm cho con nhé...</p>
                                <p className="text-[10px] text-slate-400 font-medium">Bé chờ cô một chút xíu thôi!</p>
                              </div>
                            </div>
                          )}

                          {evaluation && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="w-full space-y-4"
                            >
                              {!evaluation.isComplete ? (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm space-y-3">
                                  <div className="flex items-center gap-3 text-red-600">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                      <RefreshCw size={20} />
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold uppercase tracking-wider">Chưa hoàn thành</div>
                                      <div className="text-sm font-medium">Bé cần đọc lại đầy đủ nhé!</div>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed italic">"{evaluation.feedback}"</p>
                                  {evaluation.missingContent && (
                                    <div className="bg-white/50 p-2 rounded-lg border border-red-200 text-xs text-red-700">
                                      <span className="font-bold">Phần thiếu:</span> {evaluation.missingContent}
                                    </div>
                                  )}
                                  <button 
                                    onClick={startRecording}
                                    className="w-full py-2 bg-red-500 text-white rounded-lg font-bold text-xs hover:bg-red-600 transition-colors"
                                  >
                                    Đọc lại ngay
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl border-2 border-emerald-200 shadow-md">
                                    <div className="flex items-center gap-4">
                                      <div className="w-16 h-16 bg-brand-yellow rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-yellow/20 rotate-3">
                                        <Star size={32} fill="currentColor" />
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Điểm số & Xếp loại CEFR</div>
                                        <div className="flex items-center gap-3">
                                          <div className="text-4xl font-black text-emerald-700">{evaluation.score}</div>
                                          <div className="px-3 py-1 bg-brand-green text-white rounded-lg text-sm font-black shadow-sm">{evaluation.cefrLevel}</div>
                                        </div>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={startRecording}
                                      className="px-4 py-2 bg-white text-emerald-600 border-2 border-emerald-100 rounded-xl font-bold text-sm hover:border-brand-green transition-all shadow-sm active:scale-95"
                                    >
                                      Thử lại
                                    </button>
                                  </div>

                                  {/* Criteria Scores */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tiêu chí chấm điểm</span>
                                      <span className="text-[9px] font-medium text-slate-400 italic">Điều kiện: Đọc đủ & đúng 100% nội dung</span>
                                    </div>
                                    {evaluation.criteriaScores && (
                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border-2 border-emerald-50 shadow-sm">
                                        {Object.entries(evaluation.criteriaScores).map(([key, score]) => (
                                          <div key={key} className="text-center p-3 rounded-xl bg-emerald-50/30 border border-emerald-100">
                                            <div className="text-[9px] font-bold text-emerald-400 uppercase leading-tight mb-1">
                                              {key === 'pronunciation' ? 'Phát âm' : 
                                               key === 'stress' ? 'Trọng âm' : 
                                               key === 'intonation' ? 'Ngữ điệu' : 
                                               key === 'fluency' ? 'Trôi chảy' : 'Nối âm'}
                                            </div>
                                            <div className="text-lg font-black text-emerald-600">{score}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="bg-white p-6 rounded-2xl border-2 border-emerald-100 shadow-md space-y-6">
                                    <div className="flex items-start gap-3 bg-green-50 p-4 rounded-xl border border-green-100">
                                      <ThumbsUp size={24} className="text-green-500 mt-0.5 shrink-0" />
                                      <p className="text-base font-medium text-slate-800 leading-relaxed italic">"{evaluation.feedback}"</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-green-600">
                                          <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                                            <CheckCircle size={14} />
                                          </div>
                                          <div className="text-xs font-black uppercase tracking-wider">Ưu điểm nổi bật</div>
                                        </div>
                                        <div className="space-y-2">
                                          {evaluation.strengths.map((s, i) => (
                                            <div key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2 bg-green-50/30 p-2 rounded-lg">
                                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 shrink-0" />
                                              {s}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-orange-600">
                                          <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center">
                                            <AlertCircle size={14} />
                                          </div>
                                          <div className="text-xs font-black uppercase tracking-wider">Cần chú ý thêm</div>
                                        </div>
                                        <div className="space-y-2">
                                          {evaluation.improvements.map((imp, i) => (
                                            <div key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2 bg-orange-50/30 p-2 rounded-lg">
                                              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0" />
                                              {imp}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* IPA Analysis */}
                                    {evaluation.ipaAnalysis && evaluation.ipaAnalysis.length > 0 && (
                                      <div className="pt-4 border-t-2 border-slate-50">
                                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                            <Zap size={18} />
                                          </div>
                                          <div className="text-xs font-black uppercase tracking-widest">Phân tích âm học (IPA)</div>
                                        </div>
                                        <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                                          <table className="w-full text-left border-collapse">
                                            <thead>
                                              <tr className="bg-slate-50">
                                                <th className="p-3 text-xs font-black text-slate-500 uppercase">Từ vựng</th>
                                                <th className="p-3 text-xs font-black text-green-600 uppercase">IPA Chuẩn</th>
                                                <th className="p-3 text-xs font-black text-red-500 uppercase">Bé đọc</th>
                                                <th className="p-3 text-xs font-black text-indigo-400 uppercase">Mẹo cho bé</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                              {evaluation.ipaAnalysis.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                                                  <td className="p-3 text-sm font-black text-slate-700">{item.word}</td>
                                                  <td className="p-3 text-base font-serif font-bold text-green-600">{item.correctIpa}</td>
                                                  <td className="p-3 text-base font-serif font-bold text-red-500">{item.studentIpa}</td>
                                                  <td className="p-3 text-xs text-slate-500 font-medium leading-relaxed">{item.tip}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {/* Practice Sentences & Exercises */}
                                    {(evaluation.standardSentences?.length || 0) > 0 && (
                                      <div className="pt-3 border-t border-gray-100 space-y-3">
                                        <div>
                                          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Câu mẫu luyện tập</div>
                                          {evaluation.standardSentences?.map((sentence, idx) => (
                                            <p key={idx} className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 mb-1">
                                              {sentence}
                                            </p>
                                          ))}
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Bài tập đề xuất</div>
                                          <div className="flex flex-wrap gap-2">
                                            {evaluation.personalizedExercises?.map((ex, idx) => (
                                              <div key={idx} className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                                                {ex}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Certificate Inputs */}
                                    <div className="pt-4 border-t border-indigo-50 space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-gray-400 uppercase">Tên học sinh</label>
                                          <input 
                                            type="text" 
                                            value={studentName}
                                            onChange={(e) => setStudentName(e.target.value)}
                                            placeholder="Nhập tên bé..."
                                            className="w-full px-3 py-2 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-gray-400 uppercase">Tên giáo viên</label>
                                          <input 
                                            type="text" 
                                            value={teacherName}
                                            onChange={(e) => setTeacherName(e.target.value)}
                                            placeholder="Tên giáo viên..."
                                            className="w-full px-3 py-2 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                          />
                                        </div>
                                      </div>
                                      <button 
                                        onClick={() => setShowCertificate(true)}
                                        className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg hover:shadow-orange-200 hover:-translate-y-1"
                                      >
                                        <Trophy size={20} className="animate-bounce" />
                                        NHẬN GIẤY CHỨNG NHẬN NGAY!
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {showCertificate && evaluation && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowCertificate(false)}
                          >
                            <motion.div 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden relative"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button 
                                onClick={() => setShowCertificate(false)}
                                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors z-10"
                              >
                                <X size={20} />
                              </button>

                              <div className="p-8 overflow-auto max-h-[80vh]">
                                {/* Certificate Design */}
                                <div 
                                  ref={certificateRef}
                                  data-certificate-container
                                  className="relative w-full aspect-[1.414/1] bg-white p-12 flex flex-col items-center justify-between text-center font-serif"
                                  style={{ 
                                    border: '16px double #10b981',
                                    backgroundImage: 'radial-gradient(circle at 2px 2px, #ecfdf5 1px, transparent 0)',
                                    backgroundSize: '32px 32px',
                                    backgroundColor: '#ffffff'
                                  }}
                                >
                                  {/* Decorative Corners */}
                                  <div className="absolute top-4 left-4 w-20 h-20 rounded-tl-lg" style={{ borderTop: '8px solid #34d399', borderLeft: '8px solid #34d399' }} />
                                  <div className="absolute top-4 right-4 w-20 h-20 rounded-tr-lg" style={{ borderTop: '8px solid #34d399', borderRight: '8px solid #34d399' }} />
                                  <div className="absolute bottom-4 left-4 w-20 h-20 rounded-bl-lg" style={{ borderBottom: '8px solid #34d399', borderLeft: '8px solid #34d399' }} />
                                  <div className="absolute bottom-4 right-4 w-20 h-20 rounded-br-lg" style={{ borderBottom: '8px solid #34d399', borderRight: '8px solid #34d399' }} />

                                  <div className="space-y-4">
                                    <div className="flex justify-center">
                                      <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #0d4023, #00a84d)', border: '4px solid #ffffff', color: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                                        <Trophy size={48} style={{ color: '#ffffff' }} />
                                      </div>
                                    </div>
                                    <h1 className="text-4xl font-black uppercase tracking-widest" style={{ color: '#0d4023', textShadow: '2px 2px 0 rgba(13,64,35,0.1)' }}>Certificate of Excellence</h1>
                                    <p className="text-xl italic font-medium" style={{ color: '#059669' }}>This award is proudly presented to</p>
                                  </div>

                                  <div className="space-y-4">
                                    <h2 className="text-6xl font-black pb-4 min-w-[400px] font-serif italic" style={{ color: '#0d4023', borderBottom: '4px solid #d1fae5' }}>
                                      {studentName || "Little Star"}
                                    </h2>
                                    <div className="space-y-1">
                                      <p className="text-xl font-medium" style={{ color: '#4B5563' }}>For outstanding performance in English Speaking</p>
                                      <p className="text-lg font-bold italic" style={{ color: '#6B7280' }}>Topic: {generatedTopicName || topic || "General English"}</p>
                                    </div>
                                    <div className="inline-block px-6 py-2 rounded-full text-2xl font-black uppercase tracking-widest" style={{ backgroundColor: '#f0fdf4', color: '#065f46', border: '2px solid #d1fae5' }}>
                                      Level: {level}
                                    </div>
                                  </div>

                                  <div className="px-12 py-6 rounded-[2rem]" style={{ background: 'linear-gradient(to bottom right, #f0fdf4, #d1fae5)', border: '4px solid #ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                                    <p className="text-xs uppercase font-black tracking-[0.2em] mb-2" style={{ color: '#059669' }}>Final Score</p>
                                    <p className="text-6xl font-black" style={{ color: '#065f46', textShadow: '3px 3px 0 white' }}>{evaluation.score}<span className="text-2xl" style={{ color: '#34d399' }}>/10</span></p>
                                  </div>

                                  <div className="w-full flex justify-between items-end pt-12 px-8">
                                    <div className="text-left space-y-2">
                                      <p className="text-sm font-black" style={{ color: '#0d4023' }}>{new Date().toLocaleDateString('vi-VN')}</p>
                                      <div className="w-48" style={{ borderBottom: '2px solid #d1fae5' }} />
                                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#059669' }}>Date of Issue</p>
                                    </div>
                                    <div className="text-right space-y-2">
                                      <p className="text-xl font-black font-serif italic" style={{ color: '#0d4023' }}>{teacherName}</p>
                                      <div className="w-48" style={{ borderBottom: '2px solid #d1fae5' }} />
                                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#059669' }}>Head Teacher</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                                <button 
                                  onClick={() => setShowCertificate(false)}
                                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                                >
                                  Đóng
                                </button>
                                <button 
                                  onClick={downloadCertificate}
                                  disabled={isDownloading}
                                  className="flex-[2] py-3 bg-brand-green text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg disabled:opacity-50"
                                >
                                  {isDownloading ? <RefreshCw size={20} className="animate-spin" /> : <Download size={20} />}
                                  Tải Giấy Chứng Nhận (PNG)
                                </button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* AI Prompt Debug (Optional) */}
                      {generatedPrompt && (
                        <div className="w-full max-w-[600px] p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                          <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1 tracking-widest">AI Prompt</p>
                          <p className="text-xs text-emerald-900/70 italic leading-relaxed">{generatedPrompt}</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center space-y-4 max-w-xs"
                    >
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
                        <ImageIcon size={40} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-gray-700">Chưa có Poster nào</h3>
                        <p className="text-sm text-gray-400">Chọn trình độ, nhập chủ đề và nhấn nút tạo để bắt đầu!</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-green-dark text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Brand Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-1 bg-white rounded-2xl border-4 border-brand-yellow">
                  <BrandLogo className="w-16 h-16" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-yellow uppercase tracking-tight">ENGLISH MRS. DUNG</h3>
                <p className="text-slate-300 font-serif italic text-sm mt-1">"English with Heart. Success with Mrs.Dung"</p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-6">
              <h4 className="text-brand-yellow font-black uppercase tracking-[0.2em] relative inline-block">
                LIÊN HỆ
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-white/10" />
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 group">
                  <span className="text-brand-green mt-1">📍</span>
                  <span className="text-sm font-black group-hover:text-brand-yellow transition-colors cursor-pointer">Ngõ 717 Mạc Đăng Doanh, Hải Phòng.</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <span className="text-brand-green mt-1">📞</span>
                  <span className="text-sm font-black group-hover:text-brand-yellow transition-colors cursor-pointer">Mrs.Dung: 0364409436</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <span className="text-brand-yellow mt-1">✉️</span>
                  <span className="text-sm font-black group-hover:text-brand-yellow transition-colors cursor-pointer">nguyendungvn8@gmail.com</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <span className="text-sky-400 mt-1">🌐</span>
                  <a href="#" className="text-sm font-black group-hover:text-brand-yellow transition-colors underline decoration-brand-yellow/30 underline-offset-4">Fanpage Facebook</a>
                </li>
              </ul>
            </div>

            {/* Slogan Section */}
            <div className="space-y-6">
              <h4 className="text-brand-yellow font-black uppercase tracking-[0.2em] relative inline-block">
                SLOGAN
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-white/10" />
              </h4>
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4">
                <p className="text-lg font-serif italic text-white font-bold leading-relaxed">
                  "English with Heart. Success with Mrs.Dung"
                </p>
                <div className="h-0.5 bg-white/10 w-full" />
                <p className="text-base font-black text-brand-green uppercase tracking-widest text-[13px]">
                  HỌC TIẾNG ANH BẰNG CẢ TRÁI TIM.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
