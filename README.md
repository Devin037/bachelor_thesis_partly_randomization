
This respository shows a potential version for an experiment that is executed in purpose of my bachelor thesis for the investigation of initiating joint attention in human-robot-interaction.

Gaze-Contingent Card Sorting Experiment

Overview
This project implements a web-based card sorting game designed for user studies. Participants sort cards displaying true/false statements into categories. The system integrates a Gaze Control System (GCS) to potentially track user gaze and adapt robot behavior accordingly. All participant interactions, gaze data (inferred), robot states, and timing information are logged via a central WebSocket server.

Components
The project is divided into three main parts:

Sorting Game (sortingGame/)

    Interface: A web-based card sorting interface built with HTML (game.html), CSS (styles.css), and JavaScript (game.js).
    Gameplay:
    Loads true/false questions from sortingGame/quiz_question.csv.
    Requires participants to enter an ID before starting.
    Presents questions across three distinct rounds, plus an optional "Practice Session" using questions marked "test" in the CSV.
    Users click a card to reveal the question, then drag and drop it to either the left or right drop zone corresponding to the categories (e.g., True/False).
    Features dynamic font sizing to fit question text on cards.
    Uses robust CSV parsing to handle commas within questions correctly.
    Communication: Connects to the WebSocket server (server.py) to send game events like cardReveal (when a card is clicked) and cardDropped (when a card is placed in a drop zone). Note: No messages        are sent during the Practice Session.




Gaze Control System (gcs/)

Purpose: Designed to analyze user visual attention, likely using computer vision.
Core Logic: Assumed to be primarily within perception.py (not provided in chat, but implied by folder structure and dependencies). This script uses libraries like mediapipe and opencv-python for tasks such as gaze tracking or head pose estimation.
Dependencies: Requires its own virutal environment (venv) with specific libraries like mediapipe, opencv-python, and websockets.
Communication: Connects as a client to the WebSocket server (server.py). It receives forwarded cardReveal messages from the server, performs its analysis, determines relevant metrics (gazeDecision), potentially decides on a robot behavior state (Robot condition: e.g., "Peter condition", "Carl condition", "default"), and sends this information back to the server (e.g., via a RobotsMove message).
Other Files: Contains related assets or front-end components (index.html, css/, js/, robot_faces/), suggesting potential visualization or configuration interfaces.





WebSocket Server (server.py)

Role: Acts as the central communication hub and data logger, located in the project root directory.
Technology: Built using Python and the websockets library.
Functionality: Manages WebSocket connections from the Sorting Game client and the GCS client(s).
Receives various event messages (cardReveal, cardDropped, RobotsMove, etc.).
Routes cardReveal messages from the game client to the GCS client.
Aggregates data for each card turn, combining information from the game (question details, participant choice) and the GCS (gaze decision, robot state).
Calculates move_duration: Measures the time between the cardReveal and cardDropped events for each card.
Applies Conditional Logic: Specifically subtracts 2 seconds from the move_duration if the logged Robot condition is the "Carl condition" (ensure the exact string "Carl condition" in the code matches the data).
Logs Data: Once all required pieces of information for a card turn are received, it writes a combined record to gaze_log.csv.



How it Works (Interaction Flow)

The server.py script is started.
The gcs/perception.py script (or equivalent) is started and connects to the server (NOTE: the venv has to be started first in the gcs folder).
The researcher opens sortingGame/game.html in their browser. game.js connects to the server.
The reseracher opens gcs/index.html in their browser, likely on a different device through the same local network or through another window on the computer. 
In game.html:
  User enters Participant ID.
  User starts a round or practice session.
  User clicks a card (cardReveal event sent from game.js to server.py).

server.py: (records the reveal time and forwards the cardReveal message to the gcs client.

gcs performs analysis based on the revealed card/user gaze and sends its findings (e.g., RobotsMove event with gazeDecision, Robot condition) to server.py.
server.py updates its internal record for that card with the gcs data.
User drags and drops the card (cardDropped event sent from game.js to server.py).
server.py records the drop time, calculates the move_duration, and updates the record with the participant's choice (participants_side_choice).
server.py checks if the record is complete (contains necessary info from both game and GCS).
If complete, server.py adjusts the move_duration if the "Carl condition" applies.
server.py writes the final, aggregated data row to gaze_log.csv.


