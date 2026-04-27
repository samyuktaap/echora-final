import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Globe, Play, Pause, Settings, MessageCircle, Send, MessageSquare, X, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const VoiceAssistant = () => {
  const { language: globalLanguage, setLanguage: setGlobalLanguage, t, LANGUAGES } = useLanguage();
  const [isSupported, setIsSupported] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(globalLanguage);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speechRate, setSpeechRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState({
    en: false,
    hi: false,
    ta: false,
    kn: false
  });
  const [missingVoiceWarning, setMissingVoiceWarning] = useState(null);
  const [geminiKey, setGeminiKey] = useState(window.CONFIG?.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [workingModel, setWorkingModel] = useState(localStorage.getItem('gemini_working_model') || null);
  
  const synthRef = useRef(null);
  const recognitionRef = useRef(null);

  // Sync local language with global context
  useEffect(() => {
    setSelectedLanguage(globalLanguage);
  }, [globalLanguage]);

  const languages = LANGUAGES.map(l => ({
    ...l,
    flag: l.code === 'en' ? 'https://flagcdn.com/w20/us.png' : 'https://flagcdn.com/w20/in.png'
  }));

  // AI Knowledge Base with PROPER regional language support
  const aiResponses = {
    en: {
      greeting: "Hello! I'm your ECHORA voice assistant. I can help you with everything about the volunteer platform - finding tasks, checking your profile, understanding the leaderboard, finding meetups, and answering any questions about volunteering. What would you like to know?",
      help: "I can help you with: finding volunteer opportunities, checking your profile and stats, viewing the leaderboard, finding weekend meetups, understanding how the platform works, navigating to any section, answering questions about volunteering, and providing information about NGOs. Just ask me anything!",
      default: "I understand your question. Based on what I know about ECHORA, I'm here to help you with volunteering, finding opportunities, understanding the platform, or any other questions you might have. Could you please rephrase your question or tell me more specifically what you'd like to know?"
    },
    hi: {
      greeting: "नमस्ते! मैं आपका ECHORA वॉइस असिस्टेंट हूँ। मैं आपकी वॉलंटियर प्लेटफॉर्म में सब कुछ मदद कर सकता हूँ - टास्क ढूंढने में, प्रोफाइल चेक करने में, लीडरबोर्ड समझने में, मीटअप्स ढूंढने में, और वॉलंटियरिंग के बारे में किसी भी सवाल का जवाब देने में। आप क्या जानना चाहते हैं?",
      help: "मैं आपकी मदद कर सकता हूँ: वॉलंटियर अवसर ढूंढने में, आपका प्रोफाइल और स्टैट्स चेक करने में, लीडरबोर्ड देखने में, वीकेंड मीटअप्स ढूंढने में, प्लेटफॉर्म का काम समझने में, किसी भी सेक्शन में नेविगेट करने में, वॉलंटियरिंग के बारे में सवालों के जवाब देने में, और NGOs के बारे में जानकारी देने में। मुझे कुछ भी पूछिए!",
      default: "मैं आपका सवाल समझ गया। ECHORA के बारे में जो मैं जानता हूँ, मैं आपकी वॉलंटियरिंग में, अवसर ढूंढने में, प्लेटफॉर्म समझने में, या किसी भी दूसरे सवालों में मदद करने के लिए यहाँ हूँ। क्या आप अपना सवाल दूसरे तरीके से पूछ सकते हैं या आप वॉलंटियरिंग या ECHORA प्लेटफॉर्म के बारे में विशेष रूप से क्या जानना चाहते हैं?"
    },
    ta: {
      greeting: "வணக்கம்! நான் உங்கள் எசோரா குரல் உதவியாளர். தன்னார்வத் தளம் பற்றி எல்லாம் தெரிந்து கொண்டு உங்களுக்கு உதவும். வேலைகளைத் தேடுதல், உங்கள் விவரத்தைப் பார்த்தல், முன்னணிப் பட்டியலைப் புரிந்துகொள்ளுதல், சந்திப்புகளைக் கண்டுபிடித்தல், தன்னார்வம் பற்றும் கேள்விகளுக்கு பதிலளித்தல். என்ன தெரிய வேண்டும்?",
      help: "நான் உங்களுக்கு இவ்வை உதவ முடியும்: தன்னார்வ வாய்ப்புகளைத் தேடுதல், உங்கள் விவரம் மற்றும் புள்ளிகளைப் பார்த்தல், முன்னணிப் பட்டியலைப் பார்த்தல், வார இறுதி சந்திப்புகளைக் கண்டுபிடித்தல், தளம் எப்படி வேலை செய்கிறது என்பதைப் புரிந்துகொள்ளுதல், எந்தப் பகுதிக்கும் செல்லுதல், தன்னார்வம் பற்றும் கேள்விகளுக்கு பதிலளித்தல், அரசு கூட்டமைப்புகள் பற்றித் தகவல் கொடுத்தல். எதையும் கேளுங்கள்!",
      default: "உங்கள் கேள்வியைப் புரிந்துகொண்டேன். எசோரா பற்றி எனக்குத் தெரிந்ததின் அடிப்படையில், தன்னார்வத்தில், வாய்ப்புகளைத் தேடுதலில், தளத்தைப் புரிந்துகொள்ளுதலில், அல்லது வேறு எந்தக் கேள்விகளிலும் உங்களுக்கு உதவ இங்கு இருக்கிறேன். தயவுசெய்து உங்கள் கேள்வியை வேறு விதமாகக் கேட்கவும், அல்லது தன்னார்வம் அல்லது எசோரா தளம் பற்றி குறிப்பாக என்ன அறிய விரும்பும் என்று சொல்லுங்கள்?"
    },
    kn: {
      greeting: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ECHORA ಧ್ವನಿ ಸಹಾಯಕ. ಸ್ವಯಂಸೇವಕ ವೇದಿಕೆಯ ಬಗ್ಗೆ ಎಲ್ಲದರಲ್ಲೂ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ - ಕಾರ್ಯಗಳನ್ನು ಹುಡುಕುವುದು, ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪರಿಶೀಲಿಸುವುದು, ಲೀಡರ್‌ಬೋರ್ಡ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವುದು, ಸಮ್ಮೇಳನಗಳನ್ನು ಹುಡುಕುವುದು, ಮತ್ತು ಸ್ವಯಂಸೇವಕರ ಬಗ್ಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸುವುದು. ನೀವು ಏನು ತಿಳಿದುಕೊಳ್ಳಲು ಬಯಸುತ್ತೀರಿ?",
      help: "ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ: ಸ್ವಯಂಸೇವಕ ಅವಕಾಶಗಳನ್ನು ಹುಡುಕುವಲ್ಲಿ, ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಅಂಕಿಅಂಶಗಳನ್ನು ಪರಿಶೀಲಿಸುವಲ್ಲಿ, ಲೀಡರ್‌ಬೋರ್ಡ್ ವೀಕ್ಷಿಸುವಲ್ಲಿ, ವಾರಾಂತ್ಯದ ಸಮ್ಮೇಳನಗಳನ್ನು ಹುಡುಕುವಲ್ಲಿ, ವೇದಿಕೆ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂಬುದನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವಲ್ಲಿ, ಯಾವುದೇ ವಿಭಾಗಕ್ಕೆ ಮಾರ್ಗದರ್ಶನ ಮಾಡುವಲ್ಲಿ, ಸ್ವಯಂಸೇವಕರ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸುವಲ್ಲಿ, ಮತ್ತು NGOs ಬಗ್ಗೆ ಮಾಹಿತಿ ನೀಡುವಲ್ಲಿ. ಏನನ್ನಾದರೂ ಕೇಳಿ!",
      default: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡೆ. ECHORA ಬಗ್ಗೆ ನನಗೆ ತಿಳಿದಿರುವುದರ ಆಧಾರದ ಮೇಲೆ, ಸ್ವಯಂಸೇವಕರಲ್ಲಿ, ಅವಕಾಶಗಳನ್ನು ಹುಡುಕುವಲ್ಲಿ, ವೇದಿಕೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವಲ್ಲಿ, ಅಥವಾ ನೀವು ಹೊಂದಿರುವ ಯಾವುದೇ ಇತರ ಪ್ರಶ್ನೆಗಳಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಬೇರೆ ರೀತಿಯಲ್ಲಿ ಕೇಳಬಹುದೇ ಅಥವಾ ಸ್ವಯಂಸೇವಕರ ಬಗ್ಗೆ ಅಥವಾ ECHORA ವೇದಿಕೆಯ ಬಗ್ಗೆ ನಿರ್ದಿಷ್ಟವಾಗಿ ಏನು ತಿಳಿದುಕೊಳ್ಳಲು ಬಯಸುತ್ತೀರಿ ಎಂದು ಹೇಳಿ?"
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Detect which languages have voices with fallback logic
        const status = {
          en: voices.some(v => v.lang.startsWith('en') || v.name.toLowerCase().includes('english')),
          hi: voices.some(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')),
          ta: voices.some(v => v.lang.startsWith('ta') || v.name.toLowerCase().includes('tamil') || v.lang.includes('IN') && v.name.toLowerCase().includes('tamil')) || voices.some(v => v.lang.includes('IN')),
          kn: voices.some(v => v.lang.startsWith('kn') || v.name.toLowerCase().includes('kannada') || v.lang.includes('IN') && v.name.toLowerCase().includes('kannada')) || voices.some(v => v.lang.includes('IN'))
        };
        setVoiceStatus(status);
        
        console.log('Available voices:', voices);
        console.log('Voice status:', status);
      };
      
      loadVoices();
      
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (!transcript || !transcript.trim()) return;
        console.log('Recognized:', transcript);
        handleUserInput(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const handleUserInput = async (text) => {
    const userMessage = { text: text, sender: 'user', language: selectedLanguage };
    setChatMessages(prev => [...prev, userMessage]);
    
    // 🛡️ BULLETPROOF KEY RETRIEVAL
    const currentKey = window.CONFIG?.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    
    let finalResponse = '';

    if (currentKey) {
      setIsAiThinking(true);
      try {
        const langMap = { en: 'English', hi: 'Hindi', ta: 'Tamil', kn: 'Kannada' };
        const profileInfo = localStorage.getItem('volunteer_profile') || 'New User';
        
        // Build history-aware contents
        const historyLimit = 6;
        const recentHistory = chatMessages.slice(-historyLimit).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

        const systemInstruction = `You are ECHORA AI, a friendly and versatile assistant. 
User Profile: ${profileInfo}
While your expertise is ECHORA (India's volunteering platform), you can help with ANY question.

CRITICAL: YOU MUST RESPOND ONLY IN ${langMap[selectedLanguage].toUpperCase()}. 
Even if the user asks in a different language, your response must be in ${langMap[selectedLanguage]}.
DO NOT REPEAT YOURSELF. Be creative, engaging, and varied in your responses.`;

        const contents = [
          ...recentHistory,
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Message: "${text}"` }] }
        ];

        const modelsToTry = workingModel ? [workingModel] : ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro'];
        
        const fetchWithModel = async (model) => {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents,
              generationConfig: { temperature: 0.9, topK: 40, topP: 0.95, maxOutputTokens: 1024 }
            })
          });
          if (!res.ok) throw new Error(`Model ${model} failed`);
          const data = await res.json();
          if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) throw new Error(`Invalid response from ${model}`);
          return { text: data.candidates[0].content.parts[0].text.replace(/\*/g, ''), model };
        };

        if (workingModel) {
          try {
            const result = await fetchWithModel(workingModel);
            finalResponse = result.text;
          } catch (e) {
            console.warn('Cached model failed, clearing cache...');
            setWorkingModel(null);
            localStorage.removeItem('gemini_working_model');
            // Will fall back to default behavior on next message or we could retry now
            throw e; 
          }
        } else {
          // Discovery mode: try all in parallel
          const results = await Promise.any(modelsToTry.map(m => fetchWithModel(m)));
          finalResponse = results.text;
          setWorkingModel(results.model);
          localStorage.setItem('gemini_working_model', results.model);
        }
      } catch (err) {
        console.error('Gemini error:', err);
        finalResponse = `API Error: ${err.message || 'Unknown connection problem'}. Please verify your Gemini API key in Settings.`;
      } finally {
        setIsAiThinking(false);
      }
    } else {
      // Fallback logic
      const lowerText = text.toLowerCase();
      if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
        finalResponse = aiResponses[selectedLanguage].greeting;
      } else if (lowerText.includes('help')) {
        finalResponse = aiResponses[selectedLanguage].help;
      } else {
        finalResponse = aiResponses[selectedLanguage].default;
      }
    }
    
    const aiMessage = { text: finalResponse, sender: 'ai', language: selectedLanguage };
    setChatMessages(prev => [...prev, aiMessage]);
    speak(finalResponse);
  };

  const testConnection = async () => {
    if (!geminiKey) {
      setTestStatus('error');
      setTimeout(() => setTestStatus(null), 3000);
      return;
    }
    setTestStatus('testing');
    try {
      const models = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-pro', 'gemini-1.5-flash'];
      let success = false;
      let lastError = '';

      for (const model of models) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
              success = true;
              break;
            }
          } else {
            const errData = await res.json();
            lastError = errData.error?.message || res.statusText;
          }
        } catch (e) {
          lastError = e.message;
        }
      }

      if (success) {
        setTestStatus('success');
      } else {
        throw new Error(lastError || 'All models failed');
      }
    } catch (err) {
      console.error('Test failed:', err);
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus(null), 3000);
  };

  const reinitializeAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      alert('Audio system re-initialized. Please try speaking now.');
    }
  };

  const speak = (text) => {
    if (!synthRef.current) {
      console.error('Speech synthesis not supported');
      return;
    }
    
    stopSpeaking();
    
    // Check if voice is available for selected language
    const hasVoice = voiceStatus[selectedLanguage];
    
    if (!hasVoice && selectedLanguage !== 'en') {
      // Show warning and don't attempt to speak
      const langName = languages.find(l => l.code === selectedLanguage)?.name;
      const warning = `${langName} voice not installed on your system. Please install ${langName} language pack in Windows Settings > Time & Language > Language, or use English.`;
      setMissingVoiceWarning(warning);
      console.warn(warning);
      return;
    }
    
    setMissingVoiceWarning(null);
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = availableVoices;
    let selectedVoice = null;
    
    // Find appropriate voice for the language with better fallback logic
    if (selectedLanguage === 'hi') {
      selectedVoice = voices.find(voice => voice.lang.startsWith('hi')) || 
                   voices.find(voice => voice.name.toLowerCase().includes('hindi')) ||
                   voices.find(voice => voice.lang.includes('IN'));
    } else if (selectedLanguage === 'ta') {
      selectedVoice = voices.find(voice => voice.lang.startsWith('ta')) || 
                   voices.find(voice => voice.name.toLowerCase().includes('tamil')) ||
                   voices.find(voice => voice.lang.includes('IN')) ||
                   voices.find(voice => voice.name.toLowerCase().includes('indian'));
    } else if (selectedLanguage === 'kn') {
      selectedVoice = voices.find(voice => voice.lang.startsWith('kn')) || 
                   voices.find(voice => voice.name.toLowerCase().includes('kannada')) ||
                   voices.find(voice => voice.lang.includes('IN')) ||
                   voices.find(voice => voice.name.toLowerCase().includes('indian'));
    } else {
      selectedVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Using voice:', selectedVoice.name, 'for language:', selectedVoice.lang);
    } else {
      console.warn('No voice found, using default');
    }
    
    // Set language code for utterance
    if (selectedLanguage === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (selectedLanguage === 'ta') {
      utterance.lang = 'ta-IN';
    } else if (selectedLanguage === 'kn') {
      utterance.lang = 'kn-IN';
    } else {
      utterance.lang = 'en-US';
    }
    
    utterance.rate = speechRate;
    utterance.volume = volume;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('Started speaking:', text.substring(0, 50) + '...');
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentText('');
      console.log('Finished speaking');
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setIsSpeaking(false);
    };
    
    synthRef.current.speak(utterance);
    setCurrentText(text);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setCurrentText('');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in your browser');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = selectedLanguage === 'hi' ? 'hi-IN' : 
                                   selectedLanguage === 'ta' ? 'ta-IN' : 
                                   selectedLanguage === 'kn' ? 'kn-IN' : 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      handleUserInput(inputText);
      setInputText('');
    }
  };

  const currentLang = languages.find(l => l.code === selectedLanguage);

  if (!isSupported) {
    return (
      <div className="voice-assistant" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1000,
        maxWidth: '300px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <VolumeX size={16} />
          <span>Speech not supported in your browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-assistant">
      {/* Main Button */}
      <div 
        className="voice-assistant-main"
        title={t('voiceAssistant')}
        onClick={() => setShowSettings(!showSettings)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isSpeaking ? (
          <Volume2 size={24} color="white" style={{ animation: 'pulse 1s infinite' }} />
        ) : (
          <Mic size={24} color="white" />
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="voice-assistant-settings card">
          <div className="card-body">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={18} />
                {t('voiceAssistant')}
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Language Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                {t('selectLanguage')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setSelectedLanguage(lang.code); setGlobalLanguage(lang.code); }}
                    style={{
                      padding: '0.75rem',
                      border: '2px solid',
                      borderRadius: 'var(--radius-md)',
                      background: selectedLanguage === lang.code ? 'var(--primary-grad)' : 'transparent',
                      color: selectedLanguage === lang.code ? 'white' : 'var(--text-primary)',
                      borderColor: selectedLanguage === lang.code ? 'var(--primary-mid)' : 'var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <span>{lang.flag.includes('http') ? <img src={lang.flag} alt={lang.name} style={{width: '16px', height: '12px'}} /> : lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Language Display */}
            <div style={{ 
              padding: '0.75rem', 
              background: 'rgba(59,130,246,0.1)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '1rem',
              border: '1px solid rgba(59,130,246,0.2)'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('currentLanguage')}:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <span>{currentLang?.name}</span>
              </div>
            </div>

            {/* Missing Voice Warning */}
            {missingVoiceWarning && (
              <div style={{ 
                padding: '1rem', 
                background: '#fef2f2', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: '1rem',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.85rem',
                lineHeight: '1.5'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <VolumeX size={16} />
                  {t('voiceNotAvailable')}
                </div>
                <div>{missingVoiceWarning}</div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#7f1d1d' }}>
                  <strong>{t('installVoices')}:</strong><br/>
                  {t('winSettingsPath')}
                </div>
              </div>
            )}



            {/* Voice Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              {/* Voice Input Button */}
              <button
                onClick={toggleListening}
                disabled={isListening}
                style={{
                  padding: '0.75rem',
                  background: isListening ? 'var(--danger)' : 'var(--success)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: isListening ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                {isListening ? t('listening') : t('voiceInput')}
              </button>

              {/* Chat Button */}
              <button
                onClick={() => setShowChat(!showChat)}
                style={{
                  padding: '0.75rem',
                  background: 'var(--primary-grad)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                <MessageSquare size={18} />
                {showChat ? t('hideChat') : t('showChat')}
              </button>

              {/* Stop Speaking Button */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Pause size={18} />
                  {t('stopSpeaking')}
                </button>
              )}
            </div>

            {/* Volume Control */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                {t('volume')}: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Speech Rate Control */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                {t('speechRate')}: {speechRate}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Current Text Display */}
            {currentText && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: 'var(--bg-input)', 
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic'
              }}>
                "{currentText.substring(0, 100)}..."
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {showChat && (
        <div className="voice-assistant-chat card" style={{
          position: 'absolute',
          bottom: '80px',
          right: '0',
          width: '350px',
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}>
          <div className="card-header" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '1rem 1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} />
              <span style={{ fontWeight: 600 }}>{t('aiVoiceChat')}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {chatMessages.length > 0 && (
                <button 
                  onClick={() => setChatMessages([])}
                  style={{ 
                    background: 'var(--bg-secondary)', 
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Trash2 size={14} />
                  {t('clearChat')}
                </button>
              )}
              <button 
                onClick={() => setShowChat(false)}
                style={{ 
                  background: '#ef4444', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <X size={14} />
                {t('close')}
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {chatMessages.map((msg, index) => (
              <div key={index} style={{
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: msg.sender === 'user' ? 'var(--primary-grad)' : 'var(--bg-secondary)',
                  color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isAiThinking && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t('thinking')}
                </div>
              </div>
            )}
            
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '2rem' }}>
                <strong>{t('askAnything')}</strong><br/>
                <small>{t('langSupported')}</small>
              </div>
            )}
          </div>
          
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('typeHere')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              />
              <button
                onClick={handleSendMessage}
                style={{
                  padding: '0.75rem',
                  background: 'var(--primary-grad)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAssistant;
