/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Trash2, 
  Loader2, 
  Sparkles, 
  History, 
  Settings2, 
  MessageSquare,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// ==========================================
// KONFIGURASI PRO MODE & DATA
// ==========================================
const HOOK_FRAMEWORKS = [
  { id: 'contrarian', label: 'The Contrarian', desc: 'Melawan opini umum/arus' },
  { id: 'howto', label: 'The How-To', desc: 'Langkah praktis melakukan X' },
  { id: 'mistakes', label: 'The Mistakes', desc: 'Kesalahan umum & cara hindari' },
  { id: 'secret', label: 'The Secret', desc: 'Rahasia yang jarang diketahui' },
  { id: 'story', label: 'The Story', desc: 'Studi kasus atau cerita pribadi' },
  { id: 'listicle', label: 'The Listicle', desc: 'Daftar hal penting / kurasi' },
  { id: 'question', label: 'The Question', desc: 'Pertanyaan memancing pro/kontra' },
  { id: 'comparison', label: 'The Comparison', desc: 'Perbandingan A vs B' },
  { id: 'trend', label: 'The Trend', desc: 'Membahas tren viral / terikini' },
  { id: 'warning', label: 'The Warning', desc: 'Peringatan keras / red flags' },
  { id: 'guide', label: 'Ultimate Guide', desc: 'Panduan lengkap dari A-Z' },
  { id: 'myth', label: 'Myth Buster', desc: 'Menghancurkan mitos vs fakta' },
  { id: 'result', label: 'The Result', desc: 'Pamer hasil akhir lalu caranya' },
  { id: 'quote', label: 'The Quote', desc: 'Kutipan tokoh & pembahasannya' },
  { id: 'challenge', label: 'The Challenge', desc: 'Tantangan untuk pembaca' },
];

const TONES = [
  'Santai & Kasual',
  'Profesional & Elegan',
  'Lucu & Menghibur',
  'Menggebu-gebu (Passionate)',
  'Sarkas / Satir Ringan',
  'Edukatif & Analitis',
  'Puitis & Inspiratif'
];

const TRIGGERS = [
  'FOMO (Fear Of Missing Out)',
  'Amaze / Terpukau',
  'Wow / Terkejut',
  'Mantap / Setuju Banget',
  'Relate / Mewakili Perasaan',
  'Penasaran Tingkat Tinggi',
  'Marah / Gregetan'
];

interface HistoryItem {
  id: number;
  topic: string;
  thread: string[];
  date: string;
}

export default function App() {
  // --- STATE MANAGEMENT ---
  const [topic, setTopic] = useState('');
  const [exampleThread, setExampleThread] = useState('');
  const [selectedHook, setSelectedHook] = useState(HOOK_FRAMEWORKS[0].id);
  const [selectedTone, setSelectedTone] = useState(TONES[0]);
  const [selectedTrigger, setSelectedTrigger] = useState(TRIGGERS[0]);
  const [cta, setCta] = useState('');
  const [postCount, setPostCount] = useState(3);
  
  const [generatedThread, setGeneratedThread] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // --- INISIALISASI ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('goThreadsHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Gagal memuat riwayat", e);
      }
    }
  }, []);

  // --- FUNGSI UTILITAS ---
  const saveToHistory = (threadData: string[]) => {
    const newEntry: HistoryItem = {
      id: Date.now(),
      topic,
      thread: threadData,
      date: new Date().toLocaleString('id-ID')
    };
    const updatedHistory = [newEntry, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('goThreadsHistory', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('goThreadsHistory');
  };

  const copyToClipboard = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      console.error('Gagal menyalin text: ', err);
    }
  };

  const copyAllThread = () => {
    const fullText = generatedThread.map((t, i) => `${i+1}/ ${t}`).join('\n\n');
    copyToClipboard(fullText);
  };

  // --- API GEMINI INTEGRATION ---
  const generateContent = async () => {
    if (!topic.trim()) {
      setErrorMsg("Topik tidak boleh kosong.");
      return;
    }
    
    setIsGenerating(true);
    setErrorMsg('');
    setGeneratedThread([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const hookLabel = HOOK_FRAMEWORKS.find(h => h.id === selectedHook)?.label || selectedHook;

      const systemInstruction = `
        Anda adalah AI Copywriter Mode Pro kelas dunia yang mengkhususkan diri dalam membuat Utas (Threads) media sosial dengan retensi tinggi (seperti Twitter/X atau Threads app).
        Tugas Anda adalah merespons dengan JSON array murni yang berisi string untuk setiap post.

        Aturan KETAT:
        1. Jumlah post HARUS TEPAT ${postCount} post. Tidak kurang, tidak lebih.
        2. Panjang per post WAJIB antara 200 hingga 300 karakter. Jangan terlalu pendek, jangan kepanjangan.
        3. Post 1: Gunakan framework hook "${hookLabel}" untuk memancing emosi "${selectedTrigger}".
        4. Post terakhir: Masukkan elemen soft-selling (Call to Action) berikut dengan elegan: "${cta || 'Follow untuk insight lainnya'}".
        5. Gunakan gaya bahasa: ${selectedTone}.
        6. Jangan gunakan hashtag berlebihan.
        7. Format output HARUS JSON ARRAY of STRINGS.

        INSTRUKSI KUALITAS (PENTING):
        - Gunakan "Bahasa Manusia" yang natural, mengalir, dan tidak kaku seperti robot.
        - Pastikan ada "Storytelling Flow" yang kuat antara post 1, 2, 3, dst. Post selanjutnya harus menyambung secara logis dan emosional dari post sebelumnya.
        - Hindari kata-kata klise AI seperti "Dalam dunia yang...", "Penting untuk diingat...", "Kesimpulannya...".
        - Gunakan variasi struktur kalimat agar tidak membosankan.
        ${exampleThread ? `- Gunakan gaya penulisan dan struktur dari contoh utas berikut sebagai referensi: "${exampleThread}"` : ''}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Buatkan utas tentang topik: "${topic}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const resultText = response.text;
      if (resultText) {
        const threadArray = JSON.parse(resultText);
        if (Array.isArray(threadArray)) {
          setGeneratedThread(threadArray);
          saveToHistory(threadArray);
        } else {
          throw new Error("Format JSON tidak valid.");
        }
      } else {
        throw new Error("Respons AI kosong.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setErrorMsg(`Gagal memproses: ${err.message || 'Terjadi kesalahan'}. Mohon coba lagi.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-zinc-200">
      
      {/* HEADER - VERCEL STYLE */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-bold tracking-tighter">
            GT
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide leading-none">GO THREADS</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Power Tools For Threads</p>
          </div>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 flex items-center gap-2 transition-colors"
        >
          <History size={14} />
          {showHistory ? 'Tutup Riwayat' : 'Riwayat'}
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LEFT COLUMN: EDITOR FORM */}
        <div className={`w-full ${showHistory ? 'lg:w-2/3' : 'lg:w-1/2'} transition-all duration-300 space-y-8`}>
          
          <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Settings2 size={18} className="text-zinc-400" />
              Parameter Konfigurasi
            </h2>

            <div className="space-y-6">
              {/* TOPIK */}
              <div>
                <label className="block text-sm font-medium mb-2">1. Topik Utama <span className="text-red-500">*</span></label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Misal: Kenapa AI tidak akan pernah bisa menggantikan kreativitas sejati manusia..."
                  className="w-full p-3 bg-[#FAFAFA] border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none h-24 transition-colors"
                />
              </div>

              {/* CONTOH UTAS (OPTIONAL) */}
              <div>
                <label className="block text-sm font-medium mb-2">2. Contoh Utas FYP (Optional)</label>
                <textarea
                  value={exampleThread}
                  onChange={(e) => setExampleThread(e.target.value)}
                  placeholder="Tempel contoh utas yang menurutmu keren di sini untuk ditiru gayanya..."
                  className="w-full p-3 bg-[#FAFAFA] border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none h-20 transition-colors"
                />
                <p className="text-[10px] text-zinc-400 mt-1.5 italic">AI akan mempelajari gaya bahasa dan struktur dari contoh yang kamu berikan.</p>
              </div>

              {/* HOOK FRAMEWORKS (15 Pilihan) */}
              <div>
                <label className="block text-sm font-medium mb-2">3. Pilihan Hook Framework</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {HOOK_FRAMEWORKS.map((hook) => (
                    <button
                      key={hook.id}
                      onClick={() => setSelectedHook(hook.id)}
                      className={`text-left p-3 rounded-md border text-xs transition-all ${
                        selectedHook === hook.id 
                        ? 'border-black bg-zinc-900 text-white shadow-sm' 
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white'
                      }`}
                    >
                      <div className="font-semibold mb-1">{hook.label}</div>
                      <div className={`text-[10px] leading-tight ${selectedHook === hook.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {hook.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* TONE & TRIGGER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
              <label className="block text-sm font-medium mb-2">4. Gaya Bahasa</label>
                  <select 
                    value={selectedTone} 
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black appearance-none cursor-pointer"
                  >
                    {TONES.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">5. Emotional Trigger</label>
                  <select 
                    value={selectedTrigger} 
                    onChange={(e) => setSelectedTrigger(e.target.value)}
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black appearance-none cursor-pointer"
                  >
                    {TRIGGERS.map(trigger => <option key={trigger} value={trigger}>{trigger}</option>)}
                  </select>
                </div>
              </div>

              {/* CTA & LENGTH */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">6. Soft Selling (CTA)</label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Misal: Cek link di bio untuk tools gratis"
                    className="w-full p-2.5 bg-[#FAFAFA] border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">7. Panjang Utas (1-5 Post)</label>
                  <div className="flex items-center gap-4 mt-2">
                    <input 
                      type="range" 
                      min="1" max="5" 
                      value={postCount} 
                      onChange={(e) => setPostCount(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <span className="text-sm font-bold w-12 text-center bg-zinc-100 py-1 rounded border border-zinc-200">{postCount}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-4 border-t border-zinc-100">
                {errorMsg && (
                  <div className="mb-4 text-xs text-red-600 flex items-center gap-1.5 bg-red-50 p-2 rounded border border-red-100">
                    <AlertCircle size={14} /> {errorMsg}
                  </div>
                )}
                <button
                  onClick={generateContent}
                  disabled={isGenerating || !topic.trim()}
                  className="w-full bg-black text-white font-medium text-sm py-3 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Memproses Pro Mode...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate Utas Powerfull
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW / HISTORY */}
        <div className={`w-full ${showHistory ? 'lg:w-1/3' : 'lg:w-1/2'} flex flex-col gap-6`}>
          
          {/* GENERATED PREVIEW */}
          {!showHistory && (
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm sticky top-24">
               <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare size={18} className="text-zinc-400" />
                  Pratinjau Utas
                </h2>
                {generatedThread.length > 0 && (
                  <button 
                    onClick={copyAllThread}
                    className="text-[10px] font-semibold bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded border border-zinc-200 transition-colors flex items-center gap-1"
                  >
                    <Copy size={12} /> Copy Semua
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {generatedThread.length === 0 && !isGenerating ? (
                  <div className="text-center py-12 text-zinc-400 border border-dashed border-zinc-200 rounded-md bg-[#fafafa]">
                    <Sparkles size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Utas yang dihasilkan akan muncul di sini.</p>
                  </div>
                ) : isGenerating ? (
                  <div className="space-y-4 animate-pulse">
                     {[...Array(postCount)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 shrink-0"></div>
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-3 bg-zinc-200 rounded w-3/4"></div>
                            <div className="h-3 bg-zinc-200 rounded w-full"></div>
                            <div className="h-3 bg-zinc-200 rounded w-5/6"></div>
                          </div>
                        </div>
                     ))}
                  </div>
                ) : (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent pl-8 md:pl-0">
                    {generatedThread.map((post, idx) => (
                       <div key={idx} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group">
                         {/* Timeline Dot */}
                         <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-black text-white text-[10px] font-bold absolute left-2 md:left-1/2 -translate-x-1/2 shrink-0 z-10 shadow-sm">
                           {idx + 1}
                         </div>
                         
                         {/* Card */}
                         <div className="w-full md:w-[calc(50%-2rem)] bg-white border border-zinc-200 rounded-md p-4 shadow-sm hover:border-zinc-300 transition-colors relative">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{post}</p>
                            
                            {/* Meta & Actions */}
                            <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between items-center">
                              <span className="text-[10px] text-zinc-400 font-mono bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                                {post.length} chars
                              </span>
                              <button 
                                onClick={() => copyToClipboard(post)}
                                className="text-zinc-400 hover:text-black transition-colors p-1"
                                title="Copy post ini"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                         </div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY PANEL */}
          {showHistory && (
             <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm sticky top-24 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
               <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <History size={18} className="text-zinc-400" />
                  Riwayat Generasi
                </h2>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Hapus Semua
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {history.length === 0 ? (
                  <p className="text-sm text-center text-zinc-400 py-8">Belum ada riwayat tersimpan.</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="border border-zinc-200 rounded-md p-3 hover:bg-zinc-50 transition-colors group">
                       <div className="flex justify-between items-start mb-2">
                         <h3 className="text-xs font-bold line-clamp-1 flex-1 pr-2">{item.topic}</h3>
                         <span className="text-[9px] text-zinc-400 whitespace-nowrap">{item.date}</span>
                       </div>
                       <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                         {item.thread[0]}
                       </p>
                       <div className="flex gap-2">
                         <button 
                          onClick={() => {
                            setGeneratedThread(item.thread);
                            setTopic(item.topic);
                            setShowHistory(false);
                          }}
                          className="text-[10px] font-semibold bg-black text-white px-2 py-1 rounded transition-colors flex items-center gap-1 w-full justify-center"
                         >
                           Lihat Detail <ChevronRight size={12}/>
                         </button>
                       </div>
                    </div>
                  ))
                )}
              </div>
             </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-400 text-[10px] font-medium uppercase tracking-widest">
          <div>
            &copy; {new Date().getFullYear()} GO THREADS. ALL RIGHTS RESERVED.
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <span>
              DEVELOPMENT BY{' '}
              <a 
                href="https://instagram.com/dharmayanggg" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-black hover:underline transition-all"
              >
                @DHARMAYANGGG
              </a>
            </span>
            <span className="hidden md:block w-1 h-1 bg-zinc-200 rounded-full"></span>
            <span>
              IN COLLABORATION WITH <span className="text-zinc-600">EKA BUDIHASTUTI</span>
            </span>
          </div>
        </div>
      </footer>

      {/* CSS untuk Scrollbar Minimalis Vercel Style */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8; 
        }
      `}} />
    </div>
  );
}
