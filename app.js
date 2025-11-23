// ===================================
// GOLF SCORE TRACKER APP
// ===================================

// This object will hold all our app's data
let appData = {
    courseName: '',
    roundDate: '',
    players: [],
    currentHole: 1,
    holes: [] // Array to store par and scores for each hole
};

// Initialize holes array with default par values (par 4 for all holes)
function initializeHoles() {
    appData.holes = [];
    for (let i = 1; i <= 18; i++) {
        appData.holes.push({
            number: i,
            par: 4,
            scores: {} // Will hold scores for each player
        });
    }
}

// ===================================
// DOM ELEMENTS - Getting references to HTML elements
// ===================================

// Setup Screen Elements
const setupScreen = document.getElementById('setupScreen');
const courseNameInput = document.getElementById('courseName');
const roundDateInput = document.getElementById('roundDate');
const playersList = document.getElementById('playersList');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const startRoundBtn = document.getElementById('startRoundBtn');

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
const finishRoundBtn = document.getElementById('finishRoundBtn');

// ===================================
// INITIALIZATION
// ===================================

// Set today's date as default
roundDateInput.valueAsDate = new Date();

// ===================================
// SCREEN NAVIGATION
// ===================================

function showScreen(screenToShow) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    // Show the requested screen
    screenToShow.classList.add('active');
}

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

    // Initialize holes with default par values
    initializeHoles();

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
    saveToLocalStorage();
});

// ===================================
// SCORE SCREEN FUNCTIONALITY
// ===================================

// Build score cards for each player
function buildPlayerScoreCards() {
    playersScoreContainer.innerHTML = '';

    appData.players.forEach(playerName => {
        const currentHoleData = appData.holes[appData.currentHole - 1];
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
    saveToLocalStorage();
}

// Calculate total strokes for a player across all holes played so far
function calculatePlayerTotal(playerName) {
    let total = 0;
    for (let i = 0; i < appData.currentHole; i++) {
        total += appData.holes[i].scores[playerName].strokes;
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

// Get formatted display for vs par (e.g., "E" for even, "+2" for over, "-3" for under)
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

// Par button click handlers
document.querySelectorAll('.par-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const newPar = parseInt(btn.dataset.par);
        appData.holes[appData.currentHole - 1].par = newPar;
        updateParButtons();

        // Update all player displays (in case vs par changed)
        appData.players.forEach(playerName => {
            const vsParElement = document.getElementById(`vspar-${playerName}`);
            vsParElement.textContent = getVsParDisplay(playerName);

            const vsParValue = calculateVsPar(playerName);
            vsParElement.className = 'stat-value';
            if (vsParValue < 0) {
                vsParElement.classList.add('under-par');
            } else if (vsParValue > 0) {
                vsParElement.classList.add('over-par');
            }
        });

        // Save to localStorage
        saveToLocalStorage();
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
    let html = '<table class="scorecard-table">';

    // Header row with hole numbers
    html += '<tr><th>Hole</th>';
    for (let i = 1; i <= 18; i++) {
        html += `<th>${i}</th>`;
    }
    html += '<th class="total-col">Total</th><th class="total-col">vs Par</th></tr>';

    // Par row
    html += '<tr><td class="player-name">Par</td>';
    let totalPar = 0;
    appData.holes.forEach(hole => {
        html += `<td>${hole.par}</td>`;
        totalPar += hole.par;
    });
    html += `<td class="total-col">${totalPar}</td><td class="total-col">-</td></tr>`;

    // Player rows
    appData.players.forEach(playerName => {
        html += `<tr><td class="player-name">${playerName}</td>`;
        let playerTotal = 0;

        appData.holes.forEach(hole => {
            const score = hole.scores[playerName].strokes;
            playerTotal += score;

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
        html += `<td class="total-col" style="color: ${vsParColor}; font-weight: bold;">${vsParDisplay}</td>`;
        html += '</tr>';
    });

    html += '</table>';
    scorecardContainer.innerHTML = html;
}

// ===================================
// LOCAL STORAGE
// ===================================

function saveToLocalStorage() {
    localStorage.setItem('golfAppData', JSON.stringify(appData));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('golfAppData');
    if (savedData) {
        appData = JSON.parse(savedData);

        // If there's saved data, offer to continue
        if (appData.courseName && appData.players.length > 0) {
            const continueRound = confirm(`Continue your round at ${appData.courseName}?`);
            if (continueRound) {
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
                showScreen(scoreScreen);
            } else {
                // Reset for new round
                initializeHoles();
            }
        }
    } else {
        initializeHoles();
    }
}

// Back button - confirm before leaving
backBtn.addEventListener('click', () => {
    const confirmLeave = confirm('Return to setup? Your progress will be saved.');
    if (confirmLeave) {
        showScreen(setupScreen);
    }
});

// Finish round
finishRoundBtn.addEventListener('click', () => {
    const confirmFinish = confirm('Finish this round? The scorecard will be cleared.');
    if (confirmFinish) {
        // TODO: In the future, save completed rounds to a history
        localStorage.removeItem('golfAppData');

        // Reset the app
        courseNameInput.value = '';
        roundDateInput.valueAsDate = new Date();
        playersList.innerHTML = '<input type="text" class="player-input" placeholder="Player 1" required>';

        initializeHoles();

        showScreen(setupScreen);

        alert('Round completed! Great game! 🏌️');
    }
});

// ===================================
// APP STARTUP
// ===================================

// Load any saved data when the app starts
loadFromLocalStorage();
