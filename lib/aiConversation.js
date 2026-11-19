'use strict';

function conversationTurns(rows, limit = 10) {
  return (rows || [])
    .filter((row) => row && (row.sender === 'user' || row.sender === 'assistant' || row.role === 'user' || row.role === 'assistant'))
    .slice(-limit)
    .map((row) => ({
      role: row.sender === 'assistant' || row.role === 'assistant' ? 'assistant' : 'user',
      content: String(row.content || row.text || '').slice(0, 4000)
    }))
    .filter((row) => row.content.trim());
}

module.exports = { conversationTurns };
