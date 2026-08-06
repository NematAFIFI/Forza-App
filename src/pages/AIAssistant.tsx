import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Sparkles, Send, Mic, MicOff, Loader2, AlertCircle,
  User, Bot, Trash2, Lightbulb, Volume2, VolumeX,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

const SUGGESTIONS = [
  { ar: 'حالة الغرف الآن', en: 'Room status now' },
  { ar: 'كم إيراد الأمس؟', en: "What's yesterday's revenue?" },
  { ar: 'نسبة الإشغال', en: 'Occupancy rate' },
  { ar: 'الفواتير غير المدفوعة', en: 'Unpaid invoices' },
  { ar: 'مصروفات الأسبوع', en: 'Weekly expenses' },
  { ar: 'وصول اليوم', en: "Today's check-ins" },
  { ar: 'مخزون منخفض', en: 'Low stock' },
  { ar: 'مساعدة', en: 'Help' },
];

export default function AIAssistant() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || !speakEnabled) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[\n\r]+/g, ' ').trim();
    if (!clean) return;
    const utter = new SpeechSynthesisUtterance(clean);
    const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
    const isAr = lang === 'ar';
    const wanted = isAr ? 'ar' : 'en';
    const voice = voices.find(v => v.lang?.toLowerCase().startsWith(wanted))
      || voices.find(v => v.lang?.toLowerCase().includes(wanted))
      || voices[0];
    if (voice) utter.voice = voice;
    utter.lang = isAr ? 'ar-SA' : 'en-US';
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    window.speechSynthesis.speak(utter);
  }, [speakEnabled, lang]);

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      text: t(
        'مرحباً! أنا مساعدك الذكي. اسألني عن حالة الغرف، الإيرادات، الحجوزات، الفواتير، أو أي شيء يخص فندقك. جرّب أحد الاقتراحات أدناه أو اكتب سؤالك.',
        "Hello! I'm your smart assistant. Ask me about room status, revenue, bookings, invoices, or anything about your hotel. Try a suggestion below or type your question."
      ),
      time: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, [t, lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const answer = json.answer || t('لا توجد إجابة', 'No answer');
      const botMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: answer,
        time: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      speak(answer);
    } catch (e) {
      const err = e instanceof Error ? e.message : t('تعذر الاتصال بالمساعد', 'Unable to reach assistant');
      setError(err);
      setMessages((prev) => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        text: t('عذراً، حدث خطأ. حاول مرة أخرى.', 'Sorry, an error occurred. Please try again.'),
        time: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, t, lang]);

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError(t('المتصفح لا يدعم الإدخال الصوتي', 'Browser does not support voice input'));
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      void send(transcript);
    };
    rec.onerror = () => {
      setListening(false);
      setError(t('تعذر التعرف على الصوت', 'Voice recognition failed'));
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-reset',
      role: 'assistant',
      text: t(
        'مرحباً! أنا مساعدك الذكي. اسألني عن أي شيء يخص فندقك.',
        "Hello! I'm your smart assistant. Ask me anything about your hotel."
      ),
      time: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', minHeight: 500 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={24} color="var(--brand-500)" />
            {t('المساعد الذكي', 'Smart Assistant')}
          </h1>
          <p className="page-subtitle">
            {t('اسأل بالعربية أو الإنجليزية — صوتاً أو نصاً', 'Ask in Arabic or English — voice or text')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-outline"
            onClick={() => setSpeakEnabled((v) => !v)}
            title={speakEnabled ? t('إيقاف النطق', 'Mute voice') : t('تشغيل النطق', 'Enable voice')}
            style={{ padding: '8px 12px' }}
          >
            {speakEnabled ? <Volume2 size={16} color="var(--brand-500)" /> : <VolumeX size={16} />}
          </button>
          <button className="btn-outline" onClick={clearChat}>
            <Trash2 size={16} /> {t('محادثة جديدة', 'New chat')}
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 14,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: msg.role === 'user' ? 'var(--brand-500)' : '#f3f4f6',
              }}>
                {msg.role === 'user'
                  ? <User size={18} color="#fff" />
                  : <Bot size={18} color="var(--brand-500)" />}
              </div>
              <div style={{ maxWidth: '70%' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: msg.role === 'user' ? 'var(--brand-500)' : '#f9fafb',
                  border: msg.role === 'user' ? 'none' : '1px solid #eef0f3',
                  color: msg.role === 'user' ? '#fff' : '#1a2535',
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  borderTopRightRadius: msg.role === 'user' ? 4 : 14,
                  borderTopLeftRadius: msg.role === 'user' ? 14 : 4,
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: 10, color: '#9ca3af', marginTop: 4,
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                }}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="var(--brand-500)" />
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 14, background: '#f9fafb', border: '1px solid #eef0f3' }}>
                <Loader2 size={16} className="animate-spin" color="var(--brand-500)" />
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && !loading && (
          <div style={{ padding: '0 16px 12px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingTop: 10 }}>
              <Lightbulb size={14} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{t('اقتراحات', 'Suggestions')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => void send(t(s.ar, s.en))}
                  style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: '1px solid #eef0f3', background: '#f9fafb', color: '#4b5563',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-500)'; e.currentTarget.style.color = 'var(--brand-500)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#eef0f3'; e.currentTarget.style.color = '#4b5563'; }}
                >
                  {t(s.ar, s.en)}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 16px', background: '#fef2f2' }}>
            <p style={{ color: '#dc2626', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </p>
          </div>
        )}

        {/* Input bar */}
        <div style={{ padding: 12, borderTop: '1px solid #eef0f3', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={toggleVoice}
            style={{
              width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: listening ? '#ef4444' : 'rgba(var(--brand-rgb),0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
            title={t('إدخال صوتي', 'Voice input')}
          >
            {listening
              ? <MicOff size={20} color="#fff" />
              : <Mic size={20} color="var(--brand-500)" />}
          </button>
          <button
            onClick={() => setSpeakEnabled((v) => !v)}
            style={{
              width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: speakEnabled ? 'rgba(var(--brand-rgb),0.08)' : '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
            title={speakEnabled ? t('إيقاف النطق', 'Mute voice') : t('تشغيل النطق', 'Enable voice')}
          >
            {speakEnabled
              ? <Volume2 size={20} color="var(--brand-500)" />
              : <VolumeX size={20} color="#9ca3af" />}
          </button>
          <input
            ref={inputRef}
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } }}
            placeholder={t('اكتب سؤالك هنا...', 'Type your question here...')}
            style={{ flex: 1 }}
            disabled={loading}
          />
          <button
            className="btn-primary"
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            style={{ flexShrink: 0 }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
