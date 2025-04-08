// gcs/js/ui-handler.js
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  console.log("ui-handler.js: DOMContentLoaded");

  // --- Call Gaze Loop Start ---
  if (typeof startGazeLoop === 'function') {
      startGazeLoop();
      console.log("ui-handler.js: startGazeLoop() called.");
  } else {
      console.error("ui-handler.js: startGazeLoop function not found! Ensure gaze-controller.js is loaded first.");
  }

  // --- Collapsible Control Panel ---
  const controlPanelHeader = document.getElementById('controlPanelHeader');
  const controlPanelContent = document.getElementById('controlPanelContent');
  let panelOpen = true;

  if(controlPanelHeader && controlPanelContent) {
    controlPanelHeader.addEventListener('click', () => {
      panelOpen = !panelOpen;
      controlPanelContent.style.display = panelOpen ? 'block' : 'none';
      controlPanelHeader.innerHTML = panelOpen ? 'Controls &#9660;' : 'Controls &#9650;';
    });
  } else {
      console.error("ui-handler.js: Control panel header or content element not found!");
  }

  // --- Get References to Elements ---
  const ryanToggle = document.getElementById('ryanConditionToggle');
  const ivanToggle = document.getElementById('ivanConditionToggle');
  const carlToggle = document.getElementById('carlConditionToggle');
  const jointAttentionToggle = document.getElementById('jointAttentionToggle');
  const respondingJointAttentionToggle = document.getElementById('respondingJointAttentionToggle');
  const knowledge80Toggle = document.getElementById('knowledge80Toggle');
  const knowledge20Toggle = document.getElementById('knowledge20Toggle');
  const activationPromptModal = document.getElementById('activationPromptModal'); // Get prompt modal

  // Check elements found
  if (!ryanToggle || !ivanToggle || !carlToggle || !jointAttentionToggle || !respondingJointAttentionToggle || !knowledge80Toggle || !knowledge20Toggle || !activationPromptModal) {
      console.error("ui-handler.js: One or more elements (toggles or activation prompt modal) could not be found by ID!");
  } else {
      console.log("ui-handler.js: All toggle and modal elements found.");
  }

  // --- Helper Function for Default Styling ---
  function applyDefaultStyles() {
    console.log("ui-handler.js: Applying default styles (no condition active).");
    document.body.style.backgroundImage = "url('../gcs/robot_faces/Robot8.png')";
    document.body.style.backgroundSize = "1000px";
    const eyesContainer = document.querySelector('.eyes-container');
    if (eyesContainer) {
        eyesContainer.style.marginBottom = "90px";
        eyesContainer.style.gap = "100px";
    }
    document.querySelectorAll('.eye').forEach(el => {
      el.style.background = "radial-gradient(circle at center, #f5f5f5, #bbb)";
    });
  }

  // --- Helper Function to Hide Prompt ---
  function hideActivationPrompt() {
      if (activationPromptModal && activationPromptModal.style.display !== 'none') {
          activationPromptModal.style.display = 'none';
          console.log("ui-handler.js: Activation prompt hidden.");
      }
  }

  // --- Event Listeners for Behavior Toggles (Interactions with Carl) ---
  if (knowledge80Toggle && knowledge20Toggle && carlToggle) {
      knowledge80Toggle.addEventListener('change', function() { /* ... existing logic ... */ });
      knowledge20Toggle.addEventListener('change', function() { /* ... existing logic ... */ });
  } else { /* ... error log ... */ }

  if (jointAttentionToggle && respondingJointAttentionToggle && carlToggle) {
      jointAttentionToggle.addEventListener('change', function() { /* ... existing logic ... */ });
      respondingJointAttentionToggle.addEventListener('change', function() { /* ... existing logic ... */ });
  } else { /* ... error log ... */ }


  // --- Condition Toggle Logic (Handling manual clicks - MODIFIED for prompt & initial state) ---
  if (ryanToggle && ivanToggle && carlToggle && jointAttentionToggle && respondingJointAttentionToggle && knowledge80Toggle && knowledge20Toggle) {

      // --- Ryan Condition Listener ---
      ryanToggle.addEventListener('change', function() {
        console.log("ui-handler.js: >>> Ryan Toggle 'change' handler fired! Checked:", this.checked);
        if (this.checked) {
          hideActivationPrompt(); // Hide prompt
          // Set initial condition ONCE (checks global variable from gaze-controller.js)
          if (initialCondition === null) {
              initialCondition = 'ryan';
              conditionSequence = ['ryan'];
              console.log("ui-handler.js: Initial condition set to Ryan.");
          }
          // Uncheck others, set behaviors, apply styles
          ivanToggle.checked = false;
          carlToggle.checked = false;
          jointAttentionToggle.checked = true;
          knowledge80Toggle.checked = true;
          knowledge20Toggle.checked = false;
          respondingJointAttentionToggle.checked = false;
          console.log("ui-handler.js: Ryan Condition activated: IJA/K80 enabled.");
          document.body.style.backgroundImage = "url('../gcs/robot_faces/Robot8.png')";
          document.body.style.backgroundSize = "1000px";
          const eyesContainer = document.querySelector('.eyes-container');
          if (eyesContainer) { eyesContainer.style.marginBottom = "90px"; eyesContainer.style.gap = "100px"; }
          document.querySelectorAll('.eye').forEach(el => { el.style.background = "radial-gradient(circle at center, #f5f5f5, #bbb)"; });
        } else {
          setTimeout(() => {
              if (!ivanToggle.checked && !carlToggle.checked) { applyDefaultStyles(); }
          }, 0);
          console.log("ui-handler.js: Ryan Condition deactivated.");
        }
      });

      // --- Ivan Condition Listener ---
      ivanToggle.addEventListener('change', function() {
        console.log("ui-handler.js: >>> Ivan Toggle 'change' handler fired! Checked:", this.checked);
        if (this.checked) {
          hideActivationPrompt(); // Hide prompt
          // Set initial condition ONCE
          if (initialCondition === null) {
              initialCondition = 'ivan';
              conditionSequence = ['ivan'];
              console.log("ui-handler.js: Initial condition set to Ivan.");
          }
          // Uncheck others, set behaviors, apply styles
          ryanToggle.checked = false;
          carlToggle.checked = false;
          jointAttentionToggle.checked = true;
          knowledge20Toggle.checked = true;
          knowledge80Toggle.checked = false;
          respondingJointAttentionToggle.checked = false;
          console.log("ui-handler.js: Ivan condition activated: IJA/K20 enabled.");
          document.body.style.backgroundImage = "url('../gcs/robot_faces/Robot6.jpg')";
          document.body.style.backgroundSize = "1000px";
          const eyesContainer = document.querySelector('.eyes-container');
          if (eyesContainer) { eyesContainer.style.marginBottom = "155px"; eyesContainer.style.gap = "100px"; }
          document.querySelectorAll('.eye').forEach(el => { el.style.background = "radial-gradient(circle at center, #f5f5f5, #aaa)"; });
        } else {
          setTimeout(() => {
              if (!ryanToggle.checked && !carlToggle.checked) { applyDefaultStyles(); }
          }, 0);
          console.log("ui-handler.js: Ivan condition deactivated.");
        }
      });

      // --- Carl Condition Listener ---
      carlToggle.addEventListener('change', function() {
        console.log("ui-handler.js: >>> Carl Toggle 'change' handler fired! Checked:", this.checked);
        if (this.checked) {
          hideActivationPrompt(); // Hide prompt
          // Set initial condition ONCE
          if (initialCondition === null) {
              initialCondition = 'carl';
              conditionSequence = ['carl'];
              console.log("ui-handler.js: Initial condition set to Carl.");
          }
          // Uncheck others, disable behaviors, apply styles
          ryanToggle.checked = false;
          ivanToggle.checked = false;
          jointAttentionToggle.checked = false;
          respondingJointAttentionToggle.checked = false;
          knowledge80Toggle.checked = false;
          knowledge20Toggle.checked = false;
          console.log("ui-handler.js: Carl Condition activated: All other behavior toggles disabled.");
          document.body.style.backgroundImage = "url('../gcs/robot_faces/Robot7.jpg')";
          document.body.style.backgroundSize = "800px";
          const eyesContainer = document.querySelector('.eyes-container');
          if (eyesContainer) { eyesContainer.style.marginBottom = "45px"; eyesContainer.style.gap = "100px"; }
          document.querySelectorAll('.eye').forEach(el => { el.style.background = "radial-gradient(circle at center, #f5f5f5, #bbb)"; });
        } else {
          setTimeout(() => {
             if (!ryanToggle.checked && !ivanToggle.checked) { applyDefaultStyles(); }
          }, 0);
          console.log("ui-handler.js: Carl Condition deactivated.");
        }
      });

      // --- Initial State Check: Show prompt if needed ---
      if (!ryanToggle.checked && !ivanToggle.checked && !carlToggle.checked) {
          applyDefaultStyles(); // Apply visual default
          console.log("ui-handler.js: Initialized. No condition active.");
          // Show the prompt
          if(activationPromptModal) {
              activationPromptModal.style.display = 'flex';
              console.log("ui-handler.js: Activation prompt shown.");
          }
      } else {
          // If loaded with a condition already checked (e.g., browser refresh state)
          hideActivationPrompt(); // Ensure prompt is hidden
          // Set initialCondition if it wasn't already set (use let defined in gaze-controller)
           if (initialCondition === null) {
              if(ryanToggle.checked) { initialCondition = 'ryan'; if(typeof conditionSequence !== 'undefined') conditionSequence = ['ryan']; }
              else if(ivanToggle.checked) { initialCondition = 'ivan'; if(typeof conditionSequence !== 'undefined') conditionSequence = ['ivan']; }
              else if(carlToggle.checked) { initialCondition = 'carl'; if(typeof conditionSequence !== 'undefined') conditionSequence = ['carl']; }
              console.log(`ui-handler.js: Initial condition set from pre-checked toggle: ${initialCondition}`);
              // Ensure styles consistent with checked state by re-triggering change
              if(initialCondition === 'ryan') ryanToggle.dispatchEvent(new Event('change'));
              else if(initialCondition === 'ivan') ivanToggle.dispatchEvent(new Event('change'));
              else if(initialCondition === 'carl') carlToggle.dispatchEvent(new Event('change'));
           }
      }

  } else {
      console.error("ui-handler.js: Cannot add condition toggle listeners - element(s) missing.");
  }

}); // End DOMContentLoaded listener