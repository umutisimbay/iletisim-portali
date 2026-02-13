import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// --- TİP TANIMLAMALARI ---
export type ChatUser = {
  id: string; 
  email?: string;
  name?: string;
  avatar_url?: string;
  is_group: boolean;
  member_count?: number;
  last_seen?: string;
  pinned_users?: string[];
  blocked_users?: string[];
  last_msg_content?: string;
  last_msg_date?: string;
  last_msg_type?: 'text' | 'image';
  last_msg_status?: 'sent' | 'delivered' | 'read';
  last_msg_sender_id?: string;
}

export type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  message_type: 'text' | 'image';
  read_by?: string[];        // Okuyanların ID'leri
  delivered_to?: string[];   // İletilenlerin ID'leri
  is_deleted?: boolean;
  deleted_for?: string[];
  sender_email?: string;     // UI için geçici alan
}

// --- YARDIMCI FONKSİYONLAR ---
export const formatTime = (dateString?: string) => {
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
        if (scaleSize >= 1) { canvas.width = img.width; canvas.height = img.height; } 
        else { canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; }
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.5));
        } else { reject(new Error("Hata oluştu.")); }
      };
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
  });
};

// --- CUSTOM HOOK ---
export const useChat = () => {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  
  // STATE'LER
  const [chatList, setChatList] = useState<ChatUser[]>([]) 
  const [users, setUsers] = useState<ChatUser[]>([]) 
  
  // Modallar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  
  // Mesaj Bilgisi Modalı
  const [isMessageInfoOpen, setIsMessageInfoOpen] = useState(false)
  const [messageForInfo, setMessageForInfo] = useState<Message | null>(null)

  // Grup Oluşturma
  const [groupName, setGroupName] = useState('')
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<string[]>([])

  // Seçili Sohbet
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  // Diğer UI State'leri
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({})
  const [chatToRemove, setChatToRemove] = useState<string | null>(null)
  const [pinnedUsers, setPinnedUsers] = useState<string[]>([])
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false)

  // Mesajlaşma
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sidebar Resize
  const [sidebarWidth, setSidebarWidth] = useState(350)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Context Menüler
  const [sidebarContextMenu, setSidebarContextMenu] = useState<{ visible: boolean; x: number; y: number; chat: ChatUser } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; message: Message } | null>(null);

  // Görsel Zoom
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  // --- YENİ EKLENEN: Zoom Reset ---
  const resetZoom = () => setZoomLevel(1)

  // 1. OTURUM KONTROLÜ
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const fullUser: ChatUser = { 
          id: session.user.id, 
          email: session.user.email || "", 
          name: session.user.email || "", 
          is_group: false,
          last_seen: profile?.last_seen,
          pinned_users: profile?.pinned_users || [],
          blocked_users: profile?.blocked_users || []
      };
      setCurrentUser(fullUser)
      setPinnedUsers(fullUser.pinned_users || [])
      setBlockedUsers(fullUser.blocked_users || [])
      const updatePresence = async () => { await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id) }
      updatePresence(); const interval = setInterval(updatePresence, 5000); return () => clearInterval(interval)
    }
    checkUser()
  }, [router])

  // UI Event Listeners
  useEffect(() => { if (!selectedImage) setZoomLevel(1) }, [selectedImage])
  const startResizing = useCallback(() => setIsResizing(true), [])
  const stopResizing = useCallback(() => setIsResizing(false), [])
  const resize = useCallback((e: MouseEvent) => { if (isResizing && e.clientX > 250 && e.clientX < 600) setSidebarWidth(e.clientX) }, [isResizing])
  useEffect(() => {
    window.addEventListener("mousemove", resize); window.addEventListener("mouseup", stopResizing);
    window.addEventListener("click", () => { setContextMenu(null); setSidebarContextMenu(null); })
    return () => { window.removeEventListener("mousemove", resize); window.removeEventListener("mouseup", stopResizing); }
  }, [resize, stopResizing])

  // KULLANICILARI ÇEK
  const fetchUsers = async () => {
    if (!currentUser) return; 
    setLoadingUsers(true)
    const { data } = await supabase.from('profiles').select('*')
    const mapped = data?.map((u:any) => ({...u, name: u.email, is_group: false})) || []
    setUsers(mapped); 
    setLoadingUsers(false)
  }
  useEffect(() => { if(currentUser && users.length === 0) fetchUsers() }, [currentUser])


  // --- SOHBET LİSTESİ ÇEKME ---
  const getChatList = async () => {
    if (!currentUser) return

    // DM ve Grup verilerini çek
    const { data: msgData } = await supabase.from('messages').select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).is('group_id', null).order('created_at', { ascending: false })
    const { data: groupData } = await supabase.from('group_members').select('group_id, groups:groups(*)').eq('user_id', currentUser.id)
    const myGroupIds = groupData?.map((g: any) => g.group_id) || []
    
    let groupMemberCounts: {[key: string]: number} = {}
    let groupMessages: any[] | null = []

    if (myGroupIds.length > 0) {
        const { data: members } = await supabase.from('group_members').select('group_id').in('group_id', myGroupIds)
        members?.forEach((m: any) => { groupMemberCounts[m.group_id] = (groupMemberCounts[m.group_id] || 0) + 1 })
        
        const { data: gMsg } = await supabase.from('messages').select('*').in('group_id', myGroupIds).order('created_at', { ascending: false })
        groupMessages = gMsg
    }

    const chatMap = new Map<string, any>()

    // DM İşle
    msgData?.forEach((msg: any) => {
        if (msg.deleted_for?.includes(currentUser.id)) return
        const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id
        if (!chatMap.has(otherId)) { chatMap.set(otherId, { ...msg, is_group: false, display_id: otherId }) }
    })
    // Grup İşle
    groupData?.forEach((g: any) => {
        const lastMsg = groupMessages?.find((m: any) => m.group_id === g.groups.id)
        chatMap.set(g.groups.id, { 
            ...lastMsg, 
            is_group: true, 
            display_id: g.groups.id, 
            group_info: g.groups,
            member_count: groupMemberCounts[g.groups.id] || 0 
        })
    })

    if (chatMap.size === 0) { setChatList([]); return }

    const userIds = Array.from(chatMap.values()).filter(c => !c.is_group).map(c => c.display_id)
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)

    const finalChatList: ChatUser[] = Array.from(chatMap.values()).map((item) => {
        let chatObj: ChatUser = {
            id: item.display_id, is_group: item.is_group,
            last_msg_content: item.is_deleted ? '🚫 Silindi' : (item.content || (item.is_group ? 'Sohbet başladı' : '')),
            last_msg_date: item.created_at, last_msg_type: item.message_type,
            last_msg_status: item.status, last_msg_sender_id: item.sender_id,
            member_count: item.member_count
        }
        if (item.is_group) { chatObj.name = item.group_info.name; chatObj.avatar_url = item.group_info.avatar_url; } 
        else { const p = profiles?.find(p => p.id === item.display_id); chatObj.email = p?.email; chatObj.name = p?.email; chatObj.last_seen = p?.last_seen; }
        return chatObj
    })

    // Sıralama
    const currentPinned = pinnedUsers.length > 0 ? pinnedUsers : (currentUser.pinned_users || []);
    finalChatList.sort((a, b) => {
        const isAPinned = currentPinned.includes(a.id); const isBPinned = currentPinned.includes(b.id);
        if (isAPinned && !isBPinned) return -1; if (!isAPinned && isBPinned) return 1; 
        return new Date(b.last_msg_date || 0).getTime() - new Date(a.last_msg_date || 0).getTime(); 
    });
    setChatList([...finalChatList])

    // --- İLETİLDİ (DELIVERED) İŞLEME ---
    if (currentUser) {
        const dms = msgData?.filter((m: any) => m.receiver_id === currentUser.id && m.status === 'sent').map((m: any) => m.id) || []
        if (dms.length > 0) await supabase.from('messages').update({ status: 'delivered' }).in('id', dms)
        
        if (myGroupIds.length > 0 && groupMessages) {
            const myUnDeliveredGroupMsgs = groupMessages.filter((m: any) => 
                m.sender_id !== currentUser.id && 
                (!m.delivered_to || !m.delivered_to.includes(currentUser.id))
            )
            for (const msg of myUnDeliveredGroupMsgs) {
                const currentDelivered = msg.delivered_to || []
                const newDelivered = [...currentDelivered, currentUser.id]
                await supabase.from('messages').update({ delivered_to: newDelivered, status: 'delivered' }).eq('id', msg.id)
            }
        }
    }
  }

  // --- MESAJLARI ÇEKME VE OKUNDU YAPMA ---
  useEffect(() => {
    if (!selectedChat || !currentUser) return
    const fetchMessages = async () => {
      let query = supabase.from('messages').select('*, profiles:sender_id(email)').order('created_at', { ascending: true })
      if (selectedChat.is_group) { query = query.eq('group_id', selectedChat.id) } 
      else { query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedChat.id}),and(sender_id.eq.${selectedChat.id},receiver_id.eq.${currentUser.id})`) }

      const { data } = await query
      if (data) {
          const visible = data.filter((m: any) => !m.deleted_for?.includes(currentUser.id))
          const mapped = visible.map((m: any) => ({ ...m, sender_email: m.profiles?.email }))
          setMessages(mapped)
          
          if (!selectedChat.is_group) {
             const unreadIds = visible.filter((m: any) => m.sender_id !== currentUser.id && m.status !== 'read').map((m:any) => m.id)
             if(unreadIds.length > 0) await supabase.from('messages').update({ status: 'read' }).in('id', unreadIds)
          } else {
             const myUnreadGroupMsgs = visible.filter((m: any) => m.sender_id !== currentUser.id && (!m.read_by || !m.read_by.includes(currentUser.id)))
             if (myUnreadGroupMsgs.length > 0) {
                 for (const msg of myUnreadGroupMsgs) {
                     const currentReadBy = msg.read_by || []
                     const newReadBy = [...currentReadBy, currentUser.id]
                     const totalMembers = selectedChat.member_count || 2
                     let newStatus = msg.status
                     if (newReadBy.length >= (totalMembers - 1)) { newStatus = 'read' }
                     await supabase.from('messages').update({ read_by: newReadBy, status: newStatus }).eq('id', msg.id)
                 }
             }
          }
      }
    }
    fetchMessages()

    const channel = supabase.channel(`chat_room:${selectedChat.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
          const msg = payload.new as Message
          const isRelated = selectedChat.is_group ? msg.group_id === selectedChat.id : (msg.sender_id === selectedChat.id || msg.receiver_id === selectedChat.id)
          if (isRelated && !blockedUsers.includes(msg.sender_id)) {
             if (payload.eventType === 'INSERT') {
                 let senderEmail = '';
                 if (msg.sender_id) { const { data: p } = await supabase.from('profiles').select('email').eq('id', msg.sender_id).single(); senderEmail = p?.email || ''; }
                 setMessages(prev => [...prev, { ...msg, sender_email: senderEmail }])
             }
             if (payload.eventType === 'UPDATE') {
                 if (msg.deleted_for?.includes(currentUser.id)) { setMessages(prev => prev.filter(m => m.id !== msg.id)) }
                 else { setMessages(prev => prev.map(m => (m.id === msg.id ? { ...msg, sender_email: m.sender_email } : m))) }
             }
             getChatList()
          }
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedChat?.id, currentUser, blockedUsers])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // --- OKUNMAMIŞ SAYILARI ---
  useEffect(() => {
    if (currentUser) {
      getChatList();
      const fetchUnread = async () => {
         const { data: dms } = await supabase.from('messages').select('sender_id').eq('receiver_id', currentUser.id).neq('status', 'read').is('group_id', null);
         const { data: myGroups } = await supabase.from('group_members').select('group_id').eq('user_id', currentUser.id);
         const groupIds = myGroups?.map((g: any) => g.group_id) || [];
         
         let groupMsgs: any[] = [];
         if (groupIds.length > 0) {
             const { data: gData } = await supabase.from('messages').select('group_id, sender_id, read_by').in('group_id', groupIds).neq('status', 'read');
             groupMsgs = gData?.filter((m: any) => m.sender_id !== currentUser.id && (!m.read_by || !m.read_by.includes(currentUser.id))) || [];
         }

         const counts: any = {};
         dms?.forEach((m:any) => counts[m.sender_id] = (counts[m.sender_id] || 0) + 1);
         groupMsgs?.forEach((m:any) => counts[m.group_id] = (counts[m.group_id] || 0) + 1);
         setUnreadCounts(counts);
      }
      fetchUnread();

      const globalChannel = supabase.channel('global_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, 
        async (payload) => {
            getChatList();
            if (payload.eventType === 'INSERT') {
                const msg = payload.new as Message;
                if (msg.receiver_id === currentUser.id && selectedChat?.id !== msg.sender_id) {
                    setUnreadCounts(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
                }
                if (msg.group_id && msg.sender_id !== currentUser.id && selectedChat?.id !== msg.group_id) {
                    setUnreadCounts(prev => ({ ...prev, [msg.group_id!]: (prev[msg.group_id!] || 0) + 1 }));
                }
            }
        }).subscribe()
      return () => { supabase.removeChannel(globalChannel) }
    }
  }, [currentUser, selectedChat?.id, blockedUsers])

  // --- ACTIONS ---
  const handleShowMessageInfo = () => { if (contextMenu && contextMenu.message) { setMessageForInfo(contextMenu.message); setIsMessageInfoOpen(true); setContextMenu(null) } }
  
  const createGroup = async () => {
    if (!groupName.trim() || selectedUsersForGroup.length === 0 || !currentUser) return
    try {
        const { data: group, error: gError } = await supabase.from('groups').insert({ name: groupName, created_by: currentUser.id }).select().single()
        if (gError) throw gError
        const members = [currentUser.id, ...selectedUsersForGroup].map(uid => ({ group_id: group.id, user_id: uid, is_admin: uid === currentUser.id }))
        const { error: mError } = await supabase.from('group_members').insert(members)
        if (mError) throw mError
        toast.success("Grup oluşturuldu!"); setIsGroupModalOpen(false); setGroupName(''); setSelectedUsersForGroup([]); getChatList()
    } catch (err: any) { toast.error(err.message) }
  }
  
  const onEmojiClick = (emojiObject: any) => { setNewMessage((prev) => prev + emojiObject.emoji) }
  const sendMessage = async (e?: React.FormEvent, content: string = newMessage, type: 'text' | 'image' = 'text') => {
    if (e) e.preventDefault(); if (!content.trim() || !currentUser || !selectedChat) return;
    try {
        const msgData: any = { content, sender_id: currentUser.id, status: 'sent', message_type: type }
        if (selectedChat.is_group) { msgData.group_id = selectedChat.id } else { msgData.receiver_id = selectedChat.id }
        const { error } = await supabase.from('messages').insert(msgData)
        if (error) throw error; if(type === 'text') setNewMessage(''); setShowEmojiPicker(false); getChatList() 
    } catch (error: any) { toast.error("Hata: " + error.message) }
  }
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; try { const compressedBase64 = await compressImage(file); await sendMessage(undefined, compressedBase64, 'image') } catch (error: any) { toast.error(error.message) } e.target.value = '' }
  const performRemoveChat = async () => { if(!chatToRemove || !currentUser) return; setChatToRemove(null); toast.success("Sohbet kaldırıldı") }
  const togglePinChat = async (id: string) => { if (!currentUser) return; let newP = [...pinnedUsers]; if (newP.includes(id)) newP = newP.filter(x => x !== id); else newP.push(id); setPinnedUsers(newP); await supabase.from('profiles').update({ pinned_users: newP }).eq('id', currentUser.id); setSidebarContextMenu(null); }
  const toggleBlockUser = async (id: string) => { if (!currentUser) return; let newB = [...blockedUsers]; if (newB.includes(id)) { newB = newB.filter(x => x !== id); toast.success("Engel kalktı"); } else { newB.push(id); toast.success("Engellendi"); } setBlockedUsers(newB); await supabase.from('profiles').update({ blocked_users: newB }).eq('id', currentUser.id); setSidebarContextMenu(null); }
  const handleContextMenu = (e: any, msg: any) => { e.preventDefault(); if (msg.is_deleted) return; setContextMenu({ visible: true, x: e.pageX, y: e.pageY, message: msg }) }
  const handleSidebarContextMenu = (e: any, chat: any) => { e.preventDefault(); setSidebarContextMenu({ visible: true, x: e.pageX, y: e.pageY, chat }) }
  const handleDeleteForMe = async () => { if (!contextMenu || !currentUser) return; const msg = contextMenu.message; const newD = [...(msg.deleted_for || []), currentUser.id]; await supabase.from('messages').update({ deleted_for: newD }).eq('id', msg.id); setContextMenu(null); toast.success("Silindi") }
  const handleDeleteForEveryone = async () => { if (!contextMenu) return; await supabase.from('messages').update({ is_deleted: true }).eq('id', contextMenu.message.id); setContextMenu(null); toast.success("Herkesten silindi") }
  const logout = async () => { await supabase.auth.signOut(); router.push('/') }

  return {
    currentUser, chatList, users, isModalOpen, setIsModalOpen, isGroupModalOpen, setIsGroupModalOpen, groupName, setGroupName, selectedUsersForGroup, setSelectedUsersForGroup, createGroup, selectedChat, setSelectedChat, loadingUsers, unreadCounts, chatToRemove, setChatToRemove, pinnedUsers, blockedUsers, isFabMenuOpen, setIsFabMenuOpen, messages, newMessage, setNewMessage, showEmojiPicker, setShowEmojiPicker, selectedImage, setSelectedImage, zoomLevel, setZoomLevel, resetZoom, messagesEndRef, fileInputRef, sidebarWidth, isResizing, sidebarRef, sidebarContextMenu, setSidebarContextMenu, contextMenu, setContextMenu, startResizing, onEmojiClick, sendMessage, handleImageSelect, performRemoveChat, togglePinChat, toggleBlockUser, handleContextMenu, handleSidebarContextMenu, handleDeleteForMe, handleDeleteForEveryone, isLogoutModalOpen, setIsLogoutModalOpen, logout,
    isMessageInfoOpen, setIsMessageInfoOpen, messageForInfo, handleShowMessageInfo
  }
}