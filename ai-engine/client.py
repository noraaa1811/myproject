import asyncio
import json
import websockets
import threading

class WebSocketClient:
    def __init__(self, uri="ws://localhost:4000/ai"):
        self.uri = uri
        self.websocket = None
        self.connected = False
        self.loop = None
        self.thread = None
        
        # Start background event loop for websockets to prevent blocking CV loop
        self.thread = threading.Thread(target=self._start_event_loop, daemon=True)
        self.thread.start()

    def _start_event_loop(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._lifecycle_handler())

    async def _lifecycle_handler(self):
        """
        Manages the WebSocket connection lifecycle, performing automatic reconnects.
        """
        while True:
            try:
                print(f"[WS Client] Connecting to {self.uri}...")
                async with websockets.connect(self.uri) as ws:
                    self.websocket = ws
                    self.connected = True
                    print("[WS Client] Connection established with Backend Server.")
                    
                    # Keep connection alive, listen for any messages or disconnection
                    while True:
                        try:
                            msg = await ws.recv()
                            # Optional: Handle messages from backend if required
                        except websockets.ConnectionClosed:
                            break
            except Exception as e:
                print(f"[WS Client] Connection error: {e}. Retrying in 5s...")
                self.connected = False
                self.websocket = None
            
            await asyncio.sleep(5)

    def send_state(self, state_dict: dict):
        """
        Submits a state payload to the WebSocket stream in the background thread.
        """
        if not self.connected or not self.websocket or not self.loop:
            return
            
        # Schedule the coroutine on the background event loop
        asyncio.run_coroutine_threadsafe(
            self._send_payload(state_dict), 
            self.loop
        )

    async def _send_payload(self, state_dict: dict):
        try:
            payload = {
                "type": "FRAME_UPDATE",
                "timestamp": asyncio.get_event_loop().time(),
                "payload": state_dict
            }
            await self.websocket.send(json.dumps(payload))
        except Exception as e:
            print(f"[WS Client] Failed to transmit frame payload: {e}")

if __name__ == "__main__":
    import time
    # Quick test client
    client = WebSocketClient()
    time.sleep(2) # let it try to connect
    client.send_state({"status": "testing"})
    print("Sent test state.")
    time.sleep(2)
