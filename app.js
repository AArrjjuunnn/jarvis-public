'use strict';

const $ = (id) => document.getElementById(id);
const els = {
  form: $('chatForm'), input: $('messageInput'), conversation: $('conversation'), welcome: $('welcome'),
  activity: $('activity'), activityText: $('activityText'), send: $('sendButton'), network: $('networkState'),
  dialog: $('settingsDialog'), endpoint: $('apiEndpoint'), model: $('modelName'), key: $('apiKey'),
  speak: $('speakReplies'), searchFirst: $('searchFirst'), settingsMessage: $('settingsMessage'),
  aiStatus: $('aiStatus'), history: $('chatHistory'), mic: $('micButton'), voiceHint: $('voiceHint')
};
const STORE = { settings: 'jarvis-v2-settings', chats: 'jarvis-v2-chats', active: 'jarvis-v2-active' };
const DEFAULTS = { endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.5-flash', apiKey: '', speak: false, searchFirst: true };
let settings = load(STORE.settings, DEFAULTS);
let chats = load(STORE.chats, []);
let activeId = localStorage.getItem(STORE.active) || null;
let recognition = null;
let busy = false;

function load(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function uid() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function currentChat() { return chats.find(c => c.id === activeId); }
function newChat() { const chat = { id: uid(), title: 'New conversation', messages: [], updated: Date.now() }; chats.unshift(chat); activeId = chat.id; persist(); render(); }
function persist() { save(STORE.chats, chats); if (activeId) localStorage.setItem(STORE.active, activeId); renderHistory(); }
function renderHistory() {
  els.history.innerHTML = '';
  chats.slice(0, 12).forEach(chat => {
    const button = document.createElement('button'); button.className = `history-item${chat.id === activeId ? ' active' : ''}`;
    button.textContent = chat.title || 'New conversation'; button.title = button.textContent;
    button.addEventListener('click', () => { activeId = chat.id; localStorage.setItem(STORE.active, activeId); render(); });
    els.history.append(button);
  });
}
function render() {
  renderHistory(); const chat = currentChat(); const messages = chat?.messages || [];
  els.welcome.classList.toggle('hidden', messages.length > 0);
  els.conversation.innerHTML = '';
  messages.forEach((message, index) => renderMessage(message, index));
  els.conversation.scrollTop = els.conversation.scrollHeight;
}
function renderMessage(message, index) {
  const row = document.createElement('article'); row.className = `message ${message.role === 'user' ? 'user' : 'assistant'}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = message.role === 'user' ? 'Y' : 'J';
  const content = document.createElement('div'); content.className = 'message-content';
  const label = document.createElement('div'); label.className = 'message-label'; label.textContent = message.role === 'user' ? 'YOU' : 'JARVIS';
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = message.content || '';
  content.append(label, bubble);
  if (message.sources?.length) {
    const sources = document.createElement('div'); sources.className = 'sources';
    const title = document.createElement('div'); title.className = 'sources-title'; title.textContent = 'WEB SOURCES'; sources.append(title);
    message.sources.forEach(source => { const a = document.createElement('a'); a.className = 'source-link'; a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = source.title || source.url; sources.append(a); });
    content.append(sources);
  }
  if (message.role === 'assistant') {
    const tools = document.createElement('div'); tools.className = 'message-tools';
    const copy = document.createElement('button'); copy.textContent = 'Copy'; copy.addEventListener('click', () => navigator.clipboard?.writeText(message.content).then(() => copy.textContent = 'Copied').catch(() => {}));
    const speak = document.createElement('button'); speak.textContent = 'Speak'; speak.addEventListener('click', () => speakText(message.content));
    tools.append(copy, speak); content.append(tools);
  }
  row.append(avatar, content); els.conversation.append(row);
}
function addMessage(role, content, sources = []) {
  let chat = currentChat(); if (!chat) { newChat(); chat = currentChat(); }
  chat.messages.push({ role, content, sources, time: Date.now() }); chat.updated = Date.now();
  if (role === 'user' && chat.title === 'New conversation') chat.title = content.slice(0, 42) + (content.length > 42 ? '…' : '');
  persist(); render();
}
function setActivity(text) { els.activityText.textContent = text; els.activity.classList.remove('hidden'); els.send.disabled = true; busy = true; }
function clearActivity() { els.activity.classList.add('hidden'); els.send.disabled = false; busy = false; }
function updateNetwork() { const online = navigator.onLine; els.network.classList.toggle('offline', !online); els.network.innerHTML = `<i></i> ${online ? 'NETWORK AVAILABLE' : 'NO INTERNET'}`; $('mobileStatus').textContent = online ? 'NETWORK AVAILABLE' : 'OFFLINE'; }
function updateAIStatus() { const configured = Boolean(settings.endpoint && settings.model && settings.apiKey); els.aiStatus.textContent = configured ? 'AI CONFIGURED' : 'AI NOT CONFIGURED'; }

// A lightweight search pass. DuckDuckGo Instant Answer provides abstracts and related topics,
// not a complete search index. We label the results honestly and never invent citations.
async function webSearch(query) {
  const sources = [];
  let status = 'ok';
  const endpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Search service returned ${response.status}`);
    const data = await response.json();
    if (data.AbstractText && data.AbstractURL) sources.push({ title: data.Heading || 'DuckDuckGo summary', url: data.AbstractURL, snippet: data.AbstractText });
    const flatten = (items) => (items || []).forEach(item => {
      if (item.Topics) flatten(item.Topics);
      else if (item.Text && item.FirstURL) sources.push({ title: item.Text, url: item.FirstURL, snippet: item.Text });
    });
    flatten(data.RelatedTopics);
    if (data.Results) data.Results.forEach(item => { if (item.Text && item.FirstURL) sources.push({ title: item.Text, url: item.FirstURL, snippet: item.Text }); });
  } catch (error) {
    status = 'service_error';
    console.warn('Instant-answer search failed:', error);
  }
  const unique = [];
  const seen = new Set();
  for (const source of sources) { if (!seen.has(source.url)) { seen.add(source.url); unique.push(source); } }
  const results = unique.slice(0, 6);
  return { sources: results, status: results.length ? status : (status === 'service_error' ? status : 'no_results') };
}
async function askAI(question, sources, history) {
  if (!settings.apiKey || !settings.endpoint || !settings.model) throw new Error('AI_NOT_CONFIGURED');
  const endpoint = settings.endpoint.replace(/\/+$/, '') + '/chat/completions';
  const context = sources.length ? sources.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\nInformation: ${s.snippet}`).join('\n\n') : 'No usable search results were retrieved. Do not pretend that a web search was successful. Explicitly distinguish this from a successful search with no matching results, and answer only if you can clearly label general knowledge as unverified current information.';
  const system = `You are JARVIS, a concise and capable personal assistant. The application attempts web search before sending questions to you. Use the supplied web material when relevant. Cite claims using [1], [2], etc. only when supported by the matching source. Never invent sources, quotes, facts, or URLs. If search material is missing or weak, explicitly say so and separate general knowledge from current verified information. If sources conflict, explain the conflict. Do not claim to have browsed beyond the supplied material. Be clear, accurate, and useful.\n\nWEB SEARCH MATERIAL:\n${context}`;
  const messages = [{ role: 'system', content: system }];
  history.slice(-8).forEach(item => { if (item.role === 'user' || item.role === 'assistant') messages.push({ role: item.role, content: item.content }); });
  messages.push({ role: 'user', content: question });
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
    body: JSON.stringify({ model: settings.model, messages, temperature: 0.4 })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`AI service error (${response.status}). ${detail.slice(0, 260)}`);
  }
  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer || typeof answer !== 'string') throw new Error('The AI provider returned an empty or unsupported response.');
  return answer;
}
function isLocalCommand(text) { return /^(help|what time is it|time|what is today's date|date|read notes|show notes|clear notes|remember\s+|note\s+|calculate\s+)/i.test(text.trim()); }
function getNotes() { return load('jarvis-v2-notes', []); }
function calculate(expression) {
  if (!/^[\d\s()+\-*/%.]+$/.test(expression)) return null;
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/%]/g); if (!tokens || tokens.join('') !== expression.replace(/\s/g, '')) return null;
  let p = 0;
  function factor(){const t=tokens[p++];if(t==='+')return factor();if(t==='-')return-factor();if(t==='('){const v=expr();if(tokens[p++]!==')')throw Error();return v;}const n=Number(t);if(!Number.isFinite(n))throw Error();return n;}
  function term(){let v=factor();while(['*','/','%'].includes(tokens[p])){const op=tokens[p++],r=factor();if((op==='/'||op==='%')&&r===0)throw Error();v=op==='*'?v*r:op==='/'?v/r:v%r;}return v;}
  function expr(){let v=term();while(tokens[p]==='+'||tokens[p]==='-'){const op=tokens[p++],r=term();v=op==='+'?v+r:v-r;}return v;}
  try{const v=expr();return p===tokens.length&&Number.isFinite(v)?Number(v.toPrecision(12)):null;}catch{return null;}
}
function handleLocal(text) {
  const q = text.trim(), lower = q.toLowerCase();
  if (/^(help|what can you do)\??$/.test(lower)) return 'I can search the web and ask the connected AI model, calculate arithmetic, tell the date and time, save local notes, and speak responses. Configure an AI endpoint in Settings to enable generated answers.';
  if (/\b(time|clock)\b/.test(lower) && lower.length < 35) return `The time is ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}.`;
  if (/\b(date|day)\b/.test(lower) && lower.length < 35) return `Today is ${new Date().toLocaleDateString([], {weekday:'long',year:'numeric',month:'long',day:'numeric'})}.`;
  if (lower.startsWith('calculate ')) { const result = calculate(q.slice(10)); return result === null ? 'I could not parse that calculation. Try: calculate (12 + 8) * 3.' : `The answer is ${result}.`; }
  if (lower.startsWith('remember ') || lower.startsWith('note ')) { const note = q.replace(/^(remember|note)\s+/i,'').trim(); const notes = getNotes(); notes.push({ text: note, created: new Date().toISOString() }); save('jarvis-v2-notes', notes); return 'Saved locally in this browser.'; }
  if (lower.includes('read notes') || lower === 'show notes') { const notes = getNotes(); return notes.length ? notes.map((n,i)=>`${i+1}. ${n.text}`).join('\n') : 'There are no saved notes.'; }
  if (lower === 'clear notes') { localStorage.removeItem('jarvis-v2-notes'); return 'Local notes cleared.'; }
  return null;
}
async function submitMessage(text) {
  const question = text.trim(); if (!question || busy) return;
  if (!navigator.onLine && !isLocalCommand(question)) { addMessage('user', question); addMessage('assistant', 'Internet connection unavailable. I cannot search the web or contact the AI service. Local commands such as calculations, date/time, and saved notes remain available.'); return; }
  const chat = currentChat(); const prior = chat?.messages?.slice() || [];
  addMessage('user', question);
  const local = handleLocal(question);
  if (local !== null) { addMessage('assistant', local); if (settings.speak) speakText(local); return; }
  try {
    let search = { sources: [], status: 'skipped' };
    if (settings.searchFirst) { setActivity('Searching the web first…'); search = await webSearch(question); }
    const sources = search.sources;
    if (!settings.apiKey) {
      clearActivity();
      if (sources.length) {
        const summary = sources.map((s, i) => `${i + 1}. ${s.title}\n${s.snippet}`).join('\n\n');
        addMessage('assistant', `I found these search results, but the AI engine is not configured, so I cannot analyse them yet.\n\n${summary}\n\nOpen Settings to connect an AI model.`, sources);
      } else if (search.status === 'service_error') {
        addMessage('assistant', 'The search service could not be reached. This is a search-service failure, not an AI failure. Try again later.');
      } else if (settings.searchFirst) {
        addMessage('assistant', 'The search request completed, but DuckDuckGo Instant Answer returned no usable results. This is not proof that the topic has no web results. Configure an AI model in Settings, and consider adding a full search provider later.');
      } else {
        addMessage('assistant', 'The AI response engine is not configured. Open Settings and add an API endpoint, model name, and your own API key.');
      }
      return;
    }
    setActivity('Sending question and retrieved material to AI…');
    const answer = await askAI(question, sources, prior);
    addMessage('assistant', answer, sources);
    if (settings.speak) speakText(answer);
  } catch (error) {
    const message = error.message === 'AI_NOT_CONFIGURED' ? 'AI is not configured. Open Settings to connect a model.' : error.message;
    addMessage('assistant', `I could not complete that request. ${message}\n\nYour message was not silently treated as a successful search. Check your connection, endpoint, model name, and provider limits.`);
  } finally { clearActivity(); }
}
function speakText(text) { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 1; utterance.pitch = .92; window.speechSynthesis.speak(utterance); }
function openSettings() { els.endpoint.value = settings.endpoint; els.model.value = settings.model; els.key.value = settings.apiKey; els.speak.checked = settings.speak; els.searchFirst.checked = settings.searchFirst; els.settingsMessage.textContent = ''; els.dialog.showModal(); }
function saveSettings() {
  settings = { endpoint: els.endpoint.value.trim(), model: els.model.value.trim(), apiKey: els.key.value.trim(), speak: els.speak.checked, searchFirst: els.searchFirst.checked };
  save(STORE.settings, settings); updateAIStatus(); els.settingsMessage.textContent = 'Settings saved in this browser.';
}

els.form.addEventListener('submit', event => { event.preventDefault(); const value = els.input.value; els.input.value = ''; els.input.style.height = 'auto'; submitMessage(value); });
els.input.addEventListener('input', () => { els.input.style.height = 'auto'; els.input.style.height = `${Math.min(els.input.scrollHeight,150)}px`; });
els.input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); els.form.requestSubmit(); } });
$('settingsButton').addEventListener('click', openSettings);
$('saveSettings').addEventListener('click', saveSettings);
$('clearSettings').addEventListener('click', () => { settings = { ...DEFAULTS }; save(STORE.settings, settings); openSettings(); els.settingsMessage.textContent = 'Credentials cleared.'; updateAIStatus(); });
$('newChatButton').addEventListener('click', newChat);
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => submitMessage(button.dataset.prompt)));
window.addEventListener('online', updateNetwork); window.addEventListener('offline', updateNetwork);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition(); recognition.lang = navigator.language || 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;
  recognition.onstart = () => { els.voiceHint.textContent = 'Listening…'; els.mic.classList.add('listening'); };
  recognition.onend = () => { els.voiceHint.textContent = 'Voice input'; els.mic.classList.remove('listening'); };
  recognition.onerror = event => { els.voiceHint.textContent = event.error === 'not-allowed' ? 'Microphone permission blocked' : 'Voice unavailable'; };
  recognition.onresult = event => { els.input.value = event.results[0][0].transcript; els.input.dispatchEvent(new Event('input')); els.input.focus(); };
  els.mic.addEventListener('click', () => { try { recognition.start(); } catch { recognition.stop(); } });
} else {
  els.mic.addEventListener('click', () => { els.voiceHint.textContent = 'Use keyboard dictation on iPhone'; els.input.focus(); });
  els.voiceHint.textContent = 'Keyboard dictation';
}

if (!activeId || !chats.some(c => c.id === activeId)) { activeId = null; newChat(); } else render();
updateNetwork(); updateAIStatus();

// Retire the previous prototype's offline worker so it cannot keep serving stale files.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    }).catch(() => {});
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.filter(key => /jarvis/i.test(key)).map(key => caches.delete(key)))).catch(() => {});
    }
  });
}
