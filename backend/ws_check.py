"""Manual WS check for Mediscan chat: message, typing, call signaling, offline call-failed."""
import asyncio
import json

import httpx
import websockets

BASE = "http://localhost:8080/api"
WS = "ws://localhost:8080/api/ws/chat"


async def login(client, email, password):
    r = await client.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


async def recv_until(ws, predicate, timeout=5):
    while True:
        frame = json.loads(await asyncio.wait_for(ws.recv(), timeout))
        if predicate(frame):
            return frame


async def main():
    async with httpx.AsyncClient(timeout=10) as client:
        pt = await login(client, "patient1.demo@mediscan.local", "Demo@123")
        doc = await login(client, "doctor1.demo@mediscan.local", "Demo@123")

    PATIENT_UID = 8  # patient1.demo
    DOCTOR_UID = 3  # doctor1.demo (Asha)
    # existing conversation id=1 (patient1 <-> Asha)
    conv_id = 1

    print("patient token repr:", repr(pt)[:40], "len", len(pt))
    print("doctor  token repr:", repr(doc)[:40], "len", len(doc))
    assert pt == pt.strip() and doc == doc.strip() and " " not in pt and " " not in doc

    async with websockets.connect(f"{WS}?token={doc}") as doc_ws:
        async with websockets.connect(f"{WS}?token={pt}") as pt_ws:
            # patient -> doctor message
            await pt_ws.send(json.dumps({"type": "message", "conversation_id": conv_id, "content": "WS hello"}))
            # patient also receives its own echo (multi-tab broadcast), skip it
            doc_got = await recv_until(doc_ws, lambda f: f.get("type") == "message")
            assert doc_got["message"]["content"] == "WS hello", doc_got
            assert doc_got["sender_id"] == PATIENT_UID, doc_got
            print("1. WS message delivered to doctor:", doc_got["message"]["content"])

            # doctor -> patient reply
            await doc_ws.send(json.dumps({"type": "message", "conversation_id": conv_id, "content": "WS reply"}))
            pt_got = await recv_until(pt_ws, lambda f: f.get("type") == "message" and f.get("sender_id") == DOCTOR_UID)
            assert pt_got["message"]["content"] == "WS reply", pt_got
            print("2. WS reply delivered to patient")

            # typing
            await pt_ws.send(json.dumps({"type": "typing", "conversation_id": conv_id, "user_id": PATIENT_UID}))
            typing_got = await recv_until(doc_ws, lambda f: f.get("type") == "typing")
            assert typing_got["conversation_id"] == conv_id
            assert typing_got["user_id"] == PATIENT_UID
            print("3. typing forwarded to doctor:", typing_got["user_id"])

            # call offer patient -> doctor
            await pt_ws.send(json.dumps({
                "type": "call-offer", "to_user_id": DOCTOR_UID, "call_id": "call-1",
                "offer": {"sdp": "v=0 fake-offer"},
            }))
            offer_got = await recv_until(doc_ws, lambda f: f.get("type") == "call-offer")
            assert offer_got["from_user_id"] == PATIENT_UID
            assert offer_got["offer"]["sdp"] == "v=0 fake-offer"
            print("4. call-offer forwarded:", offer_got.get("call_id"))

            # answer doctor -> patient
            await doc_ws.send(json.dumps({
                "type": "call-answer", "to_user_id": PATIENT_UID, "call_id": "call-1",
                "answer": {"sdp": "v=0 fake-answer"},
            }))
            answer_got = await recv_until(pt_ws, lambda f: f.get("type") == "call-answer")
            assert answer_got["from_user_id"] == DOCTOR_UID
            print("5. call-answer forwarded")

            # ice
            await doc_ws.send(json.dumps({
                "type": "call-ice", "to_user_id": PATIENT_UID, "call_id": "call-1",
                "candidate": {"candidate": "candidate:1 1 udp 1 1.2.3.4 9 typ host"},
            }))
            ice_got = await recv_until(pt_ws, lambda f: f.get("type") == "call-ice")
            print("6. call-ice forwarded")

            # end
            await pt_ws.send(json.dumps({"type": "call-end", "to_user_id": DOCTOR_UID, "call_id": "call-1"}))
            end_got = await recv_until(doc_ws, lambda f: f.get("type") == "call-end")
            print("7. call-end forwarded")

            # ping/pong
            await pt_ws.send(json.dumps({"type": "ping"}))
            pong = await recv_until(pt_ws, lambda f: f.get("type") == "pong")
            print("8. ping/pong OK")

    # offline call -> caller gets call-failed
    async with websockets.connect(f"{WS}?token={pt}") as pt_ws:
        await pt_ws.send(json.dumps({
            "type": "call-offer", "to_user_id": DOCTOR_UID, "call_id": "call-2", "offer": {"sdp": "x"},
        }))
        failed = json.loads(await asyncio.wait_for(pt_ws.recv(), 5))
        assert failed["type"] == "call-failed", failed
        print("9. call-failed delivered offline:", failed["reason"])

    print("ALL WS CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main())