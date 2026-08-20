/**
 * Learner Dashboard - AI Study Assistant Module
 */

export async function askAITutor(subject, promptText) {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/learner/ai-assistant', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, prompt: promptText })
    });

    if (!response.ok) {
        throw new Error('AI Assistant request failed');
    }

    return response.json();
}
