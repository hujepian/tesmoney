"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send, Loader2, Sparkles, AlertTriangle, CheckCircle2,
  Bot, User, RefreshCw, Coins, TrendingDown, Target,
  Brain, MessageSquare, Lightbulb, TrendingUp, Shield, Award,
  Clock, Heart
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AIAdvisorProps {
  currentUser: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface FinancialData {
  totalIncome:   number;
  totalExpense:  number;
  balance:       number;
  savingsRate:   number;
  transactions:  any[];
  budgets:       any[];
  goals:         any[];
  wallets:       any[];
}

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ── Helper: ringkasan keuangan ───────────────────────────────────────────────
function buildFinancialSummary(data: FinancialData) {
  const categoryMap: Record<string, number> = {};
  data.transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

  return {
    totalIncome:   data.totalIncome,
    totalExpense:  data.totalExpense,
    balance:       data.balance,
    savingsRate:   data.savingsRate,
    expenseByCategory: categoryMap,
    budgets: data.budgets.map((b) => {
      const spent = data.transactions
        .filter((t) => t.type === "expense" && t.category === b.category)
        .reduce((s: number, t: any) => s + t.amount, 0);
      return {
        category:   b.category,
        limit:       b.limit_amount,
        spent,
        isOver:      spent > b.limit_amount,
        percentage: Math.round((spent / b.limit_amount) * 100),
      };
    }),
  };
}

// ── Hitung skor kesehatan keuangan ───────────────────────────────────────────
function computeHealthScore(data: FinancialData) {
  const items: { label: string; points: number; ok: boolean; icon?: any }[] = [];

  if (data.savingsRate >= 15)
    items.push({ label: "Tabungan Sehat", points: 25, ok: true, icon: Shield });
  else
    items.push({ label: "Tabungan Rendah", points: 5, ok: false, icon: AlertTriangle });

  if (data.balance > 0)
    items.push({ label: "Saldo Positif", points: 25, ok: true, icon: TrendingUp });
  else
    items.push({ label: "Saldo Negatif", points: 0, ok: false, icon: TrendingDown });

  const overBudgets = data.budgets.filter((b) => {
    const spent = data.transactions
      .filter((t) => t.type === "expense" && t.category === b.category)
      .reduce((s: number, t: any) => s + t.amount, 0);
    return spent > b.limit_amount;
  });

  if (data.budgets.length > 0 && overBudgets.length === 0)
    items.push({ label: "Budget Disiplin", points: 25, ok: true, icon: Target });
  else
    items.push({ label: overBudgets.length > 0 ? "Budget Bocor" : "Belum Ada Budget", points: 5, ok: false, icon: AlertTriangle });

  const completedGoals = data.goals.filter(
    (g) => g.current_amount >= g.target_amount
  );
  if (completedGoals.length > 0)
    items.push({ label: "Target Tercapai", points: 25, ok: true, icon: Award });
  else
    items.push({ label: "Target Belum Tercapai", points: 0, ok: false, icon: Target });

  const total = Math.min(100, items.reduce((s, i) => s + i.points, 0));
  return { total, items };
}

// ✅ Circular Progress Bar
function CircularScore({ score }: { score: number }) {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-full py-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#1e293b" strokeWidth={strokeWidth} fill="transparent" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          stroke="url(#gradientScore)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gradientScore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Health</span>
      </div>
    </div>
  );
}

// ── Komponen Utama ────────────────────────────────────────────────────────────
export function AIAdvisor({ currentUser }: AIAdvisorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatRp = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  // ✅ Simpan ke localStorage
  const saveMessagesToLocalStorage = useCallback((msgs: Message[]) => {
    if (currentUser) {
      localStorage.setItem(`chat_messages_${currentUser}`, JSON.stringify(msgs));
    }
  }, [currentUser]);

  const loadMessagesFromLocalStorage = useCallback(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`chat_messages_${currentUser}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        } catch (e) {
          console.error("Failed to parse saved messages", e);
        }
      }
    }
    return null;
  }, [currentUser]);

  // ✅ Cooldown timer
  const startCooldown = useCallback((seconds: number) => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }

    setCooldown(seconds);
    
    cooldownIntervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
            cooldownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  // ✅ Scroll ke bawah (tanpa animasi berlebihan)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  // ✅ Inisialisasi data
  useEffect(() => {
    if (!currentUser || !isValidUUID(currentUser)) {
      setDataLoading(false);
      return;
    }
    
    const init = async () => {
      let currentData: FinancialData | null = null;
      try {
        const [transactions, budgets, goals, wallets] = await Promise.all([
          api.transactions.list(), api.budgets.list(), api.goals.list(), api.wallets.list(),
        ]);
        const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        currentData = { 
          totalIncome, totalExpense, balance: totalIncome - totalExpense,
          savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
          transactions, budgets, goals, wallets 
        };
        setFinancialData(currentData);
      } catch { 
        toast.error("Gagal memuat data keuangan."); 
      }

      try {
        const existingConv = await api.chat.getOrCreateConversation(currentUser);
        setConversationId(existingConv?.id ?? null);
        
        const savedMessages = loadMessagesFromLocalStorage();
        if (savedMessages && savedMessages.length > 0) {
          setMessages(savedMessages);
        } else {
          const history = await api.chat.getHistory(existingConv?.id);
          if (history.length > 0) {
            const formattedHistory = history.filter((m: any) => m.content?.trim()).map((m: any) => ({
              role: m.role, content: m.content, timestamp: new Date(m.created_at)
            }));
            setMessages(formattedHistory);
            saveMessagesToLocalStorage(formattedHistory);
          }
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        setDataLoading(false); 
      }
    };
    init();
  }, [currentUser, loadMessagesFromLocalStorage, saveMessagesToLocalStorage]);

  // ✅ Simpan ke localStorage setiap ada perubahan
  useEffect(() => {
    if (messages.length > 0 && currentUser) {
      saveMessagesToLocalStorage(messages);
    }
  }, [messages, currentUser, saveMessagesToLocalStorage]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || loading || cooldown > 0 || !conversationId) return;
    
    const userMessage: Message = { role: "user", content: userText.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsTyping(true);
    
    try {
      await api.chat.saveMessage({ 
        role: "user", content: userText.trim(), user_id: currentUser, conversation_id: conversationId 
      });
      
      const res = await fetch("/api/ai-advisor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].slice(-8).map((m) => ({ role: m.role, content: m.content })),
          financialData: financialData ? buildFinancialSummary(financialData) : null,
          userId: currentUser,
        }),
      });
      
      const text = await res.text();
      
      if (!res.ok) {
        let errorMessage = text;
        try {
          const errorJson = JSON.parse(text);
          errorMessage = errorJson.error || errorMessage;
        } catch { }
        throw new Error(errorMessage);
      }
      
      await api.chat.saveMessage({ 
        role: "assistant", content: text, user_id: currentUser, conversation_id: conversationId 
      });
      
      setMessages((prev) => [...prev, { role: "assistant", content: text, timestamp: new Date() }]);
      startCooldown(3);
      
    } catch (err: any) { 
      console.error("Error:", err);
      toast.error(err.message || "Gagal terhubung ke Maya. Coba lagi nanti."); 
      setMessages((prev) => prev.filter((_, idx) => idx !== prev.length - 1));
    } finally { 
      setLoading(false); 
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    if (confirm("Yakin ingin mereset chat? Semua percakapan akan dihapus.")) {
      setMessages([]);
      if (currentUser) {
        localStorage.removeItem(`chat_messages_${currentUser}`);
      }
      toast.success("Chat telah direset");
    }
  };

  const healthScore = financialData ? computeHealthScore(financialData) : null;

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#030014] via-[#0a0a2a] to-[#000000] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030014] via-[#0a0a2a] to-[#000000]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/30 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="relative p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-xl shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-emerald-200 to-purple-300 bg-clip-text text-transparent">
                  Maya Advisor
                </h1>
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Asisten Keuangan AI-mu
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleResetChat}
              variant="ghost"
              size="sm"
              className="bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Chat
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {healthScore && (
                <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase">Financial Health</span>
                  </div>
                  <CircularScore score={healthScore.total} />
                  <div className="space-y-1.5 mt-3">
                    {healthScore.items.map((item, i) => {
                      const Icon = item.icon || (item.ok ? CheckCircle2 : AlertTriangle);
                      return (
                        <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3 h-3 ${item.ok ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span className="text-xs text-slate-300">{item.label}</span>
                          </div>
                          <span className={`text-xs font-bold ${item.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                            +{item.points}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {financialData && (
                <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase">Quick Insights</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Income</span>
                      <span className="text-emerald-400 font-medium">{formatRp(financialData.totalIncome)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Expense</span>
                      <span className="text-rose-400 font-medium">{formatRp(financialData.totalExpense)}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Savings Rate</span>
                      <span className={`font-medium ${financialData.savingsRate >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {financialData.savingsRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Chat Utama */}
            <div className="lg:col-span-3">
              <Card className="flex flex-col h-[680px] bg-gradient-to-br from-white/5 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
                
                {/* Chat Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-medium text-white">Maya</span>
                    {isTyping && (
                      <div className="flex gap-0.5 ml-1">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                    AI Powered
                  </span>
                </div>

                {/* Messages Area - Tanpa animasi berlebihan untuk performa scrolling */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 flex items-center justify-center mb-3">
                        <MessageSquare className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white mb-1">Halo! Saya Maya</h3>
                      <p className="text-xs text-slate-400 max-w-md">
                        Asisten keuangan AI-mu. Tanyakan apapun tentang keuanganmu!
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => sendMessage("Tips mengatur keuangan?")} className="bg-white/5 border-white/10 text-slate-300 text-xs">
                          💡 Tips Keuangan
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => sendMessage("Analisis pengeluaranku")} className="bg-white/5 border-white/10 text-slate-300 text-xs">
                          📊 Analisis
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // ✅ Tanpa AnimatePresence untuk performa scrolling yang lebih baik
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          msg.role === "user" 
                            ? "bg-gradient-to-br from-blue-500 to-purple-600" 
                            : "bg-gradient-to-br from-emerald-500 to-teal-600"
                        }`}>
                          {msg.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className={`max-w-[75%] p-3 rounded-xl text-sm leading-relaxed ${
                          msg.role === "user" 
                            ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-none" 
                            : "bg-white/10 backdrop-blur-sm border border-white/10 rounded-tl-none text-slate-200"
                        }`}>
                          <ReactMarkdown 
                            components={{ 
                              strong: ({ ...props }) => <b className="font-bold text-emerald-300" {...props} />,
                              p: ({ ...props }) => <p className="mb-1 last:mb-0 text-xs sm:text-sm" {...props} />,
                              ul: ({ ...props }) => <ul className="list-disc list-inside space-y-0.5 mt-1" {...props} />,
                              li: ({ ...props }) => <li className="text-xs sm:text-sm" {...props} />
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          <p className="text-[9px] mt-1.5 opacity-40">
                            {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Seragam dengan desain bubble chat */}
                <div className="p-3 border-t border-white/10 bg-black/30">
                  <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          loading ? "Maya sedang mengetik..." 
                          : cooldown > 0 ? `Tunggu ${cooldown} detik...` 
                          : "Tanya Maya tentang keuanganmu..."
                        }
                        disabled={loading || cooldown > 0}
                        className="w-full bg-white/5 border-white/10 rounded-xl h-10 text-white text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={loading || !input.trim() || cooldown > 0}
                      size="sm"
                      className="h-10 w-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                  
                  {/* Cooldown indicator yang lebih rapi */}
                  {cooldown > 0 && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <p className="text-[10px] text-amber-400">
                        Tunggu {cooldown} detik untuk mengirim pesan berikutnya
                      </p>
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-1000"
                          style={{ width: `${(cooldown / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}