'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { FiSearch, FiMoreVertical, FiCheck, FiPaperclip, FiPlus } from 'react-icons/fi';
import { MdDoneAll } from 'react-icons/md';
import { IoMdPerson } from 'react-icons/io';
import { BsFillCameraVideoFill, BsEmojiSmile } from 'react-icons/bs';
import { MdGroups } from 'react-icons/md';
import { set, get } from 'idb-keyval';

// --- Type Definitions ---
type User = { id: string; email?: string };
type Chat = {
  id: string;
  chat_name: string;
  is_group: boolean;
  members: string[];
  labels: string[];
};
type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment?: string;
  delivered?: boolean;
  seen?: boolean;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
}
function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ChatsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // IndexedDB keys
  const CHATS_KEY = 'periskope_chats';
  const MSGS_PREFIX = 'periskope_msgs_';

  // --- USER Auth ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
      else setUser({ id: data.user.id, email: data.user.email });
    });
  }, [router]);

  // --- Fetch Chats (from cache first) ---
  useEffect(() => {
    async function fetchChatsAll() {
      const cached = await get(CHATS_KEY);
      if (cached) setChats(cached);
      if (!user) return;
      const { data } = await supabase
        .from('chats')
        .select('*')
        .contains('members', [user.id]);
      if (data) {
        setChats(data as Chat[]);
        set(CHATS_KEY, data);
      }
    }
    fetchChatsAll();
  }, [user]);

  // --- Fetch Last Messages ---
  useEffect(() => {
    async function fetchLastMsgs() {
      if (!chats.length) return;
      const chatIds = chats.map(c => c.id);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false });
      if (!data) return;
      const lastMsg: Record<string, Message> = {};
      for (const msg of data) {
        if (!lastMsg[msg.chat_id]) lastMsg[msg.chat_id] = msg as Message;
      }
      setLastMessages(lastMsg);
    }
    fetchLastMsgs();
  }, [chats]);

  // --- Fetch Messages (from cache first) ---
  useEffect(() => {
    if (!activeChat) return;
    async function fetchMsgs() {
      if (!activeChat) return;
      const cached = await get(MSGS_PREFIX + activeChat.id);
      if (cached) setMessages(cached);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data as Message[]);
        set(MSGS_PREFIX + activeChat.id, data);
      }
    }
    fetchMsgs();
    // --- Real-time ---
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.chat_id === activeChat.id) {
            setMessages(msgs => {
              const updated = [...msgs, payload.new as Message];
              set(MSGS_PREFIX + activeChat.id, updated);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  // --- Send Message (and attachment) ---
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !activeChat) return;
    setLoading(true);
    let fileUrl = '';
    if (file) {
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(`${Date.now()}_${file.name}`, file);
      if (error) alert('File upload failed: ' + error.message);
      else fileUrl = supabase.storage.from('attachments').getPublicUrl(data?.path || '').data.publicUrl;
    }
    const { error } = await supabase.from('messages').insert([
      {
        chat_id: activeChat.id,
        sender_id: user!.id,
        content: newMessage.trim(),
        attachment: fileUrl || null,
      },
    ]);
    setLoading(false);
    setNewMessage('');
    setFile(null);
    if (error) alert("Error sending message: " + error.message);
  };

  // --- Add member to chat ---
  const addMemberToChat = async () => {
    if (!activeChat) return;
    const memberId = prompt('Enter user ID to add:');
    if (!memberId) return;
    if (activeChat.members.includes(memberId)) {
      alert('User is already a member.');
      return;
    }
    const newMembers = [...activeChat.members, memberId];
    await supabase
      .from('chats')
      .update({ members: newMembers })
      .eq('id', activeChat.id);
    // Refetch chats
    const { data } = await supabase
      .from('chats')
      .select('*')
      .contains('members', [user!.id]);
    if (data) setChats(data as Chat[]);
    setActiveChat({ ...activeChat, members: newMembers });
  };

  // All unique labels & members for dropdowns
  const allLabels = Array.from(
    new Set(chats.flatMap(c => c.labels ?? []))
  ).filter(Boolean);
  const allMembers = Array.from(
    new Set(chats.flatMap(c => c.members ?? []))
  ).filter(Boolean);

  // Filtered chat list
  const filteredChats = chats.filter(chat => {
    return (
      (!search || chat.chat_name.toLowerCase().includes(search.toLowerCase())) &&
      (!labelFilter || (chat.labels && chat.labels.includes(labelFilter))) &&
      (!memberFilter || (chat.members && chat.members.includes(memberFilter)))
    );
  });

  // --- RENDER ---

  return (
    <section className="flex h-screen w-screen">
      {/* Sidebar */}
      <aside className="w-[340px] bg-[#f0f2f5] h-full border-r flex flex-col">
        <header className="flex items-center gap-2 p-3 border-b bg-white">
          <img src="/periskope-logo.png" alt="Logo" className="w-8 h-8 rounded" />
          <span className="text-xl font-bold text-gray-900 ml-1">chats</span>
        </header>
        {/* Filters */}
        <nav className="flex items-center gap-2 p-2 border-b">
          <div className="relative flex-1">
            <FiSearch className="absolute left-2 top-2 text-gray-500" />
            <input
              type="text"
              placeholder="Search chats"
              className="pl-8 pr-2 py-1 rounded bg-white border w-full text-black"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Label Filter */}
          <select className="border rounded px-2 py-1 text-xs"
            value={labelFilter} onChange={e => setLabelFilter(e.target.value)}>
            <option value="">All</option>
            {allLabels.map(lbl => (
              <option key={lbl} value={lbl}>{lbl}</option>
            ))}
          </select>
          {/* Member Filter */}
          <select className="border rounded px-2 py-1 text-xs"
            value={memberFilter} onChange={e => setMemberFilter(e.target.value)}>
            <option value="">All</option>
            {allMembers.map(mem => (
              <option key={mem} value={mem}>{mem}</option>
            ))}
          </select>
        </nav>
        {/* Chat List */}
        <ul className="overflow-y-auto flex-1">
          {filteredChats.map((chat) => {
            const lastMsg = lastMessages[chat.id];
            const selected = activeChat?.id === chat.id;
            return (
              <li
                key={chat.id}
                className={`flex flex-col gap-0 px-4 py-3 cursor-pointer border-b transition-all duration-75 
                  ${selected ? 'bg-[#d9fdd3] font-bold' : 'hover:bg-[#e2e6ea]'}
                `}
                onClick={() => setActiveChat(chat)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow
                    ${chat.is_group ? 'bg-yellow-400 text-white' : 'bg-green-400 text-white'}`}>
                    {chat.is_group ? <MdGroups /> : getInitials(chat.chat_name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-base text-black">{chat.chat_name}</span>
                      {lastMsg && (
                        <span className="text-xs text-gray-600">{formatTime(lastMsg.created_at)}</span>
                      )}
                    </div>
                    {lastMsg && (
                      <span className="text-xs text-gray-700 block truncate">{lastMsg.content}</span>
                    )}
                  </div>
                </div>
                {/* Labels */}
                {chat.labels && chat.labels.length > 0 && (
                  <div className="flex gap-1 mt-1 ml-14">
                    {chat.labels.map(lbl => (
                      <span key={lbl} className="bg-blue-100 text-blue-800 text-xs px-2 rounded">
                        {lbl}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {/* New Chat */}
        <footer className="p-3 border-t bg-white flex items-center justify-between">
          <button className="bg-green-500 rounded-full p-3 text-white shadow flex items-center"
            onClick={async () => {
              if (!user) return;
              const chatName = prompt('Enter chat name:');
              if (!chatName) return;
              const isGroup = window.confirm('Is this a group chat?');
              const labelsStr = prompt('Enter labels (comma separated, optional):');
              const labels = labelsStr ? labelsStr.split(',').map(l => l.trim()).filter(l => l) : [];
              await supabase.from('chats').insert([
                {
                  chat_name: chatName,
                  is_group: isGroup,
                  members: [user.id],
                  labels,
                },
              ]);
              // Refetch chats
              const { data } = await supabase
                .from('chats')
                .select('*')
                .contains('members', [user.id]);
              if (data) setChats(data as Chat[]);
            }}
            title="New Chat"
          >
            <FiPlus className="text-2xl" />
          </button>
        </footer>
      </aside>
      {/* Main Chat */}
      <main className="flex-1 flex flex-col bg-[#ece5dd]">
        {/* Top Bar */}
        <header className="flex items-center h-20 px-8 bg-white border-b">
          {activeChat && (
            <>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow
                ${activeChat.is_group ? 'bg-yellow-400 text-white' : 'bg-green-400 text-white'}`}>
                {activeChat.is_group ? <MdGroups /> : getInitials(activeChat.chat_name)}
              </div>
              <span className="font-bold text-xl text-black ml-3">{activeChat.chat_name}</span>
              <button
                className="ml-6 px-3 py-1 bg-green-200 text-green-800 text-xs rounded"
                onClick={addMemberToChat}
              >
                + Add Member
              </button>
              <div className="ml-auto flex gap-3">
                <BsFillCameraVideoFill className="text-2xl text-gray-500 cursor-pointer" />
                <FiMoreVertical className="text-2xl text-gray-500 cursor-pointer" />
              </div>
            </>
          )}
        </header>
        {/* Messages Area */}
        <section className="flex-1 overflow-y-auto px-10 py-5">
          {activeChat && (
            <ul>
              {messages.length === 0 && (
                <li className="text-center text-gray-400 text-lg">No messages yet. Start the conversation!</li>
              )}
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={`flex mb-2 group ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2 max-w-[60%] break-words shadow relative
                    ${msg.sender_id === user?.id ? 'bg-[#d9fdd3] text-black' : 'bg-white border text-black'}`}
                  >
                    {activeChat.is_group && msg.sender_id !== user?.id && (
                      <div className="text-xs font-bold text-green-600 mb-1">
                        {msg.sender_id.slice(0, 8)}
                      </div>
                    )}
                    {msg.attachment && (
                      msg.attachment.endsWith('.mp4') ? (
                        <video controls className="rounded mb-2 max-h-48"><source src={msg.attachment} /></video>
                      ) : (
                        <img src={msg.attachment} alt="attachment" className="rounded mb-2 max-h-48" />
                      )
                    )}
                    <div>{msg.content}</div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {msg.sender_id === user?.id &&
                        (msg.seen ? (
                          <MdDoneAll className="text-green-500 text-sm" />
                        ) : (
                          <FiCheck className="text-gray-400 text-sm" />
                        ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* Input */}
        <form className="bg-white border-t flex items-center px-8 py-6 gap-2"
          onSubmit={sendMessage}>
          <label htmlFor="file-input" className="cursor-pointer">
            <FiPaperclip className="text-2xl text-gray-500" />
            <input
              id="file-input"
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
            />
          </label>
          <input
            className="flex-1 border rounded-2xl px-4 py-3 shadow text-black"
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            disabled={!activeChat || loading}
          />
          <button type="submit"
            className="bg-green-500 text-white rounded-2xl px-8 py-3 font-semibold hover:bg-green-600 shadow transition"
            disabled={!activeChat || loading || (!newMessage.trim() && !file)}>
            Send
          </button>
        </form>
      </main>
    </section>
  );
}
