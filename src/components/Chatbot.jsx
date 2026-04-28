import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Hand, HelpCircle, Target, Building, User, Map, Calendar, Users, Star, Trophy, CheckCircle, TrendingUp } from 'lucide-react';

// ─── Chatbot Knowledge Base ───
// Handles abbreviations, NGO/volunteer roles, context-aware replies
const ABBREVIATIONS = {
  'ngo': 'NGO (Non-Governmental Organization)',
  'vol': 'volunteer',
  'vols': 'volunteers',
  'req': 'request',
  'info': 'information',
  'reg': 'register',
  'signup': 'sign up',
  'signin': 'sign in',
  'login': 'log in',
  'pw': 'password',
  'otp': 'OTP (One-Time Password)',
  'tks': 'tasks',
  'task': 'task',
  'loc': 'location',
  'lang': 'language',
  'exp': 'experience',
  'lvl': 'level',
  'pts': 'points',
  'ldr': 'leaderboard',
  'map': 'map view',
  'dash': 'dashboard',
  'prof': 'profile',
  'mtup': 'meetup',
  'meetup': 'weekend meetup',
  'hlp': 'help',
  'thx': 'thanks',
  'ty': 'thank you',
  'pls': 'please',
  'asap': 'as soon as possible',
  'btw': 'by the way',
  'idk': "I don't know",
  'fyi': 'for your information',
  'imo': 'in my opinion',
  'brb': 'be right back',
  'dm': 'direct message',
  'kb': 'knowledge base',
  'fa': 'first aid',
  'ts': 'tech support',
  'edu': 'education',
  'med': 'medical',
};

const expandAbbreviations = (text) => {
  let expanded = text.toLowerCase();
  Object.entries(ABBREVIATIONS).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    expanded = expanded.replace(regex, full);
  });
  return expanded;
};

const BOT_RESPONSES = [
  // Greetings
  { patterns: ['hello', 'hi', 'hey', 'howdy', 'namaste', 'hola'], response: (name) => `Hello${name ? `, ${name}` : ''}! I'm **ECHORA AI**, your volunteering assistant. I can help you with:\n\n• Finding tasks & NGO requests\n• Managing your profile\n• Map & location info\n• Points & leaderboard\n• Weekend meetups\n\nWhat would you like to know?` },

  // Help
  { patterns: ['help', 'what can you do', 'commands', 'options', 'assist'], response: () => `Here's what I can help with:\n\n**For Volunteers:**\n• How to sign up & complete profile\n• Find tasks near you\n• Check points & badges\n• Join meetups\n\n**For NGOs:**\n• Submit volunteer requests\n• Track task status\n• Find skilled volunteers\n\nJust ask me anything!` },

  // Tasks
  { patterns: ['task', 'tasks', 'find task', 'available task', 'work', 'job'], response: () => `**Finding Tasks:**\n\nGo to **Task Board** in the sidebar to see all available tasks. You can filter by:\n• Location / State\n• Required skill\n• Urgency (High/Medium/Low)\n\nHigh urgency tasks are highlighted in red — check those first!` },

  // NGO
  { patterns: ['ngo', 'non-governmental organization', 'organization', 'submit request', 'post request'], response: () => `**NGO Information:**\n\nNGOs can submit volunteer requests via **Submit Request** in the sidebar. Fill in:\n• NGO Name & Location\n• Task Description\n• Urgency level\n• Required Skills\n\nVolunteers matching your skills will be notified automatically.` },

  // Profile
  { patterns: ['profile', 'edit profile', 'update profile', 'my info', 'my details'], response: () => `**Profile Management:**\n\nGo to **My Profile** to:\n• Edit your name, bio, location\n• Update skills & languages\n• View your badges & points\n• See your task history\n\nClick "Edit Profile" button to make changes!` },

  // Map
  { patterns: ['map', 'map view', 'location', 'near me', 'heatmap', 'nearby'], response: () => `**Map View:**\n\nThe map shows:\n• Volunteer locations (blue markers)\n• NGO task locations (red markers)\n• Heatmap of high-demand areas\n\nWhen you log in, your nearest volunteer opportunities are highlighted. You can filter by state!` },

  // Meetups
  { patterns: ['meetup', 'weekend meetup', 'event', 'meet', 'gathering', 'connect'], response: () => `**Weekend Meetups:**\n\nCheck **Weekend Meetups** in the sidebar! Events include:\n• Monthly volunteer connect\n• NGO summits\n• Skill-sharing workshops\n• Cleanup drives\n\nClick "View More" on any event to see full details and register.` },

  // Points / Gamification
  { patterns: ['points', 'pts', 'badge', 'reward', 'gamif', 'score', 'rank'], response: () => `**Points & Badges:**\n\nEarn points by:\n• Completing tasks (+50 pts each)\n• Submitting notes/feedback (+10 pts)\n• Attending meetups (+25 pts)\n• Referring volunteers (+30 pts)\n\nBadges unlock at milestones. Check **Leaderboard** to see your rank!` },

  // Leaderboard
  { patterns: ['leaderboard', 'ldr', 'top volunteer', 'ranking', 'top', 'best'], response: () => `**Leaderboard:**\n\nThe leaderboard shows top volunteers ranked by points. You can filter by:\n• State / Region\n• Skill category\n• Time period (weekly/monthly/all-time)\n\nKeep completing tasks to climb the ranks!` },

  // OTP / Login
  { patterns: ['otp', 'one-time password', 'login', 'log in', 'sign in', 'auth', 'phone'], response: () => `🔐 **Login with OTP:**\n\n1. Enter your phone number\n2. Receive OTP via SMS\n3. Enter the 6-digit code\n4. You're in!\n\n*Demo mode:* Enter any number and OTP code **123456** to test the platform.` },

  // Sign up
  { patterns: ['sign up', 'register', 'new account', 'create account', 'join', 'new volunteer'], response: () => `✨ **Joining VolunteerHub:**\n\n1. Click **Get Started** on the login page\n2. Enter your name, phone, skills, languages\n3. Choose your location & experience level\n4. Verify with OTP\n\nYou'll earn your first **Newcomer** badge instantly!` },

  // Impact
  { patterns: ['impact', 'dashboard', 'stats', 'statistics', 'data', 'analytics', 'chart'], response: () => `📊 **Impact Dashboard:**\n\nSee real-time stats:\n• Total volunteers registered\n• Tasks completed across India\n• Skill distribution charts\n• Monthly growth trends\n• Cities and states covered\n\nData updates as volunteers complete tasks!` },

  // Skills
  { patterns: ['skill', 'skills', 'teaching', 'medical', 'first aid', 'cooking', 'tech'], response: () => `🛠️ **Skills on the Platform:**\n\nAvailable skill categories:\nTeaching, Medical, First Aid, Cooking, Tech Support, Logistics, Counseling, Construction, Photography, Design, Legal Aid, Translation, Farming, Music/Arts\n\nThe AI matching engine uses your skills to suggest relevant tasks!` },

  // Languages
  { patterns: ['language', 'lang', 'multilingual', 'translate', 'hindi', 'tamil', 'telugu', 'bengali'], response: () => `🌐 **Language Support:**\n\nVolunteers can specify languages they speak. NGOs can target volunteers by language. Supported languages include:\nHindi, English, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Odia, Punjabi, Urdu and more!\n\nFilter volunteers by language in the Task Board.` },

  // Buddy system
  { patterns: ['buddy', 'mentor', 'pair', 'new volunteer', 'guide', 'experienced'], response: () => `👫 **Buddy System:**\n\nNew volunteers (Beginner level) are matched with experienced ones! Your buddy will:\n• Guide you through your first task\n• Share tips and resources\n• Help you earn your first badge\n\nSet your experience level in your profile to get matched!` },

  // Feedback
  { patterns: ['feedback', 'note', 'review', 'rating', 'comment', 'report'], response: () => `📝 **Feedback & Notes:**\n\nAfter completing a task:\n1. Go to **My Profile**\n2. Click "Add Task Note"\n3. Rate the experience (1-5 stars)\n4. Write your feedback\n\nYour feedback helps NGOs improve and earns you +10 points!` },

  // Urgency
  { patterns: ['urgent', 'urgency', 'high priority', 'emergency', 'critical'], response: () => `🚨 **Urgency Levels:**\n\n🔴 **High** — Immediate action needed (e.g., flood relief, medical camp). Pulsing red badge.\n🟡 **Medium** — Needed within a week (e.g., teaching sessions, digital literacy)\n🟢 **Low** — Flexible timeline (e.g., tree plantation, awareness drives)\n\nCheck **Task Board** and sort by urgency!` },

  // India / States
  { patterns: ['india', 'state', 'city', 'location', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'kolkata', 'pune'], response: () => `📍 **Locations:**\n\nVolunteerHub covers all **28 States + 8 UTs** of India! Use the map view to:\n• See volunteer density by state\n• Find NGO tasks near you\n• Filter opportunities by state\n\nHigh-demand areas are shown on the heatmap!` },

  // Thanks
  { patterns: ['thank', 'thanks', 'thank you', 'ty', 'thx', 'appreciate'], response: (name) => `😊 You're welcome${name ? `, ${name}` : ''}! Keep volunteering and making a difference! 🌟\n\nAnything else I can help with?` },

  // Default
  { patterns: [], response: () => `🤔 I'm not sure about that one! Here are some things I can help with:\n\n• **tasks** — Find volunteer opportunities\n• **profile** — Manage your profile\n• **map** — View locations & heatmap\n• **meetups** — Weekend events\n• **points** — Gamification & badges\n• **ngo** — NGO request system\n\nTry asking about any of these!` },
];

export const getBotResponse = (userInput, profileName) => {
  const expanded = expandAbbreviations(userInput);
  const lower = expanded.toLowerCase();

  for (const item of BOT_RESPONSES.slice(0, -1)) {
    if (item.patterns.some(p => lower.includes(p))) {
      return item.response(profileName);
    }
  }
  // Default
  return BOT_RESPONSES[BOT_RESPONSES.length - 1].response(profileName);
};

// ─── Chatbot Component ───
const Chatbot = () => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: `👋 Hi${profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! I'm **ECHORA AI**. Ask me about tasks, NGOs, your profile, the map, meetups — anything! I also understand abbreviations like "ngo", "otp", "pts", "fa", etc.` }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = (text) => {
    const msg = typeof text === 'string' ? text : input;
    const trimmed = msg.trim();
    if (!trimmed) return;

    setMessages(prev => [...prev, { from: 'user', text: trimmed }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const response = getBotResponse(trimmed, profile?.name?.split(' ')[0]);
      setTyping(false);
      setMessages(prev => [...prev, { from: 'bot', text: response }]);
    }, 700 + Math.random() * 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render markdown-like bold text
  const renderText = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i}>{part}</strong>
        : part.split('\n').map((line, j) => <React.Fragment key={j}>{line}{j < part.split('\n').length - 1 && <br />}</React.Fragment>)
    );
  };

  return (
    <>
      {/* Chatbot Window */}
      {open && (
        <div className="chatbot-window">
          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem', background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ fontSize: '1.5rem' }}>🤖</div>
              <div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>ECHORA AI</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>● Online — understands abbreviations</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', width: 28, height: 28, fontSize: '0.9rem' }}>✕</button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.from}`}>
                {renderText(msg.text)}
              </div>
            ))}
            {typing && (
              <div className="chat-bubble bot" style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0.75rem 1rem' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)',
                    animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s`
                  }} />
                ))}
                <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)' }}>
            {['Tasks', 'Map', 'Points', 'Meetups', 'Help'].map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '20px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (e.g. 'find tasks', 'otp login')"
              className="form-input"
              style={{ fontSize: '0.85rem', flex: 1 }}
            />
            <button onClick={sendMessage} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>➤</button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button className="chatbot-fab" onClick={() => setOpen(o => !o)} title="Chat with ECHORA AI">
        {open ? '✕' : '💬'}
      </button>
    </>
  );
};

export default Chatbot;
