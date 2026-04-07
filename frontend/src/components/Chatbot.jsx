import { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import { getSearch } from '../api'

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm your Reddit narrative investigator. Ask me anything about the dataset — topics, communities, ideologies, or sources."
    }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef(null)
  const { setSearchResults, setSearchQuery } = useStore()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const q = input.trim()
    if (!q || loading) return

    // add user message
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      const res  = await getSearch({ q })
      const data = res.data

      // update dashboard
      setSearchQuery(q)
      setSearchResults(data)

      // build response message
      let reply = ''

      if (data.error) {
        reply = data.error
      } else if (data.total === 0) {
        reply = `I couldn't find any posts about "${q}". Try rephrasing or using different terms.`
      } else {
        reply = data.summary ||
          `Found ${data.total} posts about "${q}". ` +
          `Most active in r/${data.subreddits?.[0]?.subreddit || 'various communities'}.`
      }

      setMessages(prev => [...prev, {
        role:            'assistant',
        text:            reply,
        related_queries: data.related_queries || [],
        total:           data.total
      }])

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Something went wrong. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleRelated = async (q) => {
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      const res  = await getSearch({ q })
      const data = res.data
      setSearchQuery(q)
      setSearchResults(data)

      const reply = data.summary ||
        `Found ${data.total} posts about "${q}".`

      setMessages(prev => [...prev, {
        role:            'assistant',
        text:            reply,
        related_queries: data.related_queries || [],
        total:           data.total
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background:   '#ffffff',
      border:       '1px solid #dbe4f0',
      borderRadius: '16px',
      display:      'flex',
      flexDirection:'column',
      height:       '70vh',
      minHeight:    '520px',
      maxHeight:    '760px',
      boxShadow:    '0 8px 32px rgba(0,0,0,0.4)'
    }}>

      {/* Header */}
      <div style={{
        padding:      '14px 16px',
        borderBottom: '1px solid #dbe4f0',
        display:      'flex',
        alignItems:   'center',
        gap:          '10px'
      }}>
        <div style={{
          width:        '32px',
          height:       '32px',
          borderRadius: '50%',
          background:   '#0b5fff',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     '16px'
        }}>
          🔍
        </div>
        <div>
          <div style={{ color: '#0f1b2d', fontSize: '14px', fontWeight: '600' }}>
            Narrative Investigator
          </div>
          <div style={{ color: '#0f766e', fontSize: '11px' }}>
            ● Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex:       1,
        overflowY:  'auto',
        padding:    '12px',
        display:    'flex',
        flexDirection: 'column',
        gap:        '10px'
      }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{
              display:       'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth:     '640px',
                padding:      '10px 14px',
                borderRadius: msg.role === 'user'
                  ? '16px 16px 4px 16px'
                  : '16px 16px 16px 4px',
                background:   msg.role === 'user' ? '#0b5fff' : '#f8fafc',
                color:        '#0f1b2d',
                fontSize:     '13px',
                lineHeight:   '1.5'
              }}>
                {msg.text}
              </div>
            </div>

            {/* Related queries */}
            {msg.related_queries?.length > 0 && (
              <div style={{ marginTop: '6px', paddingLeft: '4px' }}>
                <div style={{ color: '#5b6b82', fontSize: '10px', marginBottom: '4px' }}>
                  EXPLORE NEXT:
                </div>
                <div className="flex flex-wrap gap-2">
                  {msg.related_queries.map((q, j) => (
                    <button
                      key={j}
                      onClick={() => handleRelated(q)}
                      style={{
                        textAlign:    'left',
                        padding:      '4px 10px',
                        borderRadius: '12px',
                        background:   '#f8fafc',
                        color:        '#0b5fff',
                        border:       '1px solid #dbe4f0',
                        fontSize:     '11px',
                        cursor:       'pointer'
                      }}
                    >
                      → {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{
            padding:      '10px 14px',
            borderRadius: '16px 16px 16px 4px',
            background:   '#f8fafc',
            color:        '#5b6b82',
            fontSize:     '13px',
            width:        'fit-content'
          }}>
            Investigating...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding:      '12px',
        borderTop:    '1px solid #dbe4f0',
        display:      'flex',
        gap:          '8px'
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything..."
          style={{
            flex:         1,
            padding:      '8px 12px',
            borderRadius: '8px',
            background:   '#f8fafc',
            border:       '1px solid #dbe4f0',
            color:        '#0f1b2d',
            fontSize:     '13px',
            outline:      'none'
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding:      '8px 14px',
            borderRadius: '8px',
            background:   input.trim() ? '#0b5fff' : '#dbe4f0',
            color: input.trim() ? '#fff' : '#5b6b82',
            border:       'none',
            cursor:       input.trim() ? 'pointer' : 'not-allowed',
            fontSize:     '13px'
          }}
        >
          Send
        </button>
      </div>

    </div>
  )
}