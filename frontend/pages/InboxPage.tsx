
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { conversationsApi, aiApi } from '../lib/api';
import { Chat, Message } from '../types';

const InboxPage: React.FC = () => {
  const { user, authToken } = usePersistence();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get('chatId');

  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(chatIdFromUrl);
  const [messageText, setMessageText] = useState('');
  const [filter, setFilter] = useState<'All' | 'Buying' | 'Selling'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isStitchThinking, setIsStitchThinking] = useState(false);
  const [stitchAdvice, setStitchAdvice] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await conversationsApi.list(authToken);
        setChats(data || []);
      } catch (err: any) {
        console.error('Failed to fetch conversations:', err);
        setError(err.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [authToken]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChatId || !authToken) return;

      try {
        const data = await conversationsApi.get(selectedChatId, authToken);
        setMessages(data || []);
      } catch (err: any) {
        console.error('Failed to fetch messages:', err);
      }
    };

    fetchMessages();
  }, [selectedChatId, authToken]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !selectedChatId || !authToken) return;

    try {
      await conversationsApi.sendMessage(selectedChatId, messageText, authToken);
      // Refresh messages
      const data = await conversationsApi.get(selectedChatId, authToken);
      setMessages(data || []);
      setMessageText('');
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(err.message || 'Failed to send message');
    }
  };

  const consultStitch = async () => {
    if (!activeChat || !user) return;
    setIsStitchThinking(true);
    setStitchAdvice(null);

    try {
      const conversationContext = messages.map(m => 
        `${m.senderId === user.id ? 'Me' : 'Seller'}: ${m.text}`
      ).join('\n');

      // Call actual AI endpoint
      const response = await aiApi.consultNegotiation({
        product_title: activeChat.productTitle || 'this item',
        product_price: activeChat.productPrice || 0,
        conversation: conversationContext || 'No conversation yet.',
        user_role: 'buyer', // Determine from context if needed
      });

      setStitchAdvice(response.advice || "Stitch says: This looks like a fair community price! Trust your instincts.");
    } catch (err: any) {
      console.error('Stitch consultation failed:', err);
      setStitchAdvice("Stitch is temporarily unavailable. Trust your instincts and negotiate if you feel it's reasonable!");
    } finally {
      setIsStitchThinking(false);
    }
  };

  const filteredChats = chats.filter(c => {
    if (filter === 'All') return true;
    // For this MVP, we consider any chat we initiate as "Buying" 
    // and any chat where someone else initiates as "Selling".
    // Since our mock data is simple, we'll just show all for now.
    return true;
  });

  return (
    <div className="flex-grow h-[calc(100vh-140px)] bg-slate-50 dark:bg-background-dark overflow-hidden animate-fadeIn">
      <div className="max-w-7xl mx-auto h-full flex divide-x divide-gray-100 dark:divide-white/5">
        
        {/* Sidebar */}
        <aside className="w-full md:w-[380px] flex flex-col bg-white dark:bg-surface-dark z-20">
           <div className="p-8 border-b border-gray-100 dark:border-white/5 space-y-6">
              <h1 className="text-3xl font-black tracking-tight">Messages</h1>
              <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                 {['All', 'Buying', 'Selling'].map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setFilter(tab as any)} 
                      className={`flex-1 py-2 text-xs font-medium uppercase tracking-wide rounded transition-all ${filter === tab ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      {tab}
                    </button>
                 ))}
              </div>
           </div>
           <div className="flex-1 overflow-y-auto scrollbar-hide">
              {filteredChats.length === 0 ? (
                <div className="p-10 text-center space-y-4">
                   <div className="size-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <span className="material-symbols-outlined !text-3xl">inbox</span>
                   </div>
                   <p className="text-sm font-bold text-slate-400">No conversations yet.</p>
                </div>
              ) : filteredChats.map(chat => (
                <button 
                  key={chat.id} 
                  onClick={() => {
                    setSelectedChatId(chat.id);
                    setSearchParams({ chatId: chat.id });
                  }}
                  className={`w-full p-6 flex gap-4 text-left border-b border-gray-50 dark:border-white/5 transition-all ${selectedChatId === chat.id ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                   <div className="relative">
                      <div className="size-14 rounded-lg bg-cover bg-center shadow-sm" style={{backgroundImage: `url("${chat.productImage}")`}}></div>
                      {chat.unread && <div className="absolute -top-1 -right-1 size-3 bg-primary rounded-full border-2 border-white"></div>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                         <h4 className="font-black truncate text-sm">{chat.other_participant?.name || 'Unknown User'}</h4>
                         <span className="text-[9px] font-bold text-slate-400 uppercase">{chat.lastTimestamp || 'New'}</span>
                      </div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-tighter mb-1 truncate">{chat.productTitle}</p>
                      <p className="text-xs truncate text-slate-500">{chat.lastMessage || 'Start the negotiation!'}</p>
                   </div>
                </button>
              ))}
           </div>
        </aside>

        {/* Chat Window */}
        <main className="hidden md:flex flex-1 flex-col relative bg-white dark:bg-black/20">
           {activeChat ? (
             <>
               <div className="p-6 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-white/5 flex items-center justify-between shadow-sm z-10">
                  <div className="flex items-center gap-4">
                     <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">person</span>
                     </div>
                     <div>
                        <h3 className="font-black text-lg">{activeChat?.productTitle ? 'Seller' : 'Buyer'}</h3>
                        <p className="text-xs font-bold text-green-500 flex items-center gap-1">
                          <span className="size-1.5 bg-green-500 rounded-full animate-pulse"></span>
                          Neighbor • Online
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-2 px-4 rounded-lg border border-gray-100 dark:border-white/10">
                     <img src={activeChat?.productImage || ''} className="size-10 rounded object-cover" alt="" />
                     <div className="hidden sm:block">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{activeChat?.productTitle || 'Product'}</p>
                        <p className="text-sm font-black text-primary">${activeChat?.productPrice || 0}</p>
                     </div>
                  </div>
               </div>

               {/* Thread */}
               <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-6 scrollbar-hide bg-[#FBFDFF] dark:bg-transparent">
                  <div className="flex justify-center mb-8">
                     <span className="px-4 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Neighborhood Exchange Started</span>
                  </div>

                  {messages.length === 0 && (
                    <div className="text-center py-10 opacity-40">
                       <span className="material-symbols-outlined !text-6xl mb-4">waving_hand</span>
                       <p className="font-black text-sm uppercase tracking-widest">Say hello to your neighbor!</p>
                    </div>
                  )}

                  {messages.map((m) => {
                    const isMe = user && m.senderId === user.id || m.senderId === 'me';
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fadeInUp`}>
                        <div className={`max-w-[70%] p-4 rounded-lg shadow-sm text-sm font-medium ${
                          isMe
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-white/10'
                        }`}>
                          <p>{m.text}</p>
                          <p className={`text-[8px] mt-2 font-black uppercase tracking-widest ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                            {m.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Stitch AI Advice UI */}
                  {stitchAdvice && (
                    <div className="flex justify-center animate-fadeInDown sticky bottom-4 z-20">
                       <div className="max-w-md bg-slate-900 text-white p-5 rounded-lg border border-white/10 shadow-lg flex gap-4">
                          <div className="size-12 shrink-0 bg-primary rounded-lg flex items-center justify-center text-white shadow-md">
                             <span className="material-symbols-outlined !text-2xl">magic_button</span>
                          </div>
                          <div className="flex-1">
                             <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Stitch Insight</p>
                             <p className="text-sm font-medium leading-relaxed italic">"{stitchAdvice}"</p>
                             <button onClick={() => setStitchAdvice(null)} className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Dismiss</button>
                          </div>
                       </div>
                    </div>
                  )}
               </div>

               {/* Input Area */}
               <div className="p-6 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-white/5">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-4 max-w-5xl mx-auto">
                     <button 
                       type="button" 
                       onClick={consultStitch}
                       disabled={isStitchThinking || !activeChat || messages.length === 0}
                       className="size-16 shrink-0 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-20 group relative"
                       title="Consult Stitch AI"
                     >
                        {isStitchThinking ? (
                          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined !text-2xl group-hover:text-primary transition-colors">magic_button</span>
                        )}
                        {activeChat && messages.length > 0 && !isStitchThinking && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                          </span>
                        )}
                     </button>
                     <div className="flex-1 relative">
                        <input 
                           type="text" 
                           value={messageText}
                           onChange={e => setMessageText(e.target.value)}
                           placeholder="Type a message or offer..." 
                           className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-lg py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                     </div>
                     <button 
                        type="submit"
                        className="size-16 bg-primary text-white rounded-lg flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                     >
                        <span className="material-symbols-outlined !text-2xl">send</span>
                     </button>
                  </form>
               </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                <div className="size-32 bg-gray-50 dark:bg-white/5 rounded-[48px] flex items-center justify-center text-slate-200">
                   <span className="material-symbols-outlined !text-6xl">chat</span>
                </div>
                <div>
                   <h3 className="text-2xl font-black mb-2">Select a Conversation</h3>
                   <p className="text-slate-500 font-medium max-w-xs">Negotiate prices and arrange safe meetups with neighbors.</p>
                </div>
             </div>
           )}
        </main>
      </div>
    </div>
  );
};

export default InboxPage;
