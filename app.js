// ===================================
// GOLF SCORE TRACKER APP - ENHANCED VERSION
// ===================================

// API Configuration for Golf Course API
const GOLF_API_KEY = '274CKOV66N2XQTKWVD4EDPBIYM';
const GOLF_API_BASE = 'https://api.golfcourseapi.com';

// ===================================
// DATA STRUCTURE
// ===================================

// Current round data
let appData = {
    courseName: '',
    courseId: null,
    courseCity: '',
    courseState: '',
    roundDate: '',
    players: [],
    currentHole: 1,
    holes: [], // Array of hole objects with par, yardage, handicap, scores
    tees: [] // Array of all tee boxes with their information
};

// Stored data in localStorage
// - currentRound: The active round (appData)
// - roundHistory: Array of completed rounds
// - playerStats: Object with player statistics

// ===================================
// DOM ELEMENTS
// ===================================

// Sidebar elements
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const navScoreEntry = document.getElementById('navScoreEntry');
const navCourseHistory = document.getElementById('navCourseHistory');
const navPlayerStats = document.getElementById('navPlayerStats');

// Setup Screen Elements
const setupScreen = document.getElementById('setupScreen');
const courseNameInput = document.getElementById('courseName');
const roundDateInput = document.getElementById('roundDate');
const playersList = document.getElementById('playersList');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const startRoundBtn = document.getElementById('startRoundBtn');

// Course Search Screen
const courseSearchScreen = document.getElementById('courseSearchScreen');
const courseSearchInput = document.getElementById('courseSearchInput');
const searchCoursesBtn = document.getElementById('searchCoursesBtn');
const searchResults = document.getElementById('searchResults');
const manualCourseBtn = document.getElementById('manualCourseBtn');

// Score Screen Elements
const scoreScreen = document.getElementById('scoreScreen');
const backBtn = document.getElementById('backBtn');
const courseNameDisplay = document.getElementById('courseNameDisplay');
const roundDateDisplay = document.getElementById('roundDateDisplay');
const prevHoleBtn = document.getElementById('prevHoleBtn');
const nextHoleBtn = document.getElementById('nextHoleBtn');
const currentHoleDisplay = document.getElementById('currentHoleDisplay');
const playersScoreContainer = document.getElementById('playersScoreContainer');
const viewScoresBtn = document.getElementById('viewScoresBtn');

// Scorecard Screen Elements
const scorecardScreen = document.getElementById('scorecardScreen');
const backToScoreBtn = document.getElementById('backToScoreBtn');
const scorecardContainer = document.getElementById('scorecardContainer');
const saveFinishBtn = document.getElementById('saveFinishBtn');

// History Screen
const historyScreen = document.getElementById('historyScreen');
const historyList = document.getElementById('historyList');
const startNewRoundBtn = document.getElementById('startNewRoundBtn');

// Round Detail Screen
const roundDetailScreen = document.getElementById('roundDetailScreen');
const backToHistoryBtn = document.getElementById('backToHistoryBtn');
const detailCourseName = document.getElementById('detailCourseName');
const detailRoundDate = document.getElementById('detailRoundDate');
const detailScorecard = document.getElementById('detailScorecard');

// Player Stats Screen
const statsScreen = document.getElementById('statsScreen');
const playerStatsList = document.getElementById('playerStatsList');

// Player Detail Screen
const playerDetailScreen = document.getElementById('playerDetailScreen');
const backToStatsBtn = document.getElementById('backToStatsBtn');
const playerDetailName = document.getElementById('playerDetailName');
const playerDetailStats = document.getElementById('playerDetailStats');

// ===================================
// INITIALIZATION
// ===================================

// Set today's date as default
roundDateInput.valueAsDate = new Date();

// Initialize holes array with default par values
function initializeHoles() {
    appData.holes = [];
    for (let i = 1; i <= 18; i++) {
        appData.holes.push({
            number: i,
            par: 4,
            yardage: null,
            handicap: null,
            scores: {} // Will hold scores for each player
        });
    }
}

// ===================================
// SIDEBAR NAVIGATION
// ===================================

function openSidebar() {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

hamburgerBtn.addEventListener('click', openSidebar);
closeSidebarBtn.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Navigation handlers
navScoreEntry.addEventListener('click', (e) => {
    e.preventDefault();
    closeSidebar();

    // Check if there's an active round
    const savedRound = localStorage.getItem('currentRound');
    if (savedRound) {
        // Resume the current round
        loadCurrentRound();
        showScreen(scoreScreen);
    } else {
        // Start a new round - show course search
        showScreen(courseSearchScreen);
    }
});

navCourseHistory.addEventListener('click', (e) => {
    e.preventDefault();
    closeSidebar();
    displayHistory();
    showScreen(historyScreen);
});

navPlayerStats.addEventListener('click', (e) => {
    e.preventDefault();
    closeSidebar();
    displayPlayerStats();
    showScreen(statsScreen);
});

// ===================================
// SCREEN NAVIGATION
// ===================================

function showScreen(screenToShow) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    screenToShow.classList.add('active');
}

// ===================================
// GOLF COURSE API INTEGRATION
// ===================================

// Search for golf courses
searchCoursesBtn.addEventListener('click', async () => {
    const query = courseSearchInput.value.trim();

    if (!query) {
        alert('Please enter a course name or city to search');
        return;
    }

    searchResults.innerHTML = '<div class="loading-spinner">🏌️ Searching for courses...</div>';

    try {
        // Use the Golf Course API to search
        const searchUrl = `${GOLF_API_BASE}/v1/search?search_query=${encodeURIComponent(query)}`;
        console.log('🏌️ Searching golf courses at:', searchUrl);
        console.log('🔑 Using authorization:', `Key ${GOLF_API_KEY}`);

        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Key ${GOLF_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Received search data:', data);

        // Check if API returned data in expected format
        let courses = [];
        if (data && data.courses && Array.isArray(data.courses)) {
            console.log('📋 Found courses array with', data.courses.length, 'courses');
            courses = data.courses;
        } else if (Array.isArray(data)) {
            console.log('📋 Data is direct array with', data.length, 'courses');
            courses = data;
        } else {
            console.warn('⚠️ Unexpected API response format:', data);
        }

        displayCourseResults(courses);

    } catch (error) {
        console.error('Error searching courses:', error);
        searchResults.innerHTML = `
            <div class="empty-history">
                <p>⚠️ Unable to search courses</p>
                <p style="font-size: 14px;">Please check your internet connection or try again later.</p>
            </div>
        `;
    }
});

// Display course search results
function displayCourseResults(courses) {
    console.log('📋 Displaying', courses.length, 'course results');

    if (courses.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-history">
                <p>No courses found</p>
                <p style="font-size: 14px;">Try a different search term or enter manually.</p>
            </div>
        `;
        return;
    }

    searchResults.innerHTML = '';

    courses.forEach((course, index) => {
        console.log(`Course ${index + 1}:`, {
            id: course.id,
            club_name: course.club_name,
            course_name: course.course_name,
            location: course.location
        });

        const courseDiv = document.createElement('div');
        courseDiv.className = 'course-result';

        // API returns club_name and course_name
        const displayName = course.club_name && course.course_name
            ? `${course.club_name} - ${course.course_name}`
            : (course.club_name || course.course_name || course.name || 'Unknown Course');

        // Location can be a string or object with city/state properties
        let location = 'Location N/A';
        if (course.location) {
            if (typeof course.location === 'string') {
                location = course.location;
            } else if (course.location.city || course.location.state) {
                const city = course.location.city || '';
                const state = course.location.state || '';
                location = [city, state].filter(Boolean).join(', ');
            }
        }

        courseDiv.innerHTML = `
            <h3>${displayName}</h3>
            <p>📍 ${location}</p>
        `;

        courseDiv.addEventListener('click', () => selectCourse(course));
        searchResults.appendChild(courseDiv);
    });
}

// When a course is selected, fetch its hole details
async function selectCourse(course) {
    console.log('🎯 Selected course:', course);
    searchResults.innerHTML = '<div class="loading-spinner">📊 Loading course details...</div>';

    try {
        // Fetch course details including holes
        const detailUrl = `${GOLF_API_BASE}/v1/courses/${course.id}`;
        console.log('📊 Fetching course details from:', detailUrl);
        console.log('🔑 Using authorization:', `Key ${GOLF_API_KEY}`);

        const response = await fetch(detailUrl, {
            headers: {
                'Authorization': `Key ${GOLF_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            throw new Error(`Failed to fetch course details: ${response.status} ${response.statusText}`);
        }

        const courseDetails = await response.json();
        console.log('✅ Received course details:', courseDetails);
        setupRoundWithCourse(courseDetails, course);

    } catch (error) {
        console.error('❌ Error fetching course details:', error);
        alert('Unable to load course details. You can still enter the course manually.');
        showScreen(setupScreen);
    }
}

// Setup round with course data from API
function setupRoundWithCourse(courseDetails, originalCourse) {
    console.log('⚙️ Setting up round with course details');
    console.log('📊 Full course details:', courseDetails);

    // Use club_name and course_name from API response
    const courseName = courseDetails.club_name && courseDetails.course_name
        ? `${courseDetails.club_name} - ${courseDetails.course_name}`
        : (courseDetails.name || originalCourse.club_name || originalCourse.course_name || 'Unknown Course');

    appData.courseName = courseName;
    appData.courseId = courseDetails.id || originalCourse.id;
    appData.courseCity = courseDetails.city || '';
    appData.courseState = courseDetails.state || '';

    // Initialize holes with default values
    initializeHoles();

    // Extract ALL tee boxes from the API response
    // API structure: courseDetails.tees has "male" and "female" arrays
    if (courseDetails.tees) {
        console.log('🎯 Extracting tee information from API');
        console.log('📊 Full tees object:', JSON.stringify(courseDetails.tees, null, 2));

        // CRITICAL FIX: Extract male and female tees separately
        const maleTees = courseDetails.tees?.male || [];
        const femaleTees = courseDetails.tees?.female || [];
        const allTees = [...maleTees, ...femaleTees];

        console.log('Male tees found:', maleTees.length);
        console.log('Female tees found:', femaleTees.length);
        console.log('Total tees extracted:', allTees.length);

        // Store all tees directly
        appData.tees = allTees.map((tee, index) => {
            console.log(`  Tee ${index + 1}:`, tee.tee_name || tee.name || 'Unnamed', 'with', tee.holes?.length || 0, 'holes');
            return {
                tee_name: tee.tee_name || tee.name || `Tee ${index + 1}`,
                total_yards: tee.total_yards || 0,
                par_total: tee.par_total || 0,
                holes: (tee.holes || []).map((h, holeIdx) => ({
                    hole: h.hole || h.number || (holeIdx + 1),
                    par: h.par,
                    yardage: h.yardage,
                    handicap: h.handicap
                }))
            };
        });

        console.log('Tees stored:', appData.tees.length);

        // Use first tee's holes to populate appData.holes
        if (allTees.length > 0 && allTees[0].holes) {
            console.log('Populating hole data from first tee:', allTees[0].tee_name || allTees[0].name);
            appData.holes.forEach((hole, index) => {
                if (allTees[0].holes[index]) {
                    hole.par = allTees[0].holes[index].par || 4;
                    hole.yardage = allTees[0].holes[index].yardage || null;
                    hole.handicap = allTees[0].holes[index].handicap || null;
                    console.log(`    Hole ${index + 1}: Par ${hole.par}, ${hole.yardage} yards, HCP ${hole.handicap}`);
                }
            });
        }

        console.log('Sample hole after update:', appData.holes[0]);
    } else {
        console.warn('⚠️ No tees data found in API response');
        appData.tees = [];
    }

    console.log('✅ Course setup complete:');
    console.log('  - Course:', appData.courseName);
    console.log('  - Tees stored:', appData.tees.length);
    console.log('  - Sample hole data:', appData.holes[0]);
    console.log('  - Holes configured:', appData.holes.filter(h => h.par !== 4).length, 'non-par-4 holes');

    // Now show setup screen to add players
    courseNameInput.value = appData.courseName;
    courseNameInput.disabled = true; // Course is locked from API
    showScreen(setupScreen);
}

// Manual course entry
manualCourseBtn.addEventListener('click', () => {
    courseNameInput.disabled = false;
    courseNameInput.value = '';
    appData.courseId = null;
    appData.courseCity = '';
    appData.courseState = '';
    showScreen(setupScreen);
});

// ===================================
// SETUP SCREEN FUNCTIONALITY
// ===================================

// Add a new player input field
addPlayerBtn.addEventListener('click', () => {
    const newPlayerInput = document.createElement('input');
    newPlayerInput.type = 'text';
    newPlayerInput.className = 'player-input';
    newPlayerInput.placeholder = `Player ${playersList.children.length + 1}`;
    playersList.appendChild(newPlayerInput);
});

// Start a new round
startRoundBtn.addEventListener('click', () => {
    // Get all player names from input fields
    const playerInputs = document.querySelectorAll('.player-input');
    const players = [];

    playerInputs.forEach(input => {
        if (input.value.trim() !== '') {
            players.push(input.value.trim());
        }
    });

    // Validate inputs
    if (courseNameInput.value.trim() === '') {
        alert('Please enter a course name');
        return;
    }

    if (players.length === 0) {
        alert('Please add at least one player');
        return;
    }

    // Store the round data
    appData.courseName = courseNameInput.value.trim();
    appData.roundDate = roundDateInput.value;
    appData.players = players;
    appData.currentHole = 1;

    // If holes weren't initialized yet (manual entry), initialize them
    if (appData.holes.length === 0) {
        initializeHoles();
    }

    // Initialize scores for each player
    appData.players.forEach(player => {
        appData.holes.forEach(hole => {
            hole.scores[player] = {
                strokes: hole.par, // Default to par
                putts: 2 // Default putts
            };
        });
    });

    // Update the score screen with round info
    courseNameDisplay.textContent = appData.courseName;
    roundDateDisplay.textContent = new Date(appData.roundDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Build the player score cards
    buildPlayerScoreCards();

    // Update hole navigation
    updateHoleNavigation();

    // Show the score screen
    showScreen(scoreScreen);

    // Save to localStorage
    saveCurrentRound();
});

// ===================================
// SCORE SCREEN FUNCTIONALITY
// ===================================

// Build score cards for each player
function buildPlayerScoreCards() {
    playersScoreContainer.innerHTML = '';

    const currentHoleData = appData.holes[appData.currentHole - 1];

    // Display ALL tee information for current hole
    if (appData.tees && appData.tees.length > 0) {
        const teeInfoDiv = document.createElement('div');
        teeInfoDiv.className = 'hole-details';
        teeInfoDiv.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;';

        let teeInfoHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 16px; color: #333;">Hole ${appData.currentHole} - Par ${currentHoleData.par}</h3>
                <button onclick="editHolePar()" style="padding: 6px 12px; background: #4f46e5; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">✏️ Edit Par</button>
            </div>
        `;
        teeInfoHTML += '<h4 style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Course Tee Information:</h4>';
        teeInfoHTML += '<div style="display: grid; gap: 8px; font-size: 14px;">';

        appData.tees.forEach(tee => {
            const holeInfo = tee.holes.find(h => h.hole === appData.currentHole);
            if (holeInfo) {
                teeInfoHTML += `
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 600; color: #4f46e5;">${tee.tee_name}:</span>
                        <span>${holeInfo.yardage} yards <span style="color: #6b7280;">(Handicap ${holeInfo.handicap})</span></span>
                    </div>
                `;
            }
        });

        teeInfoHTML += '</div>';
        teeInfoDiv.innerHTML = teeInfoHTML;
        playersScoreContainer.appendChild(teeInfoDiv);
    } else if (currentHoleData.yardage || currentHoleData.handicap) {
        // Fallback to basic display if no tee data
        const holeInfoDiv = document.createElement('div');
        holeInfoDiv.className = 'hole-details';
        holeInfoDiv.style.cssText = 'background: #f0f0f0; padding: 12px; border-radius: 8px; margin-bottom: 16px; text-align: center;';

        let holeInfoHTML = '';
        if (currentHoleData.yardage) {
            holeInfoHTML += `<span style="margin-right: 16px;">📏 ${currentHoleData.yardage} yards</span>`;
        }
        if (currentHoleData.handicap) {
            holeInfoHTML += `<span>⚡ Handicap ${currentHoleData.handicap}</span>`;
        }

        holeInfoDiv.innerHTML = holeInfoHTML;
        playersScoreContainer.appendChild(holeInfoDiv);
    }

    appData.players.forEach(playerName => {
        const playerScore = currentHoleData.scores[playerName];

        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';

        playerCard.innerHTML = `
            <h3>${playerName}</h3>

            <div class="score-control">
                <label>Strokes</label>
                <div class="score-input">
                    <button class="score-btn" onclick="changeScore('${playerName}', 'strokes', -1)">−</button>
                    <div class="score-value" id="strokes-${playerName}">${playerScore.strokes}</div>
                    <button class="score-btn" onclick="changeScore('${playerName}', 'strokes', 1)">+</button>
                </div>
            </div>

            <div class="score-control">
                <label>Putts</label>
                <div class="score-input">
                    <button class="score-btn" onclick="changeScore('${playerName}', 'putts', -1)">−</button>
                    <div class="score-value" id="putts-${playerName}">${playerScore.putts}</div>
                    <button class="score-btn" onclick="changeScore('${playerName}', 'putts', 1)">+</button>
                </div>
            </div>

            <div class="player-stats">
                <div class="stat">
                    <div class="stat-label">Total Strokes</div>
                    <div class="stat-value" id="total-${playerName}">${calculatePlayerTotal(playerName)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">vs Par</div>
                    <div class="stat-value" id="vspar-${playerName}">${getVsParDisplay(playerName)}</div>
                </div>
            </div>
        `;

        playersScoreContainer.appendChild(playerCard);
    });

    // Update par buttons for current hole
    updateParButtons();
}

// Change a player's score (strokes or putts)
function changeScore(playerName, type, delta) {
    const currentHoleData = appData.holes[appData.currentHole - 1];
    const playerScore = currentHoleData.scores[playerName];

    // Update the score (prevent negative values)
    playerScore[type] = Math.max(0, playerScore[type] + delta);

    // Update the display
    document.getElementById(`${type}-${playerName}`).textContent = playerScore[type];

    // Update total and vs par
    document.getElementById(`total-${playerName}`).textContent = calculatePlayerTotal(playerName);

    const vsParElement = document.getElementById(`vspar-${playerName}`);
    vsParElement.textContent = getVsParDisplay(playerName);

    // Update color based on performance
    const vsParValue = calculateVsPar(playerName);
    vsParElement.className = 'stat-value';
    if (vsParValue < 0) {
        vsParElement.classList.add('under-par');
    } else if (vsParValue > 0) {
        vsParElement.classList.add('over-par');
    }

    // Save to localStorage
    saveCurrentRound();
}

// Calculate total strokes for a player across all holes played so far
function calculatePlayerTotal(playerName) {
    let total = 0;
    for (let i = 0; i < appData.currentHole; i++) {
        total += appData.holes[i].scores[playerName].strokes;
    }
    return total;
}

// Calculate total putts for a player
function calculatePlayerTotalPutts(playerName) {
    let total = 0;
    for (let i = 0; i < 18; i++) {
        if (appData.holes[i].scores[playerName]) {
            total += appData.holes[i].scores[playerName].putts;
        }
    }
    return total;
}

// Calculate how over/under par a player is
function calculateVsPar(playerName) {
    let totalStrokes = 0;
    let totalPar = 0;

    for (let i = 0; i < appData.currentHole; i++) {
        totalStrokes += appData.holes[i].scores[playerName].strokes;
        totalPar += appData.holes[i].par;
    }

    return totalStrokes - totalPar;
}

// Get formatted display for vs par
function getVsParDisplay(playerName) {
    const vsPar = calculateVsPar(playerName);
    if (vsPar === 0) return 'E';
    if (vsPar > 0) return `+${vsPar}`;
    return `${vsPar}`;
}

// Update par buttons for current hole
function updateParButtons() {
    const currentHoleData = appData.holes[appData.currentHole - 1];
    const parButtons = document.querySelectorAll('.par-btn');

    parButtons.forEach(btn => {
        btn.classList.remove('active');
        const parValue = parseInt(btn.dataset.par);
        if (parValue === currentHoleData.par) {
            btn.classList.add('active');
        }
    });
}

// Edit par function for manual override
function editHolePar() {
    const currentHoleData = appData.holes[appData.currentHole - 1];
    const newPar = prompt(`Enter new par for Hole ${appData.currentHole}:`, currentHoleData.par);

    if (newPar !== null && !isNaN(newPar) && newPar >= 3 && newPar <= 6) {
        const parValue = parseInt(newPar);
        appData.holes[appData.currentHole - 1].par = parValue;

        // Rebuild player score cards to reflect the change
        buildPlayerScoreCards();

        // Save to localStorage
        saveCurrentRound();
    } else if (newPar !== null) {
        alert('Please enter a valid par value (3-6)');
    }
}

// Par button click handlers
document.querySelectorAll('.par-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const newPar = parseInt(btn.dataset.par);
        appData.holes[appData.currentHole - 1].par = newPar;
        updateParButtons();

        // Update all player displays (in case vs par changed)
        appData.players.forEach(playerName => {
            const vsParElement = document.getElementById(`vspar-${playerName}`);
            if (vsParElement) {
                vsParElement.textContent = getVsParDisplay(playerName);

                const vsParValue = calculateVsPar(playerName);
                vsParElement.className = 'stat-value';
                if (vsParValue < 0) {
                    vsParElement.classList.add('under-par');
                } else if (vsParValue > 0) {
                    vsParElement.classList.add('over-par');
                }
            }
        });

        // Save to localStorage
        saveCurrentRound();
    });
});

// Hole navigation
function updateHoleNavigation() {
    currentHoleDisplay.textContent = `Hole ${appData.currentHole}`;
    prevHoleBtn.disabled = appData.currentHole === 1;
    nextHoleBtn.disabled = appData.currentHole === 18;
}

prevHoleBtn.addEventListener('click', () => {
    if (appData.currentHole > 1) {
        appData.currentHole--;
        updateHoleNavigation();
        buildPlayerScoreCards();
    }
});

nextHoleBtn.addEventListener('click', () => {
    if (appData.currentHole < 18) {
        appData.currentHole++;
        updateHoleNavigation();
        buildPlayerScoreCards();
    }
});

// ===================================
// SCORECARD SCREEN
// ===================================

viewScoresBtn.addEventListener('click', () => {
    generateScorecard();
    showScreen(scorecardScreen);
});

backToScoreBtn.addEventListener('click', () => {
    showScreen(scoreScreen);
});

function generateScorecard() {
    let html = '';

    // Display all tee information first if available
    if (appData.tees && appData.tees.length > 0) {
        html += '<div style="margin-bottom: 24px;">';
        html += '<h3 style="margin-bottom: 12px; color: #333;">Course Tee Information</h3>';
        html += '<div style="overflow-x: auto;">';
        html += '<table class="scorecard-table" style="margin-bottom: 0;">';

        // Header row with hole numbers
        html += '<tr><th>Tee</th>';
        for (let i = 1; i <= 18; i++) {
            html += `<th>${i}</th>`;
        }
        html += '<th class="total-col">Total</th></tr>';

        // Row for each tee
        appData.tees.forEach(tee => {
            html += `<tr><td class="player-name" style="background: #4f46e5; color: white;">${tee.tee_name}</td>`;
            let totalYardage = 0;

            for (let holeNum = 1; holeNum <= 18; holeNum++) {
                const holeInfo = tee.holes.find(h => h.hole === holeNum);
                if (holeInfo) {
                    html += `<td title="Par ${holeInfo.par}, HCP ${holeInfo.handicap}">${holeInfo.yardage}</td>`;
                    totalYardage += holeInfo.yardage || 0;
                } else {
                    html += '<td>-</td>';
                }
            }

            html += `<td class="total-col" style="font-weight: bold;">${totalYardage}</td>`;
            html += '</tr>';
        });

        html += '</table>';
        html += '</div>';
        html += '</div>';
    }

    // Player scores table
    html += '<h3 style="margin-bottom: 12px; color: #333;">Player Scores</h3>';
    html += '<div style="overflow-x: auto;">';
    html += '<table class="scorecard-table">';

    // Header row with hole numbers
    html += '<tr><th>Hole</th>';
    for (let i = 1; i <= 18; i++) {
        html += `<th>${i}</th>`;
    }
    html += '<th class="total-col">Total</th><th class="total-col">Putts</th><th class="total-col">vs Par</th></tr>';

    // Par row
    html += '<tr><td class="player-name">Par</td>';
    let totalPar = 0;
    appData.holes.forEach(hole => {
        html += `<td>${hole.par}</td>`;
        totalPar += hole.par;
    });
    html += `<td class="total-col">${totalPar}</td><td class="total-col">-</td><td class="total-col">-</td></tr>`;

    // Player rows
    appData.players.forEach(playerName => {
        html += `<tr><td class="player-name">${playerName}</td>`;
        let playerTotal = 0;
        let playerTotalPutts = 0;

        appData.holes.forEach(hole => {
            const score = hole.scores[playerName].strokes;
            const putts = hole.scores[playerName].putts;
            playerTotal += score;
            playerTotalPutts += putts;

            // Color code the score based on par
            let cellClass = '';
            if (score < hole.par) cellClass = 'style="color: #22c55e; font-weight: bold;"';
            else if (score > hole.par) cellClass = 'style="color: #ef4444; font-weight: bold;"';

            html += `<td ${cellClass}>${score}</td>`;
        });

        const vsPar = playerTotal - totalPar;
        const vsParDisplay = vsPar === 0 ? 'E' : (vsPar > 0 ? `+${vsPar}` : `${vsPar}`);
        const vsParColor = vsPar < 0 ? '#22c55e' : (vsPar > 0 ? '#ef4444' : '#333');

        html += `<td class="total-col">${playerTotal}</td>`;
        html += `<td class="total-col">${playerTotalPutts}</td>`;
        html += `<td class="total-col" style="color: ${vsParColor}; font-weight: bold;">${vsParDisplay}</td>`;
        html += '</tr>';
    });

    html += '</table>';
    html += '</div>';
    scorecardContainer.innerHTML = html;
}

// ===================================
// SAVE & FINISH ROUND
// ===================================

saveFinishBtn.addEventListener('click', () => {
    const confirmFinish = confirm('Save and finish this round?');
    if (confirmFinish) {
        saveRoundToHistory();

        // Reset the app for new round
        courseNameInput.value = '';
        courseNameInput.disabled = false;
        roundDateInput.valueAsDate = new Date();
        playersList.innerHTML = '<input type="text" class="player-input" placeholder="Player 1" required>';

        appData = {
            courseName: '',
            courseId: null,
            courseCity: '',
            courseState: '',
            roundDate: '',
            players: [],
            currentHole: 1,
            holes: [],
            tees: []
        };

        localStorage.removeItem('currentRound');

        // Show history screen
        displayHistory();
        showScreen(historyScreen);

        alert('Round saved! Great game! 🏌️');
    }
});

// ===================================
// ROUND HISTORY
// ===================================

function saveRoundToHistory() {
    // Get existing history
    const history = JSON.parse(localStorage.getItem('roundHistory') || '[]');

    // Check if we're editing an existing round
    if (appData.editingRoundId) {
        console.log('💾 Updating existing round:', appData.editingRoundId);

        // Find and update the existing round
        const roundIndex = history.findIndex(r => r.id === appData.editingRoundId);
        if (roundIndex !== -1) {
            // Update the round data while keeping the original ID and savedAt
            history[roundIndex] = {
                id: appData.editingRoundId,
                courseName: appData.courseName,
                courseCity: appData.courseCity,
                courseState: appData.courseState,
                date: appData.roundDate,
                players: appData.players,
                holes: appData.holes,
                tees: appData.tees || [],
                savedAt: history[roundIndex].savedAt, // Keep original save time
                updatedAt: new Date().toISOString()
            };

            // Save updated history
            localStorage.setItem('roundHistory', JSON.stringify(history));

            // Recalculate ALL player statistics from scratch
            recalculateAllPlayerStats(history);

            console.log('✅ Round updated successfully');
        } else {
            console.error('❌ Could not find round to update');
        }

        // Clear the editing flag
        delete appData.editingRoundId;
    } else {
        console.log('💾 Saving new round to history');

        // Add new round to history
        const roundData = {
            id: Date.now(), // Unique ID for this round
            courseName: appData.courseName,
            courseCity: appData.courseCity,
            courseState: appData.courseState,
            date: appData.roundDate,
            players: appData.players,
            holes: appData.holes,
            tees: appData.tees || [],
            savedAt: new Date().toISOString()
        };

        history.unshift(roundData); // Add to beginning (newest first)

        // Save to localStorage
        localStorage.setItem('roundHistory', JSON.stringify(history));

        // Update player statistics
        updatePlayerStatistics(roundData);

        console.log('✅ New round saved successfully');
    }
}

function displayHistory() {
    const history = JSON.parse(localStorage.getItem('roundHistory') || '[]');

    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <p>📊 No rounds played yet</p>
                <p style="font-size: 14px;">Start your first round to begin tracking your golf history!</p>
            </div>
        `;
        return;
    }

    // Sort by date descending (most recent first)
    const sortedHistory = [...history].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Descending order
    });

    console.log('📊 Displaying', sortedHistory.length, 'rounds sorted by date (newest first)');

    historyList.innerHTML = '';

    sortedHistory.forEach(round => {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'history-item';

        const roundDate = new Date(round.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let playersHTML = '<div class="history-players">';
        let totalPar = round.holes.reduce((sum, hole) => sum + hole.par, 0);

        round.players.forEach(playerName => {
            let playerTotal = 0;
            round.holes.forEach(hole => {
                playerTotal += hole.scores[playerName].strokes;
            });
            const vsPar = playerTotal - totalPar;
            const vsParDisplay = vsPar === 0 ? 'E' : (vsPar > 0 ? `+${vsPar}` : `${vsPar}`);

            playersHTML += `
                <div class="player-score-badge">
                    <span class="player-name">${playerName}:</span>
                    <span class="score">${playerTotal} (${vsParDisplay})</span>
                </div>
            `;
        });
        playersHTML += '</div>';

        roundDiv.innerHTML = `
            <h3>${round.courseName}</h3>
            <div class="history-date">📅 ${roundDate}</div>
            ${playersHTML}
        `;

        roundDiv.addEventListener('click', () => showRoundDetail(round));
        historyList.appendChild(roundDiv);
    });
}

function showRoundDetail(round) {
    detailCourseName.textContent = round.courseName;
    detailRoundDate.textContent = new Date(round.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Generate detailed scorecard
    let html = '';

    // Display all tee information first if available
    if (round.tees && round.tees.length > 0) {
        html += '<div style="margin-bottom: 24px;">';
        html += '<h3 style="margin-bottom: 12px; color: #333;">Course Tee Information</h3>';
        html += '<div style="overflow-x: auto;">';
        html += '<table class="scorecard-table" style="margin-bottom: 0;">';

        // Header row with hole numbers
        html += '<tr><th>Tee</th>';
        for (let i = 1; i <= 18; i++) {
            html += `<th>${i}</th>`;
        }
        html += '<th class="total-col">Total</th></tr>';

        // Row for each tee
        round.tees.forEach(tee => {
            html += `<tr><td class="player-name" style="background: #4f46e5; color: white;">${tee.tee_name}</td>`;
            let totalYardage = 0;

            for (let holeNum = 1; holeNum <= 18; holeNum++) {
                const holeInfo = tee.holes.find(h => h.hole === holeNum);
                if (holeInfo) {
                    html += `<td title="Par ${holeInfo.par}, HCP ${holeInfo.handicap}">${holeInfo.yardage}</td>`;
                    totalYardage += holeInfo.yardage || 0;
                } else {
                    html += '<td>-</td>';
                }
            }

            html += `<td class="total-col" style="font-weight: bold;">${totalYardage}</td>`;
            html += '</tr>';
        });

        html += '</table>';
        html += '</div>';
        html += '</div>';
    }

    // Player scores table
    html += '<h3 style="margin-bottom: 12px; color: #333;">Player Scores</h3>';
    html += '<div style="overflow-x: auto;">';
    html += '<table class="scorecard-table">';

    // Header
    html += '<tr><th>Hole</th>';
    for (let i = 1; i <= 18; i++) {
        html += `<th>${i}</th>`;
    }
    html += '<th class="total-col">Total</th><th class="total-col">Putts</th><th class="total-col">vs Par</th></tr>';

    // Par row
    html += '<tr><td class="player-name">Par</td>';
    let totalPar = 0;
    round.holes.forEach(hole => {
        html += `<td>${hole.par}</td>`;
        totalPar += hole.par;
    });
    html += `<td class="total-col">${totalPar}</td><td class="total-col">-</td><td class="total-col">-</td></tr>`;

    // Player rows
    round.players.forEach(playerName => {
        html += `<tr><td class="player-name">${playerName}</td>`;
        let playerTotal = 0;
        let playerTotalPutts = 0;

        round.holes.forEach(hole => {
            const score = hole.scores[playerName].strokes;
            const putts = hole.scores[playerName].putts;
            playerTotal += score;
            playerTotalPutts += putts;

            let cellClass = '';
            if (score < hole.par) cellClass = 'style="color: #22c55e; font-weight: bold;"';
            else if (score > hole.par) cellClass = 'style="color: #ef4444; font-weight: bold;"';

            html += `<td ${cellClass}>${score}</td>`;
        });

        const vsPar = playerTotal - totalPar;
        const vsParDisplay = vsPar === 0 ? 'E' : (vsPar > 0 ? `+${vsPar}` : `${vsPar}`);
        const vsParColor = vsPar < 0 ? '#22c55e' : (vsPar > 0 ? '#ef4444' : '#333');

        html += `<td class="total-col">${playerTotal}</td>`;
        html += `<td class="total-col">${playerTotalPutts}</td>`;
        html += `<td class="total-col" style="color: ${vsParColor}; font-weight: bold;">${vsParDisplay}</td>`;
        html += '</tr>';
    });

    html += '</table>';
    html += '</div>';

    // Add Edit and Delete buttons
    html += `
        <div class="action-buttons" style="margin-top: 20px;">
            <button class="btn-primary" onclick="editRound(${round.id})">✏️ Edit Round</button>
            <button class="btn-secondary" onclick="deleteRound(${round.id})" style="border-color: #ef4444; color: #ef4444;">🗑️ Delete Round</button>
        </div>
    `;

    detailScorecard.innerHTML = html;

    showScreen(roundDetailScreen);
}

backToHistoryBtn.addEventListener('click', () => {
    displayHistory();
    showScreen(historyScreen);
});

startNewRoundBtn.addEventListener('click', () => {
    showScreen(courseSearchScreen);
});

// ===================================
// PLAYER STATISTICS
// ===================================

function updatePlayerStatistics(round) {
    const stats = JSON.parse(localStorage.getItem('playerStats') || '{}');

    let totalPar = round.holes.reduce((sum, hole) => sum + hole.par, 0);

    round.players.forEach(playerName => {
        if (!stats[playerName]) {
            stats[playerName] = {
                roundsPlayed: 0,
                totalScore: 0,
                totalVsPar: 0,
                lowestScore: Infinity,
                highestScore: -Infinity,
                totalPutts: 0,
                courseStats: {} // Track stats by course
            };
        }

        // Calculate this round's stats
        let playerTotal = 0;
        let playerPutts = 0;
        round.holes.forEach(hole => {
            playerTotal += hole.scores[playerName].strokes;
            playerPutts += hole.scores[playerName].putts;
        });

        const vsPar = playerTotal - totalPar;

        // Update player stats
        stats[playerName].roundsPlayed++;
        stats[playerName].totalScore += playerTotal;
        stats[playerName].totalVsPar += vsPar;
        stats[playerName].lowestScore = Math.min(stats[playerName].lowestScore, playerTotal);
        stats[playerName].highestScore = Math.max(stats[playerName].highestScore, playerTotal);
        stats[playerName].totalPutts += playerPutts;

        // Update course-specific stats
        const courseName = round.courseName;
        if (!stats[playerName].courseStats[courseName]) {
            stats[playerName].courseStats[courseName] = {
                rounds: 0,
                totalScore: 0,
                lowestScore: Infinity
            };
        }
        stats[playerName].courseStats[courseName].rounds++;
        stats[playerName].courseStats[courseName].totalScore += playerTotal;
        stats[playerName].courseStats[courseName].lowestScore = Math.min(
            stats[playerName].courseStats[courseName].lowestScore,
            playerTotal
        );
    });

    localStorage.setItem('playerStats', JSON.stringify(stats));
}

function displayPlayerStats() {
    const stats = JSON.parse(localStorage.getItem('playerStats') || '{}');
    const playerNames = Object.keys(stats);

    if (playerNames.length === 0) {
        playerStatsList.innerHTML = `
            <div class="empty-history">
                <p>👤 No player statistics yet</p>
                <p style="font-size: 14px;">Play some rounds to start tracking your stats!</p>
            </div>
        `;
        return;
    }

    playerStatsList.innerHTML = '';

    playerNames.forEach(playerName => {
        const playerStats = stats[playerName];
        const avgScore = (playerStats.totalScore / playerStats.roundsPlayed).toFixed(1);
        const avgVsPar = (playerStats.totalVsPar / playerStats.roundsPlayed).toFixed(1);
        const avgPutts = (playerStats.totalPutts / playerStats.roundsPlayed).toFixed(1);

        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-stats-item';

        playerDiv.innerHTML = `
            <h3>${playerName}</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-label">Rounds Played</div>
                    <div class="stat-value">${playerStats.roundsPlayed}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Avg Score</div>
                    <div class="stat-value">${avgScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Avg vs Par</div>
                    <div class="stat-value ${parseFloat(avgVsPar) < 0 ? 'positive' : 'negative'}">${avgVsPar > 0 ? '+' : ''}${avgVsPar}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Best Round</div>
                    <div class="stat-value positive">${playerStats.lowestScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Worst Round</div>
                    <div class="stat-value negative">${playerStats.highestScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Avg Putts</div>
                    <div class="stat-value">${avgPutts}</div>
                </div>
            </div>
        `;

        playerDiv.addEventListener('click', () => showPlayerDetail(playerName, playerStats));
        playerStatsList.appendChild(playerDiv);
    });
}

function showPlayerDetail(playerName, playerStats) {
    playerDetailName.textContent = playerName;

    const avgScore = (playerStats.totalScore / playerStats.roundsPlayed).toFixed(1);
    const avgVsPar = (playerStats.totalVsPar / playerStats.roundsPlayed).toFixed(1);
    const avgPutts = (playerStats.totalPutts / playerStats.roundsPlayed).toFixed(1);

    let html = `
        <div class="stats-section">
            <h3>📊 Overall Statistics</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-label">Total Rounds</div>
                    <div class="stat-value">${playerStats.roundsPlayed}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Average Score</div>
                    <div class="stat-value">${avgScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Average vs Par</div>
                    <div class="stat-value ${parseFloat(avgVsPar) < 0 ? 'positive' : 'negative'}">${avgVsPar > 0 ? '+' : ''}${avgVsPar}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Best Round</div>
                    <div class="stat-value positive">${playerStats.lowestScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Worst Round</div>
                    <div class="stat-value negative">${playerStats.highestScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Average Putts/Round</div>
                    <div class="stat-value">${avgPutts}</div>
                </div>
            </div>
        </div>
    `;

    // Find best course
    const courseNames = Object.keys(playerStats.courseStats);
    if (courseNames.length > 0) {
        html += `
            <div class="stats-section">
                <h3>🏌️ Performance by Course</h3>
        `;

        courseNames.forEach(courseName => {
            const courseData = playerStats.courseStats[courseName];
            const courseAvg = (courseData.totalScore / courseData.rounds).toFixed(1);

            html += `
                <div class="course-breakdown">
                    <h4>${courseName}</h4>
                    <p>Rounds played: ${courseData.rounds}</p>
                    <p>Average score: ${courseAvg}</p>
                    <p>Best score: ${courseData.lowestScore}</p>
                </div>
            `;
        });

        html += '</div>';
    }

    playerDetailStats.innerHTML = html;
    showScreen(playerDetailScreen);
}

backToStatsBtn.addEventListener('click', () => {
    displayPlayerStats();
    showScreen(statsScreen);
});

// ===================================
// EDIT AND DELETE ROUNDS
// ===================================

// Edit an existing round
function editRound(roundId) {
    console.log('✏️ Editing round:', roundId);

    // Find the round in history
    const history = JSON.parse(localStorage.getItem('roundHistory') || '[]');
    const round = history.find(r => r.id === roundId);

    if (!round) {
        alert('Round not found!');
        return;
    }

    // Confirm edit
    if (!confirm('Edit this round? You can modify scores for all players.')) {
        return;
    }

    // Load the round data into appData
    appData = {
        courseName: round.courseName,
        courseId: round.courseId || null,
        courseCity: round.courseCity || '',
        courseState: round.courseState || '',
        roundDate: round.date,
        players: [...round.players],
        currentHole: 1,
        holes: JSON.parse(JSON.stringify(round.holes)), // Deep copy
        tees: JSON.parse(JSON.stringify(round.tees || [])) // Deep copy
    };

    // Mark this as an edit by storing the original round ID
    appData.editingRoundId = roundId;

    // Update the score screen with round info
    courseNameDisplay.textContent = appData.courseName;
    roundDateDisplay.textContent = new Date(appData.roundDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Build the player score cards
    buildPlayerScoreCards();

    // Update hole navigation
    updateHoleNavigation();

    // Save to localStorage as current round
    saveCurrentRound();

    // Show the score screen
    showScreen(scoreScreen);
}

// Delete a round
function deleteRound(roundId) {
    console.log('🗑️ Deleting round:', roundId);

    // Find the round in history
    const history = JSON.parse(localStorage.getItem('roundHistory') || '[]');
    const round = history.find(r => r.id === roundId);

    if (!round) {
        alert('Round not found!');
        return;
    }

    // Confirm deletion
    const courseName = round.courseName;
    const roundDate = new Date(round.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (!confirm(`Delete this round?\n\n${courseName}\n${roundDate}\n\nThis action cannot be undone.`)) {
        return;
    }

    // Remove the round from history
    const updatedHistory = history.filter(r => r.id !== roundId);
    localStorage.setItem('roundHistory', JSON.stringify(updatedHistory));

    console.log('✅ Round deleted. Recalculating player statistics...');

    // Recalculate ALL player statistics from scratch
    recalculateAllPlayerStats(updatedHistory);

    // Show success message and return to history
    alert('Round deleted successfully!');
    displayHistory();
    showScreen(historyScreen);
}

// Recalculate all player statistics from round history
function recalculateAllPlayerStats(history) {
    console.log('🔄 Recalculating player stats from', history.length, 'rounds');

    const stats = {};

    history.forEach(round => {
        const totalPar = round.holes.reduce((sum, hole) => sum + hole.par, 0);

        round.players.forEach(playerName => {
            if (!stats[playerName]) {
                stats[playerName] = {
                    roundsPlayed: 0,
                    totalScore: 0,
                    totalVsPar: 0,
                    lowestScore: Infinity,
                    highestScore: -Infinity,
                    totalPutts: 0,
                    courseStats: {}
                };
            }

            // Calculate this round's stats
            let playerTotal = 0;
            let playerPutts = 0;
            round.holes.forEach(hole => {
                playerTotal += hole.scores[playerName].strokes;
                playerPutts += hole.scores[playerName].putts;
            });

            const vsPar = playerTotal - totalPar;

            // Update player stats
            stats[playerName].roundsPlayed++;
            stats[playerName].totalScore += playerTotal;
            stats[playerName].totalVsPar += vsPar;
            stats[playerName].lowestScore = Math.min(stats[playerName].lowestScore, playerTotal);
            stats[playerName].highestScore = Math.max(stats[playerName].highestScore, playerTotal);
            stats[playerName].totalPutts += playerPutts;

            // Update course-specific stats
            const courseName = round.courseName;
            if (!stats[playerName].courseStats[courseName]) {
                stats[playerName].courseStats[courseName] = {
                    rounds: 0,
                    totalScore: 0,
                    lowestScore: Infinity
                };
            }
            stats[playerName].courseStats[courseName].rounds++;
            stats[playerName].courseStats[courseName].totalScore += playerTotal;
            stats[playerName].courseStats[courseName].lowestScore = Math.min(
                stats[playerName].courseStats[courseName].lowestScore,
                playerTotal
            );
        });
    });

    localStorage.setItem('playerStats', JSON.stringify(stats));
    console.log('✅ Player stats recalculated for', Object.keys(stats).length, 'players');
}

// ===================================
// LOCAL STORAGE
// ===================================

function saveCurrentRound() {
    localStorage.setItem('currentRound', JSON.stringify(appData));
}

function loadCurrentRound() {
    const savedData = localStorage.getItem('currentRound');
    if (savedData) {
        appData = JSON.parse(savedData);

        // Restore the score screen
        courseNameDisplay.textContent = appData.courseName;
        roundDateDisplay.textContent = new Date(appData.roundDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        buildPlayerScoreCards();
        updateHoleNavigation();
    }
}

// Back button - confirm before leaving
backBtn.addEventListener('click', () => {
    const confirmLeave = confirm('Return to main menu? Your progress will be saved.');
    if (confirmLeave) {
        showScreen(courseSearchScreen);
    }
});

// ===================================
// APP STARTUP
// ===================================

// Check if there's a current round in progress
const savedRound = localStorage.getItem('currentRound');
if (savedRound) {
    const continueRound = confirm('You have a round in progress. Continue?');
    if (continueRound) {
        loadCurrentRound();
        showScreen(scoreScreen);
    } else {
        // Show course search for new round
        showScreen(courseSearchScreen);
    }
} else {
    // No round in progress - show course search
    showScreen(courseSearchScreen);
}
