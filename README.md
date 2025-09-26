# Compre AI - Chrome Extension

A powerful AI-enhanced Chrome extension that helps you analyze web pages, summarize text, translate content, and extract key data from any website.

## ✨ Features

- **📊 Page Analysis**: Get comprehensive insights about any web page including word count, structure, and key elements
- **📝 Text Summarization**: Quickly summarize selected text on any website
- **🌐 Translation**: Translate selected text to different languages
- **📈 Data Extraction**: Automatically extract emails, phone numbers, dates, prices, and addresses from web pages
- **⚡ Context Menu Integration**: Right-click on selected text for quick AI actions
- **🎨 Beautiful UI**: Modern, intuitive interface with gradient design

## 🚀 Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Clone or download** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** by toggling the switch in the top-right corner
4. **Click "Load unpacked"** and select the folder containing this extension
5. **Pin the extension** to your toolbar for easy access

### Method 2: Chrome Web Store (Coming Soon)

This extension will be available on the Chrome Web Store once it's published.

## 🛠️ Setup

### Adding Icons

Before using the extension, you need to add icon files:

1. Create or obtain PNG icon files in the following sizes:
   - `icon16.png` (16×16 pixels)
   - `icon32.png` (32×32 pixels) 
   - `icon48.png` (48×48 pixels)
   - `icon128.png` (128×128 pixels)

2. Place these files in the `icons/` directory

3. Reload the extension in `chrome://extensions/`

### Optional: AI Integration

To enable advanced AI features:

1. Obtain API keys from your preferred AI service (OpenAI, Google AI, etc.)
2. Click the extension icon and go to Settings
3. Enter your API credentials
4. Save settings

## 🎯 How to Use

### Basic Usage

1. **Click the extension icon** in your Chrome toolbar
2. **Select a feature** from the popup menu:
   - Analyze Current Page
   - Summarize Selected Text (select text first)
   - Translate Text (select text first)
   - Extract Key Data

### Context Menu Usage

1. **Select any text** on a webpage
2. **Right-click** to open the context menu
3. **Choose** from Compre AI options:
   - Analyze with Compre AI
   - Summarize with Compre AI
   - Translate with Compre AI

## 📁 Project Structure

```
compre-ai/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── content.js             # Content script for web page interaction
├── background.js          # Background script for extension lifecycle
├── icons/                 # Extension icons (16, 32, 48, 128px)
│   └── README.md         # Icon creation guide
└── README.md             # This file
```

## 🔧 Development

### File Overview

- **`manifest.json`**: Extension configuration and permissions
- **`popup.html/js`**: User interface when clicking the extension icon
- **`content.js`**: Runs on web pages to analyze and extract data
- **`background.js`**: Handles extension lifecycle and background tasks

### Key Features Implemented

- ✅ Page content analysis
- ✅ Text selection and processing
- ✅ Data extraction (emails, phones, dates, etc.)
- ✅ Modern popup UI with gradient design
- ✅ Context menu integration
- ✅ Settings storage
- ✅ Analytics logging framework
- ✅ Error handling

### Permissions Used

- **`activeTab`**: Access to the currently active tab
- **`storage`**: Store user settings and preferences
- **`contextMenus`**: Add right-click menu options (automatically included)

## 🎨 Customization

### Changing the Theme

Edit the CSS in `popup.html` to customize colors and appearance:

```css
/* Main gradient background */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Feature hover effects */
.feature:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

### Adding New Features

1. Add UI elements to `popup.html`
2. Add event listeners in `popup.js`
3. Implement functionality in `content.js`
4. Update manifest permissions if needed

## 🔒 Privacy

- **No data collection**: This extension processes data locally
- **No external servers**: All processing happens in your browser
- **Optional AI integration**: Only if you provide API keys
- **Local storage only**: Settings stored locally in Chrome

## 🐛 Troubleshooting

### Extension Not Loading

- Ensure all required files are present
- Check Chrome DevTools console for errors
- Verify manifest.json syntax
- Make sure Developer Mode is enabled

### Features Not Working

- Check if the page allows content scripts
- Verify permissions in manifest.json
- Look for JavaScript errors in DevTools
- Try reloading the extension

### Icons Not Showing

- Ensure icon files exist in `icons/` directory
- Check file names match manifest.json exactly
- Verify PNG format and correct dimensions
- Reload the extension after adding icons

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔮 Roadmap

- [ ] Chrome Web Store publication
- [ ] Advanced AI integrations
- [ ] Multi-language support
- [ ] Custom data extraction rules
- [ ] Export functionality
- [ ] Team collaboration features

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review Chrome extension developer documentation
3. Create an issue on the GitHub repository

---

**Made with ❤️ for better web browsing**