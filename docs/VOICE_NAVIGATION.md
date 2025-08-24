# Voice Navigation System for Multi-Agent AI Debate Platform

## Overview

The Voice Navigation system provides hands-free navigation and control for the Multi-Agent AI Debate Platform using voice commands and AI-powered natural language processing. This system is specifically designed for managing AI agents, debate sessions, and analytics in a flow-based AI processing environment.

## Features

- **Voice Recognition**: Real-time speech-to-text conversion
- **AI Command Processing**: Uses Groq AI to understand natural language commands
- **Navigation**: Voice-controlled page navigation
- **Multi-Agent Management**: Voice control for AI agent creation and management
- **Session Control**: Voice commands for debate session management
- **Visual Feedback**: Real-time voice visualization and command feedback
- **Help System**: Built-in help and command suggestions

## Setup

### Environment Variables

Add the following to your `.env.local` file:

```bash
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Dependencies

The system requires the following packages (already included in package.json):

- `groq-sdk` - For AI command processing
- `@supabase/supabase-js` - For authentication
- `lucide-react` - For icons

## API Routes

### `/api/voice/process-command`

Processes voice commands using Groq AI.

**Request:**

```json
{
  "command": "go to health tracker",
  "userContext": {
    "userType": "user",
    "currentPath": "/",
    "activeTab": "overview"
  }
}
```

**Response:**

```json
{
  "intent": "navigation",
  "action": "navigate",
  "targetPath": "/health-tracker",
  "parameters": null,
  "confidence": 0.9,
  "response": "Navigating to Health Tracker"
}
```

### `/api/voice/process-command`

Processes voice commands using Groq AI for the Multi-Agent system.

**Request:**

```json
{
  "command": "go to my agents",
  "userContext": {
    "userType": "user",
    "currentPath": "/dashboard",
    "availableRoutes": [
      "/",
      "/dashboard",
      "/dashboard/agents",
      "/dashboard/sessions",
      "/dashboard/analytics"
    ]
  }
}
```

**Response:**

```json
{
  "intent": "navigation",
  "action": "navigate",
  "targetPath": "/dashboard/agents",
  "parameters": null,
  "confidence": 0.95,
  "response": "Navigating to AI Agents Management"
}
```

## Usage

### Basic Voice Commands

#### Navigation

- "Go to dashboard" → Navigate to main dashboard
- "Show my agents" → Navigate to AI agents management
- "Open sessions" → Navigate to flow sessions management
- "Go to analytics" → Navigate to analytics dashboard
- "Go back" → Navigate to previous page
- "Take me home" → Navigate to home page

#### Multi-Agent Operations

- "Create a new agent" → Navigate to agent creation
- "Start a new debate" → Navigate to session creation
- "Show active sessions" → Filter to active sessions
- "Manage my agents" → Navigate to agent management

#### System Commands

- "Help" → Show available commands
- "What can I say?" → List command options

### Component Integration

```tsx
import VoiceNavigation from "@/components/voice/VoiceNavigation";

export default function MyPage() {
  return (
    <div>
      {/* Your page content */}
      <VoiceNavigation />
    </div>
  );
}
```

## Voice Recognition

The system uses the Web Speech API for voice recognition:

- **Browser Support**: Chrome, Edge, Safari (with limitations)
- **Language**: English (en-US)
- **Continuous**: Yes, for better user experience
- **Interim Results**: Yes, for real-time feedback

## AI Processing

Commands are processed using Groq's Llama 3.3 70B model:

- **Model**: `llama-3.3-70b-versatile`
- **Temperature**: 0.1 (for consistent responses)
- **Response Format**: JSON for structured output
- **Confidence Threshold**: 0.3 (minimum confidence for execution)

## Customization

### Adding New Routes

Update the `AVAILABLE_ROUTES` constant in `VoiceNavigation.tsx`:

```tsx
const AVAILABLE_ROUTES = {
  "/new-page": {
    path: "/new-page",
    name: "New Page",
    aliases: ["new", "page", "new page"],
    description: "Description of the new page",
  },
  // ... existing routes
};
```

### Adding New Command Patterns

Extend the `nlpPatterns` function:

```tsx
{
  patterns: [
    /your regex pattern here/i,
  ],
  action: "yourAction",
  parameters: { /* your parameters */ },
  confidence: 0.8,
  category: "action",
  description: "Description of what this command does",
}
```

### Custom Actions

Implement custom actions in the `processCommand` function:

```tsx
if (result.intent === "custom") {
  switch (result.action) {
    case "yourCustomAction":
      // Your custom logic here
      break;
  }
}
```

## Error Handling

The system handles various error scenarios:

- **Speech Recognition Errors**: Network, audio capture, permissions
- **AI Processing Errors**: Invalid responses, parsing failures
- **Navigation Errors**: Invalid routes, permission issues
- **Network Errors**: API failures, timeouts

## Testing

The voice navigation system is integrated into your dashboard. To test it:

```bash
npm run dev
# Navigate to any dashboard page (e.g., http://localhost:3000/dashboard)
# Look for the microphone button in the bottom right corner
```

## Troubleshooting

### Common Issues

1. **Microphone not working**

   - Check browser permissions
   - Ensure HTTPS (required for microphone access)
   - Try refreshing the page

2. **Commands not recognized**

   - Speak clearly and at normal pace
   - Use simple, direct commands
   - Check the help system for available commands

3. **Navigation not working**
   - Verify the route exists in `AVAILABLE_ROUTES`
   - Check authentication status
   - Ensure proper permissions
   - Try alternative command phrases (e.g., "show agents" vs "go to agents")

### Debug Mode

Enable console logging for debugging:

```tsx
// In VoiceNavigation.tsx
console.log("Processing command:", command);
console.log("AI response:", result);
```

## Performance Considerations

- **Voice Recognition**: Runs in background when active
- **AI Processing**: Cached responses for similar commands
- **Memory Usage**: Minimal, with proper cleanup on unmount
- **Network**: Only makes API calls when processing commands

## Security

- **Authentication**: All API calls require valid user session
- **Input Validation**: Commands are sanitized before processing
- **Route Validation**: Only allows navigation to predefined routes
- **Rate Limiting**: Consider implementing rate limiting for API calls

## Future Enhancements

- **Multi-language Support**: Additional language recognition
- **Voice Profiles**: Personalized voice recognition
- **Offline Mode**: Local command processing
- **Advanced Analytics**: Command usage statistics
- **Integration**: Connect with other voice assistants
