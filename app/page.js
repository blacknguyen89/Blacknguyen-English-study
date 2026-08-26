"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Mic,
  Square,
  RotateCcw,
  BookOpen,
  Stamp,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const DEFAULT_ROADMAP = [
  { emoji: "☕", label: "Quán cà phê" },
  { emoji: "🛒", label: "Siêu thị" },
  { emoji: "🚕", label: "Taxi / Grab" },
  { emoji: "🍜", label: "Nhà hàng" },
  { emoji: "🏢", label: "Công việc" },
  { emoji: "👨‍👩‍👦", label: "Gia đình" },
  { emoji: "🏥", label: "Khám bệnh" },
  { emoji: "✈️", label: "Sân bay" },
  { emoji: "🏨", label: "Khách sạn" },
  { emoji: "💬", label: "Đồng nghiệp" },
];

function extractSection(text, marker) {
  const idx = text.indexOf(marker);
  if (idx === -1) return null;
  return text.slice(idx).trim();
}

function parseRoadmap(profileText) {
  if (!profileText) return DEFAULT_ROADMAP;
  const lines = profileText.split("\n");
  const items = [];
  for (const line of lines) {
    const m = line.match(/^\s*(?:\d+[\.\)]|[-•])\s*(.+)$/);
    if (!m) continue;
    const rest = m[1].trim();
    const emojiMatch = rest.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+/u);
    const emoji = emojiMatch ? emojiMatch[0] : "📍";
    const label = rest
      .replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+\s*/u, "")
      .replace(/[.:].*$/, "")
      .trim();
    if (label && label.length < 40) items.push({ emoji, label });
  }
  return items.length >= 5 ? items.slice(0, 10) : DEFAULT_ROADMAP;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

function MarkdownLite({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let listBuffer = [];
  let listType = null;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const key = `list-${blocks.length}`;
    if (listType === "ol") {
      blocks.push(
        <ol key={key} className="md-list">
          {listBuffer.map((li, i) => (
            <li key={i}>{renderInline(li)}</li>
          ))}
        </ol>
      );
    } else {
      blocks.push(
        <ul key={key} className="md-list">
          {listBuffer.map((li, i) => (
            <li key={i}>{renderInline(li)}</li>
          ))}
        </ul>
      );
    }
    listBuffer = [];
    listType = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[\.\)]\s+(.*)$/);

    if (heading) {
      flushList();
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      blocks.push(
        level <= 2 ? (
          <h4 key={i} className="md-h">{content}</h4>
        ) : (
          <h5 key={i} className="md-h5">{content}</h5>
        )
      );
    } else if (bullet) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(bullet[1]);
    } else if (numbered) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(numbered[1]);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={i} className="md-p">{renderInline(line)}</p>);
    }
  });
  flushList();

  return <div className="md">{blocks}</div>;
}

async function storageGet(key) {
  try {
    const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
    const data = await res.json();
    return data.value || null;
  } catch (e) {
    return null;
  }
}
async function storageSet(key, value) {
  try {
    await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  } catch (e) {}
}
async function storageDelete(key) {
  try {
    await fetch(`/api/storage?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch (e) {}
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function EnglishTutorApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [lastRecord, setLastRecord] = useState(null);
  const [lessonCount, setLessonCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    (async () => {
      const p = await storageGet("ho-so-trinh-do");
      if (p) setProfile(p);
      const r = await storageGet("ban-ghi-latest");
      if (r) setLastRecord(r);
      const c = await storageGet("lesson-count");
      if (c) setLessonCount(parseInt(c) || 0);
      const s = await storageGet("current-session-messages");
      if (s) {
        try {
          setMessages(JSON.parse(s));
        } catch (e) {}
      }
      setInitializing(false);
    })();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const persistSession = useCallback(async (msgs) => {
    await storageSet("current-session-messages", JSON.stringify(msgs));
  }, []);

  const sendMessage = useCallback(
    async (text, audioData) => {
      if (loading) return;
      if (!text && !audioData) return;
      setError(null);

      const displayContent = text || "🎤 (đoạn ghi âm luyện phát âm)";
      const newMessages = [...messages, { role: "user", content: displayContent }];
      setMessages(newMessages);
      setInput("");
      setLoading(true);
      await persistSession(newMessages);

      const apiMessages = newMessages.map((m, i) => {
        if (i === newMessages.length - 1 && audioData) {
          return { role: m.role, content: text || "", audio: audioData };
        }
        return { role: m.role, content: m.content };
      });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Lỗi không xác định từ server.");
        }

        const updated = [...newMessages, { role: "assistant", content: data.text }];
        setMessages(updated);
        await persistSession(updated);

        const hoso = extractSection(data.text, "HỒ SƠ TRÌNH ĐỘ");
        if (hoso) {
          setProfile(hoso);
          await storageSet("ho-so-trinh-do", hoso);
        }

        const banGhi = extractSection(data.text, "BẢN GHI BUỔI HỌC");
        if (banGhi) {
          setLastRecord(banGhi);
          await storageSet("ban-ghi-latest", banGhi);
          const numMatch = banGhi.match(/#\s*(\d+)/);
          if (numMatch) {
            const n = parseInt(numMatch[1]);
            setLessonCount(n);
            await storageSet("lesson-count", String(n));
          }
        }
      } catch (e) {
        setError("Có lỗi khi gọi AI: " + e.message + " — DABU thử gửi lại nhé.");
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, persistSession]
  );

  const startNewChatSession = useCallback(
    async (starterText) => {
      setMessages([]);
      await storageDelete("current-session-messages");
      setTimeout(() => sendMessage(starterText), 0);
    },
    [sendMessage]
  );

  const handleStartAssessment = () => startNewChatSession("Bắt đầu kiểm tra trình độ");

  const handleStartNextLesson = () => {
    const nextNum = lessonCount + 1;
    let context = "";
    if (profile) context += profile + "\n\n";
    if (lastRecord) context += lastRecord + "\n\n";
    context += `Bắt đầu buổi học ${nextNum}.`;
    startNewChatSession(context);
  };

  const handleReset = async () => {
    await Promise.all([
      storageDelete("ho-so-trinh-do"),
      storageDelete("ban-ghi-latest"),
      storageDelete("lesson-count"),
      storageDelete("current-session-messages"),
    ]);
    setProfile(null);
    setLastRecord(null);
    setLessonCount(0);
    setMessages([]);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const base64 = await blobToBase64(blob);
        sendMessage(null, { mimeType, data: base64 });
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      setError("Không thể truy cập micro. Kiểm tra quyền truy cập micro của trình duyệt.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const roadmap = parseRoadmap(profile);
  const showStartScreen = messages.length === 0 && !initializing;

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        .app-root {
          --ink: #101826;
          --ink-soft: #1b2536;
          --parchment: #f3ead8;
          --parchment-dim: #e8ddc4;
          --gold: #cf9a3e;
          --gold-soft: #e4c584;
          --teal: #3e8f7c;
          --rust: #b5533c;
          --text-on-ink: #f3ead8;
          --text-muted: #9aa4b8;
          font-family: 'IBM Plex Sans', sans-serif;
          background: var(--ink);
          color: var(--text-on-ink);
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        .header { padding: 20px 20px 12px; border-bottom: 1px solid #2a3550; }
        .header-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
        .title .stamp-icon { color: var(--gold); }
        .subtitle { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
        .reset-btn { background: none; border: 1px solid #3a4666; color: var(--text-muted); font-size: 12px; padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-family: 'IBM Plex Sans', sans-serif; }
        .reset-btn:hover { color: var(--rust); border-color: var(--rust); }

        .roadmap { display: flex; gap: 10px; overflow-x: auto; padding: 16px 20px; border-bottom: 1px solid #2a3550; }
        .stamp { flex: 0 0 auto; width: 68px; text-align: center; opacity: 0.35; }
        .stamp.done, .stamp.current { opacity: 1; }
        .stamp-circle { width: 46px; height: 46px; border-radius: 50%; border: 2px dashed #4a5678; display: flex; align-items: center; justify-content: center; font-size: 20px; margin: 0 auto 4px; }
        .stamp.done .stamp-circle { border: 2px solid var(--teal); background: rgba(62,143,124,0.15); }
        .stamp.current .stamp-circle { border: 2px solid var(--gold); background: rgba(207,154,62,0.18); box-shadow: 0 0 0 3px rgba(207,154,62,0.15); }
        .stamp-label { font-size: 10px; color: var(--text-muted); line-height: 1.2; }
        .stamp.done .stamp-label, .stamp.current .stamp-label { color: var(--parchment); }

        .body-wrap { flex: 1; display: flex; min-height: 0; }
        .profile-panel { width: 280px; flex-shrink: 0; border-right: 1px solid #2a3550; padding: 16px; overflow-y: auto; display: none; }
        @media (min-width: 820px) { .profile-panel { display: block; } }
        .profile-card { background: var(--ink-soft); border: 1px solid #2a3550; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
        .profile-card h6 { font-family: 'Fraunces', serif; font-size: 13px; margin: 0 0 8px; color: var(--gold-soft); text-transform: uppercase; letter-spacing: 0.6px; }
        .profile-empty { font-size: 12.5px; color: var(--text-muted); line-height: 1.5; }
        .profile-card .md { font-size: 12px; color: var(--text-on-ink); line-height: 1.55; }
        .profile-card .md-h { font-size: 12.5px; color: var(--gold-soft); margin: 10px 0 4px; }
        .profile-card .md-h5 { font-size: 12px; color: var(--gold-soft); margin: 8px 0 3px; }
        .profile-card .md-p { margin: 4px 0; }
        .profile-card .md-list { margin: 4px 0; padding-left: 16px; }

        .chat-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .mobile-profile-toggle { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; border-bottom: 1px solid #2a3550; cursor: pointer; font-size: 13px; color: var(--gold-soft); }
        @media (min-width: 820px) { .mobile-profile-toggle { display: none; } }
        .mobile-profile-body { padding: 12px 20px; border-bottom: 1px solid #2a3550; }

        .messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .bubble-row { display: flex; }
        .bubble-row.user { justify-content: flex-end; }
        .bubble-row.assistant { justify-content: flex-start; }
        .bubble { max-width: 640px; padding: 12px 16px; border-radius: 10px; font-size: 14px; line-height: 1.55; }
        .bubble.user { background: var(--gold); color: var(--ink); border-radius: 10px 10px 2px 10px; }
        .bubble.assistant { background: var(--parchment); color: var(--ink); border-radius: 10px 10px 10px 2px; border: 1px solid var(--parchment-dim); position: relative; }
        .bubble.assistant::before { content: ""; position: absolute; top: 10px; left: -6px; width: 8px; height: 8px; border-radius: 50%; background: var(--teal); }
        .md-h { font-family: 'Fraunces', serif; font-size: 15px; margin: 10px 0 4px; color: var(--ink); }
        .md-h5 { font-family: 'Fraunces', serif; font-size: 14px; margin: 8px 0 3px; color: var(--ink); }
        .md-p { margin: 4px 0; }
        .md-list { margin: 4px 0; padding-left: 20px; }
        .bubble :first-child { margin-top: 0; }

        .empty-state { flex: 1; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .empty-card { text-align: center; max-width: 420px; }
        .empty-card .stamp-icon-lg { color: var(--gold); margin-bottom: 10px; }
        .empty-card h3 { font-family: 'Fraunces', serif; font-size: 20px; margin: 0 0 8px; }
        .empty-card p { font-size: 13.5px; color: var(--text-muted); line-height: 1.6; margin: 0 0 20px; }
        .start-btn { background: var(--gold); color: var(--ink); border: none; padding: 12px 22px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; }
        .start-btn:hover { background: var(--gold-soft); }
        .start-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 13px; padding-left: 4px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .error-banner { margin: 0 20px 10px; background: rgba(181,83,60,0.15); border: 1px solid var(--rust); color: #e8b3a4; padding: 8px 12px; border-radius: 8px; font-size: 12.5px; }

        .input-bar { display: flex; gap: 10px; padding: 14px 20px 12px; border-top: 1px solid #2a3550; }
        .input-bar textarea { flex: 1; resize: none; background: var(--ink-soft); border: 1px solid #3a4666; border-radius: 8px; color: var(--text-on-ink); padding: 10px 12px; font-size: 14px; font-family: 'IBM Plex Sans', sans-serif; line-height: 1.4; min-height: 44px; max-height: 120px; }
        .input-bar textarea:focus { outline: none; border-color: var(--gold); }
        .icon-btn { border: none; width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .send-btn { background: var(--gold); color: var(--ink); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .mic-btn { background: var(--ink-soft); color: var(--gold-soft); border: 1px solid #3a4666 !important; }
        .mic-btn.recording { background: var(--rust); color: white; animation: pulse 1.2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .voice-hint { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; padding: 0 20px 14px; }
      `}</style>

      <div className="header">
        <div className="header-top">
          <div>
            <p className="title"><Stamp size={20} className="stamp-icon" /> Hộ Chiếu Tiếng Anh</p>
            <p className="subtitle">
              {lessonCount > 0 ? `Đã hoàn thành ${lessonCount} buổi` : "Chưa bắt đầu hành trình"}
              {profile ? " · Đã có Hồ sơ trình độ" : ""}
            </p>
          </div>
          <button className="reset-btn" onClick={handleReset}>
            <RotateCcw size={13} /> Làm lại từ đầu
          </button>
        </div>
      </div>

      <div className="roadmap">
        {roadmap.map((item, i) => {
          const num = i + 1;
          const cls = num <= lessonCount ? "done" : num === lessonCount + 1 ? "current" : "";
          return (
            <div key={i} className={`stamp ${cls}`}>
              <div className="stamp-circle">{item.emoji}</div>
              <div className="stamp-label">{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="body-wrap">
        <div className="profile-panel">
          <div className="profile-card">
            <h6>Hồ sơ trình độ</h6>
            {profile ? <MarkdownLite text={profile} /> : (
              <p className="profile-empty">Chưa có. Bắt đầu buổi "Kiểm tra trình độ" để tạo hồ sơ.</p>
            )}
          </div>
          <div className="profile-card">
            <h6>Bản ghi buổi gần nhất</h6>
            {lastRecord ? <MarkdownLite text={lastRecord} /> : (
              <p className="profile-empty">Chưa có buổi học nào hoàn thành.</p>
            )}
          </div>
        </div>

        <div className="chat-col">
          <div className="mobile-profile-toggle" onClick={() => setShowProfile((s) => !s)}>
            <span><BookOpen size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Hồ sơ & Bản ghi buổi học</span>
            {showProfile ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
          {showProfile && (
            <div className="mobile-profile-body">
              <div className="profile-card">
                <h6>Hồ sơ trình độ</h6>
                {profile ? <MarkdownLite text={profile} /> : <p className="profile-empty">Chưa có.</p>}
              </div>
              <div className="profile-card">
                <h6>Bản ghi buổi gần nhất</h6>
                {lastRecord ? <MarkdownLite text={lastRecord} /> : <p className="profile-empty">Chưa có.</p>}
              </div>
            </div>
          )}

          {showStartScreen ? (
            <div className="empty-state">
              <div className="empty-card">
                <Stamp size={36} className="stamp-icon-lg" />
                <h3>{profile ? `Sẵn sàng cho buổi học ${lessonCount + 1}` : "Bắt đầu hành trình học tiếng Anh"}</h3>
                <p>
                  {profile
                    ? "AI sẽ tự động dùng Hồ sơ trình độ và Bản ghi buổi trước để cá nhân hoá bài học."
                    : "Buổi đầu tiên là một bài kiểm tra trình độ ngắn, từ dễ đến khó."}
                </p>
                <button
                  className="start-btn"
                  onClick={profile ? handleStartNextLesson : handleStartAssessment}
                  disabled={loading || initializing}
                >
                  {profile ? `Bắt đầu buổi học ${lessonCount + 1}` : "Bắt đầu kiểm tra trình độ"}
                </button>
              </div>
            </div>
          ) : (
            <div className="messages" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`bubble-row ${m.role}`}>
                  <div className={`bubble ${m.role}`}>
                    {m.role === "assistant" ? <MarkdownLite text={m.content} /> : m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="loading-row">
                  <Loader2 size={14} className="spin" /> Đang soạn phản hồi...
                </div>
              )}
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          {!showStartScreen && (
            <>
              <div className="input-bar">
                <button
                  className={`icon-btn mic-btn ${isRecording ? "recording" : ""}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  title="Ghi âm luyện phát âm"
                >
                  {isRecording ? <Square size={16} /> : <Mic size={17} />}
                </button>
                <textarea
                  placeholder="Nhập câu trả lời bằng tiếng Anh..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  disabled={loading || isRecording}
                />
                <button
                  className="icon-btn send-btn"
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim() || isRecording}
                >
                  <Send size={17} />
                </button>
              </div>
              <div className="voice-hint">
                <Mic size={11} />{" "}
                {isRecording
                  ? "Đang ghi âm... bấm nút vuông để dừng và gửi."
                  : "Ở Bước 5, bấm mic để ghi âm luyện phát âm — Gemini sẽ nghe trực tiếp."}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
