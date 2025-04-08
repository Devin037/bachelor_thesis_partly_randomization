import asyncio
import websockets
import json
import csv
import os
from datetime import datetime, timezone # Import timezone

CSV_FILENAME = 'gaze_log.csv'
# Updated header with renamed columns
CSV_HEADER = [
    'timestamp', 'participant', 'cardId', 'question',
    'difficulty', 'correct_answer', 'correct_side',
    'participants_side_choice', 'Robot', 'gazeDecision', 'move_duration'
]

# Global dictionary to store records keyed by cardId.
card_records = {}

def initialize_csv_file():
    """
    Create the CSV file with headers if it doesn't already exist.
    Uses the updated CSV_HEADER with renamed columns.
    """
    if not os.path.exists(CSV_FILENAME):
        with open(CSV_FILENAME, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=CSV_HEADER)
            writer.writeheader()
        print(f"CSV file {CSV_FILENAME} created with headers: {CSV_HEADER}")
    else:
        # Optional: Check if existing header matches
        try:
            with open(CSV_FILENAME, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                existing_header = next(reader, None)
                if existing_header and 'move_duration' not in existing_header:
                     print(f"Warning: CSV file exists but is missing the 'move_duration' column. New rows will have it.")
                elif existing_header and ('answer' in existing_header or 'side_choice' in existing_header or 'reveal_to_drop_duration_s' in existing_header):
                     print(f"Warning: CSV file seems to have old column names (e.g., 'answer', 'side_choice'). New data will use: {CSV_HEADER}")
                elif existing_header != CSV_HEADER:
                    print(f"Warning: CSV header mismatch or unexpected columns. Expected {CSV_HEADER}, found {existing_header}. Consider backing up the file.")
                else:
                    print(f"CSV file {CSV_FILENAME} already exists with correct headers.")
        except Exception as e:
            print(f"Could not read existing CSV header: {e}")


def write_combined_record(record):
    """
    Maps internal record keys to the final CSV header keys (including renames),
    adjusts move_duration based on Robot condition (-2s for 'Carl condition'),
    and writes the filtered record to the CSV.
    """
    record_timestamp = record.get('event_arrival_timestamp', datetime.now(timezone.utc))
    record['timestamp'] = record_timestamp.isoformat() # Store as ISO format string

    # --- Adjust move_duration based on Robot condition --- START ---

    # !! IMPORTANT: Replace "Carl condition" below with the EXACT string identifier !!
    # !! used in your 'Robot' data field for this specific condition.        !!
    carl_condition_identifier = "Carl condition" # <<< MODIFY THIS VALUE AS NEEDED

    robot_condition = record.get('Robot')           # Get the Robot condition value
    original_duration = record.get('move_duration') # Get the calculated duration

    final_duration = original_duration # Start with the original duration

    # Check if it's the Carl condition and if the duration is a valid number
    if robot_condition == carl_condition_identifier:
        if isinstance(original_duration, (int, float)):
            final_duration = original_duration - 2.0
            # Optional: Prevent duration from going below zero if desired
            # final_duration = max(0, final_duration)
            print(f"Adjusting duration for Carl condition (Card {record.get('cardId', 'N/A')}): {original_duration:.3f} -> {final_duration:.3f}")
        else:
            # Handle cases where duration wasn't calculated or is not a number
            print(f"Cannot adjust duration for Carl condition (Card {record.get('cardId', 'N/A')}): original duration invalid ({original_duration})")
            # Keep final_duration as the original non-numeric value (e.g., None or '')

    # --- Adjust move_duration based on Robot condition --- END ---


    # --- Map internal data keys to the final CSV Header keys ---
    filtered_record = {}
    for header_key in CSV_HEADER:
        if header_key == 'timestamp':
            filtered_record[header_key] = record.get('timestamp', '')
        elif header_key == 'correct_answer':
            filtered_record[header_key] = record.get('answer', '')
        elif header_key == 'participants_side_choice':
            filtered_record[header_key] = record.get('side_choice_raw', '')
        elif header_key == 'move_duration':
            # Format the final duration (original or adjusted) for the CSV
            duration_to_format = final_duration # Use the potentially adjusted value
            if isinstance(duration_to_format, (int, float)):
                 filtered_record[header_key] = f"{duration_to_format:.3f}" # Format to 3 decimals
            else:
                 filtered_record[header_key] = '' # Leave blank if not numeric
        elif header_key == 'correct_side':
             filtered_record[header_key] = record.get('side', '')
        else:
            # For other keys, assume header name matches internal key name
            filtered_record[header_key] = record.get(header_key, '')
    # --- End Mapping ---

    # --- CSV Writing Logic --- (Remains the same)
    try:
        with open(CSV_FILENAME, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=CSV_HEADER)
            csvfile.seek(0, os.SEEK_END)
            if csvfile.tell() == 0:
                 writer.writeheader()
            writer.writerow(filtered_record)
        print(f"Logged combined record for cardId {filtered_record.get('cardId', 'N/A')}")
    except IOError as e:
        print(f"Error writing to CSV file {CSV_FILENAME}: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during CSV writing: {e}")
    """
    Maps internal record keys to the final CSV header keys (including renames)
    and writes the filtered record to the CSV.
    """
    record_timestamp = record.get('event_arrival_timestamp', datetime.now(timezone.utc))
    record['timestamp'] = record_timestamp.isoformat() # Store as ISO format string

    filtered_record = {}
    for header_key in CSV_HEADER:
        if header_key == 'timestamp':
            filtered_record[header_key] = record.get('timestamp', '')
        elif header_key == 'correct_answer':
            filtered_record[header_key] = record.get('answer', '') # Map internal 'answer'
        elif header_key == 'participants_side_choice':
            filtered_record[header_key] = record.get('side_choice_raw', '') # Map internal 'side_choice_raw'
        elif header_key == 'move_duration':
            duration = record.get('move_duration', '') # Use new internal key 'move_duration'
            if isinstance(duration, (int, float)):
                 filtered_record[header_key] = f"{duration:.3f}"
            else:
                 filtered_record[header_key] = ''
        elif header_key == 'correct_side':
             filtered_record[header_key] = record.get('side', '') # Map internal 'side'
        else:
            filtered_record[header_key] = record.get(header_key, '')

    try:
        with open(CSV_FILENAME, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=CSV_HEADER)
            csvfile.seek(0, os.SEEK_END)
            if csvfile.tell() == 0:
                 writer.writeheader()
            writer.writerow(filtered_record)
        # Only print confirmation, content is in the file
        print(f"Logged combined record for cardId {filtered_record.get('cardId', 'N/A')}")
    except IOError as e:
        print(f"Error writing to CSV file {CSV_FILENAME}: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during CSV writing: {e}")


def record_complete(rec):
    """
    Check if the record contains all required keys using internal key names.
    """
    # Use internal keys: 'answer', 'side', 'side_choice_raw'
    required = ['cardId', 'side', 'answer', 'question', 'difficulty', 'side_choice_raw', 'Robot', 'gazeDecision']
    has_all_required = all(key in rec for key in required)
    return has_all_required


# Keep track of connected clients.
connected = set()

async def handler(websocket):
    print(f"Client connected: {websocket.remote_address}")
    connected.add(websocket)
    try:
        async for message in websocket:
            arrival_time = datetime.now(timezone.utc)
            # Shorten logged message to prevent excessive console output
            log_message = message[:150] + ('...' if len(message) > 150 else '')
            print(f"Message received from {websocket.remote_address} at {arrival_time.isoformat()}: {log_message}")

            try:
                data = json.loads(message)
                card_id = data.get('cardId')
                event_type = data.get('event')
                participant_name = data.get('participant', '')

                if card_id and card_id not in card_records:
                     card_records[card_id] = {}

                if card_id and participant_name:
                     card_records[card_id]['participant'] = participant_name

                if card_id:
                    # Store arrival time of this specific event
                    card_records[card_id]['event_arrival_timestamp'] = arrival_time

                # --- Process cardReveal events ---
                if event_type == 'cardReveal':
                    if card_id:
                         card_records[card_id]['reveal_timestamp'] = arrival_time # Store reveal time
                         print(f"Stored reveal timestamp for cardId {card_id}: {arrival_time.isoformat()}")

                         # Store relevant data using internal keys
                         data['side'] = data.get('side')
                         data['answer'] = data.get('answer')
                         card_records[card_id].update(data) # Update record with all fields from message


                         # <<< --- FORWARDING LOOP RE-ADDED --- >>>
                         print(f"Forwarding cardReveal for {card_id} to other clients...")
                         forward_tasks = []
                         for conn in connected.copy():
                            if conn != websocket: # Don't send back to original sender
                                try:
                                    # Use create_task for potentially better concurrency if needed,
                                    # but simple await is fine for moderate client numbers.
                                    # print(f"DEBUG: Sending to {conn.remote_address}: {message}") # Optional Debug
                                    await conn.send(message) # Send the original message string
                                except websockets.ConnectionClosed:
                                    print(f"Removing closed connection during forward: {conn.remote_address}")
                                    connected.remove(conn)
                                except Exception as e:
                                    print(f"Error sending message to {conn.remote_address}: {e}")
                         # <<< --- END OF RE-ADDED LOOP --- >>>

                         # Send status back to the original sender *after* attempting to forward
                         await websocket.send(json.dumps({"status": "cardReveal processed, stored, and forwarded"}))

                    else: # cardReveal missing cardId
                        print("Warning: cardReveal event received without cardId.")
                        await websocket.send(json.dumps({"status": "error", "message": "cardReveal missing cardId"}))
                    # Skip further processing for this message iteration
                    continue # IMPORTANT

                # --- Process cardDropped events ---
                elif event_type == 'cardDropped':
                    if card_id and card_id in card_records:
                        drop_time = arrival_time
                        print(f"Processing drop for cardId {card_id} at {drop_time.isoformat()}")

                        # Store choice using internal key 'side_choice_raw'
                        data['side_choice_raw'] = data.get('side_choice')
                        card_records[card_id].update(data)

                        # Calculate Duration using the internal key 'move_duration'
                        reveal_time = card_records[card_id].get('reveal_timestamp')
                        if reveal_time:
                            duration = drop_time - reveal_time
                            duration_seconds = duration.total_seconds()
                            card_records[card_id]['move_duration'] = duration_seconds
                            print(f"Calculated duration for cardId {card_id}: {duration_seconds:.3f}s")
                        else:
                            print(f"Warning: cardDropped received for cardId {card_id}, but no reveal_timestamp found.")
                            card_records[card_id]['move_duration'] = None # Use new key

                    elif not card_id: # cardDropped missing cardId
                        print("Warning: cardDropped event received without cardId.")
                        await websocket.send(json.dumps({"status": "error", "message": "cardDropped missing cardId"}))
                        continue # Skip completion check if no cardId
                    else: # card_id provided but not in card_records
                         print(f"Warning: cardDropped received for unknown cardId {card_id}. Storing partial data.")
                         data['side_choice_raw'] = data.get('side_choice')
                         card_records[card_id] = data
                         card_records[card_id]['move_duration'] = None


                # --- Process RobotsMove events ---
                elif event_type == 'RobotsMove':
                     if card_id and card_id in card_records:
                         # Update record directly, contains 'Robot', 'gazeDecision' etc.
                         card_records[card_id].update(data)
                     elif not card_id:
                         print("Warning: RobotsMove event received without cardId.")
                         await websocket.send(json.dumps({"status": "error", "message": "RobotsMove missing cardId"}))
                         continue # Skip completion check
                     else: # card_id provided but not in card_records
                         print(f"Warning: RobotsMove received for unknown cardId {card_id}. Storing partial data.")
                         card_records[card_id] = data


                # --- Check completion and log (now happens after any relevant event) ---
                if card_id and card_id in card_records:
                     # Pass the original record with internal keys to record_complete
                     if record_complete(card_records[card_id]):
                         print(f"Record complete for cardId {card_id}. Writing to CSV.")
                         write_combined_record(card_records[card_id]) # Handles mapping/filtering/writing
                         del card_records[card_id] # Clean up memory
                         # Send completion status *only* if not triggered by cardReveal (which sent its own status)
                         if event_type != 'cardReveal':
                              await websocket.send(json.dumps({"status": "combined record logged"}))
                     else:
                         # Send waiting status *only* if not triggered by cardReveal
                         if event_type != 'cardReveal':
                              await websocket.send(json.dumps({"status": f"{event_type} stored; waiting for additional info"}))

                # --- Broadcast any other messages ---
                elif event_type not in ['cardReveal', 'cardDropped', 'RobotsMove']:
                     print(f"Broadcasting unknown event type: {event_type}")
                     for conn in connected.copy():
                         if conn != websocket:
                             try:
                                 await conn.send(message)
                             except websockets.ConnectionClosed:
                                 print(f"Removing closed connection during broadcast: {conn.remote_address}")
                                 connected.remove(conn)
                             except Exception as e:
                                 print(f"Error broadcasting message to {conn.remote_address}: {e}")


            except json.JSONDecodeError:
                print(f"Error: Received non-JSON message: {message}") # Log full message on JSON error
            except Exception as e:
                import traceback
                print(f"Error processing message: {e}")
                print(traceback.format_exc()) # Print full traceback for unexpected errors
                print(f"Problematic Message Content (start): {message[:500]}")

    except websockets.ConnectionClosed as e:
        print(f"Client disconnected: {websocket.remote_address} - Code: {e.code}, Reason: {e.reason}")
    except Exception as e:
        import traceback
        print(f"An unexpected error occurred in the handler: {e}")
        print(traceback.format_exc())

    finally:
        connected.discard(websocket)
        print(f"Connection closed for {websocket.remote_address}. Remaining clients: {len(connected)}")


async def main():
    initialize_csv_file()
    server = await websockets.serve(handler, "0.0.0.0", 8765)
    print("WebSocket logging server started on ws://0.0.0.0:8765")
    await asyncio.Future() # Run forever

if __name__ == "__main__":
    asyncio.run(main())