# 🏌️ Golf Score Tracker

A mobile-first web app for tracking golf scores with advanced history features, Golf Course API integration, and player statistics. Optimized for iOS but works great on desktop too!

## ✨ Features

### Core Features
✅ **Mobile-First Design** - Large, touch-friendly buttons perfect for use on the golf course
✅ **Score Tracking** - Track strokes and putts for up to 18 holes
✅ **Multiple Players** - Add as many players as you want
✅ **Live Stats** - See total strokes and over/under par in real-time
✅ **Full Scorecard** - View complete scorecard with color-coded scores

### 🆕 New Advanced Features
✅ **Sidebar Navigation** - Easy hamburger menu (☰) to access all features
✅ **Golf Course API** - Search real golf courses and auto-load par, yardage, and handicap
✅ **Round History** - Save and view all your past rounds with full scorecards
✅ **Player Statistics** - Track lifetime stats: avg score, best/worst rounds, avg putts, and more
✅ **Course Performance** - See how you perform at each course you've played
✅ **Offline Support** - All data stored locally, works without internet
✅ **Auto-Save** - Your round is automatically saved as you play

## 🚀 How to Use

### Starting a New Round

1. Open `index.html` in your web browser
2. Click the **hamburger menu (☰)** in the top-left corner
3. Select **"Score Entry"**
4. **Search for a golf course:**
   - Type the course name or city (e.g., "Pebble Beach" or "San Francisco")
   - Click "Search Courses"
   - Select a course from the results (CA/HI courses shown first!)
   - *Or click "Enter Course Manually" to skip the API*
5. Enter the **date** (defaults to today)
6. Add **player names** (click "+ Add Player" for more)
7. Click **"Start Round"**

### Tracking Scores

1. You'll see the **hole number, yardage, and handicap** (if from API)
2. Use the **Par buttons** (3, 4, 5) to set/adjust par for each hole
3. For each player:
   - Tap **−** or **+** to adjust strokes
   - Tap **−** or **+** to adjust putts
4. View **Total Strokes** and **vs Par** stats in real-time
5. Use **← Prev** and **Next →** to navigate between holes
6. Click **"View Scorecard"** to see the full scorecard anytime

### Viewing the Scorecard

- Shows all 18 holes in a table format
- **Green scores** = under par
- **Red scores** = over par
- See total strokes, total putts, and overall vs par for each player

### Finishing a Round

1. Click **"Save & Finish Round"** when done
2. Your round is saved to **Course History**!
3. Player statistics are automatically updated
4. You can now start a new round

### Viewing History & Stats

**Course History:**
- Click hamburger menu → **"Course History"**
- See all past rounds (newest first)
- Click any round to view the full detailed scorecard

**Player Statistics:**
- Click hamburger menu → **"Player Stats"**
- See lifetime stats for all players
- Click any player to see detailed breakdown by course

## Technical Details (For Learning)

### Files Structure

```
golfapp/
├── index.html          # HTML structure (8 screens total)
├── styles.css          # Mobile-first CSS with sidebar navigation
├── app.js              # Complete JavaScript (1100+ lines!)
├── README.md           # This file (quick start guide)
└── FEATURES_GUIDE.md   # Detailed beginner's guide with code explanations
```

### Key Concepts You'll Learn

#### HTML (`index.html`)
- **Structure**: 8 different screens in a single-page app
- **Forms**: Input fields for user data and search
- **Navigation**: Sidebar menu with smooth animations
- **Semantic Elements**: Proper use of nav, section, header elements

#### CSS (`styles.css`)
- **Mobile-First Design**: Start with mobile, enhance for desktop
- **Animations**: Smooth sidebar slide-in/out with CSS transitions
- **Flexbox & Grid**: Modern layout for stats and cards
- **Touch Targets**: Minimum 48px for iOS usability
- **Fixed Positioning**: Hamburger button stays on screen
- **Responsive Design**: Media queries for different screen sizes

#### JavaScript (`app.js`)
- **API Integration**: Fetching data from Golf Course API with async/await
- **DOM Manipulation**: Dynamically creating HTML elements
- **Event Listeners**: Responding to clicks, navigation, searches
- **Data Management**: Complex state management for rounds and stats
- **Local Storage**: Saving multiple types of data (rounds, history, stats)
- **Array Methods**: filter(), map(), reduce(), forEach() for data processing
- **Statistics Calculations**: Computing averages, best/worst, vs-par

## How It Works

### 1. Data Structure
The app uses **three localStorage keys** to store different types of data:

**Current Round** (`currentRound`):
```javascript
{
  courseName: "Pebble Beach",
  courseId: 12345,
  courseCity: "Pebble Beach",
  courseState: "CA",
  roundDate: "2025-11-23",
  players: ["Alice", "Bob"],
  currentHole: 5,
  holes: [
    {
      number: 1,
      par: 4,
      yardage: 425,        // NEW: From API
      handicap: 5,         // NEW: From API
      scores: {
        "Alice": { strokes: 5, putts: 2 },
        "Bob": { strokes: 4, putts: 2 }
      }
    }
    // ... 17 more holes
  ]
}
```

**Round History** (`roundHistory`):
```javascript
[
  {
    id: 1732387200000,
    courseName: "Pebble Beach",
    date: "2025-11-23",
    players: ["Alice", "Bob"],
    holes: [...],  // All 18 holes with scores
    savedAt: "2025-11-23T18:30:00Z"
  }
  // ... more past rounds
]
```

**Player Stats** (`playerStats`):
```javascript
{
  "Alice": {
    roundsPlayed: 5,
    totalScore: 450,
    totalVsPar: 90,
    lowestScore: 85,
    highestScore: 95,
    totalPutts: 180,
    courseStats: {
      "Pebble Beach": {
        rounds: 2,
        totalScore: 180,
        lowestScore: 88
      }
    }
  }
}
```

### 2. Golf Course API
The app fetches real course data:
```javascript
// Search for courses
GET https://externalapi.golfgenius.com/v2/courses?name=Pebble

// Get course details
GET https://externalapi.golfgenius.com/v2/courses/12345
```

### 3. Screen Navigation
8 screens with sidebar navigation:
1. Course Search (find golf course)
2. Setup (add players)
3. Score Entry (track scores)
4. Scorecard View (view current round)
5. Course History (all past rounds)
6. Round Detail (view specific past round)
7. Player Stats (all players list)
8. Player Detail (individual player stats)

### 4. Statistics Calculations
- **Average Score**: `totalScore / roundsPlayed`
- **Average vs Par**: `totalVsPar / roundsPlayed`
- **Best Course**: Course with lowest average score
- **Color Coding**: Green (under par), Red (over par)

## ✅ Completed Features

- ✅ Sidebar navigation with hamburger menu
- ✅ Course API integration for automatic par/yardage/handicap
- ✅ Save completed rounds to history
- ✅ View past rounds with detailed scorecards
- ✅ Player statistics and performance tracking
- ✅ Course-specific breakdowns

## 🚀 Future Enhancement Ideas

### Easy Additions
- [ ] Add player profile photos
- [ ] Track fairways hit and greens in regulation
- [ ] Add scoring terminology badges (birdie, eagle, bogey)
- [ ] Export scorecard as image or PDF
- [ ] Dark mode toggle

### Medium Complexity
- [ ] Charts and graphs for performance trends (Chart.js)
- [ ] Score prediction based on history
- [ ] Weather conditions tracking
- [ ] Stroke differential calculations
- [ ] Front 9 vs Back 9 analysis

### Advanced Features
- [ ] GPS hole location tracking
- [ ] Multiplayer sync across devices
- [ ] Official USGA handicap calculations
- [ ] Social sharing of scorecards
- [ ] Compare rounds side-by-side

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

## 📚 Learn More

### Understanding the Code
**👉 See `FEATURES_GUIDE.md` for a complete beginner-friendly guide** that explains:
- How the sidebar navigation works (with code examples)
- How the Golf Course API integration works
- How localStorage saves all your data
- How player statistics are calculated
- Complete explanations of all JavaScript concepts used

### Web Development Resources
Want to learn more about web development?
- **HTML**: [MDN HTML Guide](https://developer.mozilla.org/en-US/docs/Learn/HTML)
- **CSS**: [MDN CSS Guide](https://developer.mozilla.org/en-US/docs/Learn/CSS)
- **JavaScript**: [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Learn/JavaScript)
- **APIs**: [Working with APIs](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Fetching_data)

---

**Enjoy tracking your golf game! ⛳️🏌️**
