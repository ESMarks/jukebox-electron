import socket
import os
import time
import threading

UPDATE_SOCKET = "/tmp/jukebox_updates.sock"
COMMAND_SOCKET = "/tmp/jukebox_commands.sock"

# Clean up the socket if it already exists
def cleanup(path):
    try:
        os.remove(path)
    except FileNotFoundError:
        pass

def command_listener():
    cleanup(COMMAND_SOCKET)
    srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    srv.bind(COMMAND_SOCKET)
    srv.listen(5)
    print(f"[+] Listening for commands on {COMMAND_SOCKET}")
    try:
        while True:
            conn, _ = srv.accept()
            with conn:
                data = conn.recv(1024)
                if data:
                    print(f"[<] Command received: {data.decode('utf-8')}")
                # once the client closes the socket, conn.recv() will return b'' 
                # and we’ll simply go back to accept() for the next client
    except KeyboardInterrupt:
        pass
    finally:
        srv.close()
        cleanup(COMMAND_SOCKET)

def main():
    # Clean up and start update socket
    cleanup(UPDATE_SOCKET)
    upd_srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    upd_srv.bind(UPDATE_SOCKET)
    upd_srv.listen(1)

    # Start command‐listener thread
    t = threading.Thread(target=command_listener, daemon=True)
    t.start()

    print(f"[+] Waiting for UI to connect at {UPDATE_SOCKET}")
    conn, _ = upd_srv.accept()
    print("[+] UI connected!")
    time.sleep(5)

    try:
        while True:
            message = '{"type": "status", "message": {"MM1": "playing", "MM5": "idle", "MM6": "idle", "TI2": "idle"}}'
            conn.sendall(message.encode('utf-8'))
            print(f"[>] Sent: {message}")
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n[!] Shutting down.")
    finally:
        conn.close()
        upd_srv.close()
        cleanup(UPDATE_SOCKET)

if __name__ == "__main__":
    main()
