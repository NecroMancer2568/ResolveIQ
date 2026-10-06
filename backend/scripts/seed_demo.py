import asyncio
from app.db.session import init_db, SessionLocal
from app.db.models import Ticket, Resolution

async def main():
    await init_db()
    async with SessionLocal() as db:
        t=Ticket(customer_message="I was charged twice for my premium subscription.", customer_context={"product":"premium","region":"IN","customer_segment":"student"})
        db.add(t); await db.flush()
        db.add(Resolution(ticket_id=t.id, problem=t.customer_message, context=t.customer_context, resolution="Confirmed duplicate charges are eligible for a refund under the current policy.", final_response="We confirmed the duplicate charge. Your refund can be processed under the applicable refund policy and normally arrives within 5–7 business days after approval.", outcome="approved", success_score=.95, evidence_ids=["policy-refund-v3","faq-double-charge"]))
        await db.commit()
        print(f"Demo ticket created: {t.id}")

if __name__ == "__main__": asyncio.run(main())
