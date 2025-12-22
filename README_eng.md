## Fawn's Plot Driver 📝
An AI-powered narrative control extension for SillyTavern that helps generate plot-driving OOC (Out Of Character) instructions.

**Author's Note**: I'm not a professional coder, so please explain any issues in simple terms! <3

## Features ✨
- **AI-Generated Plot Control**: Automatically generates OOC instructions for time skips and plot twists
- **Smart Context Awareness**: Uses recent chat history to create contextually relevant directions
- **Customizable Prompts**: Fine-tune the AI's instructions for different narrative styles
- **Preferences System**: Add specific details or requirements before generation
- **Minimalist Design**: Clean, theme-adaptive interface that matches SillyTavern
- **Manual Input Option**: Full control with manual OOC input when needed

## Installation 🚀
### Easy Installation (Recommended)
1. In SillyTavern, go to **Extensions → Install Extension**
2. Paste this URL:  
   `https://github.com/fawn1e/st-plot-driver.git`
3. Click **Install**
4. Restart SillyTavern

### Manual Installation
1. Download the extension files
2. Place them in your SillyTavern extensions folder:
   ```
   SillyTavern/public/scripts/extensions/third-party/plot-driver-fawn/
   ```
3. Restart SillyTavern

That's it! You should now see a pen icon (`✒️`) in your chat interface.

## Usage 📖
### Basic Usage
1. Click the pen icon (`fa-pen-nib`) in the chat interface
2. Choose from:
   - **⏳ Time Skip**: Generate OOC instructions for narrative time jumps
   - **⚡ Plot Twist**: Create unexpected plot developments
   - **✍️ Manual Input**: Write custom OOC instructions
   - **⏰ Last OOC**: View and re-use your last generated OOC
   - **⚙️ Settings**: Customize prompts and settings

### Preferences System
Before generation, you can specify preferences:
- **Skip to specific times** (morning, evening, next week)
- **Add character details** (specific NPCs, locations, events)
- **Set plot requirements** (twist types, emotional tone, outcomes)

Simply enter your preferences in the popup before generation!

### OOC Preview & Editing
After generation:
1. Review the AI-generated OOC
2. Edit the text if needed
3. Apply to send as a system prompt
4. Regenerate if unsatisfied

## Settings ⚙️
Access settings via the menu to customize:

### Prompt Customization
- **Time Skip Prompt**: Default: "You are a master story architect. Create a natural time-skip that moves the narrative forward elegantly."
- **Plot Twist Prompt**: Default: "You are a genius narrative stylist. Introduce an unexpected but logical plot twist."

### Context Settings
- **Message Count**: Number of recent messages to use for context (5-50)
- Default: 15 messages

## How It Works 🔧
1. **Context Collection**: Gathers recent chat messages based on your settings
2. **Prompt Assembly**: Combines your preferences with AI instructions
3. **AI Generation**: Sends the prompt to your configured AI backend
4. **OOC Extraction**: Parses the response to extract clean OOC instructions
5. **Prompt Application**: Adds the OOC as a system prompt for the next AI response

## Best Practices 💡

### For Time Skips:
- Be specific about duration ("skip to next morning")
- Mention important events ("after they arrive at the castle")
- Include environmental changes ("as the seasons change")

### For Plot Twists:
- Suggest twist types ("betrayal", "revelation", "unexpected ally")
- Set emotional tone ("dramatic", "subtle", "shocking")
- Consider character development implications

### General Tips:
- Use preferences for specific requirements
- Edit generated OOC to match your exact needs
- Combine multiple OOC instructions for complex narratives
- Save frequently used preferences as templates

## Troubleshooting 🔧

### Common Issues:

**Issue**: OOC not generating properly
**Solution**: Check your AI backend connection and token limits

**Issue**: Preferences not being considered
**Solution**: Ensure preferences are clearly written and relevant to context

**Issue**: Menu not appearing
**Solution**: Try restarting SillyTavern and check console for errors

**Issue**: Something else broken?
**Solution**: I'm still learning! Please describe the issue in simple terms so I can understand and fix it. 🙏

### Simple Debug Mode:
Check your browser console (F12) for messages starting with "Fawn Plot Driver:"

## Technical Details 🛠️

### Dependencies:
- SillyTavern 1.10.0+
- Working AI backend (OpenAI, Claude, Local LLM, etc.)
- Modern browser with JavaScript enabled

### File Structure:
```
plot-driver-fawn/
├── index.js          # Main extension logic
├── script.js         # Additional functionality
├── manifest.json     # Extension metadata
└── README.md         # This file
```

### API Integration:
Uses SillyTavern's extension API:
- `generateQuietPrompt()` for AI calls
- `setExtensionPrompt()` for OOC application
- `getContext()` for chat history access

## Support & Feedback 💬

**Important**: I'm not a professional developer! If you find issues or have suggestions:

1. Please explain them in simple, beginner-friendly terms
2. Be patient - I'm learning as I go
3. Feel free to suggest improvements

You can:
- Report issues on GitHub
- Join my Telegram channel to see any bugs fixed or announcments of updates: t.me/dearfawwn
- Contact me directly in Telegram

## Credits 🙏

- **Author**: fawn1e 
- **Inspired by**: Narrative control tools and AI writing assistants
- **Built for**: SillyTavern community
- **Special Thanks**: Everyone who's been patient with my learning journey

---

*Happy storytelling with Fawn's Plot Driver! May your narratives flow smoothly and your plot twists be perfectly timed.* 🩰✨
