// gcs/js/messaging.js
"use strict";

/************************************************************
 * WebSocket Communication Handler for GCS
 * Manages connections to Perception (8766) and Logging (8765) servers.
 * Handles receiving perception data, game events, and triggering condition switches.
 ************************************************************/

// --- Configuration ---
const PERCEPTION_WS_URL = 'ws://192.168.178.44:8766';
const LOGGING_WS_URL = 'ws://192.168.178.44:8765';

// --- State ---
let perceptionWs = null;
let loggingWs = null;
let loggingMessageQueue = [];

// --- Perception WebSocket (Port 8766) ---

function connectPerceptionWebSocket() {
    console.log("Attempting to connect Perception WebSocket to:", PERCEPTION_WS_URL);
    perceptionWs = new WebSocket(PERCEPTION_WS_URL);

    perceptionWs.onopen = () => {
        console.log("Perception WebSocket connected (8766).");
    };

    perceptionWs.onmessage = (message) => {
        try {
            const data = JSON.parse(message.data);
            // console.log("[Perception WS] Received:", data); // Verbose

            // --- Update Shared Context ---
            // Assumes 'context' object is defined globally by gaze-controller.js
            if (data.event === 'faceDetection' && typeof context !== 'undefined') {
                context.userInFront = data.userInFront;
                context.faceX = (data.faceX !== undefined && data.faceX !== null) ? data.faceX : 0.5;
                context.faceY = (data.faceY !== undefined && data.faceY !== null) ? data.faceY : 0.5;
                context.secondFaceX = (data.secondFaceX !== undefined && data.secondFaceX !== null) ? data.secondFaceX : null;
                context.secondFaceY = (data.secondFaceY !== undefined && data.secondFaceY !== null) ? data.secondFaceY : null;
                context.headDirection = (data.headDirection !== undefined && data.headDirection !== null) ? data.headDirection : "none";
            }
            // No longer handling 'cardReveal' here

        } catch (err) {
            console.error("Error parsing Perception WebSocket message:", err, message.data);
        }
    };

    perceptionWs.onerror = (error) => {
        console.error("Perception WebSocket error:", error);
    };

    perceptionWs.onclose = (event) => {
        console.log("Perception WebSocket connection closed:", event.code, event.reason);
        perceptionWs = null;
        // Optional: Implement reconnection logic
    };
}


// --- Logging WebSocket (Port 8765) ---

function connectLoggingWebSocket() {
    console.log("Attempting to connect Logging WebSocket to:", LOGGING_WS_URL);
    loggingWs = new WebSocket(LOGGING_WS_URL);

    loggingWs.onopen = () => {
        console.log("Logging WebSocket connected (8765).");
        // Send any queued messages
        while (loggingMessageQueue.length > 0) {
            const msg = loggingMessageQueue.shift();
             if (typeof sendGCSLogMessage === 'function') {
                 sendGCSLogMessage(msg);
             } else { /* ... error handling ... */ }
        }
    };

    loggingWs.onmessage = (message) => {
        try {
            const data = JSON.parse(message.data);
            console.log("[Logging WS] Received:", data);

            // --- Handle cardReveal events ---
            if (data.event === 'cardReveal') {
                console.log("[Logging WS] Processing cardReveal event:", data);
                // Call the handler function defined in gaze-controller.js
                if (typeof handleCardRevealed === 'function') {
                    handleCardRevealed(data);
                } else {
                    console.error("handleCardRevealed function not found when receiving cardReveal event via Logging WS!");
                }
            }
            // =======================================================
            // == Handle startRound event w/ NEW Randomized Logic   ==
            // =======================================================
            else if (data.event === 'startRound') {
                 console.log("[Logging WS] Processing startRound event:", data);
                 const startingRound = data.round;

                 // --- Check if initial condition was selected (state from gaze-controller.js) ---
                 // Assumes initialCondition is globally accessible or via a state module
                 if (initialCondition === null) {
                     console.warn("startRound received but no initial condition selected by user yet!");
                     // Show the prompt again forcefully
                     const promptModal = document.getElementById('activationPromptModal');
                     if(promptModal) promptModal.style.display = 'flex';
                     return; // Stop processing this event
                 }

                 let nextCondition = null;
                 const conditions = ['ryan', 'ivan', 'carl']; // Use the correct internal names

                 // --- Logic for Round 2 (First automatic switch) ---
                 // Check secondCondition to prevent re-triggering if message duplicates or logic reruns
                 if (startingRound === 2 && secondCondition === null) {
                     // Find the two conditions NOT initially selected
                     const remainingConditions = conditions.filter(c => c !== initialCondition);
                     if (remainingConditions.length === 2) {
                         // Randomly pick one of the two remaining
                         nextCondition = remainingConditions[Math.floor(Math.random() * 2)];
                         secondCondition = nextCondition; // Store the choice (global state)
                         if (typeof conditionSequence !== 'undefined') conditionSequence.push(secondCondition); // Add to sequence if tracking
                         console.log(`startRound 2: Initial was ${initialCondition}. Randomly chose ${secondCondition} from [${remainingConditions.join(', ')}].`);
                     } else {
                         console.error("startRound 2: Error determining remaining conditions. Remaining:", remainingConditions);
                         return;
                     }
                 }
                 // --- Logic for Round 3 (Second automatic switch) ---
                 else if (startingRound === 3) {
                     // Ensure we have the first two conditions set
                     if (initialCondition !== null && secondCondition !== null) {
                         // Find the single condition not yet used
                         const remainingConditions = conditions.filter(c => c !== initialCondition && c !== secondCondition);
                         if (remainingConditions.length === 1) {
                             nextCondition = remainingConditions[0];
                              if (typeof conditionSequence !== 'undefined') conditionSequence.push(nextCondition); // Add to sequence
                             console.log(`startRound 3: Sequence was [${initialCondition}, ${secondCondition}]. Choosing last remaining: ${nextCondition}.`);
                         } else {
                             // This could happen if round 3 message arrives before round 2 finished processing? Or duplicate messages.
                             console.error("startRound 3: Error determining the single remaining condition. Remaining:", remainingConditions, "Sequence so far:", conditionSequence);
                             return;
                         }
                     } else {
                          console.error("startRound 3: Cannot determine next condition because initial or second condition is missing.");
                          return;
                     }
                 } // End Round 3 Logic

                 // --- Activate the Chosen Toggle ---
                 if (nextCondition) {
                     let targetToggle = null;
                     // Get toggle elements using their correct IDs
                     if (nextCondition === 'ryan') targetToggle = document.getElementById('ryanConditionToggle');
                     else if (nextCondition === 'ivan') targetToggle = document.getElementById('ivanConditionToggle');
                     else if (nextCondition === 'carl') targetToggle = document.getElementById('carlConditionToggle');

                     if (targetToggle) {
                         // Only trigger if not already checked (important for round 3 if Carl was manually selected in round 2)
                         if (!targetToggle.checked) {
                             console.log(`startRound ${startingRound}: Activating ${nextCondition} condition programmatically.`);
                             targetToggle.checked = true;
                             // Dispatch change event to trigger UI updates in ui-handler.js
                             targetToggle.dispatchEvent(new Event('change', { bubbles: true }));
                         } else {
                              console.log(`startRound ${startingRound}: Target condition ${nextCondition} was already active.`);
                         }
                     } else {
                         console.error(`startRound ${startingRound}: Could not find toggle element for calculated next condition "${nextCondition}"! Check element IDs.`);
                     }
                 } else if (startingRound > 1) { // Don't log warning for round 1 start if no action needed
                      console.log(`startRound ${startingRound}: No condition change needed or already handled for this round.`);
                 }

            } // --- End of startRound handling ---
            // =======================================================
            else {
                // Handle status messages or other events from the server
                 if (data.status) {
                    console.log(`[Server Status via Logging WS] ${data.status} ${data.message || ''}`);
                 } else {
                     console.log("[Logging WS] Received unhandled message type:", data.event || 'Unknown', data);
                 }
            }

        } catch (err) {
            console.error("Error parsing Logging WebSocket message:", err, message.data);
        }
    }; // End onmessage

    loggingWs.onerror = (error) => {
        console.error("Logging WebSocket error:", error);
    };

    loggingWs.onclose = (event) => {
        console.log("Logging WebSocket connection closed:", event.code, event.reason);
        loggingWs = null;
        // Optional: Implement reconnection logic
    };
} // End connectLoggingWebSocket


/**
 * Sends a message object via the Logging WebSocket connection (8765).
 * Queues the message if the connection is not yet open.
 * @param {object} message The message object to send.
 */
function sendGCSLogMessage(message) {
    if (loggingWs && loggingWs.readyState === WebSocket.OPEN) {
        try {
           loggingWs.send(JSON.stringify(message));
           console.log("[Logging WS] Sent: ", message);
        } catch (e) {
           console.error("Error sending Logging WS message:", e, message);
           loggingMessageQueue.push(message); // Re-queue on send error
        }
    } else {
        console.warn("[Logging WS] Connection not open. Queuing message:", message);
        loggingMessageQueue.push(message);
         if (!loggingWs) {
             console.error("Logging WebSocket not initiated. Cannot send/queue reliably.");
             // connectLoggingWebSocket(); // Cautious about auto-reconnect loops
         }
    }
}

// --- Initialization ---
// Expose the sending function globally for other scripts (like gaze-controller) to use
window.sendGCSLogMessage = sendGCSLogMessage;

// Attempt to connect both WebSockets when the script loads
connectPerceptionWebSocket();
connectLoggingWebSocket();