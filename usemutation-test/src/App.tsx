import React, { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

function App() {
  const [message, setMessage] = useState('')
  const [author, setAuthor] = useState('')
  
  const createMessage = useMutation(api.messages.createMessage)
  const messages = useQuery(api.messages.listMessages)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('[CLIENT] About to call useMutation with params:', {
      message,
      author
    })
    
    try {
      const result = await createMessage({ message, author })
      console.log('[CLIENT] useMutation result:', result)
      
      // フォームをリセット
      setMessage('')
      setAuthor('')
    } catch (error) {
      console.error('[CLIENT] useMutation error:', error)
    }
  }
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>useMutation Test</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            メッセージ:
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            作者:
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>
        
        <button type="submit" style={{ padding: '10px 20px' }}>
          メッセージを送信
        </button>
      </form>
      
      <h2>メッセージ一覧</h2>
      {messages === undefined ? (
        <p>読み込み中...</p>
      ) : (
        <ul>
          {messages.map((msg: any) => (
            <li key={msg._id} style={{ marginBottom: '10px' }}>
              <strong>{msg.author}</strong>: {msg.message}
              <br />
              <small>{new Date(msg.createdAt).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
