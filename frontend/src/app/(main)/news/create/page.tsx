"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { IconPen } from "@/components/Icons";
import toast from "react-hot-toast";

type SearchedUser = { id: number; name: string; stockSymbol: string; };

export default function CreateNewsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [moderationBlocked, setModerationBlocked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileSizeError, setFileSizeError] = useState(""); // instant client-side file guard

  const MAX_FILE_MB = 10;
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Multi-phase submission tracking
  type PublishPhase = "idle" | "uploading" | "moderating" | "publishing";
  const [publishPhase, setPublishPhase] = useState<PublishPhase>("idle");
  const loading = publishPhase !== "idle";

  const phaseLabel: Record<PublishPhase, string> = {
    idle: "Submit to Verification",
    uploading: "📤 Uploading Evidence...",
    moderating: "🛡️ AI Safety Engine Analysing...",
    publishing: "📡 Publishing to Feed...",
  };

  // Mention system state
  const [mentions, setMentions] = useState<Map<string, SearchedUser>>(new Map());
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [activeMentionQuery, setActiveMentionQuery] = useState<{ text: string; startIndex: number; endIndex: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Search logic for mentions
  useEffect(() => {
    if (!activeMentionQuery || !activeMentionQuery.text.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/search?q=${encodeURIComponent(activeMentionQuery.text)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out current user
          setSearchResults(data.users.filter((u: SearchedUser) => u.id !== user?.id));
          setShowDropdown(true);
        }
      } catch (err) { console.error("Search failed", err); }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeMentionQuery, user?.id]);

  // Handle textarea changes to detect @typing
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Check if we are currently typing a mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newContent.slice(0, cursorPos);
    const wordsBeforeCursor = textBeforeCursor.split(/[\s\n]/);
    const lastWord = wordsBeforeCursor[wordsBeforeCursor.length - 1];

    if (lastWord.startsWith('@')) {
      const queryText = lastWord.slice(1);
      setActiveMentionQuery({
        text: queryText,
        startIndex: cursorPos - lastWord.length,
        endIndex: cursorPos
      });
      setShowDropdown(true);
    } else {
      setActiveMentionQuery(null);
      setShowDropdown(false);
    }

    // Clean up mentions map if user deletes a mention from text
    setMentions(prev => {
      const next = new Map(prev);
      for (const [name, _] of prev.entries()) {
        if (!newContent.toLowerCase().includes(`@${name.toLowerCase()}`)) {
          next.delete(name);
        }
      }
      return next;
    });
  };

  // Handle selecting a user from dropdown
  const handleSelectUser = (u: SearchedUser) => {
    if (!activeMentionQuery || !textareaRef.current) return;

    // Replace the `@typed...` with the user's full name, e.g., `@Vedant Kulkarni`
    const before = content.slice(0, activeMentionQuery.startIndex);
    const after = content.slice(activeMentionQuery.endIndex);
    
    // Convert spaces in name to PascalCase or strip so it forms one consecutive mention block,
    // or just leave as is. Actually, if we leave spaces: "@Vedant Kulkarni", our matching logic 
    // handles words but standard mentions don't have spaces. Let's use the exact name but strip spaces
    // for the visual @ tag (e.g. "@VedantKulkarni") to be safe, or just insert it as is. 
    // Let's insert the exact full name, without spaces, to ensure the regex finds it easily as one token.
    const cleanName = u.name.replace(/\s+/g, '');
    const newMentionText = `@${cleanName} `;
    
    const newContent = before + newMentionText + after;
    setContent(newContent);
    
    setMentions(prev => {
      const next = new Map(prev);
      next.set(cleanName, u);
      return next;
    });

    setActiveMentionQuery(null);
    setShowDropdown(false);
    
    // Refocus textarea and place cursor after the new mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const curPos = before.length + newMentionText.length;
        textareaRef.current.setSelectionRange(curPos, curPos);
      }
    }, 0);
  };

  const handleRemoveMention = (name: string) => {
    setContent(prev => prev.replace(new RegExp(`@${name}\\b`, 'gi'), ''));
    setMentions(prev => {
      const next = new Map(prev);
      next.delete(name);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { setError("You must be logged in."); return; }
    if (!content.trim()) { setError("Please write something."); return; }
    
    const subjectIds = Array.from(mentions.values()).map(u => u.id);
    const uniqueSubjectIds = [...new Set(subjectIds)];

    if (uniqueSubjectIds.length === 0) {
      setError("Please tag at least one subject using @mention.");
      return;
    }

    setError("");
    setModerationBlocked(false);

    try {
      let evidenceUrl = "";
      
      // Phase 1: Upload evidence
      if (file) {
        setPublishPhase("uploading");
        const formData = new FormData();
        formData.append("file", file);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file");

        const uploadData = await uploadRes.json();
        evidenceUrl = uploadData.url;
      }

      // Phase 2: AI Moderation analysis (backend runs this synchronously)
      setPublishPhase("moderating");

      // Phase 3: Submit to backend (which runs moderation then saves)
      setPublishPhase("publishing");
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          publisherId: user.id, 
          subjectIds: uniqueSubjectIds, 
          content,
          evidenceUrl
        }),
      });

      if (res.ok) {
        router.push("/news");
      } else {
        const d = await res.json();
        if (d.moderationBlock) {
          setModerationBlocked(true);
          setError(d.reason || "Content flagged by AI Safety Engine.");
        } else {
          setError(d.error || "Failed to publish news.");
        }
      }
    } catch {
      setError("Network error or upload failed.");
    } finally {
      setPublishPhase("idle");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-lg w-full p-8 relative animate-fade-in">
        <Link href="/news" className="text-sm font-medium mb-6 inline-block transition" style={{ color: "var(--accent)" }}>
          ← Back to News Feed
        </Link>
        <h1 className="text-2xl font-black mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <IconPen size={24} color="var(--accent)" />
          Publish News
        </h1>
        <p className="text-sm mb-6 ml-8" style={{ color: "var(--text-secondary)" }}>spill the tea. your credibility is at stake.</p>

        {error && (
          <div className={`p-4 mb-6 rounded-xl text-sm font-medium border ${
            moderationBlocked
              ? "bg-red-900/20 border-red-500/40 text-red-300"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {moderationBlocked && (
              <div className="flex items-center gap-2 font-bold text-red-400 mb-2">
                <span>🚨</span>
                <span>Post Blocked by AI Safety Engine</span>
              </div>
            )}
            <p>{error}</p>
            {moderationBlocked && (
              <p className="text-xs text-gray-500 mt-2">Edit your content and try again. Repeated violations may affect your Credibility Score.</p>
            )}
          </div>
        )}

        {!user ? (
          <div className="text-center p-6 border rounded-xl" style={{ borderColor: "var(--border)" }}>
            <p className="mb-4" style={{ color: "var(--text-secondary)" }}>You need an account to publish.</p>
            <Link href="/login" className="btn-primary">Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            
            {/* Mention Tracked Chips */}
            {mentions.size > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-white/10 bg-black/20">
                <span className="text-xs text-gray-400 my-auto uppercase tracking-wider font-semibold mr-2">Tagged:</span>
                {Array.from(mentions.entries()).map(([name, u]) => (
                  <div key={u.id} className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-sm">
                    <span>@{name} <span className="opacity-60 text-xs">${u.stockSymbol}</span></span>
                    <button type="button" onClick={() => handleRemoveMention(name)} className="hover:text-red-400 font-bold ml-1">&times;</button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>The Scoop</label>
              <textarea 
                ref={textareaRef}
                value={content} 
                onChange={handleContentChange} 
                className="input w-full min-h-[160px] resize-y text-lg p-4 leading-relaxed" 
                placeholder="What happened? Type @ to tag people..." 
              />
              
              {/* Mentions Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div ref={dropdownRef} className="absolute z-50 mt-1 w-64 rounded-xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl bg-[#1a1a1a]/95">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between"
                    >
                      <span className="font-semibold text-gray-200">{u.name}</span>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">${u.stockSymbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Evidence (Optional)</label>
              <div className="border border-dashed border-white/20 p-4 rounded-xl hover:border-white/40 transition-colors bg-white/5 relative">
                <input
                  type="file"
                  accept="image/*,video/*,.pdf"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFileSizeError("");
                    if (selected) {
                      if (selected.size > MAX_FILE_BYTES) {
                        setFileSizeError(
                          `File is too large: ${formatFileSize(selected.size)}. Maximum allowed size is ${MAX_FILE_MB} MB. Please compress or choose a smaller file.`
                        );
                        setFile(null);
                        e.target.value = ""; // reset input so user can reselect
                      } else {
                        setFile(selected);
                      }
                    } else {
                      setFile(null);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center pointer-events-none">
                  {file ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-emerald-400 font-medium">📄 {file.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">
                        {formatFileSize(file.size)} / {MAX_FILE_MB} MB ✓
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Click to upload image, video or PDF</span>
                  )}
                </div>
              </div>
              {/* Instant file size error — shown below the dropzone */}
              {fileSizeError && (
                <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-amber-900/20 border border-amber-500/30 text-amber-300 text-sm">
                  <span className="text-lg leading-none">⚠️</span>
                  <div>
                    <p className="font-bold mb-0.5">File too large</p>
                    <p>{fileSizeError}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !!fileSizeError}
              className="btn-primary w-full py-4 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {phaseLabel[publishPhase]}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
