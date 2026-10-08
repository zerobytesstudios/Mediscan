"""WebSocket endpoint for live chat and WebRTC call signaling.

Client -> server payloads:
  {"type": "message", "conversation_id": int, "content": str}
  {"type": "typing", "conversation_id": int}
  Signal payloads below all carry "to_user_id" + "call_id":
  {"type": "call-offer", ...  "offer": {...}}
  {"type": "call-answer", ... "answer": {...}}
  {"type": "call-ice", ...    "candidate": {...}}
  {"type": "call-decline", ...}
  {"type": "call-cancel", ...}
  {"type": "call-end", ...}

Server -> client:
  {"type": "message", "message": {...}}          (broadcast to both participants)
  {"type": "typing", "conversation_id": int, "user_id": int}
  {"type": "call-offer"/"call-answer"/"call-ice"/"call-decline"/"call-end"/"call-cancel",
   ...forwarded..., "from_user_id": int}
  {"type": "call-failed", "call_id": str, "reason": str}
  {"type": "error", "detail": str}
"""
import logging

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect

from app.database import SessionLocal
from app.models import Conversation, User
from app.services import chat as chat_service
from app.utils.security import decode_access_token

logger = logging.getLogger("mediscan.chat")


class ChatManager:
    def __init__(self) -> None:
        self._sockets: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, socket: WebSocket) -> None:
        await socket.accept()
        self._sockets.setdefault(user_id, set()).add(socket)

    async def disconnect(self, user_id: int, socket: WebSocket) -> None:
        sockets = self._sockets.get(user_id)
        if sockets:
            sockets.discard(socket)
            if not sockets:
                self._sockets.pop(user_id, None)

    def online(self, user_id: int) -> bool:
        return bool(self._sockets.get(user_id))

    async def send_to_user(self, user_id: int, payload: dict) -> bool:
        sockets = self._sockets.get(user_id)
        if not sockets:
            return False
        for socket in list(sockets):
            try:
                await socket.send_json(payload)
            except Exception:
                sockets.discard(socket)
        return True

    async def broadcast(self, user_ids: list[int], payload: dict) -> None:
        for user_id in user_ids:
            await self.send_to_user(user_id, payload)

    async def send_call_failed(self, caller_id: int, call_id: str, reason: str) -> None:
        await self.send_to_user(
            caller_id, {"type": "call-failed", "call_id": call_id, "reason": reason}
        )


manager = ChatManager()


def _load_user(db, socket: WebSocket, token: str) -> User | None:
    try:
        payload = decode_access_token(token)
    except Exception:
        return None
    user = db.get(User, int(payload.get("sub", 0)))
    if user is None or not user.is_active:
        return None
    return user


async def _handle_message(db, sender: User, payload: dict) -> None:
    conversation = chat_service.get_conversation_for_user(
        db, int(payload.get("conversation_id", 0)), sender
    )
    # HTTP APIs raise HTTPException; translate to clean WebSocket errors.
    try:
        message = chat_service.add_message(db, conversation, sender, str(payload.get("content", "")))
    except Exception as exc:
        reason = str(getattr(exc, "detail", exc))
        await manager.send_to_user(sender.id, {"type": "error", "detail": reason})
        return

    outgoing = {
        "type": "message",
        "message": chat_service.to_message_out(message),
        "conversation_id": conversation.id,
        "sender_id": sender.id,
    }
    await manager.broadcast(
        [conversation.doctor_user_id, conversation.patient_user_id], outgoing
    )


async def _handle_typing(db, sender: User, payload: dict) -> None:
    try:
        conversation = chat_service.get_conversation_for_user(
            db, int(payload.get("conversation_id", 0)), sender
        )
    except Exception:
        return
    other_id = chat_service.other_participant_id(conversation, sender.id)
    await manager.send_to_user(
        other_id,
        {"type": "typing", "conversation_id": conversation.id, "user_id": sender.id},
    )


async def route_signal(sender: User, payload: dict) -> None:
    """Forward WebRTC signaling payloads between conversation participants."""
    signal_type = payload.get("type")
    to_user_id = payload.get("to_user_id")
    call_id = payload.get("call_id")
    if not to_user_id or not call_id:
        await manager.send_to_user(sender.id, {"type": "error", "detail": "Missing signal target."})
        return

    deliverable = {key: value for key, value in payload.items()}
    deliverable["from_user_id"] = sender.id
    delivered = await manager.send_to_user(int(to_user_id), deliverable)
    if not delivered and signal_type in {"call-offer", "call-cancel"}:
        await manager.send_call_failed(
            sender.id, str(call_id), "The other person is not online right now."
        )


def register_websocket(app: FastAPI) -> None:
    @app.websocket("/api/ws/chat")
    async def websocket_chat(
        socket: WebSocket, token: str = Query("", alias="token")
    ) -> None:
        db = SessionLocal()
        user = _load_user(db, socket, token)
        if user is None:
            await socket.close(code=4401, reason="Unauthorized")
            db.close()
            return

        await manager.connect(user.id, socket)
        try:
            while True:
                payload = await socket.receive_json()
                message_type = payload.get("type")

                if message_type == "ping":
                    await socket.send_json({"type": "pong"})
                elif message_type == "message":
                    await _handle_message(db, user, payload)
                elif message_type == "typing":
                    await _handle_typing(db, user, payload)
                elif message_type in {
                    "call-offer",
                    "call-answer",
                    "call-ice",
                    "call-decline",
                    "call-cancel",
                    "call-end",
                }:
                    await route_signal(user, payload)
                # ignore unknown types silently.
        except WebSocketDisconnect:
            pass
        except Exception as exc:  # malformed frames, JSON errors
            logger.warning("websocket error for user=%s: %s", user.id, exc)
        finally:
            await manager.disconnect(user.id, socket)
            db.close()