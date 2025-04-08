// js/gaze-controller.js
"use strict";

/************************************************************
 * Gaze Controller
 * - Manages gaze state and behavior selection.
 * - Runs the main update loop.
 * - Handles game events affecting gaze.
 * Requires gaze-mechanics.js and gaze-behaviors.js loaded first.
 * Requires messaging.js for context updates and logging.
 * Relies on ui-handler.js for toggle state information (by reading element state).
 ************************************************************/

// --- Core State ---
const context = {
    userInFront: false,
    faceX: 0.5,
    faceY: 0.5,
    secondFaceX: null,
    secondFaceY: null,
    headDirection: "none" // Updated by messaging.js
};

// --- Behavior Control State ---
let currentBehavior = null; // Instance of an active high-level behavior
let lastHandledCardId = null; // Prevent double handling cardReveal
let lastRespondingJointAttentionTime = 0;
const respondingCooldown = 7000; // ms

let initialCondition = null; // Stores 'ryan', 'ivan', or 'carl'
let secondCondition = null;  // Stores the condition used in round 2
let conditionSequence = [];  // Optional: array to track full sequence ['initial', 'second', 'third']


// --- Main Update Loop ---
let gazeLoopInterval = null;

function startGazeLoop() {
    if (gazeLoopInterval) {
        console.warn("gaze-controller: Gaze loop already running.");
        return;
    }
    console.log("gaze-controller: Starting gaze loop.");
    // Ensure DOM elements needed by mechanics/status are likely ready
    setTimeout(() => {
        gazeLoopInterval = setInterval(() => {
            try {
                updateGaze();
            } catch (error) {
                console.error("Error in gaze loop:", error);
            }
        }, 50); // ~20 FPS update rate
    }, 100); // Small delay after DOM ready
}

// --- Behavior Selection & Update ---
function updateGaze() {
    const now = Date.now();

    // --- Get UI State (Toggles) ---
    // Reads the state directly from the DOM elements using updated IDs
    const ryanToggle = document.getElementById('ryanConditionToggle'); // Use new ID
    const ivanToggle = document.getElementById('ivanConditionToggle'); // Use new ID
    const carlToggle = document.getElementById('carlConditionToggle');
    const jointAttentionToggle = document.getElementById('jointAttentionToggle');
    const respondingJointAttentionToggle = document.getElementById('respondingJointAttentionToggle');
    const knowledge80Toggle = document.getElementById('knowledge80Toggle');
    const knowledge20Toggle = document.getElementById('knowledge20Toggle');

    // Use new variable names for clarity
    const isRyanActive = ryanToggle && ryanToggle.checked;
    const isIvanActive = ivanToggle && ivanToggle.checked;
    const isCarlActive = carlToggle && carlToggle.checked;
    const isInitiatingJAEnabled = jointAttentionToggle && jointAttentionToggle.checked;
    const isRespondingJAEnabled = respondingJointAttentionToggle && respondingJointAttentionToggle.checked;
    // Knowledge checks remain the same variables
    const isKnowledge80Active = knowledge80Toggle && knowledge80Toggle.checked;
    const isKnowledge20Active = knowledge20Toggle && knowledge20Toggle.checked;


    // --- Handle Completion of Active Behavior ---
    if (currentBehavior) {
        const behaviorIsStillActive = currentBehavior.apply(); // Run the behavior's logic
        if (behaviorIsStillActive) {
            updateGazeStatus(); // Update UI text
            return; // Keep running current behavior
        } else {
            // Behavior just finished
            console.log(`gaze-controller: Behavior ${currentBehavior.name} finished.`);
            currentBehavior = null; // Ready for a new behavior
        }
    }

    // --- Select New Behavior if Idle ---
    if (!currentBehavior) {
        if (context.userInFront) {
            // Priority: Responding JA (if enabled, not on cooldown, head turned, and Carl not active)
            if (!isCarlActive && isRespondingJAEnabled &&
                (context.headDirection === "Looking Left" || context.headDirection === "Looking Right") &&
                (now - lastRespondingJointAttentionTime >= respondingCooldown))
            {
                const dir = context.headDirection.split(" ")[1].toLowerCase();
                console.log("gaze-controller: Triggering Responding JA towards:", dir);
                currentBehavior = new RespondingJointAttention(dir);
                lastRespondingJointAttentionTime = now; // Reset cooldown
            }
            // Else: Dynamic Gaze (if multiple faces)
            else if (context.secondFaceX !== null && context.secondFaceY !== null) {
                 console.log("gaze-controller: Starting/Continuing Dynamic Gaze");
                 currentBehavior = new dynamicGaze();
            }
            // Else: Mutual Gaze (if single face)
            else {
                 console.log("gaze-controller: Starting/Continuing Mutual Gaze");
                 currentBehavior = new MutualGaze(); // MutualGaze handles aversion internally
            }
        } else {
            // No user in front: Idle (look center)
            setPupilTransform(0.5, 0.5, 1.0); // Look forward explicitly
        }
    }

    // Apply the newly selected behavior (if any) for the first time
    if (currentBehavior) {
        currentBehavior.apply();
    }

    updateGazeStatus(); // Update UI text
}


// --- Handle Game Events ---
// This function is intended to be called by messaging.js when a cardReveal event is received.
function handleCardRevealed(data) {
    console.log("gaze-controller: Received card reveal event data:", data);

    // Validate data needed
    if (!data || !data.cardId || !data.side) {
         console.error("gaze-controller: Invalid cardReveal data received.", data);
         return;
    }

    // Prevent double handling
    if (lastHandledCardId === data.cardId) {
        console.log("gaze-controller: Card ID", data.cardId, "already handled. Ignoring.");
        return;
    }
    lastHandledCardId = data.cardId;

    // --- Get UI State (Toggles - using NEW IDs/Variables) ---
    const ryanToggle = document.getElementById('ryanConditionToggle');     // Use new ID
    const ivanToggle = document.getElementById('ivanConditionToggle');     // Use new ID
    const carlToggle = document.getElementById('carlConditionToggle');
    const jointAttentionToggle = document.getElementById('jointAttentionToggle');
    const knowledge80Toggle = document.getElementById('knowledge80Toggle');
    const knowledge20Toggle = document.getElementById('knowledge20Toggle');

    // Use new variable names
    const isCarlActive = carlToggle && carlToggle.checked;
    const isInitiatingJAEnabled = jointAttentionToggle && jointAttentionToggle.checked;
    const isKnowledge80Active = knowledge80Toggle && knowledge80Toggle.checked;
    const isKnowledge20Active = knowledge20Toggle && knowledge20Toggle.checked;
    const isRyanActive = ryanToggle && ryanToggle.checked; // Use new variable name
    const isIvanActive = ivanToggle && ivanToggle.checked; // Use new variable name


    // --- Determine Robot Action based on Conditions/Toggles ---
    let direction = data.side; // Default: look towards the revealed card's side
    let knowledgeFactor = 1.0;
    let gazeTriggered = false;
    let robotCondition = "default"; // Determine active condition for logging

    // Assign condition name based on NEW variables
    if (isRyanActive) robotCondition = "Ryan condition"; // Use CORRECT name for log
    else if (isIvanActive) robotCondition = "Ivan condition"; // Use CORRECT name for log
    // Carl condition checked separately below

    // Check if automatic gaze should trigger
    if (!isCarlActive && isInitiatingJAEnabled) {
        gazeTriggered = true; // Intend to trigger gaze

        // Apply knowledge factor
        if (isKnowledge80Active) knowledgeFactor = 0.8;
        else if (isKnowledge20Active) knowledgeFactor = 0.2;

        if (knowledgeFactor < 1.0 && Math.random() > knowledgeFactor) {
            direction = (direction === "left") ? "right" : "left"; // Flip direction
            console.log(`gaze-controller: Knowledge factor ${knowledgeFactor*100}% applied: Robot looks ${direction} (INCORRECT)`);
        } else {
            console.log(`gaze-controller: Knowledge factor ${knowledgeFactor*100}% applied: Robot looks ${direction} (CORRECT)`);
        }
    } else {
         // Log why gaze was NOT triggered automatically
         if (isCarlActive) console.log("gaze-controller: Automatic gaze NOT triggered (Carl Condition active).");
         else if (!isInitiatingJAEnabled) console.log("gaze-controller: Automatic gaze NOT triggered (Initiating JA toggle off).");
         else console.log("gaze-controller: Automatic gaze NOT triggered (Unknown reason - check toggles).");
    }

    // --- Schedule Gaze Action and Logging ---
    const gazeDecisionForLog = gazeTriggered ? direction : "none"; // 'none' if not triggered
    const reasonForNoGaze = isCarlActive ? "Carl condition active" : (!isInitiatingJAEnabled ? "Initiating JA toggle off" : "");

    if(gazeTriggered) {
        // Schedule the gaze shift after a delay
        console.log(`gaze-controller: Scheduling Initiating JA towards ${direction} in 2 seconds...`);
        setTimeout(() => {
            // Prevent triggering if another high-priority behavior started during the delay
            if (currentBehavior instanceof InitiatingJointAttention || currentBehavior instanceof RespondingJointAttention) {
                console.log("gaze-controller: Another JA was already in progress when scheduled IJA tried to run. Skipping.");
                return;
            }
            console.log(`gaze-controller: Triggering scheduled Initiating JA towards ${direction}`);
            currentBehavior = new InitiatingJointAttention(direction); // Start the behavior
        }, 2000); // 2-second delay
    }

    // --- Send Logs Immediately (Decision is made now, action happens later) ---
    // Log the 'RobotsMove' event detailing the decision/condition immediately
    const robotMoveMessage = {
        action: "logEvent", // Or your expected action for server.py
        event: "RobotsMove",
        cardId: data.cardId,
        gazeDecision: gazeDecisionForLog, // 'left', 'right', or 'none'
        // Use updated robotCondition variable, ensuring Carl takes precedence
        Robot: isCarlActive ? "Carl condition" : robotCondition,
        reason: gazeTriggered ? "" : reasonForNoGaze, // Add reason if no gaze triggered
        timestamp: Date.now() // Use current time for the decision log
    };
    console.log("gaze-controller: Sending RobotsMove log:", robotMoveMessage);
    // Ensure sendGCSLogMessage function exists (defined in messaging.js)
    if (typeof sendGCSLogMessage === 'function') {
        sendGCSLogMessage(robotMoveMessage);
    } else {
        console.error("gaze-controller: sendGCSLogMessage function not found! Ensure messaging.js is loaded correctly.");
    }

    // Optional: Send separate log for card reveal outcome (commented out)
    /*
    const cardRevealOutcomeLog = { ... };
    if (typeof sendGCSLogMessage === 'function') {
        sendGCSLogMessage(cardRevealOutcomeLog);
    }
    */
}


// --- UI Status Update ---
function updateGazeStatus() {
    const statusElement = document.getElementById('gazeStatus');
    if (!statusElement) return; // Element not ready yet

    // Get toggle states safely using NEW IDs
    const isRyanActive = document.getElementById('ryanConditionToggle')?.checked;
    const isIvanActive = document.getElementById('ivanConditionToggle')?.checked;
    const isCarlActive = document.getElementById('carlConditionToggle')?.checked;
    const isInitiatingJAActive = document.getElementById('jointAttentionToggle')?.checked;
    const isRespondingJAActive = document.getElementById('respondingJointAttentionToggle')?.checked;
    const isKnowledge80Active = document.getElementById('knowledge80Toggle')?.checked;
    const isKnowledge20Active = document.getElementById('knowledge20Toggle')?.checked;

    // Construct status text using NEW condition names
    let statusText = "Cond: ";
    if (isRyanActive) statusText += "Ryan | "; // Updated Name
    else if (isIvanActive) statusText += "Ivan | "; // Updated Name
    else if (isCarlActive) statusText += "Carl | ";
    else statusText += "None | ";

    statusText += "Behav: ";
    if (currentBehavior) {
      statusText += `${currentBehavior.name} `;
      if (currentBehavior instanceof MutualGaze && currentBehavior.gazeAversion?.aversionFixation) {
         statusText += "(Averting) ";
      } else if (currentBehavior.phase) { // For JA behaviors
         statusText += `(${currentBehavior.phase}) `;
      }
    } else {
      statusText += context.userInFront ? "Idle (User)" : "Idle ";
    }

    statusText += "| IJA:" + (isInitiatingJAActive ? 'ON' : 'OFF');
    statusText += " RJA:" + (isRespondingJAActive ? 'ON' : 'OFF');

    if (isKnowledge80Active) statusText += " K:80%";
    else if (isKnowledge20Active) statusText += " K:20%";
    else statusText += " K:---";

    statusText += " | User:" + (context.userInFront ? 'Y' : 'N');
    statusText += " Faces:" + (context.secondFaceX !== null ? '2' : (context.userInFront ? '1' : '0'));
    statusText += " Head:" + context.headDirection;

    statusElement.innerText = statusText;
}

// --- Keyboard Input Listener ---
// (No changes needed here for Ryan/Ivan renaming)
document.addEventListener('keydown', (e) => {
    const jointAttentionToggle = document.getElementById('jointAttentionToggle');
    const carlToggle = document.getElementById('carlConditionToggle');

    if (!jointAttentionToggle || !jointAttentionToggle.checked || (carlToggle && carlToggle.checked)) {
        return;
    }
    if (currentBehavior instanceof InitiatingJointAttention || currentBehavior instanceof RespondingJointAttention) {
        console.log("gaze-controller: Ignoring keydown, JA already in progress.");
        return;
    }
    let direction = null;
    if (e.key === 'ArrowLeft') direction = "left";
    else if (e.key === 'ArrowRight') direction = "right";

    if (direction) {
        console.log(`gaze-controller: Keydown ${e.key} - Triggering Initiating JA ${direction}`);
        currentBehavior = new InitiatingJointAttention(direction);
        // Optional: Send log via sendGCSLogMessage(...)
    }
});


// --- Global Exports ---
// Expose globally the function that messaging.js needs to call
window.handleCardRevealed = handleCardRevealed;
// Expose start function globally for index.html (or ui-handler.js) to call
window.startGazeLoop = startGazeLoop;
// Expose context globally if other modules absolutely need direct access (Use with caution)
window.gazeContext = context; // Example name

console.log("gaze-controller.js loaded");