'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { FiSearch, FiMoreVertical, FiCheck, FiPaperclip } from 'react-icons/fi';
import { MdDoneAll } from 'react-icons/md';
import { IoMdPerson } from 'react-icons/io';
import { BsFillCameraVideoFill, BsEmojiSmile } from 'react-icons/bs';
import { MdGroups } from 'react-icons/md';

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
  delivered?: boolean;
  seen?: boolean;
};

export default function ChatsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user/session on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
      else setUser(data.user);
    });
  }, [router]);

  // Fetch chats
  const fetchChats = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chats')
      .select('*')
      .contains('members', [user.id]);
    if (data) setChats(data as Chat[]);
  };

  // Get last message per chat for preview
  const fetchLastMessages = async (chatIds: string[]) => {
    if (chatIds.length === 0) return;
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
  };

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line
  }, [user]);
  useEffect(() => {
    if (chats.length) fetchLastMessages(chats.map(c => c.id));
    // eslint-disable-next-line
  }, [chats]);

  // Fetch messages for selected chat, with logs and real-time subscription
  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();

    // Real-time subscription for new messages
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.chat_id === activeChat.id) {
            setMessages((msgs) => [...msgs, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  // Send a new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    setLoading(true);
    const { error } = await supabase.from('messages').insert([
      {
        chat_id: activeChat.id,
        sender_id: user.id,
        content: newMessage.trim(),
      },
    ]);
    setLoading(false);
    if (!error) setNewMessage('');
    else alert("Error sending message: " + error.message);
  };

  // Add member to chat
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
    fetchChats();
    setActiveChat({ ...activeChat, members: newMembers });
  };

  // Helpers
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

  // ---- FILTER LOGIC ----
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

  // ---- RENDER FUNCTIONS ----

  // Sidebar rendering
  function renderChats() {
    return (
      <div className="w-96 bg-[#f0f2f5] h-full border-r flex flex-col">
        {/* Profile Bar */}
        <div className="flex items-center gap-3 p-4 border-b bg-white">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-2xl text-white font-bold shadow">
            <IoMdPerson />
          </div>
          <span className="text-black font-bold text-lg">
            {user?.email?.split('@')[0] ?? 'Me'}
          </span>
          <div className="ml-auto flex gap-2">
            <BsFillCameraVideoFill className="text-2xl text-gray-500 cursor-pointer" />
            <FiMoreVertical className="text-2xl text-gray-500 cursor-pointer" />
          </div>
        </div>
        {/* Filter Bar */}
        <div className="flex gap-2 p-2 bg-[#f0f2f5] border-b items-center">
          <div className="flex-1 flex items-center bg-white rounded px-2">
            <FiSearch className="text-lg mr-1 text-gray-500" />
            <input
              type="text"
              placeholder="Search chats"
              className="flex-1 bg-transparent outline-none text-black py-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border rounded px-2 py-1 text-xs"
            value={labelFilter}
            onChange={e => setLabelFilter(e.target.value)}
          >
            <option value="">All Labels</option>
            {allLabels.map(lbl => (
              <option key={lbl} value={lbl}>{lbl}</option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 text-xs"
            value={memberFilter}
            onChange={e => setMemberFilter(e.target.value)}
          >
            <option value="">All Members</option>
            {allMembers.map(mem => (
              <option key={mem} value={mem}>{mem}</option>
            ))}
          </select>
        </div>
        {/* Chat List */}
        <ul className="flex-1 overflow-y-auto">
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
        {/* New Chat Button */}
        <div className="p-4 border-t bg-white flex items-center justify-center">
          <button
            className="bg-green-500 text-white px-5 py-2 rounded-full hover:bg-green-600 font-bold text-xl shadow w-full flex items-center justify-center gap-2"
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
              fetchChats();
            }}
            title="New Chat"
          >
            <IoMdPerson className="text-2xl" />
            +
          </button>
        </div>
      </div>
    );
  }

  // Chat top bar
  function renderTopBar() {
    if (!activeChat)
      return <div className="h-20 bg-white border-b" />;
    return (
      <div className="flex items-center gap-4 h-20 px-8 bg-white border-b">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow
          ${activeChat.is_group ? 'bg-yellow-400 text-white' : 'bg-green-400 text-white'}`}>
          {activeChat.is_group ? <MdGroups /> : getInitials(activeChat.chat_name)}
        </div>
        <span className="font-bold text-xl text-black">{activeChat.chat_name}</span>
        <div className="ml-4">
          <button
            className="px-3 py-1 bg-green-200 text-green-800 text-xs rounded"
            onClick={addMemberToChat}
          >
            + Add Member
          </button>
        </div>
        <div className="ml-auto flex gap-3">
          <BsFillCameraVideoFill className="text-2xl text-gray-500 cursor-pointer" />
          <FiMoreVertical className="text-2xl text-gray-500 cursor-pointer" />
        </div>
      </div>
    );
  }

  // Messages rendering (bubble style)
  function renderMessages() {
    if (!activeChat) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-2xl bg-[#ece5dd]">
          Select a chat to view messages.
        </div>
      );
    }
    return (
      <div className="flex flex-col flex-1 bg-[#ece5dd] overflow-y-auto px-12 py-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-lg">No messages yet. Start the conversation!</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex mb-2 group ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-2xl px-4 py-2 max-w-[60%] break-words shadow relative
              ${msg.sender_id === user.id ? 'bg-[#d9fdd3] text-black' : 'bg-white border text-black'}`}
            >
              {activeChat.is_group && msg.sender_id !== user.id && (
                <div className="text-xs font-bold text-green-600 mb-1">
                  {msg.sender_id.slice(0, 8)} {/* Replace with name if you have a users table */}
                </div>
              )}
              <div>{msg.content}</div>
              <div className="flex items-center justify-end gap-1 mt-1">
                {msg.sender_id === user.id &&
                  (msg.seen ? (
                    <MdDoneAll className="text-green-500 text-sm" />
                  ) : (
                    <FiCheck className="text-gray-400 text-sm" />
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Input bar (fixed at bottom)
  function renderInput() {
    return (
      <form
        onSubmit={sendMessage}
        className="w-full bg-white border-t flex gap-3 px-8 py-6 items-center"
      >
        <BsEmojiSmile className="text-2xl text-gray-500 cursor-pointer" />
        <FiPaperclip className="text-2xl text-gray-500 cursor-pointer" />
        <input
          className="flex-1 border rounded-2xl px-4 py-3 shadow text-black"
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          disabled={!activeChat || loading}
        />
        <button
          type="submit"
          className="bg-green-500 text-white rounded-2xl px-8 py-3 font-semibold hover:bg-green-600 shadow transition"
          disabled={!activeChat || loading || !newMessage.trim()}
        >
          Send
        </button>
      </form>
    );
  }

  return (
    <div className="flex h-screen w-screen">
      {renderChats()}
      <div className="flex-1 flex flex-col h-full bg-[#ece5dd]">
        {renderTopBar()}
        {renderMessages()}
        {renderInput()}
      </div>
    </div>
  );
}
