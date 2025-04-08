// js/gameFlow.js
"use strict";

/**
 * Initializes the game: caches elements, loads data, sets up visuals, shows ID prompt.
 */
function initGame() {
    console.log("Initializing game...");
    cacheDOMElements(); // Get references to UI elements

    // Load questions, then proceed with setup
    loadCSVQuestions(() => {
        console.log("CSV loaded, proceeding with setup.");
        // Ensure deck visuals are ready (might be redundant if cacheDOMElements works)
        if (!deckContainer.querySelector('.card')) {
             console.log("Setting up initial deck visuals.");
             setupDeckVisuals(); // Create the visual card stack
        } else {
             resetDeckVisuals(); // Ensure correct positioning if already exists
        }

        // Show the participant ID entry modal using the UI function
         showGenericModal(
            nameEntryModal,
            "Enter Participant ID", // Modal title
            "Start Game",          // Button text
            handleIdSubmit         // Action on button click
         );
    });
}

/**
 * Handles submission of the Participant ID.
 */
function handleIdSubmit() {
    const enteredId = participantIdInput.value.trim();
    if (!enteredId) {
        if (nameError) nameError.textContent = 'Please enter a Participant ID.';
        participantIdInput.focus();
        return;
    }
    // Basic validation (you might add more complex checks)
    if (!/^[a-zA-Z0-9_-]+$/.test(enteredId)) {
         if (nameError) nameError.textContent = 'ID can only contain letters, numbers, underscore, dash.';
         participantIdInput.focus();
         return;
    }

    participantId = enteredId; // Store the ID in the state
    if (nameError) nameError.textContent = ''; // Clear error message
    console.log("Participant ID set to:", participantId);
    hideModal(nameEntryModal); // Hide the ID entry modal

    // Now show the prompt to start Round 1 (or practice)
    triggerNextPhaseModal();
}

/**
 * Determines what modal to show next (start round 1, next round, or game over).
 * This centralizes the logic after ID entry, after test session, and between rounds.
 */
function triggerNextPhaseModal() {
    if (currentRound === 0) { // Game hasn't started yet
         if (!questionsByRound[1] || questionsByRound[1].length === 0) {
            console.error("No questions loaded for Round 1. Cannot start game.");
            showGenericModal(roundModal, "Error: No questions found for Round 1. Check CSV.", "Refresh", () => window.location.reload());
        } else {
            // Show Round 1 start prompt (with Test button if available)
            showRoundModal(
                "Ready?",                                // Message
                "Start Round 1",                         // Main button text
                () => startRound(1),                     // Main button action
                startTestSession                         // Test button action
             );
        }
    } else if (currentRound < 3) { // Between rounds 1&2 or 2&3
         const nextRound = currentRound + 1;
         if (!questionsByRound[nextRound] || questionsByRound[nextRound].length === 0) {
             console.error(`No questions loaded for Round ${nextRound}. Cannot continue.`);
             showGenericModal(roundModal, `Error: No questions found for Round ${nextRound}. Check CSV.`, "Game Over", handleGameOver);
         } else {
             // Show next round prompt (with Test button)
              showRoundModal(
                `Round ${currentRound} Over!\nPlease tell the Researcher you finished this Round and continue with the Questionnaire!\n\nReady for Round ${nextRound}?`, // Message
                `Start Round ${nextRound}`,              // Main button text
                () => startRound(nextRound),             // Main button action
                startTestSession                         // Test button action
             );
         }
    } else { // After round 3 is finished
        handleGameOver();
    }
}

/**
 * Prepares the questions for a specific round by selecting and interleaving
 * easy and hard questions for an alternating order.
 * Assumes questions have a 'difficulty' property ('easy' or 'hard', case-insensitive).
 * @param {number} roundNumber The round number (1, 2, or 3).
 * @returns {boolean} True if successful, False if questions could not be prepared.
 */
function prepareRoundQuestions(roundNumber) {
    if (!questionsByRound[roundNumber] || questionsByRound[roundNumber].length === 0) {
        console.error(`Cannot prepare round ${roundNumber}: No questions loaded.`);
        showGenericModal(roundModal, `Error: Questions for Round ${roundNumber} not found!`, "Game Over", handleGameOver);
        return false;
    }

    let availableQuestions = [...questionsByRound[roundNumber]]; // Copy questions for the round

    // --- MODIFICATION START ---

    // 1. Separate questions by difficulty
    let easyQuestions = [];
    let hardQuestions = [];
    availableQuestions.forEach(q => {
        // Make the check case-insensitive and handle potential undefined/null difficulty
        const difficulty = (q.difficulty || 'N/A').trim().toLowerCase();
        if (difficulty === 'easy') {
            easyQuestions.push(q);
        } else if (difficulty === 'hard') {
            hardQuestions.push(q);
        } else {
            // Optional: Decide how to handle questions with other/missing difficulties
            // For now, let's add them to 'hard' or create a third category if needed
            console.warn(`Question with unexpected difficulty '${q.difficulty}' found. Treating as 'hard'. Question: ${q.question}`);
            hardQuestions.push(q);
        }
    });

    // 2. Shuffle each difficulty group independently
    shuffleArray(easyQuestions);
    shuffleArray(hardQuestions);

    // 3. Interleave questions (Easy, Hard, Easy, Hard...)
    questionsThisRound = [];
    let easyIdx = 0;
    let hardIdx = 0;
    let addedCount = 0;

    while (addedCount < QUESTIONS_PER_ROUND && (easyIdx < easyQuestions.length || hardIdx < hardQuestions.length)) {
        // Add an easy question if available and limit not reached
        if (easyIdx < easyQuestions.length && addedCount < QUESTIONS_PER_ROUND) {
            questionsThisRound.push(easyQuestions[easyIdx]);
            easyIdx++;
            addedCount++;
        }
        // Add a hard question if available and limit not reached
        if (hardIdx < hardQuestions.length && addedCount < QUESTIONS_PER_ROUND) {
            questionsThisRound.push(hardQuestions[hardIdx]);
            hardIdx++;
            addedCount++;
        }
        // Break if both lists are exhausted prematurely (less than QUESTIONS_PER_ROUND available)
        if (easyIdx >= easyQuestions.length && hardIdx >= hardQuestions.length) {
            break;
        }
    }

    // --- MODIFICATION END ---


    if (questionsThisRound.length === 0) {
        console.error(`Critical Error: Round ${roundNumber} prepared with zero questions after interleaving.`);
         showGenericModal(roundModal, `Error: No questions available for Round ${roundNumber}.`, "Game Over", handleGameOver);
        return false;
    }
    if (questionsThisRound.length < QUESTIONS_PER_ROUND) {
        console.warn(`Round ${roundNumber} started with only ${questionsThisRound.length} questions after interleaving (less than target ${QUESTIONS_PER_ROUND}). Easy: ${easyQuestions.length}, Hard: ${hardQuestions.length}`);
    }

    questionIndexThisRound = 0; // Reset index for the new round
    console.log(`Prepared Round ${roundNumber} with ${questionsThisRound.length} interleaved questions (Easy first).`);
    console.log("Prepared questions:", questionsThisRound.map(q => `${q.difficulty}: ${q.question.substring(0, 30)}...`)); // Log difficulty and start of question
    return true;
}

// Ensure you have the shuffleArray function available in your scope (it seems you do based on the original code)
/* Example shuffle function (Fisher-Yates shuffle) */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}


/**
 * Starts a specific game round: updates state, UI, sends message.
 * @param {number} roundNumber The round number to start (1, 2, or 3).
 */
function startRound(roundNumber) {
    console.log(`Attempting to start Round ${roundNumber}`);
    isTestSession = false; // Ensure we are NOT in test mode

    hideModal(roundModal); // Hide any active modal

    if (!prepareRoundQuestions(roundNumber)) {
        console.error(`Failed to start round ${roundNumber} due to question preparation error.`);
        return; // Stop if questions aren't ready
    }

    // --- Update State ---
    currentRound = roundNumber;
    questionIndexThisRound = 0; // Reset index just to be sure
    leftCount = 0; // Reset counters
    rightCount = 0;
    inputLocked = false; // Ensure input is unlocked at round start
    if (currentRevealedCard) { // Clean up card from previous state (e.g., test session)
        removeCardDOM(currentRevealedCard);
        currentRevealedCard = null;
        currentQuestionData = null;
    }

    // --- Update UI ---
    updateCounters();
    updateRoundDisplay();
    updateInstructions("Tip on Card to reveal");
    setupDeckVisuals(); // Ensure a full, fresh visual deck for the round <--- TO THIS LINE

    // Ensure cards in deck are clickable again
    const cards = deckContainer?.querySelectorAll('.card:not(.revealed)');
    if(cards) cards.forEach(card => card.style.pointerEvents = 'auto');

     // --- Send Start Round Message (for rounds 2 and 3) ---
     // Send message when Round 2 or 3 specifically STARTS
    if (roundNumber > 1 && typeof sendMessage === 'function') {
        const startRoundMessage = {
            action: "logStatus", // Or "logEvent" or similar, depends on server
            event: "startRound",
            participant: participantId,
            round: roundNumber // The round number that is STARTING
        };
        console.log(`>>> Sending startRound (${roundNumber}) data:`, JSON.stringify(startRoundMessage));
        sendMessage(startRoundMessage);
    } else if (roundNumber > 1) {
         console.warn("sendMessage function not found. Skipping startRound event log.");
    }

    console.log(`Round ${currentRound} started successfully.`);
}

/**
 * Starts the Test/Practice Session.
 */
function startTestSession() {
    if (testQuestions.length === 0) {
        console.error("Cannot start test session: No test questions loaded.");
        // Optionally provide brief feedback in the modal before hiding
        if(modalMessage) modalMessage.innerText = "No practice questions available.";
        setTimeout(() => {
             if(roundModal.style.display !== 'none') {
                // Re-show the appropriate round prompt if modal hasn't closed
                 triggerNextPhaseModal();
             }
        }, 1500);
        return;
    }

    console.log("Starting Test Session");
    hideModal(roundModal);

    // --- Update State ---
    isTestSession = true;
    testQuestionIndex = 0; // Reset test question index
    shuffleArray(testQuestions); // Shuffle test questions each time
    leftCount = 0; // Reset counters for test session
    rightCount = 0;
    inputLocked = false; // Ensure input is unlocked
     if (currentRevealedCard) { // Clean up any revealed card
        removeCardDOM(currentRevealedCard);
        currentRevealedCard = null;
        currentQuestionData = null;
    }
    // Assign the shuffled test questions to the list being used for reveals
    questionsThisRound = testQuestions; // Point questionsThisRound to test questions for reveal logic
    questionIndexThisRound = 0; // Use this index for test reveals too


    // --- Update UI ---
    updateCounters();
    updateRoundDisplay(); // Will hide round number
    updateInstructions("Practice: Tip on Card to reveal");
    setupDeckVisuals(); // Ensure a full, fresh visual deck for test session <--- TO THIS LINE

    // Ensure cards are clickable
    const cards = deckContainer?.querySelectorAll('.card:not(.revealed)');
     if(cards) cards.forEach(card => card.style.pointerEvents = 'auto');
}


/**
 * Advances the game to the next round modal or triggers game over.
 * Called after a regular round completes successfully.
 */
function advanceToNextRound() {
    // The logic is now handled by triggerNextPhaseModal
    triggerNextPhaseModal();
}

/**
 * Handles the end of the game: displays final message, disables interactions.
 */
function handleGameOver() {
    console.log("Game Over for Participant:", participantId);

    // --- Update State ---
    isTestSession = false; // Ensure test mode is off
    currentRound = 4; // Indicate game finished state if needed
    inputLocked = true; // Lock input permanently

     // --- Update UI ---
    hideModal(roundModal); // Hide any intermediate modal
    updateInstructions("Game Finished!");
    updateRoundDisplay(); // Should show "Finished"

    if (currentRevealedCard) { // Remove any lingering revealed card
         removeCardDOM(currentRevealedCard);
         currentRevealedCard = null;
         currentQuestionData = null;
    }
    // Disable clicking on any remaining cards in the deck visually
    const cards = deckContainer?.querySelectorAll('.card');
     if(cards) cards.forEach(card => card.style.pointerEvents = 'none');

    // Show a final confirmation modal (using the round modal structure)
    showRoundModal(
         "Game Finished!", // Message
         "Finished",       // Button text (doesn't need action)
         () => { /* No action needed */ }, // Main button action (none)
         () => { /* No action needed */ }  // Test button action (none)
    );
    // Explicitly disable buttons on the final modal
     setTimeout(() => { // Delay slightly ensure elements are rendered
         if(modalButton) modalButton.disabled = true;
         if(testSessionButton) {
            testSessionButton.disabled = true;
            testSessionButton.style.display = 'none'; // Hide test button too
         }
     }, 100);
}