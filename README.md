# 🏌️ Golf Score Tracker

A mobile-first web app for tracking golf scores on the course. Optimized for iOS but works great on desktop too!

## Features

✅ **Mobile-First Design** - Large, touch-friendly buttons perfect for use on the golf course
✅ **Score Tracking** - Track strokes and putts for up to 18 holes
✅ **Multiple Players** - Add as many players as you want
✅ **Par Tracking** - Set par for each hole (3, 4, or 5)
✅ **Live Stats** - See total strokes and over/under par in real-time
✅ **Offline Support** - All data stored locally, works without internet
✅ **Auto-Save** - Your round is automatically saved as you play
✅ **Full Scorecard** - View complete scorecard with color-coded scores

## How to Use

### Starting a New Round

1. Open `index.html` in your web browser
2. Enter the course name
3. Select the date (defaults to today)
4. Add player names (click "+ Add Player" for more)
5. Click "Start Round"

### Tracking Scores

1. Use the **Par buttons** (3, 4, 5) to set the par for each hole
2. For each player:
   - Tap **−** or **+** to adjust strokes
   - Tap **−** or **+** to adjust putts
3. View **Total Strokes** and **vs Par** stats in real-time
4. Use **← Prev** and **Next →** to navigate between holes
5. Click **View Scorecard** to see the full scorecard

### Viewing the Scorecard

- Shows all 18 holes in a table format
- **Green scores** = under par
- **Red scores** = over par
- See total strokes and overall vs par for each player

### Finishing a Round

- Click "Finish Round" when done
- This will clear the current round data
- You can start a new round

## Technical Details (For Learning)

### Files Structure

```
golfapp/
├── index.html    # HTML structure (the skeleton)
├── styles.css    # Styling (the appearance)
├── app.js        # JavaScript (the functionality)
└── README.md     # This file
```

### Key Concepts You'll Learn

#### HTML (`index.html`)
- **Structure**: How to organize a web page with semantic elements
- **Forms**: Input fields for user data
- **Screens**: Multiple "pages" in a single-page app

#### CSS (`styles.css`)
- **Mobile-First Design**: Start with mobile, enhance for desktop
- **Flexbox & Grid**: Modern layout techniques
- **Touch Targets**: Minimum 44px for iOS usability
- **Responsive Design**: Media queries for different screen sizes

#### JavaScript (`app.js`)
- **DOM Manipulation**: Changing HTML elements with JavaScript
- **Event Listeners**: Responding to button clicks
- **Data Management**: Storing and calculating scores
- **Local Storage**: Saving data in the browser

## How It Works

### 1. Data Structure
The app stores everything in an `appData` object:
```javascript
{
  courseName: "Pebble Beach",
  roundDate: "2025-11-23",
  players: ["Alice", "Bob"],
  currentHole: 1,
  holes: [
    {
      number: 1,
      par: 4,
      scores: {
        "Alice": { strokes: 5, putts: 2 },
        "Bob": { strokes: 4, putts: 2 }
      }
    },
    // ... 17 more holes
  ]
}
```

### 2. Screen Navigation
Only one screen is visible at a time:
- Add `.active` class to show a screen
- Remove `.active` to hide it

### 3. Local Storage
Your round is automatically saved to the browser:
- Survives page refreshes
- Stored as JSON (JavaScript Object Notation)
- Offers to continue when you return

### 4. Score Calculations
- **Total**: Sum of all strokes for holes played
- **vs Par**: Total strokes minus total par
- Displayed as "E" (even), "+2" (over), or "-3" (under)

## Next Steps & Future Enhancements

### Easy Additions
- [ ] Add player profile photos
- [ ] Track fairways hit and greens in regulation
- [ ] Add scoring terminology (birdie, eagle, bogey)
- [ ] Export scorecard as image or PDF

### Medium Complexity
- [ ] Save completed rounds to history
- [ ] View past rounds and statistics
- [ ] Charts and graphs for performance
- [ ] Dark mode toggle

### Advanced Features
- [ ] Course API integration for automatic par values
- [ ] GPS hole location tracking
- [ ] Multiplayer sync across devices
- [ ] Handicap calculations

## Browser Compatibility

Works best in:
- ✅ Safari (iOS and macOS)
- ✅ Chrome (mobile and desktop)
- ✅ Firefox
- ✅ Edge

## Installation on iPhone

For the best mobile experience:

1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Now it opens like a native app!

## Tips for Use on the Course

- 📱 Add to home screen for quick access
- 🔋 Use Low Power Mode to save battery
- ☀️ Increase screen brightness for outdoor visibility
- ✈️ Works in Airplane Mode (all data is local)

## Questions or Issues?

Since you're new to coding, here are some common troubleshooting tips:

**Q: The app isn't saving my data**
A: Make sure you're not in Private/Incognito mode. LocalStorage doesn't work there.

**Q: Can I use this offline?**
A: Yes! Once you've loaded the page once, it works completely offline.

**Q: How do I reset everything?**
A: Click "Finish Round" or clear your browser's local storage.

## Learn More

Want to understand how this works?
- **HTML**: [MDN HTML Guide](https://developer.mozilla.org/en-US/docs/Learn/HTML)
- **CSS**: [MDN CSS Guide](https://developer.mozilla.org/en-US/docs/Learn/CSS)
- **JavaScript**: [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Learn/JavaScript)

---

**Enjoy your round! ⛳️**
