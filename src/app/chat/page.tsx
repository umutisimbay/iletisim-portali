'use client'

import { Toaster } from 'react-hot-toast'
import EmojiPicker from 'emoji-picker-react'
import { useChat, formatTime, type ChatUser } from './useChat'
import { useState } from 'react'

export default function ChatPage() {
  const {
    currentUser, chatList, users, isModalOpen, setIsModalOpen,
    isGroupModalOpen, setIsGroupModalOpen, groupName, setGroupName,
    selectedUsersForGroup, setSelectedUsersForGroup, createGroup,
    selectedChat, setSelectedChat, loadingUsers, unreadCounts,
    chatToRemove, setChatToRemove, isLogoutModalOpen, setIsLogoutModalOpen,
    pinnedUsers, blockedUsers, isFabMenuOpen, setIsFabMenuOpen,
    messages, newMessage, setNewMessage, showEmojiPicker, setShowEmojiPicker,
    selectedImage, setSelectedImage, zoomLevel, setZoomLevel, resetZoom,
    messagesEndRef, fileInputRef, sidebarWidth, isResizing, sidebarRef,
    sidebarContextMenu, setSidebarContextMenu, contextMenu, setContextMenu,
    startResizing, onEmojiClick, sendMessage, handleImageSelect,
    performRemoveChat, togglePinChat, toggleBlockUser, handleContextMenu,
    handleSidebarContextMenu, handleDeleteForMe, handleDeleteForEveryone, logout,
    isMessageInfoOpen, setIsMessageInfoOpen, messageForInfo, handleShowMessageInfo
  } = useChat()

  const [infoTab, setInfoTab] = useState<'read' | 'delivered'>('read')

  const directChats = chatList.filter(chat => !chat.is_group)
  const groupChats = chatList.filter(chat => chat.is_group)

  const renderTicks = (status: string) => {
      const color = status === 'read' ? '#34B7F1' : '#8696a0' 
      const tickPath = "M10.91 3.316l.475.475a.7.7 0 0 1 0 .988L5.8 10.366l-3.186-3.19a.7.7 0 0 1 0-.99l.476-.473a.7.7 0 0 1 .987 0l1.722 1.725L9.92 3.317a.7.7 0 0 1 .99 0z";
      if (status === 'sent') { return (<svg viewBox="0 0 16 15" width="16" height="15" className="block ml-1 shrink-0"><path fill={color} d={tickPath}></path></svg>) }
      return (<svg viewBox="0 0 18 15" width="18" height="15" className="block ml-1 shrink-0"><path fill={color} d={tickPath}></path><path transform="translate(5, -1)" fill={color} d={tickPath}></path></svg>)
  }

  const getLastSeenText = (chat: ChatUser) => {
    if (chat.is_group) return 'Grup Sohbeti'
    if (chat.blocked_users?.includes(currentUser?.id || '')) return ''
    if (!chat.last_seen) return 'Görülmedi'
    const diff = Math.floor((new Date().getTime() - new Date(chat.last_seen).getTime()) / 1000)
    return diff < 60 ? <span className="text-green-600 font-semibold">Çevrimiçi</span> : `Son görülme: ${new Date(chat.last_seen).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsersForGroup(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  const ChatItem = ({ chat }: { chat: ChatUser }) => (
    <div key={chat.id} onClick={() => setSelectedChat(chat)} onContextMenu={(e) => handleSidebarContextMenu(e, chat)} className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 ${selectedChat?.id === chat.id ? 'bg-gray-100 border-l-4 border-l-green-500' : 'border-l-4 border-l-transparent'}`}>
        <div className="relative shrink-0 mr-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${chat.is_group ? 'bg-indigo-500' : 'bg-gray-400'}`}>{chat.is_group ? 'G' : chat.name?.charAt(0).toLocaleUpperCase('tr-TR')}</div>
            {pinnedUsers.includes(chat.id) && (<div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-gray-500"><path fillRule="evenodd" d="M15.75 2.25H21a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V4.81L8.03 17.03a.75.75 0 0 1-1.06-1.06L19.19 3.75h-3.44a.75.75 0 0 1 0-1.5Zm-10.5 4.5a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V10.5a.75.75 0 0 1 1.5 0v8.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V8.25a3 3 0 0 1 3-3h8.25a.75.75 0 0 1 0 1.5H5.25Z" clipRule="evenodd" /></svg></div>)}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5"><h3 className="font-semibold text-gray-800 truncate text-sm">{chat.name}</h3><span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatTime(chat.last_msg_date)}</span></div>
            <p className="text-xs text-gray-500 truncate flex items-center h-4">{chat.last_msg_sender_id === currentUser?.id && chat.last_msg_status && (<span className="inline-block mr-1">{renderTicks(chat.last_msg_status)}</span>)}{chat.last_msg_type === 'image' ? <span className="flex items-center gap-1">📷 Fotoğraf</span> : (chat.last_msg_content || '')}</p>
        </div>
        {unreadCounts[chat.id] > 0 && <div className="bg-[#00a884] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ml-2 shadow-sm shrink-0">{unreadCounts[chat.id]}</div>}
    </div>
  )

  if (!currentUser) return <div className="h-screen flex items-center justify-center">Yükleniyor...</div>

  return (
    <div className={`flex h-screen bg-gray-100 overflow-hidden relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <Toaster position="top-center" />

      {/* SIDEBAR */}
      <div ref={sidebarRef} className="bg-white border-r border-gray-300 flex flex-col flex-shrink-0 relative" style={{ width: sidebarWidth }}>
        <div className="p-4 bg-gray-100 border-b border-gray-300 flex justify-between items-center h-16 shrink-0">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-xs">{currentUser.name?.charAt(0).toLocaleUpperCase('tr-TR')}</div><span className="font-semibold text-gray-700 text-sm truncate" style={{maxWidth: sidebarWidth - 100}}>{currentUser.name}</span></div>
          <button onClick={() => setIsLogoutModalOpen(true)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center" title="Çıkış Yap"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto">
            {chatList.length === 0 && (<div className="p-8 text-center text-gray-400 text-sm">Henüz sohbet yok.</div>)}
            {directChats.length > 0 && (<div><div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 tracking-wider sticky top-0 z-10">TEKLİ SOHBETLER ({directChats.length})</div>{directChats.map(chat => <ChatItem key={chat.id} chat={chat} />)}</div>)}
            {groupChats.length > 0 && (<div><div className="px-4 py-2 bg-gray-50 border-b border-t border-gray-200 text-xs font-bold text-gray-500 tracking-wider sticky top-0 z-10">GRUP SOHBETLERİ ({groupChats.length})</div>{groupChats.map(chat => <ChatItem key={chat.id} chat={chat} />)}</div>)}
        </div>
        {isFabMenuOpen && (<div className="absolute bottom-24 right-6 flex flex-col gap-3 z-30 animate-in slide-in-from-bottom-5"><button onClick={() => { setIsFabMenuOpen(false); setIsGroupModalOpen(true) }} className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-xl hover:bg-indigo-50 text-indigo-700 border border-indigo-100 transition-all cursor-pointer"><span className="font-medium">👥 Yeni Grup</span></button><button onClick={() => { setIsFabMenuOpen(false); setIsModalOpen(true) }} className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-xl hover:bg-green-50 text-green-700 border border-green-100 transition-all cursor-pointer"><span className="font-medium">👤 Yeni Sohbet</span></button></div>)}
        <button onClick={() => setIsFabMenuOpen(!isFabMenuOpen)} className={`absolute bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all z-20 cursor-pointer text-white ${isFabMenuOpen ? 'bg-gray-600 rotate-45' : 'bg-green-600 hover:bg-green-700'}`}><span className="text-3xl font-light pb-1">+</span></button>
      </div>
      <div className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize z-20" onMouseDown={startResizing}></div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative min-w-[400px]">
        {selectedChat ? (
            <>
                <div className="h-16 bg-gray-50 border-b px-6 flex items-center gap-3 shadow-sm z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${selectedChat.is_group ? 'bg-indigo-500' : 'bg-gray-400'}`}>{selectedChat.is_group ? 'G' : selectedChat.name?.charAt(0).toLocaleUpperCase('tr-TR')}</div>
                    <div><h2 className="font-bold text-gray-800">{selectedChat.name}</h2><p className="text-xs text-gray-500">{getLastSeenText(selectedChat)}</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', opacity: 0.9 }}>
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === currentUser.id
                        return (
                            <div key={msg.id} onContextMenu={(e) => handleContextMenu(e, msg)} className={`flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'}`}>
                                {selectedChat.is_group && !isMe && (<span className="text-[13px] text-orange-700 ml-2 mb-1 font-bold">{msg.sender_email?.split('@')[0] || 'Bilinmeyen'}</span>)}
                                <div className={`max-w-[70%] px-4 py-2 rounded-lg text-sm shadow-sm ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                    {msg.message_type === 'image' ? (<img src={msg.content} onClick={() => setSelectedImage(msg.content)} className="rounded-lg max-h-[300px] cursor-pointer hover:opacity-90 transition-opacity" />) : (<span>{msg.content}</span>)}
                                    <div className="flex justify-end items-center mt-1 space-x-1"><span className="text-[10px] text-gray-500 opacity-70">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>{isMe && renderTicks(msg.status)}</div>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-3 bg-[#f0f2f5] border-t relative">
                    {showEmojiPicker && <div className="absolute bottom-20 left-4 z-50"><EmojiPicker onEmojiClick={onEmojiClick} /></div>}
                    <input type="file" ref={fileInputRef} hidden onChange={handleImageSelect} accept="image/*" />
                    <form onSubmit={(e) => sendMessage(e, newMessage, 'text')} className="flex gap-2 items-center">
                        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-500 p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg></button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-500 p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg></button>
                        <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Bir mesaj yazın" className="flex-1 px-4 py-3 rounded-lg border-none focus:ring-0 outline-none text-gray-700" />
                        <button type="submit" disabled={!newMessage.trim()} className="bg-[#00a884] text-white p-3 rounded-full hover:bg-[#008f6f] cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-sm"><svg viewBox="0 0 24 24" height="20" width="20" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24"><path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path></svg></button>
                    </form>
                </div>
            </>
        ) : (<div className="h-full flex flex-col items-center justify-center text-gray-400"><div className="text-6xl mb-4">💬</div><p>Bir sohbet seçin veya yeni bir grup kurun.</p></div>)}
      </div>

      {/* MODALS */}
      {isGroupModalOpen && (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"><div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-lg text-gray-800">Yeni Grup Oluştur</h3><button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-full hover:bg-gray-200 transition-colors">✕</button></div><div className="p-6 overflow-y-auto flex-1"><div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Grup Adı</label><input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Örn: Proje Ekibi" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/></div><label className="block text-sm font-medium text-gray-700 mb-2">Üyeleri Seç ({selectedUsersForGroup.length})</label><div className="space-y-2">{loadingUsers ? <p className="text-sm text-gray-500">Kullanıcılar yükleniyor...</p> : users.map(user => (<div key={user.id} onClick={() => toggleUserSelection(user.id)} className={`flex items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedUsersForGroup.includes(user.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}><div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${selectedUsersForGroup.includes(user.id) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>{selectedUsersForGroup.includes(user.id) && <span className="text-white text-xs">✓</span>}</div><div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold mr-3">{user.name?.charAt(0).toLocaleUpperCase('tr-TR')}</div><span className="text-sm text-gray-700">{user.name}</span></div>))}</div></div><div className="p-4 border-t bg-gray-50 flex justify-end gap-2"><button onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">İptal</button><button onClick={createGroup} disabled={!groupName.trim() || selectedUsersForGroup.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">Oluştur</button></div></div></div>)}
      {isModalOpen && (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl"><div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800">Kişi Seç</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-full hover:bg-gray-200 transition-colors">✕</button></div><div className="max-h-[400px] overflow-y-auto p-2">{users.map(u => (<button key={u.id} onClick={() => { setSelectedChat(u); setIsModalOpen(false) }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left cursor-pointer transition-colors"><div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">{u.name?.charAt(0).toLocaleUpperCase('tr-TR')}</div><span className="text-gray-700">{u.name}</span></button>))}</div></div></div>)}
      
      {/* MESAJ BİLGİSİ MODALI */}
      {isMessageInfoOpen && messageForInfo && (
          <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 bg-gray-50 border-b flex items-center gap-3"><button onClick={() => setIsMessageInfoOpen(false)} className="text-gray-500 hover:bg-gray-200 p-2 rounded-full transition-colors cursor-pointer">✕</button><h3 className="font-bold text-gray-800">Mesaj Bilgisi</h3></div>
                  <div className="p-6 bg-white border-b flex justify-end">
                      <div className="bg-[#d9fdd3] px-4 py-2 rounded-lg text-sm shadow-sm rounded-tr-none max-w-full relative">
                          {messageForInfo.message_type === 'image' ? '📷 Fotoğraf' : messageForInfo.content}
                          <div className="flex justify-end items-center mt-1 space-x-1"><span className="text-[10px] text-gray-500 opacity-70">{new Date(messageForInfo.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>{renderTicks(messageForInfo.status)}</div>
                      </div>
                  </div>
                  {/* SEKMELER */}
                  <div className="flex border-b">
                      <button onClick={() => setInfoTab('read')} className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${infoTab === 'read' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:bg-gray-50'}`}>Okuyanlar {messageForInfo.read_by?.length ? `(${messageForInfo.read_by.length})` : ''}</button>
                      <button onClick={() => setInfoTab('delivered')} className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${infoTab === 'delivered' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:bg-gray-50'}`}>İletilenler {messageForInfo.delivered_to?.length ? `(${messageForInfo.delivered_to.length})` : ''}</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                      {infoTab === 'read' ? (
                          (messageForInfo.read_by && messageForInfo.read_by.length > 0) ? (
                              messageForInfo.read_by.map(readerId => {
                                  const user = users.find(u => u.id === readerId)
                                  return (
                                      <div key={readerId} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg"><div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-sm">{user?.name?.charAt(0).toLocaleUpperCase('tr-TR')}</div><div><p className="text-sm font-medium text-gray-800">{user?.name || 'Bilinmeyen'}</p><p className="text-xs text-blue-500">Okudu</p></div></div>
                                  )
                              })
                          ) : <p className="text-center text-gray-400 mt-4 text-sm">Henüz kimse okumadı.</p>
                      ) : (
                          (messageForInfo.delivered_to && messageForInfo.delivered_to.length > 0) ? (
                              messageForInfo.delivered_to
                                  .filter(id => !messageForInfo.read_by?.includes(id)) 
                                  .map(readerId => {
                                  const user = users.find(u => u.id === readerId)
                                  return (
                                      <div key={readerId} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg"><div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-sm">{user?.name?.charAt(0).toLocaleUpperCase('tr-TR')}</div><div><p className="text-sm font-medium text-gray-800">{user?.name || 'Bilinmeyen'}</p><p className="text-xs text-gray-500">İletildi</p></div></div>
                                  )
                              })
                          ) : <p className="text-center text-gray-400 mt-4 text-sm">Henüz kimseye iletilmedi.</p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {sidebarContextMenu && sidebarContextMenu.visible && (<div className="fixed bg-white shadow-xl rounded-lg py-1 z-[60] min-w-[160px] border border-gray-100" style={{ top: sidebarContextMenu.y, left: sidebarContextMenu.x }}><button onClick={() => togglePinChat(sidebarContextMenu.chat.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer transition-colors">{pinnedUsers.includes(sidebarContextMenu.chat.id) ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}</button>{!sidebarContextMenu.chat.is_group && <button onClick={() => toggleBlockUser(sidebarContextMenu.chat.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-gray-100 transition-colors">{blockedUsers.includes(sidebarContextMenu.chat.id) ? 'Engeli Kaldır' : 'Engelle'}</button>}</div>)}
      
      {contextMenu && contextMenu.visible && (
            <div className="fixed bg-white shadow-xl rounded-lg py-1 z-50 min-w-[160px] border border-gray-100" style={{ top: contextMenu.y, left: contextMenu.x }}>
                {selectedChat?.is_group && contextMenu.message.sender_id === currentUser?.id && (<button onClick={handleShowMessageInfo} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer transition-colors border-b border-gray-100"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>Mesaj Bilgisi</button>)}
                <button onClick={handleDeleteForMe} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer transition-colors">Benden Sil</button>
                {contextMenu.message.sender_id === currentUser?.id && <button onClick={handleDeleteForEveryone} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-gray-100 transition-colors">Herkesten Sil</button>}
            </div>
      )}

      {chatToRemove && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-2xl p-6 text-center"><h3 className="font-bold text-lg mb-2">Sohbeti Kaldır?</h3><div className="flex gap-3 justify-center"><button onClick={() => setChatToRemove(null)} className="px-4 py-2 bg-gray-100 rounded-lg">Vazgeç</button><button onClick={performRemoveChat} className="px-4 py-2 bg-red-600 text-white rounded-lg">Kaldır</button></div></div></div>)}
      
      {/* ÇIKIŞ MODALI */}
      {isLogoutModalOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsLogoutModalOpen(false)} 
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()} 
          >
            <h3 className="font-bold text-lg mb-2">Çıkış Yapmak İstediğinize Emin Misiniz?</h3>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setIsLogoutModalOpen(false)} 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer transition-colors"
              >
                Hayır
              </button>
              <button 
                onClick={logout} 
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors"
              >
                Evet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GÖRSEL ÖNİZLEME ve ZOOM MODALI --- */}
      {selectedImage && (
          <div 
              className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4" 
              onClick={() => setSelectedImage(null)}
          >
              {/* İNDİRME BUTONU (DÜZELTİLDİ: Doğru SVG Path Eklendi) */}
              <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    const link = document.createElement('a'); 
                    link.href = selectedImage; 
                    link.download = 'image.jpg'; 
                    link.click(); 
                }} 
                className="absolute top-4 right-16 text-white p-2 bg-gray-800 rounded-full hover:bg-gray-700 cursor-pointer z-50 flex items-center justify-center transition-colors"
              >
                {/* YENİ SVG: Standart İndirme İkonu */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 3v13.5M8.25 12.75 12 16.5l3.75-3.75" />
                </svg>
              </button>
              
              <button 
                onClick={() => setSelectedImage(null)} 
                className="absolute top-4 right-4 text-white p-2 bg-gray-800 rounded-full hover:bg-gray-700 cursor-pointer z-50 flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <img 
                  src={selectedImage} 
                  className="max-h-[90vh] max-w-full object-contain transition-transform duration-200 ease-out" 
                  onClick={(e) => e.stopPropagation()} 
                  style={{ transform: `scale(${zoomLevel})` }} 
              />

              <div 
                  className="absolute bottom-8 bg-gray-900/80 px-6 py-3 rounded-full flex items-center gap-6 text-white backdrop-blur-sm select-none" 
                  onClick={e => e.stopPropagation()}
              >
                  {/* ZOOM OUT BUTONU */}
                  <button 
                      onClick={() => setZoomLevel(p => Math.max(p - 0.25, 0.25))}
                      className="text-xl font-bold hover:text-gray-300 w-8 cursor-pointer"
                  >
                      -
                  </button>
                  
                  <div className="flex flex-col items-center min-w-[60px]">
                      <span className="font-mono font-semibold">{Math.round(zoomLevel * 100)}%</span>
                      {zoomLevel !== 1 && (
                          <button 
                              onClick={resetZoom} 
                              className="text-[10px] text-green-400 hover:text-green-300 uppercase tracking-wider cursor-pointer mt-1 font-bold animate-in fade-in"
                          >
                              Sıfırla
                          </button>
                      )}
                  </div>

                  {/* ZOOM IN BUTONU */}
                  <button 
                      onClick={() => setZoomLevel(p => Math.min(p + 0.25, 5))}
                      className="text-xl font-bold hover:text-gray-300 w-8 cursor-pointer"
                  >
                      +
                  </button>
              </div>
          </div>
      )}
    </div>
  )
}