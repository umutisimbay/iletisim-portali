'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EmojiPicker from 'emoji-picker-react'
import toast, { Toaster } from 'react-hot-toast'

// --- TİP TANIMLAMALARI ---
type ChatUser = {
  id: string;
  email: string;
  last_seen?: string;
  pinned_users?: string[];
  blocked_users?: string[];
  last_msg_content?: string;
  last_msg_date?: string;
  last_msg_type?: 'text' | 'image';
  last_msg_status?: 'sent' | 'delivered' | 'read';
  last_msg_sender_id?: string;
}

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  message_type: 'text' | 'image';
  is_deleted?: boolean;
  deleted_for?: string[];
}

// --- YARDIMCI FONKSİYONLAR ---
const formatTime = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
        reject(new Error("Dosya boyutu 5MB'dan büyük olamaz."));
        return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        
        if (scaleSize >= 1) {
            canvas.width = img.width;
            canvas.height = img.height;
        } else {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
            resolve(compressedBase64);
        } else {
            reject(new Error("Resim işlenirken hata oluştu."));
        }
      };
      img.onerror = () => reject(new Error("Resim yüklenemedi."));
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
  });
};

export default function ChatPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  
  // --- STATE'LER ---
  const [chatList, setChatList] = useState<ChatUser[]>([]) 
  const [users, setUsers] = useState<ChatUser[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({})
  const [chatToRemove, setChatToRemove] = useState<string | null>(null)
  
  // ÖZELLİK STATELERİ
  const [pinnedUsers, setPinnedUsers] = useState<string[]>([])
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sidebarWidth, setSidebarWidth] = useState(350)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const [sidebarContextMenu, setSidebarContextMenu] = useState<{ visible: boolean; x: number; y: number; user: ChatUser } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; message: Message } | null>(null);

  // 1. OTURUM KONTROLÜ
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { 
        router.push('/') 
      } else {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (!profile) {
            setCurrentUser({ id: session.user.id, email: session.user.email || "", pinned_users: [], blocked_users: [] });
            return;
        }
        const fullUser: ChatUser = { 
            id: session.user.id, 
            email: session.user.email || "", 
            last_seen: profile.last_seen,
            pinned_users: profile.pinned_users || [],
            blocked_users: profile.blocked_users || []
        };
        setCurrentUser(fullUser)
        setPinnedUsers(fullUser.pinned_users || [])
        setBlockedUsers(fullUser.blocked_users || [])
        
        const updatePresence = async () => { 
            await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id) 
        }
        updatePresence() 
        const interval = setInterval(updatePresence, 5000) 
        return () => clearInterval(interval)
      }
    }
    checkUser()
  }, [router])

  // Resize Mantığı
  const startResizing = useCallback(() => setIsResizing(true), [])
  const stopResizing = useCallback(() => setIsResizing(false), [])
  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX
      if (newWidth > 250 && newWidth < 600) setSidebarWidth(newWidth)
    }
  }, [isResizing])

  useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    window.addEventListener("click", () => {
        setContextMenu(null);
        setSidebarContextMenu(null);
    })
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
      window.removeEventListener("click", () => {
        setContextMenu(null);
        setSidebarContextMenu(null);
      })
    }
  }, [resize, stopResizing])

  // --- VERİ ÇEKME ---
  const fetchUnreadCounts = async () => {
      if (!currentUser) return;
      const { data } = await supabase.from('messages').select('sender_id').eq('receiver_id', currentUser.id).neq('status', 'read');
      if (data) {
          const counts: {[key: string]: number} = {};
          data.forEach((msg: any) => { 
              // GÜNCELLEME: Engelli kullanıcıdan gelen mesajları sayma
              const isBlocked = blockedUsers.includes(msg.sender_id);
              if (!isBlocked) {
                  counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1; 
              }
          });
          setUnreadCounts(counts);
      }
  }

  const getChatList = async () => {
    if (!currentUser) return
    const { data: messagesData } = await supabase.from('messages').select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order('created_at', { ascending: false })
    if (!messagesData) return

    const uniqueUsersMap = new Map<string, any>();
    messagesData.forEach((msg: any) => { 
        const isDeletedForMe = msg.deleted_for && msg.deleted_for.includes(currentUser.id)
        if (isDeletedForMe) return
        
        const otherUserId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
        
        // GÜNCELLEME: Eğer karşı taraf engelli listesindeyse sohbet listesinde son mesaj olarak gösterme
        // (İsteğe bağlı: Engellenen kullanıcıyı listeden tamamen gizlemek isterseniz burayı açın)
        // if (blockedUsers.includes(otherUserId)) return; 

        if (!uniqueUsersMap.has(otherUserId)) {
            uniqueUsersMap.set(otherUserId, {
                content: msg.is_deleted ? '🚫 Bu mesaj silindi' : msg.content,
                date: msg.created_at,
                type: msg.message_type,
                status: msg.status,
                sender_id: msg.sender_id 
            });
        }
    })
    
    if (uniqueUsersMap.size === 0) { setChatList([]); return }

    const { data: profilesData } = await supabase.from('profiles').select('*').in('id', Array.from(uniqueUsersMap.keys()))
    
    if (profilesData) {
        const combinedData: ChatUser[] = profilesData.map((profile: any) => {
            const lastMsgInfo = uniqueUsersMap.get(profile.id);
            return {
                ...profile,
                last_msg_content: lastMsgInfo?.content,
                last_msg_date: lastMsgInfo?.date,
                last_msg_type: lastMsgInfo?.type,
                last_msg_status: lastMsgInfo?.status,
                last_msg_sender_id: lastMsgInfo?.sender_id
            };
        });

        const currentPinned = pinnedUsers.length > 0 ? pinnedUsers : (currentUser.pinned_users || []);
        
        const sortedList = combinedData.sort((a, b) => {
            const isAPinned = currentPinned.includes(a.id);
            const isBPinned = currentPinned.includes(b.id);
            
            if (isAPinned && !isBPinned) return -1;
            if (!isAPinned && isBPinned) return 1; 
            
            const dateA = new Date(a.last_msg_date || 0).getTime();
            const dateB = new Date(b.last_msg_date || 0).getTime();
            
            return dateB - dateA; 
        });

        setChatList([...sortedList]) 
    }
  }

  // Blocked users veya Pinned users değişince listeyi yenile
  useEffect(() => { if(chatList.length > 0 || pinnedUsers.length > 0 || blockedUsers.length > 0) getChatList(); }, [pinnedUsers, blockedUsers])

  // --- GLOBAL LISTENER (GELEN MESAJ KONTROLÜ) ---
  useEffect(() => {
    if (currentUser) {
      getChatList();
      fetchUnreadCounts();
      const globalChannel = supabase.channel('global_changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, 
        async (payload) => {
            // GÜNCELLEME: ENGELLİ KULLANICIDAN MI GELİYOR?
            const senderId = payload.new.sender_id;
            if (blockedUsers.includes(senderId)) {
                console.log("Engelli kullanıcıdan mesaj geldi, yoksayılıyor.");
                return; // Hiçbir şey yapma, mesajı gösterme
            }

            getChatList(); 
            if (selectedUser?.id !== payload.new.sender_id) { 
                await supabase.from('messages').update({ status: 'delivered' }).eq('id', payload.new.id);
                setUnreadCounts(prev => ({ ...prev, [payload.new.sender_id]: (prev[payload.new.sender_id] || 0) + 1 }));
            } else {
                 await supabase.from('messages').update({ status: 'read' }).eq('id', payload.new.id);
            }
        }).subscribe()
      return () => { supabase.removeChannel(globalChannel) }
    }
  }, [currentUser, selectedUser?.id, blockedUsers]) // blockedUsers değiştiğinde listener yenilenmeli

  const fetchUsers = async () => {
    if (!currentUser) return; setLoadingUsers(true)
    const { data } = await supabase.from('profiles').select('*').neq('id', currentUser.id)
    setUsers(data || []); setLoadingUsers(false)
  }
  useEffect(() => { if (isModalOpen) fetchUsers() }, [isModalOpen])

  useEffect(() => {
    if (!selectedUser) return
    setUnreadCounts(prev => { const newCounts = { ...prev }; delete newCounts[selectedUser.id]; return newCounts; });
    const profileChannel = supabase.channel(`profile:${selectedUser.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${selectedUser.id}` }, (payload) => { setSelectedUser(payload.new as ChatUser) }).subscribe()
    return () => { supabase.removeChannel(profileChannel) }
  }, [selectedUser?.id])

  useEffect(() => {
    if (!selectedUser || !currentUser) return
    const fetchAndMarkMessages = async () => {
      const { data } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`).order('created_at', { ascending: true })
      if (data) {
          // GÜNCELLEME: Mesajları çekerken engelli mi kontrolü (Opsiyonel: Eğer geçmiş mesajları da görmek istemiyorsanız burayı filtreleyebilirsiniz)
          // const visibleMessages = data.filter((m: any) => !m.deleted_for?.includes(currentUser.id) && !blockedUsers.includes(m.sender_id))
          
          const visibleMessages = data.filter((m: any) => !m.deleted_for?.includes(currentUser.id))
          setMessages(visibleMessages)
          const unreadMessages = visibleMessages.filter((m: any) => m.receiver_id === currentUser.id && m.status !== 'read')
          if (unreadMessages.length > 0) { 
              await supabase.from('messages').update({ status: 'read' }).in('id', unreadMessages.map((m: any) => m.id));
              setUnreadCounts(prev => { const newCounts = { ...prev }; delete newCounts[selectedUser.id]; return newCounts; });
          }
      }
    }
    fetchAndMarkMessages()
    const channel = supabase.channel(`chat:${currentUser.id}-${selectedUser.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=in.(${currentUser.id},${selectedUser.id})` }, 
        async (payload) => {
          const msg = payload.new as Message
          
          // GÜNCELLEME: Canlı sohbetteyken engelli kişiden mesaj gelirse ekleme
          if (blockedUsers.includes(msg.sender_id)) return;

          if (payload.eventType === 'INSERT') {
             if ((msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id) || (msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id)) {
                if (!msg.deleted_for?.includes(currentUser.id)) {
                    setMessages((prev) => [...prev, msg])
                    if (msg.receiver_id === currentUser.id) { await supabase.from('messages').update({ status: 'read' }).eq('id', msg.id) } 
                    getChatList() 
                }
             }
          }
          if (payload.eventType === 'UPDATE') { 
              if (msg.deleted_for?.includes(currentUser.id)) { setMessages((prev) => prev.filter(m => m.id !== msg.id)) } 
              else { setMessages((prev) => prev.map(m => m.id === msg.id ? msg : m)) }
              getChatList()
          }
        }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedUser?.id, currentUser, blockedUsers])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // --- ACTION HANDLERS ---
  const onEmojiClick = (emojiObject: any) => { setNewMessage((prev) => prev + emojiObject.emoji) }

  const sendMessage = async (e?: React.FormEvent, content: string = newMessage, type: 'text' | 'image' = 'text') => {
    if (e) e.preventDefault()
    if (!content.trim() || !currentUser || !selectedUser) return
    try {
        const { error } = await supabase.from('messages').insert({ content: content, sender_id: currentUser.id, receiver_id: selectedUser.id, status: 'sent', message_type: type })
        if (error) throw error
        if(type === 'text') setNewMessage('')
        setShowEmojiPicker(false)
        getChatList() 
    } catch (error: any) { toast.error("Mesaj gönderilemedi: " + (error.message)) }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { const compressedBase64 = await compressImage(file); await sendMessage(undefined, compressedBase64, 'image') } 
    catch (error: any) { toast.error(error.message) }
    e.target.value = ''
  }

  const performRemoveChat = async () => {
    if(!chatToRemove || !currentUser) return;
    const targetUserId = chatToRemove;
    const { data: msgs } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`);
    if(msgs) {
         const updates = msgs.map(async (msg: any) => {
             const currentDeleted = msg.deleted_for || [];
             if(!currentDeleted.includes(currentUser.id)) {
                 const newDeleted = [...currentDeleted, currentUser.id];
                 await supabase.from('messages').update({ deleted_for: newDeleted }).eq('id', msg.id);
             }
         });
         await Promise.all(updates);
         getChatList();
         if(selectedUser?.id === targetUserId) setSelectedUser(null);
         toast.success("Sohbet kaldırıldı")
    }
    setChatToRemove(null);
  }

  const togglePinChat = async (targetUserId: string) => {
    if (!currentUser) return;
    let newPinnedList = [...(pinnedUsers || [])];
    if (newPinnedList.includes(targetUserId)) { newPinnedList = newPinnedList.filter(id => id !== targetUserId); } 
    else { newPinnedList.push(targetUserId); }
    setPinnedUsers(newPinnedList);
    const { error } = await supabase.from('profiles').update({ pinned_users: newPinnedList }).eq('id', currentUser.id);
    if (error) { setPinnedUsers(pinnedUsers); toast.error("İşlem başarısız."); }
    setSidebarContextMenu(null);
  };

  const toggleBlockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    let newBlockedList = [...(blockedUsers || [])];
    const isBlocked = newBlockedList.includes(targetUserId);
    if (isBlocked) { 
        newBlockedList = newBlockedList.filter(id => id !== targetUserId); 
        toast.success("Kullanıcı engeli kaldırıldı");
    } else { 
        newBlockedList.push(targetUserId); 
        toast.success("Kullanıcı engellendi");
    }
    setBlockedUsers(newBlockedList);
    const { error } = await supabase.from('profiles').update({ blocked_users: newBlockedList }).eq('id', currentUser.id);
    if (error) { 
        setBlockedUsers(blockedUsers);
        toast.error("Engelleme işlemi başarısız."); 
    }
    setSidebarContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault(); if (msg.is_deleted) return;
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, message: msg });
  };

  const handleSidebarContextMenu = (e: React.MouseEvent, user: ChatUser) => {
      e.preventDefault();
      setSidebarContextMenu({ visible: true, x: e.pageX, y: e.pageY, user });
  }

  const handleDeleteForMe = async () => {
    if (!contextMenu || !currentUser) return;
    const msg = contextMenu.message;
    const currentDeletedFor = msg.deleted_for || [];
    const newDeletedFor = [...currentDeletedFor, currentUser.id];
    await supabase.from('messages').update({ deleted_for: newDeletedFor }).eq('id', msg.id);
    setContextMenu(null);
    toast.success("Mesaj sizden silindi")
  };

  const handleDeleteForEveryone = async () => {
    if (!contextMenu) return;
    await supabase.from('messages').update({ is_deleted: true }).eq('id', contextMenu.message.id);
    setContextMenu(null);
    toast.success("Mesaj herkesten silindi")
  };

  const renderTicks = (status: string) => {
      const color = status === 'read' ? '#34B7F1' : '#8696a0' 
      if (status === 'sent') return (<svg viewBox="0 0 16 15" width="16" height="15" className="block ml-1"><path fill={color} d="M10.91 3.316l.475.475a.7.7 0 0 1 0 .988L5.8 10.366l-3.186-3.19a.7.7 0 0 1 0-.99l.476-.473a.7.7 0 0 1 .987 0l1.722 1.725L9.92 3.317a.7.7 0 0 1 .99 0z"></path></svg>)
      return (<svg viewBox="0 0 16 15" width="16" height="15" className="block ml-1"><path fill={color} d="M15.01 3.316l-.478-.475a.665.665 0 0 0-.478-.206.67.67 0 0 0-.478.206L8.47 7.947l-1.423 1.426 1.42 1.422 6.543-6.49a.695.695 0 0 0 0-.987z"></path><path fill={color} d="M6.082 11.49L1.325 6.726a.697.697 0 0 1 0-.99l.475-.475a.697.697 0 0 1 .99 0l3.29 3.29 1.156 1.156a.46.46 0 0 1-.035.035l-1.12 1.748z"></path><path fill={color} d="M11.962 3.843l-5.88 5.882-1.422-1.424 1.156-1.156 4.723-4.724a.697.697 0 0 1 .99 0l.475.475a.665.665 0 0 1 .206.477.67.67 0 0 1-.206.477z"></path></svg>)
  }

  const getLastSeenText = (lastSeenDate?: string) => {
    if (!lastSeenDate) return 'Görülmedi'
    const diffInSeconds = Math.floor((new Date().getTime() - new Date(lastSeenDate).getTime()) / 1000)
    if (diffInSeconds < 15) return <span className="text-green-600 font-semibold">Çevrimiçi</span>
    return `Son görülme: ${new Date(lastSeenDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  if (!currentUser) return <div className="h-screen flex items-center justify-center">Yükleniyor...</div>

  return (
    <div className={`flex h-screen bg-gray-100 overflow-hidden relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      
      {/* TOAST NOTIFICATIONS */}
      <Toaster position="top-center" />

      {/* SOL MENÜ */}
      <div ref={sidebarRef} className="bg-white border-r border-gray-300 flex flex-col flex-shrink-0 relative" style={{ width: sidebarWidth }}>
        <div className="p-4 bg-gray-100 border-b border-gray-300 flex justify-between items-center h-16 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-xs">{currentUser.email?.charAt(0).toUpperCase()}</div>
            <span className="font-semibold text-gray-700 text-sm truncate" style={{ maxWidth: sidebarWidth - 100 }}>{currentUser.email}</span>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer" title="Çıkış Yap">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
            {chatList.length === 0 ? (<div className="p-4 text-center"><p className="text-gray-400 text-xs mt-4">Henüz sohbet yok.</p></div>) : (<div className="divide-y divide-gray-100">
                    {chatList.map((user) => (
                        <div 
                            key={user.id} 
                            onClick={() => setSelectedUser(user)} 
                            onContextMenu={(e) => handleSidebarContextMenu(e, user)}
                            className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${selectedUser?.id === user.id ? 'bg-gray-100 border-l-4 border-green-500' : ''}`}
                        >
                            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg shrink-0 relative">
                                    {user.email?.charAt(0).toUpperCase()}
                                    {pinnedUsers.includes(user.id) && (
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-gray-500"><path fillRule="evenodd" d="M15.75 2.25H21a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V4.81L8.03 17.03a.75.75 0 0 1-1.06-1.06L19.19 3.75h-3.44a.75.75 0 0 1 0-1.5Zm-10.5 4.5a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V10.5a.75.75 0 0 1 1.5 0v8.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V8.25a3 3 0 0 1 3-3h8.25a.75.75 0 0 1 0 1.5H5.25Z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                    {blockedUsers.includes(user.id) && (
                                        <div className="absolute -top-1 -right-1 bg-red-100 rounded-full p-0.5 shadow-sm border border-red-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-red-500">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex flex-col flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-800 truncate flex items-center gap-2">
                                            {user.email}
                                            {pinnedUsers.includes(user.id) && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded-sm font-normal">Sabitlendi</span>}
                                        </h3>
                                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatTime(user.last_msg_date)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate h-4 mt-0.5 w-[90%] flex items-center">
                                        {user.last_msg_sender_id === currentUser?.id && user.last_msg_status && (
                                            <span className="inline-block mr-1">{renderTicks(user.last_msg_status)}</span>
                                        )}
                                        {user.last_msg_type === 'image' ? <span className="flex items-center gap-1">📷 Fotoğraf</span> : (user.last_msg_content || '')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pl-2">
                                {unreadCounts[user.id] > 0 && (<div className="bg-[#00a884] text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-pulse">{unreadCounts[user.id]}</div>)}
                                <button onClick={(e) => { e.stopPropagation(); setChatToRemove(user.id); }} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors z-10 cursor-pointer" title="Sohbeti Kaldır">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* SIDEBAR CONTEXT MENU */}
        {sidebarContextMenu && sidebarContextMenu.visible && (
            <div className="fixed bg-white shadow-xl rounded-lg py-1 z-[60] min-w-[160px] border border-gray-100" style={{ top: sidebarContextMenu.y, left: sidebarContextMenu.x }}>
                <button onClick={() => togglePinChat(sidebarContextMenu.user.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
                    {pinnedUsers.includes(sidebarContextMenu.user.id) ? (
                        <> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></svg> Sabitlemeyi Kaldır </>
                    ) : (
                        <> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg> Başa Sabitle </>
                    )}
                </button>
                {/* ENGELLEME BUTONU */}
                <button onClick={() => toggleBlockUser(sidebarContextMenu.user.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-gray-100">
                    {blockedUsers.includes(sidebarContextMenu.user.id) ? (
                        <> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> Engeli Kaldır </>
                    ) : (
                        <> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg> Engelle </>
                    )}
                </button>
            </div>
        )}

        {/* FAB MENÜ */}
        {isFabMenuOpen && (
            <div className="absolute bottom-24 right-6 flex flex-col gap-3 z-30">
                <button onClick={() => { setIsFabMenuOpen(false); alert("Grup oluşturma özelliği yakında!") }} className="flex items-center gap-3 bg-white text-gray-700 px-4 py-3 rounded-lg shadow-xl hover:bg-gray-50 transition-all border border-gray-100 min-w-[180px] cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg></div>
                    <span className="font-medium text-sm">Yeni Grup Oluştur</span>
                </button>
                <button onClick={() => { setIsFabMenuOpen(false); setIsModalOpen(true) }} className="flex items-center gap-3 bg-white text-gray-700 px-4 py-3 rounded-lg shadow-xl hover:bg-gray-50 transition-all border border-gray-100 min-w-[180px] cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg></div>
                    <span className="font-medium text-sm">Yeni Sohbet Başlat</span>
                </button>
            </div>
        )}

        <button onClick={() => setIsFabMenuOpen(!isFabMenuOpen)} className={`absolute bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all z-20 cursor-pointer ${isFabMenuOpen ? 'bg-gray-600 rotate-45' : 'bg-green-600 hover:bg-green-700'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </button>
      </div>

      <div className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors flex items-center justify-center z-20" onMouseDown={startResizing}><div className="w-[2px] h-8 bg-gray-400 rounded-full opacity-50"></div></div>

      {/* SAĞ TARAF */}
      <div className="flex-1 flex flex-col relative bg-[#efeae2] min-w-[400px]">
        {/* HEADER */}
        {selectedUser && (
            <div className="h-16 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">{selectedUser.email?.charAt(0).toUpperCase()}</div>
                   <div><h2 className="font-bold text-gray-800">{selectedUser.email}</h2><p className="text-xs text-gray-500">{getLastSeenText(selectedUser.last_seen)}</p></div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', opacity: 0.9 }}>
          {!selectedUser ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-white/50 backdrop-blur-sm rounded-xl m-10">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-bold mb-2">Umudiye'ye Hoş Geldiniz!</h2>
                <p>Sohbet seçin veya başlatın.</p>
            </div>
          ) : (
             <div className="space-y-2 flex flex-col pb-4">
                {messages.map((msg) => {
                    if (msg.deleted_for && msg.deleted_for.includes(currentUser?.id || '')) return null;
                    const isMe = msg.sender_id === currentUser?.id
                    return (
                        <div key={msg.id} onContextMenu={(e) => handleContextMenu(e, msg)} className={`flex ${isMe ? 'justify-end' : 'justify-start'} cursor-context-menu`}>
                            <div className={`max-w-[70%] px-4 py-2 rounded-lg text-sm shadow-sm relative ${isMe ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                                <div className="flex items-end gap-2">
                                    <div className="mb-1">
                                        {msg.is_deleted ? (
                                            <span className="italic text-gray-500 flex items-center gap-1"><span className="text-xs">🚫</span> Bu mesaj silindi</span>
                                        ) : msg.message_type === 'image' ? (
                                            <img src={msg.content} alt="Gönderilen Fotoğraf" className="rounded-lg max-h-[300px] max-w-full object-cover cursor-pointer" />
                                        ) : (
                                            <span>{msg.content}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end min-w-[50px]">
                                        <span className="text-[10px] text-gray-500 opacity-70">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        {isMe && (<div className="-mt-1">{renderTicks(msg.status || 'sent')}</div>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
             </div>
          )}
        </div>

        {/* INPUT AREA (ENGELLİ KONTROLÜ İLE) */}
        {selectedUser && (
            <div className="p-3 bg-[#f0f2f5] border-t border-gray-300 shrink-0 relative">
                {blockedUsers.includes(selectedUser.id) ? (
                    <div className="w-full bg-gray-100 text-gray-500 text-center py-3 rounded-lg text-sm border border-gray-300">
                        🚫 Bu kullanıcıyı engellediniz. Mesaj göndermek için engeli kaldırın.
                    </div>
                ) : (
                    <>
                        {showEmojiPicker && (<div className="absolute bottom-[80px] left-4 z-50"><EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} /></div>)}
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                        <form onSubmit={(e) => sendMessage(e, newMessage, 'text')} className="flex gap-2 items-center">
                            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                            </button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer" title="Fotoğraf Gönder">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
                            </button>
                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Bir mesaj yazın" className="flex-1 px-4 py-3 rounded-lg border-none focus:ring-0 outline-none text-gray-700 placeholder:text-gray-500 shadow-sm" />
                            <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center cursor-pointer">
                                <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" className="" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24"><path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path></svg>
                            </button>
                        </form>
                    </>
                )}
            </div>
        )}

      {/* SOHBETİ KALDIR ONAY MODALI */}
      {chatToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Sohbeti Kaldır?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Bu sohbet listenizden kaldırılacak. Mesaj geçmişi silinmez, ancak bu sohbeti tekrar başlatana kadar göremezsiniz.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setChatToRemove(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors cursor-pointer">Hayır, Vazgeç</button>
                        <button onClick={performRemoveChat} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md transition-colors cursor-pointer">Evet, Kaldır</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* KIŞI SEÇME MODALI */}
      {isModalOpen && (<div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"><div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800">Kişi Seç</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button></div><div className="max-h-[400px] overflow-y-auto p-2">{loadingUsers ? <p className="text-center py-8">Yükleniyor...</p> : users.map((u) => (<button key={u.id} onClick={() => { setSelectedUser(u); setIsModalOpen(false) }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left cursor-pointer"><div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">{u.email?.charAt(0).toUpperCase()}</div><div><p className="font-medium text-gray-800">{u.email}</p></div></button>))}</div></div></div>)}
      </div>
    </div>
  )
}