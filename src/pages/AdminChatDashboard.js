import React, { useState, useEffect, useRef } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import axios from 'axios';
import io from 'socket.io-client';
import '../StyleWeb/AdminChat.css';

const AdminChatDashboard = () => {
  const { adminToken, adminInfo } = useAdminAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [newMessageIndicator, setNewMessageIndicator] = useState(false);
  
  const messagesEndRef = useRef(null);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.9:5001' || 'http://localhost:5001';

  // Check if user is admin
  const isAdmin = adminInfo?.role === 'admin';

  // Debug logging
  console.log('Admin Info:', adminInfo);
  console.log('Admin Token:', adminToken);
  console.log('Is Admin:', isAdmin);

  useEffect(() => {
    if (adminInfo && adminToken && isAdmin) {
      loadAdminChats();
      setupSocketConnection();
    }

    return () => {
      if (socket) {
        // Leave admin chat room before disconnecting
        if (selectedSession) {
          socket.emit('leaveAdminChat', { sessionId: selectedSession.session_id });
        }
        socket.disconnect();
      }
    };
  }, [adminInfo, adminToken, isAdmin]);

  // Set up periodic refresh for real-time updates
  useEffect(() => {
    if (!adminInfo || !adminToken || !isAdmin) return;

    // Refresh sessions list every 30 seconds to catch any missed updates
    const sessionsInterval = setInterval(() => {
      loadAdminChats();
    }, 30000);

    // Refresh current chat messages every 15 seconds if a session is selected
    const messagesInterval = setInterval(() => {
      if (selectedSession) {
        refreshCurrentChatMessages(selectedSession.session_id);
      }
    }, 15000);

    // Refresh user online status every 5 seconds
    const statusInterval = setInterval(() => {
      refreshUserOnlineStatus();
    }, 5000);

    return () => {
      clearInterval(sessionsInterval);
      clearInterval(messagesInterval);
      clearInterval(statusInterval);
    };
  }, [adminInfo, adminToken, isAdmin, selectedSession]);

  // Debug effect to log sessions state changes
  useEffect(() => {
    console.log('📊 Sessions state changed:', sessions);
    console.log('📊 Sessions with online status:', sessions.map(s => ({
      session_id: s.session_id,
      user_id: s.user?.id, // Changed from _id to id
      is_online: s.is_online
    })));
  }, [sessions]);

  // Function to refresh user online status
  const refreshUserOnlineStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/online-status`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.data.success) {
        const onlineUsersList = response.data.data.onlineUsers;
        setOnlineUsers(new Set(onlineUsersList));

        console.log('🔍 Online users:', onlineUsersList);
        console.log('🔍 Online users Set:', new Set(onlineUsersList));
        console.log('🔍 Online users type check:', onlineUsersList.map(id => ({ id, type: typeof id })));
        
        // Update sessions with online status using the current state
        setSessions(prevSessions => {
          // Don't proceed if no sessions are loaded yet
          if (prevSessions.length === 0) {
            console.log('⚠️ No sessions loaded yet, skipping online status refresh');
            return prevSessions;
          }
          
          console.log('🔄 Updating sessions with online status. Previous sessions:', prevSessions);
          console.log('🔍 Current sessions count:', prevSessions.length);
          
          const updatedSessions = prevSessions.map(session => {
            const userId = session.user?.id; // Changed from _id to id
            const isOnline = userId ? onlineUsersList.includes(userId) : false;
            
            console.log(`Session ${session.session_id}: User ${userId} is ${isOnline ? 'online' : 'offline'}`);
            
            return {
              ...session,
              is_online: isOnline
            };
          });
          
          console.log('🔄 Updated sessions:', updatedSessions);
          return updatedSessions;
        });
      }
    } catch (error) {
      console.error('Error refreshing user online status:', error);
    }
  };

  const setupSocketConnection = () => {
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: {
        token: adminToken
      }
    });

    newSocket.on('connect', () => {
      console.log('🔌 Admin connected to socket:', newSocket.id);
      newSocket.emit('adminConnect', { adminId: adminInfo.username });
    });

    newSocket.on('newUserMessage', (data) => {
      console.log('📱 New user message received:', data);
      
      // Always refresh sessions list to show new message and update unread counts
      loadAdminChats();
      
      // If this session is currently selected, add message to chat AND refresh messages
      if (selectedSession && selectedSession.session_id === data.sessionId) {
        // Add message to local state immediately for real-time feel
        addMessageToChat({
          message_id: data.messageId || `user_${Date.now()}`,
          text: data.text,
          is_user: true,
          timestamp: data.timestamp,
          user_id: data.userId
        });
        
        // Show new message indicator
        setNewMessageIndicator(true);
        
        // Also refresh the full chat history to ensure consistency
        refreshCurrentChatMessages(data.sessionId);
      }
    });

    newSocket.on('newAdminMessage', (data) => {
      console.log('👨‍💼 New admin message received:', data);
      
      // Always refresh sessions list to update last message and timestamp
      loadAdminChats();
      
      // If this session is currently selected, add message to chat AND refresh messages
      if (selectedSession && selectedSession.session_id === data.sessionId) {
        // Add message to local state immediately for real-time feel
        addMessageToChat({
          message_id: data.messageId || `admin_${Date.now()}`,
          text: data.text,
          is_user: false,
          timestamp: data.timestamp,
          admin_id: data.adminId
        });
        
        // Also refresh the full chat history to ensure consistency
        refreshCurrentChatMessages(data.sessionId);
      }
    });

    newSocket.on('newAdminChatSession', (data) => {
      console.log('🆕 New admin chat session:', data);
      
      // Join the admin chat room to receive messages
      newSocket.emit('joinAdminChat', { sessionId: data.sessionId });
      
      // Refresh sessions list to show new session
      loadAdminChats();
      
      // Show notification to admin about new chat session
      console.log(`🆕 New chat session from user: ${data.userName || 'Unknown user'}`);
    });

    newSocket.on('userTypingInAdminChat', (data) => {
      console.log('⌨️ User typing in admin chat:', data);
      // You can add typing indicator here
    });

    newSocket.on('userTyping', (data) => {
      console.log('⌨️ User typing:', data);
      // You can add typing indicator here
    });

    setSocket(newSocket);
  };

  const loadAdminChats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/chat/admin/all-chats`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.data.success) {
        const newSessions = response.data.data.sessions;
        console.log('📋 Loaded sessions:', newSessions);
        console.log('📋 First session structure:', newSessions[0]);
        console.log('📋 First session user object:', newSessions[0]?.user);
        console.log('📋 First session user ID:', newSessions[0]?.user?.id);
        
        setSessions(newSessions);
        
        // Immediately refresh online status after loading sessions
        await refreshUserOnlineStatus();
        
        // If we have a selected session, update it with fresh data
        if (selectedSession) {
          const updatedSession = newSessions.find(s => s.session_id === selectedSession.session_id);
          if (updatedSession) {
            setSelectedSession(updatedSession);
            console.log('🔄 Updated selected session with fresh data');
          }
        }
      }
    } catch (error) {
      console.error('Error loading admin chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh messages for the currently selected chat session
  const refreshCurrentChatMessages = async (sessionId) => {
    if (!sessionId || !adminToken) return;
    
    try {
      console.log('🔄 Refreshing chat messages for session:', sessionId);
      const response = await axios.get(`${API_BASE_URL}/api/chat/admin/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.data.success) {
        // Only update messages if this session is still selected
        if (selectedSession && selectedSession.session_id === sessionId) {
          setMessages(response.data.data.messages);
          console.log('✅ Chat messages refreshed:', response.data.data.messages.length);
          scrollToBottom();
          
          // Clear new message indicator when messages are refreshed
          setNewMessageIndicator(false);
        }
      }
    } catch (error) {
      console.error('Error refreshing chat messages:', error);
    }
  };

  const selectSession = async (session) => {
    // Leave previous session room if exists
    if (selectedSession && socket) {
      socket.emit('leaveAdminChat', { sessionId: selectedSession.session_id });
      console.log('👨‍💼 Admin left admin chat room:', selectedSession.session_id);
    }
    
    setSelectedSession(session);
    
    // Clear new message indicator when switching sessions
    setNewMessageIndicator(false);
    
    // Join the admin chat room to receive messages
    if (socket) {
      socket.emit('joinAdminChat', { sessionId: session.session_id });
      console.log('👨‍💼 Admin joined admin chat room:', session.session_id);
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/admin/sessions/${session.session_id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.data.success) {
        setMessages(response.data.data.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendAdminResponse = async () => {
    if (!inputText.trim() || !selectedSession) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chat/admin/sessions/${selectedSession.session_id}/respond`,
        { message: inputText.trim() },
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        }
      );

      if (response.data.success) {
        // Add message to local state
        addMessageToChat(response.data.data.message);
        setInputText('');
        
        // Clear new message indicator when admin sends a message
        setNewMessageIndicator(false);
        
        // Refresh sessions list to update last message
        loadAdminChats();
      }
    } catch (error) {
      console.error('Error sending admin response:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
    }
  };

  const addMessageToChat = (message) => {
    setMessages(prev => [...prev, message]);
    setTimeout(scrollToBottom, 100);
    
    // Clear new message indicator when admin sends a message
    if (!message.is_user) {
      setNewMessageIndicator(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getSessionStatus = (session) => {
    if (session.status === 'active') {
      return <span className="status-badge active">Đang hoạt động</span>;
    } else if (session.status === 'closed') {
      return <span className="status-badge closed">Đã đóng</span>;
    } else {
      return <span className="status-badge archived">Đã lưu trữ</span>;
    }
  };

  const getUnreadCount = (session) => {
    // Count user messages since last admin response
    let count = 0;
    for (let i = session.messages?.length - 1; i >= 0; i--) {
      if (session.messages[i].is_user) {
        count++;
      } else {
        break; // Stop at first admin message
      }
    }
    return count;
  };

  if (!adminInfo || !isAdmin) {
    return (
      <div className="admin-chat-container">
        <div className="access-denied">
          <h2>🔒 Truy cập bị từ chối</h2>
          <p>Bạn cần đăng nhập với quyền admin để truy cập trang này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-chat-container">
      <div className="admin-chat-header">
        <h1>💬 Chăm sóc khách hàng</h1>
        <p>Quản lý chat với khách hàng từ ứng dụng di động</p>
        <div className="admin-info">
          <span>👨‍💼 {adminInfo.name}</span>
          <span>🟢 Online</span>
        </div>
      </div>

      <div className="admin-chat-content">
        {/* Sessions List */}
        <div className="sessions-panel">
          <div className="sessions-header">
            <h3>Danh sách Chat ({sessions.length})</h3>
            <button 
              className="refresh-btn"
              onClick={loadAdminChats}
              disabled={loading}
            >
              🔄 {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
          
          <div className="sessions-list">
            {sessions.length === 0 ? (
              <div className="no-sessions">
                <p>📭 Chưa có cuộc trò chuyện nào</p>
              </div>
            ) : (
              sessions.map((session) => {
                const unreadCount = getUnreadCount(session);
                const isOnline = session.is_online || false;
                
                console.log(`🎨 Rendering session ${session.session_id}: is_online = ${isOnline}`);
                
                return (
                  <div
                    key={session.session_id}
                    className={`session-item ${selectedSession?.session_id === session.session_id ? 'selected' : ''}`}
                    onClick={() => selectSession(session)}
                  >
                    <div className="session-header">
                      <div className="user-info">
                        <div className="user-avatar">
                          {session.user?.full_name?.charAt(0) || 'K'}
                        </div>
                        <div className="user-details">
                          <h4>{session.user?.full_name || 'Khách hàng'}</h4>
                          <p>{session.user?.email}</p>
                        </div>
                      </div>
                      <div className="session-meta">
                        {getSessionStatus(session)}
                        <span className={`online-status ${isOnline ? 'online' : 'offline'}`}>
                          {isOnline ? '🟢 Online' : '🔴 Offline'}
                        </span>
                      </div>
                    </div>
                    
                    {session.last_message && (
                      <div className="last-message">
                        <p className="message-preview">
                          {session.last_message.is_user ? '👤 ' : '👨‍💼 '}
                          {session.last_message.text}
                        </p>
                        <span className="message-time">
                          {formatTimestamp(session.last_message.timestamp)}
                        </span>
                      </div>
                    )}
                    
                    {unreadCount > 0 && (
                      <div className="unread-badge">
                        {unreadCount} tin nhắn mới
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-panel">
          {selectedSession ? (
            <>
              <div className="chat-header">
                <div className="chat-user-info">
                  <h3>
                    💬 Chat với {selectedSession.user?.full_name || 'Khách hàng'}
                    {newMessageIndicator && <span className="new-message-indicator">🆕</span>}
                  </h3>
                  <p>{selectedSession.user?.email}</p>
                  <div className="chat-meta">
                    <span>Session: {selectedSession.session_id}</span>
                    <span>Tin nhắn: {selectedSession.total_messages}</span>
                  </div>
                </div>
              </div>

              <div 
                className="messages-container"
                onClick={() => setNewMessageIndicator(false)}
              >
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>📝 Chưa có tin nhắn nào</p>
                  </div>
                ) : (
                  <div className="messages-list">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.message_id}_${index}`}
                        className={`message ${message.is_user ? 'user-message' : 'admin-message'}`}
                      >
                        <div className="message-content">
                          <div className="message-header">
                            <span className="message-sender">
                              {message.is_user ? '👤 Khách hàng' : '👨‍💼 Bạn'}
                            </span>
                            <span className="message-time">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          <p className="message-text">{message.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="chat-input">
                <div className="input-container">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn phản hồi cho khách hàng..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendAdminResponse();
                      }
                    }}
                  />
                  <button
                    className="send-btn"
                    onClick={sendAdminResponse}
                    disabled={!inputText.trim()}
                  >
                    📤 Gửi
                  </button>
                </div>
                <div className="input-tips">
                  <small>💡 Nhấn Enter để gửi, Shift+Enter để xuống dòng</small>
                </div>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="welcome-message">
                <h2>👋 Chào mừng đến với Chăm sóc khách hàng</h2>
                <p>Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu hỗ trợ khách hàng.</p>
                <div className="stats">
                  <div className="stat-item">
                    <span className="stat-number">{sessions.length}</span>
                    <span className="stat-label">Cuộc trò chuyện</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{sessions.filter(s => s.status === 'active').length}</span>
                    <span className="stat-label">Đang hoạt động</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{onlineUsers.size}</span>
                    <span className="stat-label">Người dùng online</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChatDashboard;
