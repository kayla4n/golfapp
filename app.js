// ===================================
// GOLF SCORE TRACKER APP - ENHANCED VERSION
// ===================================

// API Configuration for Golf Course API
const GOLF_API_KEY = '274CKOV66N2XQTKWVD4EDPBIYM';
const GOLF_API_BASE = 'https://api.golfcourseapi.com';

// ===================================
// SUPABASE CONFIGURATION
// ===================================

const SUPABASE_URL = 'https://yptsoezkkjixhephjlfi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdHNvZXpra2ppeGhlcGhqbGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMjYwMzgsImV4cCI6MjA3OTgwMjAzOH0.tCJBCjf2KVMvLbxCaEtU70nDFHQeKeZR6VrSXWDYjHI';

// Initialize Supabase client
let supabase = null;
let currentUserId = null;

// Sync state management
let syncState = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    isAuthenticated: false
};

// ===================================
// SUPABASE AUTHENTICATION
// ===================================

async function initSupabase() {
    try {
        console.log('🔧 Initializing Supabase client...');
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        updateSyncStatus('error', 'Failed to initialize cloud sync');
        return false;
    }
}

async function initAuth() {
    try {
        console.log('🔐 Initializing authentication...');
        updateSyncStatus('syncing', 'Connecting to cloud...');

        // Check if user is already signed in
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('❌ Session error:', sessionError);
            throw sessionError;
        }

        if (!session) {
            console.log('🆕 No existing session, signing in anonymously...');
            // Sign in anonymously (creates a persistent user)
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) {
                console.error('❌ Anonymous auth error:', error);
                throw error;
            }
            console.log('✅ Signed in anonymously:', data.user.id);
            currentUserId = data.user.id;
        } else {
            console.log('✅ Already signed in:', session.user.id);
            currentUserId = session.user.id;
        }

        syncState.isAuthenticated = true;
        updateSyncStatus('synced', 'Connected to cloud');
        updateCloudSyncUI();

        // Check for local data to migrate
        checkForLocalDataMigration();

        // Load rounds from cloud
        await loadRoundsFromCloud();

        return currentUserId;
    } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        syncState.isAuthenticated = false;
        updateSyncStatus('error', 'Authentication failed');
        updateCloudSyncUI();
        return null;
    }
}

// ===================================
// CLOUD SYNC FUNCTIONS
// ===================================

function updateSyncStatus(status, message) {
    console.log(`📡 Sync status: ${status} - ${message}`);

    const syncIcon = document.getElementById('syncStatusIndicator')?.querySelector('.sync-icon');
    const syncText = document.getElementById('syncStatusIndicator')?.querySelector('.sync-text');
    const syncIconLarge = document.getElementById('syncIconLarge');
    const syncStatusText = document.getElementById('syncStatusText');

    let icon, color;
    switch(status) {
        case 'synced':
            icon = '☁️';
            color = '#4CAF50';
            break;
        case 'syncing':
            icon = '📡';
            color = '#2196F3';
            break;
        case 'offline':
            icon = '⚠️';
            color = '#FF9800';
            break;
        case 'error':
            icon = '❌';
            color = '#F44336';
            break;
        default:
            icon = '⏳';
            color = '#999';
    }

    if (syncIcon) syncIcon.textContent = icon;
    if (syncText) syncText.textContent = message;
    if (syncIconLarge) syncIconLarge.textContent = icon;
    if (syncStatusText) {
        syncStatusText.textContent = message;
        syncStatusText.style.color = color;
    }

    syncState.isSyncing = (status === 'syncing');
}

function updateCloudSyncUI() {
    const userIdDisplay = document.getElementById('userIdDisplay');
    const lastSyncDisplay = document.getElementById('lastSyncDisplay');
    const lastSyncTime = document.getElementById('lastSyncTime');
    const cloudRoundsCount = document.getElementById('cloudRoundsCount');

    if (userIdDisplay && currentUserId) {
        userIdDisplay.textContent = currentUserId.substring(0, 8) + '...';
    }

    if (syncState.lastSyncTime) {
        const timeAgo = getTimeAgo(syncState.lastSyncTime);
        if (lastSyncDisplay) lastSyncDisplay.textContent = timeAgo;
        if (lastSyncTime) lastSyncTime.textContent = timeAgo;
    }

    // Update cloud rounds count
    if (cloudRoundsCount) {
        const history = JSON.parse(localStorage.getItem('roundHistory') || '[]');
        cloudRoundsCount.textContent = history.length;
    }
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

async function saveRoundToCloud(roundData) {
    if (!currentUserId || !supabase) {
        console.log('⚠️ Not authenticated or Supabase not initialized, skipping cloud sync');
        return null;
    }

    if (!syncState.isOnline) {
        console.log('⚠️ Offline, will sync when back online');
        syncState.pendingChanges++;
        return null;
    }

    try {
        console.log('☁️ Saving round to cloud:', roundData);
        updateSyncStatus('syncing', 'Saving to cloud...');

        const cloudRoundData = {
            user_id: currentUserId,
            course_name: roundData.courseName,
            course_id: roundData.courseId || null,
            round_date: roundData.date,
            players: roundData.players,
            holes: roundData.holes,
            tees: roundData.tees || [],
            saved_at: new Date().toISOString()
        };

        // Check if this round already exists in cloud (by checking if it has a supabaseId)
        if (roundData.supabaseId) {
            console.log('🔄 Updating existing round in cloud:', roundData.supabaseId);
            const { data, error } = await supabase
                .from('rounds')
                .update({
                    ...cloudRoundData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', roundData.supabaseId)
                .eq('user_id', currentUserId)
                .select();

            if (error) throw error;
            console.log('✅ Round updated in cloud:', data);
            syncState.lastSyncTime = Date.now();
            updateSyncStatus('synced', 'Synced to cloud');
            updateCloudSyncUI();
            return data[0];
        } else {
            console.log('➕ Inserting new round to cloud');
            const { data, error } = await supabase
                .from('rounds')
                .insert([cloudRoundData])
                .select();

            if (error) throw error;
            console.log('✅ Round saved to cloud:', data[0].id);
            syncState.lastSyncTime = Date.now();
            updateSyncStatus('synced', 'Synced to cloud');
            updateCloudSyncUI();
            return data[0];
        }
    } catch (error) {
        console.error('❌ Failed to save round to cloud:', error);
        updateSyncStatus('error', 'Sync failed');
        syncState.pendingChanges++;
        return null;
    }
}

async function loadRoundsFromCloud() {
    if (!currentUserId || !supabase) {
        console.log('⚠️ Not authenticated, skipping cloud load');
        return [];
    }

    try {
        console.log('📥 Loading rounds from cloud...');
        updateSyncStatus('syncing', 'Loading from cloud...');

        const { data, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('user_id', currentUserId)
            .order('round_date', { ascending: false });

        if (error) throw error;

        console.log(`✅ Loaded ${data.length} rounds from cloud`);

        // Merge cloud data with local data
        mergeCloudDataWithLocal(data);

        syncState.lastSyncTime = Date.now();
        updateSyncStatus('synced', 'Synced');
        updateCloudSyncUI();

        return data;
    } catch (error) {
        console.error('❌ Failed to load rounds from cloud:', error);
        updateSyncStatus('error', 'Failed to load from cloud');
        return [];
    }
}

function mergeCloudDataWithLocal(cloudRounds) {
    console.log('🔄 Merging cloud data with local data...');

    const localHistory = JSON.parse(localStorage.getItem('roundHistory') || '[]');
    const mergedRounds = [];
    const cloudRoundMap = new Map();

    // Create a map of cloud rounds by their ID
    cloudRounds.forEach(cloudRound => {
        const localRound = {
            id: cloudRound.id, // Use Supabase UUID as id
            supabaseId: cloudRound.id, // Store Supabase ID
            courseName: cloudRound.course_name,
            courseCity: '', // Not stored in cloud
            courseState: '', // Not stored in cloud
            date: cloudRound.round_date,
            players: cloudRound.players,
            holes: cloudRound.holes,
            tees: cloudRound.tees || [],
            savedAt: cloudRound.saved_at,
            updatedAt: cloudRound.updated_at
        };
        cloudRoundMap.set(cloudRound.id, localRound);
        mergedRounds.push(localRound);
    });

    // Add any local rounds that don't exist in cloud yet
    localHistory.forEach(localRound => {
        if (!localRound.supabaseId || !cloudRoundMap.has(localRound.supabaseId)) {
            mergedRounds.push(localRound);
        }
    });

    // Sort by date (newest first)
    mergedRounds.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Save merged data back to localStorage
    localStorage.setItem('roundHistory', JSON.stringify(mergedRounds));

    console.log(`✅ Merged data: ${mergedRounds.length} total rounds`);
}

async function deleteRoundFromCloud(supabaseId) {
    if (!currentUserId || !supabase || !supabaseId) {
        console.log('⚠️ Cannot delete from cloud, missing data');
        return false;
    }

    try {
        console.log('🗑️ Deleting round from cloud:', supabaseId);
        updateSyncStatus('syncing', 'Deleting from cloud...');

        const { error } = await supabase
            .from('rounds')
            .delete()
            .eq('id', supabaseId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        console.log('✅ Round deleted from cloud');
        syncState.lastSyncTime = Date.now();
        updateSyncStatus('synced', 'Synced');
        updateCloudSyncUI();
        return true;
    } catch (error) {
        console.error('❌ Failed to delete round from cloud:', error);
        updateSyncStatus('error', 'Delete failed');
        return false;
    }
}

function checkForLocalDataMigration() {
    const localHistory = JSON.parse(localStorage.getItem('roundHistory') || '[]');
    const unmigrated = localHistory.filter(round => !round.supabaseId);

    if (unmigrated.length > 0) {
        console.log(`📦 Found ${unmigrated.length} local rounds to migrate`);

        // Show migration prompt after a short delay
        setTimeout(() => {
            if (confirm(`Found ${unmigrated.length} rounds in local storage. Upload to cloud?`)) {
                migrateLocalDataToCloud();
            }
        }, 2000);
    }
}

async function migrateLocalDataToCloud() {
    const localHistory = JSON.parse(localStorage.getItem('roundHistory') || '[]');
    const unmigrated = localHistory.filter(round => !round.supabaseId);

    if (unmigrated.length === 0) {
        alert('No local data to migrate!');
        return;
    }

    console.log(`📤 Migrating ${unmigrated.length} rounds to cloud...`);
    updateSyncStatus('syncing', `Uploading ${unmigrated.length} rounds...`);

    let successCount = 0;
    let failCount = 0;

    for (const round of unmigrated) {
        const cloudData = await saveRoundToCloud(round);
        if (cloudData) {
            // Update local round with Supabase ID
            round.supabaseId = cloudData.id;
            successCount++;
        } else {
            failCount++;
        }
    }

    // Save updated local history
    localStorage.setItem('roundHistory', JSON.stringify(localHistory));

    console.log(`✅ Migration complete: ${successCount} success, ${failCount} failed`);
    alert(`Migration complete!\n✅ ${successCount} rounds uploaded\n${failCount > 0 ? `❌ ${failCount} failed` : ''}`);
    updateSyncStatus('synced', 'Migration complete');
    updateCloudSyncUI();
}

async function resetAccount() {
    if (!confirm('Are you sure you want to reset your account?\n\nThis will:\n- Sign you out\n- Create a new anonymous account\n- You will lose access to your current data unless you have a backup\n\nContinue?')) {
        return;
    }

    try {
        console.log('🔄 Resetting account (signing out)...');
        await supabase.auth.signOut();
        currentUserId = null;
        syncState.isAuthenticated = false;

        // Clear local storage
        localStorage.removeItem('roundHistory');
        localStorage.removeItem('currentRound');
        localStorage.removeItem('playerStats');

        alert('Account reset! Refreshing page...');
        location.reload();
    } catch (error) {
        console.error('❌ Failed to reset account:', error);
        alert('Failed to reset account: ' + error.message);
    }
}

// Monitor online/offline status
window.addEventListener('online', () => {
    console.log('🌐 Back online');
    syncState.isOnline = true;
    updateSyncStatus('synced', 'Back online');

    // Sync pending changes
    if (syncState.pendingChanges > 0) {
        console.log(`🔄 Syncing ${syncState.pendingChanges} pending changes...`);
        loadRoundsFromCloud();
    }
});

window.addEventListener('offline', () => {
    console.log('📴 Gone offline');
    syncState.isOnline = false;
    updateSyncStatus('offline', 'Offline - will sync when back online');
});

// ===================================
// STORAGE UTILITIES
// ===================================

// Calculate localStorage usage
function getStorageUsage() {
    let totalSize = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length + key.length;
        }
    }
    // Convert to KB
    const sizeInKB = (totalSize / 1024).toFixed(2);
    const estimatedQuota = 5000; // ~5MB typical quota for localStorage
    const percentage = ((totalSize / 1024) / estimatedQuota * 100).toFixed(1);

    return {
        usedKB: parseFloat(sizeInKB),
        totalKB: estimatedQuota,
        percentage: parseFloat(percentage)
    };
}

// Get storage statistics
function getStorageStats() {
    const history = JSON.parse(localStorage.getItem('roundHistory') || '[]');
    const stats = {
        roundCount: history.length,
        oldestRound: null,
        newestRound: null,
        lastBackupDate: localStorage.getItem('lastBackupDate') || null
    };

    if (history.length > 0) {
        const sortedByDate = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        stats.oldestRound = sortedByDate[0].date;
        stats.newestRound = sortedByDate[sortedByDate.length - 1].date;
    }

    return stats;
}

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

// Backup & Restore Screen
const backupRestoreScreen = document.getElementById('backupRestoreScreen');
const storageInfoDisplay = document.getElementById('storageInfoDisplay');
const exportAllDataBtn = document.getElementById('exportAllDataBtn');
const exportLast30DaysBtn = document.getElementById('exportLast30DaysBtn');
const exportSelectedBtn = document.getElementById('exportSelectedBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const importStatus = document.getElementById('importStatus');
const navBackupRestore = document.getElementById('navBackupRestore');

// Cloud Sync Screen
const cloudSyncScreen = document.getElementById('cloudSyncScreen');
const syncNowBtn = document.getElementById('syncNowBtn');
const migrateLocalDataBtn = document.getElementById('migrateLocalDataBtn');
const downloadCloudDataBtn = document.getElementById('downloadCloudDataBtn');
const resetAccountBtn = document.getElementById('resetAccountBtn');

// Storage Warning Banner
const storageWarningBanner = document.getElementById('storageWarningBanner');

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

navBackupRestore.addEventListener('click', (e) => {
    e.preventDefault();
    closeSidebar();
    displayBackupRestore();
    showScreen(backupRestoreScreen);
});

const navCloudSync = document.getElementById('navCloudSync');
navCloudSync.addEventListener('click', (e) => {
    e.preventDefault();
    closeSidebar();
    updateCloudSyncUI();
    showScreen(cloudSyncScreen);
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

        const data = await response.json();
        console.log('✅ Full API response:', data);

        // CRITICAL: Extract the nested "course" property from the response
        const courseData = data.course;
        console.log('✅ Extracted course data:', courseData);
        console.log('✅ Course tees structure:', courseData.tees);

        setupRoundWithCourse(courseData, course);

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
        console.log('Total tees before deduplication:', allTees.length);

        // Deduplicate tees by name (case-insensitive)
        const uniqueTees = [];
        const seenNames = new Set();
        allTees.forEach(tee => {
            const teeName = tee.tee_name || tee.name || '';
            const nameLower = teeName.toLowerCase();
            if (!seenNames.has(nameLower)) {
                seenNames.add(nameLower);
                uniqueTees.push(tee);
            }
        });

        console.log('Total tees after deduplication:', uniqueTees.length);

        // Store all tees directly
        appData.tees = uniqueTees.map((tee, index) => {
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
        if (uniqueTees.length > 0 && uniqueTees[0].holes) {
            console.log('Populating hole data from first tee:', uniqueTees[0].tee_name || uniqueTees[0].name);
            appData.holes.forEach((hole, index) => {
                if (uniqueTees[0].holes[index]) {
                    hole.par = uniqueTees[0].holes[index].par || 4;
                    hole.yardage = uniqueTees[0].holes[index].yardage || null;
                    hole.handicap = uniqueTees[0].holes[index].handicap || null;
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
                strokes: null, // Start with blank score
                putts: null // Start with blank putts
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

    // Add hole header with par and edit button at the top
    const holeHeaderDiv = document.createElement('div');
    holeHeaderDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px;';
    holeHeaderDiv.innerHTML = `
        <h3 style="margin: 0; font-size: 18px; color: #333;">Hole ${appData.currentHole} - Par ${currentHoleData.par}</h3>
        <button onclick="editHolePar()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500;">✏️ Edit Par</button>
    `;
    playersScoreContainer.appendChild(holeHeaderDiv);

    // Add player cards FIRST (above tee information)
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
                    <div class="score-value" id="strokes-${playerName}">${playerScore.strokes === null ? '' : playerScore.strokes}</div>
                    <button class="score-btn" onclick="changeScore('${playerName}', 'strokes', 1)">+</button>
                </div>
            </div>

            <div class="score-control">
                <label>Putts</label>
                <div class="score-input">
                    <button class="score-btn" onclick="changeScore('${playerName}', 'putts', -1)">−</button>
                    <div class="score-value" id="putts-${playerName}">${playerScore.putts === null ? '' : playerScore.putts}</div>
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

    // Add tee information AFTER player cards
    if (appData.tees && appData.tees.length > 0) {
        const teeInfoDiv = document.createElement('div');
        teeInfoDiv.className = 'hole-details';
        teeInfoDiv.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 16px;';

        let teeInfoHTML = '<h4 style="margin: 0 0 12px 0; font-size: 16px; color: #333;">Course Tee Information:</h4>';
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
        holeInfoDiv.style.cssText = 'background: #f0f0f0; padding: 12px; border-radius: 8px; margin-top: 16px; text-align: center;';

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

    // Update par buttons for current hole
    updateParButtons();
}

// Change a player's score (strokes or putts)
function changeScore(playerName, type, delta) {
    const currentHoleData = appData.holes[appData.currentHole - 1];
    const playerScore = currentHoleData.scores[playerName];

    // Handle null values: if null and decrementing, do nothing; if null and incrementing, start at 1
    if (playerScore[type] === null) {
        if (delta > 0) {
            playerScore[type] = 1;
        } else {
            return; // Do nothing when decrementing from null
        }
    } else {
        // Update the score (prevent negative values)
        playerScore[type] = Math.max(0, playerScore[type] + delta);
    }

    // Update the display
    document.getElementById(`${type}-${playerName}`).textContent = playerScore[type] === null ? '' : playerScore[type];

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
        const strokes = appData.holes[i].scores[playerName].strokes;
        total += strokes === null ? 0 : strokes;
    }
    return total;
}

// Calculate total putts for a player
function calculatePlayerTotalPutts(playerName) {
    let total = 0;
    for (let i = 0; i < 18; i++) {
        if (appData.holes[i].scores[playerName]) {
            const putts = appData.holes[i].scores[playerName].putts;
            total += putts === null ? 0 : putts;
        }
    }
    return total;
}

// Calculate how over/under par a player is
function calculateVsPar(playerName) {
    let totalStrokes = 0;
    let totalPar = 0;

    for (let i = 0; i < appData.currentHole; i++) {
        const strokes = appData.holes[i].scores[playerName].strokes;
        totalStrokes += strokes === null ? 0 : strokes;
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
    html += '<th class="total-col">Total</th><th class="total-col">vs Par</th></tr>';

    // Par row
    html += '<tr><td class="player-name">Par</td>';
    let totalPar = 0;
    appData.holes.forEach(hole => {
        html += `<td>${hole.par}</td>`;
        totalPar += hole.par;
    });
    html += `<td class="total-col">${totalPar}</td><td class="total-col">-</td></tr>`;

    // Player rows with putts per hole
    appData.players.forEach(playerName => {
        // Player strokes row
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
        html += `<td class="total-col" style="color: ${vsParColor}; font-weight: bold;">${vsParDisplay}</td>`;
        html += '</tr>';

        // Player putts row
        html += `<tr style="background-color: #f9fafb;"><td class="player-name" style="padding-left: 24px; font-size: 0.9em; color: #6b7280; font-style: italic;">Putts</td>`;

        appData.holes.forEach(hole => {
            const putts = hole.scores[playerName].putts;
            html += `<td style="color: #6b7280; font-size: 0.9em;">${putts}</td>`;
        });

        html += `<td class="total-col" style="color: #6b7280; font-weight: 600;">${playerTotalPutts}</td>`;
        html += `<td class="total-col">-</td>`;
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
    try {
        // Get existing history
        const history = JSON.parse(localStorage.getItem('roundHistory') || '[]');

        // Check if we're editing an existing round
        if (appData.editingRoundId) {
            console.log('💾 Updating existing round:', appData.editingRoundId);

            // Find and update the existing round
            const roundIndex = history.findIndex(r => r.id === appData.editingRoundId);
            if (roundIndex !== -1) {
                // Update the round data while keeping the original ID and savedAt
                const updatedRound = {
                    id: appData.editingRoundId,
                    supabaseId: history[roundIndex].supabaseId, // Keep Supabase ID
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

                history[roundIndex] = updatedRound;

                // Save updated history
                localStorage.setItem('roundHistory', JSON.stringify(history));

                // Sync to cloud
                saveRoundToCloud(updatedRound);

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

            // Sync to cloud (async, but don't wait for it)
            saveRoundToCloud(roundData).then(cloudData => {
                if (cloudData) {
                    // Update local round with Supabase ID
                    roundData.supabaseId = cloudData.id;
                    localStorage.setItem('roundHistory', JSON.stringify(history));
                    console.log('✅ Round synced to cloud with ID:', cloudData.id);
                }
            });

            // Update player statistics
            updatePlayerStatistics(roundData);

            console.log('✅ New round saved successfully');
        }

        // Check storage after saving
        checkStorageAndShowWarning();

    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert('❌ Cannot save - storage full! Please export and delete old rounds.');
            showStorageWarning('critical', 100);
            navigateToBackup();
        } else {
            console.error('Error saving round to history:', e);
            alert('❌ Error saving round. Please try again.');
        }
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
    html += '<th class="total-col">Total</th><th class="total-col">vs Par</th></tr>';

    // Par row
    html += '<tr><td class="player-name">Par</td>';
    let totalPar = 0;
    round.holes.forEach(hole => {
        html += `<td>${hole.par}</td>`;
        totalPar += hole.par;
    });
    html += `<td class="total-col">${totalPar}</td><td class="total-col">-</td></tr>`;

    // Player rows with putts per hole
    round.players.forEach(playerName => {
        // Player strokes row
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
        html += `<td class="total-col" style="color: ${vsParColor}; font-weight: bold;">${vsParDisplay}</td>`;
        html += '</tr>';

        // Player putts row
        html += `<tr style="background-color: #f9fafb;"><td class="player-name" style="padding-left: 24px; font-size: 0.9em; color: #6b7280; font-style: italic;">Putts</td>`;

        round.holes.forEach(hole => {
            const putts = hole.scores[playerName].putts;
            html += `<td style="color: #6b7280; font-size: 0.9em;">${putts}</td>`;
        });

        html += `<td class="total-col" style="color: #6b7280; font-weight: 600;">${playerTotalPutts}</td>`;
        html += `<td class="total-col">-</td>`;
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

    // Delete from cloud if it has a Supabase ID
    if (round.supabaseId) {
        deleteRoundFromCloud(round.supabaseId);
    }

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
    try {
        localStorage.setItem('currentRound', JSON.stringify(appData));
        checkStorageAndShowWarning();
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert('❌ Cannot save - storage full! Please export and delete old rounds.');
            showStorageWarning('critical', 100);
        } else {
            console.error('Error saving round:', e);
            alert('❌ Error saving round. Please try again.');
        }
    }
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
// STORAGE WARNING BANNER
// ===================================

function checkStorageAndShowWarning() {
    const usage = getStorageUsage();
    console.log('📊 Storage check:', usage);

    if (usage.percentage > 95) {
        showStorageWarning('critical', usage.percentage);
    } else if (usage.percentage > 80) {
        showStorageWarning('warning', usage.percentage);
    } else {
        hideStorageWarning();
    }

    // Check for 30-day backup reminder
    checkBackupReminder();
}

function showStorageWarning(level, percentage) {
    const banner = storageWarningBanner;
    let message = '';
    let backgroundColor = '';

    if (level === 'critical') {
        message = `🚨 Storage critically full (${percentage}% used)! Export now to prevent data loss.`;
        backgroundColor = '#fee2e2'; // red background
    } else if (level === 'warning') {
        message = `⚠️ Storage almost full (${percentage}% used). Export your data to back it up!`;
        backgroundColor = '#fef3c7'; // yellow background
    }

    banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: ${backgroundColor}; border-bottom: 2px solid ${level === 'critical' ? '#ef4444' : '#eab308'};">
            <span style="flex: 1; font-weight: 500;">${message}</span>
            <button onclick="navigateToBackup()" style="margin-left: 12px; padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; min-height: 48px;">
                Export Data
            </button>
        </div>
    `;
    banner.style.display = 'block';
}

function hideStorageWarning() {
    storageWarningBanner.style.display = 'none';
}

function navigateToBackup() {
    displayBackupRestore();
    showScreen(backupRestoreScreen);
}

function checkBackupReminder() {
    const lastBackup = localStorage.getItem('lastBackupDate');
    if (!lastBackup) {
        return; // Don't show reminder if they've never backed up
    }

    const daysSinceBackup = (Date.now() - new Date(lastBackup)) / (1000 * 60 * 60 * 24);
    if (daysSinceBackup > 30) {
        // Show gentle reminder (only if no critical warning is showing)
        const usage = getStorageUsage();
        if (usage.percentage <= 80) {
            const banner = storageWarningBanner;
            banner.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #dbeafe; border-bottom: 2px solid #3b82f6;">
                    <span style="flex: 1; font-weight: 500;">💡 Tip: Back up your data regularly! Last backup was ${Math.floor(daysSinceBackup)} days ago.</span>
                    <button onclick="navigateToBackup()" style="margin-left: 12px; padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; min-height: 48px;">
                        Backup Now
                    </button>
                </div>
            `;
            banner.style.display = 'block';
        }
    }
}

// ===================================
// BACKUP & RESTORE
// ===================================

function displayBackupRestore() {
    const usage = getStorageUsage();
    const stats = getStorageStats();

    // Determine progress bar color
    let barColor = '#22c55e'; // green
    if (usage.percentage >= 80) {
        barColor = '#ef4444'; // red
    } else if (usage.percentage >= 50) {
        barColor = '#eab308'; // yellow
    }

    let html = `
        <div class="storage-bar-container" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #333;">Storage Usage</span>
                <span style="font-weight: 700; font-size: 18px; color: ${barColor};">${usage.percentage}%</span>
            </div>
            <div style="width: 100%; height: 24px; background: #e5e7eb; border-radius: 12px; overflow: hidden;">
                <div style="width: ${usage.percentage}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
            </div>
            <div style="margin-top: 8px; font-size: 14px; color: #666;">
                Using ${usage.usedKB} KB of ~${usage.totalKB} KB available
            </div>
        </div>

        <div class="storage-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
            <div class="stat-box">
                <div class="stat-label">Rounds Stored</div>
                <div class="stat-value">${stats.roundCount}</div>
            </div>
    `;

    if (stats.oldestRound) {
        html += `
            <div class="stat-box">
                <div class="stat-label">Oldest Round</div>
                <div class="stat-value" style="font-size: 14px;">${new Date(stats.oldestRound).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
        `;
    }

    if (stats.newestRound) {
        html += `
            <div class="stat-box">
                <div class="stat-label">Newest Round</div>
                <div class="stat-value" style="font-size: 14px;">${new Date(stats.newestRound).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
        `;
    }

    if (stats.lastBackupDate) {
        html += `
            <div class="stat-box">
                <div class="stat-label">Last Export</div>
                <div class="stat-value" style="font-size: 14px;">${new Date(stats.lastBackupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
        `;
    }

    html += '</div>';

    storageInfoDisplay.innerHTML = html;
}

// Export all data
exportAllDataBtn.addEventListener('click', () => {
    const data = {
        roundHistory: JSON.parse(localStorage.getItem('roundHistory') || '[]'),
        playerStats: JSON.parse(localStorage.getItem('playerStats') || '{}'),
        exportDate: new Date().toISOString(),
        version: '1.0'
    };

    downloadJSON(data, `forescore-backup-${getDateString()}.json`);
    localStorage.setItem('lastBackupDate', new Date().toISOString());
    displayBackupRestore(); // Refresh display
    alert('✅ All data exported successfully!');
});

// Export last 30 days
exportLast30DaysBtn.addEventListener('click', () => {
    const allRounds = JSON.parse(localStorage.getItem('roundHistory') || '[]');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRounds = allRounds.filter(round => new Date(round.date) >= thirtyDaysAgo);

    if (recentRounds.length === 0) {
        alert('No rounds found in the last 30 days.');
        return;
    }

    const data = {
        roundHistory: recentRounds,
        exportDate: new Date().toISOString(),
        version: '1.0',
        note: 'Last 30 days export'
    };

    downloadJSON(data, `forescore-last30days-${getDateString()}.json`);
    localStorage.setItem('lastBackupDate', new Date().toISOString());
    displayBackupRestore(); // Refresh display
    alert(`✅ Exported ${recentRounds.length} round(s) from the last 30 days!`);
});

// Export selected date range
exportSelectedBtn.addEventListener('click', () => {
    const startDate = prompt('Enter start date (YYYY-MM-DD):');
    if (!startDate) return;

    const endDate = prompt('Enter end date (YYYY-MM-DD):');
    if (!endDate) return;

    const allRounds = JSON.parse(localStorage.getItem('roundHistory') || '[]');
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        alert('Invalid date format. Please use YYYY-MM-DD.');
        return;
    }

    const selectedRounds = allRounds.filter(round => {
        const roundDate = new Date(round.date);
        return roundDate >= start && roundDate <= end;
    });

    if (selectedRounds.length === 0) {
        alert('No rounds found in the selected date range.');
        return;
    }

    const data = {
        roundHistory: selectedRounds,
        exportDate: new Date().toISOString(),
        version: '1.0',
        note: `Date range: ${startDate} to ${endDate}`
    };

    downloadJSON(data, `forescore-custom-${getDateString()}.json`);
    localStorage.setItem('lastBackupDate', new Date().toISOString());
    displayBackupRestore(); // Refresh display
    alert(`✅ Exported ${selectedRounds.length} round(s) from selected date range!`);
});

// Export to CSV
exportCsvBtn.addEventListener('click', () => {
    const allRounds = JSON.parse(localStorage.getItem('roundHistory') || '[]');

    if (allRounds.length === 0) {
        alert('No rounds to export.');
        return;
    }

    // CSV header
    let csv = 'Date,Course,Player,Score,Putts,vs Par\n';

    // Process each round
    allRounds.forEach(round => {
        const totalPar = round.holes.reduce((sum, hole) => sum + hole.par, 0);
        const roundDate = new Date(round.date).toLocaleDateString('en-US');

        round.players.forEach(playerName => {
            let playerTotal = 0;
            let playerPutts = 0;

            round.holes.forEach(hole => {
                playerTotal += hole.scores[playerName].strokes;
                playerPutts += hole.scores[playerName].putts;
            });

            const vsPar = playerTotal - totalPar;
            const vsParDisplay = vsPar === 0 ? 'E' : (vsPar > 0 ? `+${vsPar}` : `${vsPar}`);

            // Escape course name in case it has commas
            const escapedCourseName = `"${round.courseName.replace(/"/g, '""')}"`;

            csv += `${roundDate},${escapedCourseName},${playerName},${playerTotal},${playerPutts},${vsParDisplay}\n`;
        });
    });

    downloadCSV(csv, `forescore-rounds-${getDateString()}.csv`);
    localStorage.setItem('lastBackupDate', new Date().toISOString());
    displayBackupRestore(); // Refresh display
    alert('✅ Data exported to CSV successfully!');
});

// Import data
importDataBtn.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData.roundHistory || !Array.isArray(importedData.roundHistory)) {
                throw new Error('Invalid backup file format');
            }

            const existingRounds = JSON.parse(localStorage.getItem('roundHistory') || '[]');
            const existingIds = new Set(existingRounds.map(r => r.id));

            let newRounds = 0;
            let duplicates = 0;

            importedData.roundHistory.forEach(round => {
                if (!existingIds.has(round.id)) {
                    existingRounds.push(round);
                    newRounds++;
                } else {
                    duplicates++;
                }
            });

            // Save updated rounds
            localStorage.setItem('roundHistory', JSON.stringify(existingRounds));

            // Recalculate player stats from all rounds
            recalculateAllPlayerStats(existingRounds);

            // Show status
            let statusMessage = `✅ Import complete!\n${newRounds} new round(s) added.`;
            if (duplicates > 0) {
                statusMessage += `\n${duplicates} duplicate(s) skipped.`;
            }

            importStatus.innerHTML = `<p style="color: #22c55e; font-weight: 500;">${statusMessage.replace(/\n/g, '<br>')}</p>`;
            alert(statusMessage);

            // Refresh display
            displayBackupRestore();

            // Reset file input
            importFileInput.value = '';

        } catch (error) {
            console.error('Import error:', error);
            importStatus.innerHTML = `<p style="color: #ef4444; font-weight: 500;">❌ Error: Invalid backup file</p>`;
            alert('❌ Error: Unable to import file. Please make sure it\'s a valid ForeScore backup file.');
        }
    };

    reader.readAsText(file);
});

// ===================================
// CLOUD SYNC BUTTON EVENT LISTENERS
// ===================================

syncNowBtn.addEventListener('click', async () => {
    console.log('🔄 Manual sync requested');
    syncNowBtn.disabled = true;
    syncNowBtn.textContent = '🔄 Syncing...';

    try {
        await loadRoundsFromCloud();
        alert('✅ Sync complete!');
    } catch (error) {
        console.error('❌ Sync failed:', error);
        alert('❌ Sync failed: ' + error.message);
    } finally {
        syncNowBtn.disabled = false;
        syncNowBtn.textContent = '🔄 Sync Now';
    }
});

migrateLocalDataBtn.addEventListener('click', async () => {
    migrateLocalDataToCloud();
});

downloadCloudDataBtn.addEventListener('click', async () => {
    console.log('📥 Downloading from cloud...');
    downloadCloudDataBtn.disabled = true;
    downloadCloudDataBtn.textContent = '⬇️ Downloading...';

    try {
        const cloudData = await loadRoundsFromCloud();
        alert(`✅ Downloaded ${cloudData.length} rounds from cloud!`);
        displayHistory(); // Refresh the history view
    } catch (error) {
        console.error('❌ Download failed:', error);
        alert('❌ Download failed: ' + error.message);
    } finally {
        downloadCloudDataBtn.disabled = false;
        downloadCloudDataBtn.textContent = '⬇️ Download from Cloud';
    }
});

resetAccountBtn.addEventListener('click', () => {
    resetAccount();
});

// Helper function to download JSON
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper function to download CSV
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper function to get date string for filenames
function getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ===================================
// APP STARTUP
// ===================================

// Initialize Supabase and authenticate on app load
(async function initializeApp() {
    console.log('🚀 Starting ForeScore app...');

    // Initialize Supabase client
    const supabaseInitialized = await initSupabase();

    if (supabaseInitialized) {
        // Authenticate user
        await initAuth();
    } else {
        console.warn('⚠️ Cloud sync not available, continuing in offline mode');
        updateSyncStatus('offline', 'Cloud sync unavailable');
    }

    // Check storage on app load
    checkStorageAndShowWarning();

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

    console.log('✅ ForeScore app initialized');
})();
