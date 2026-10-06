from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import Ticket,Draft,Feedback,Resolution,KnowledgeGap
from app.schemas import TicketCreate, FeedbackCreate
from app.services.pipeline import ResolutionPipeline

router=APIRouter(); pipeline=ResolutionPipeline()

@router.post("/tickets")
async def create_ticket(body: TicketCreate, db: AsyncSession=Depends(get_db)):
    t=Ticket(customer_message=body.customer_message,customer_context=body.customer_context); db.add(t); await db.commit(); await db.refresh(t)
    return {"id":t.id,"status":t.status}

@router.post("/tickets/{ticket_id}/resolve")
async def resolve_ticket(ticket_id:int,db:AsyncSession=Depends(get_db)):
    t=await db.get(Ticket,ticket_id)
    if not t: raise HTTPException(404,"Ticket not found")
    result=await pipeline.run(db,t.customer_message,t.customer_context)
    d=Draft(ticket_id=t.id,summary=result["summary"],resolution=result["resolution"],draft_response=result["draft_response"],confidence=result["confidence"],decision=result["decision"],evidence=result["evidence"],verification=result["verification"])
    db.add(d); await db.commit(); await db.refresh(d)
    result["draft_id"]=d.id; return result

@router.post("/tickets/{ticket_id}/feedback")
async def feedback(ticket_id:int,body:FeedbackCreate,db:AsyncSession=Depends(get_db)):
    t=await db.get(Ticket,ticket_id)
    if not t: raise HTTPException(404,"Ticket not found")
    draft=(await db.execute(select(Draft).where(Draft.ticket_id==ticket_id).order_by(Draft.id.desc()))).scalars().first()
    f=Feedback(ticket_id=ticket_id,draft_id=draft.id if draft else None,**body.model_dump()); db.add(f)
    if body.decision in {"approved","edited"} and draft:
        final=body.edited_response or draft.draft_response
        r=Resolution(ticket_id=ticket_id,problem=t.customer_message,context=t.customer_context,resolution=draft.resolution,final_response=final,outcome="approved",success_score=(body.rating or 4)/5,evidence_ids=draft.evidence and [x.get("id") for x in draft.evidence])
        db.add(r); t.status="resolved"
    await db.commit(); return {"ok":True}

@router.get("/tickets")
async def tickets(db:AsyncSession=Depends(get_db)):
    rows=(await db.execute(select(Ticket).order_by(Ticket.id.desc()).limit(50))).scalars().all(); return [{"id":x.id,"customer_message":x.customer_message,"status":x.status,"context":x.customer_context} for x in rows]

@router.get("/tickets/{ticket_id}")
async def ticket(ticket_id:int,db:AsyncSession=Depends(get_db)):
    t=await db.get(Ticket,ticket_id)
    if not t: raise HTTPException(404,"Ticket not found")
    d=(await db.execute(select(Draft).where(Draft.ticket_id==ticket_id).order_by(Draft.id.desc()))).scalars().first()
    return {"id":t.id,"customer_message":t.customer_message,"context":t.customer_context,"status":t.status,"draft":({"id":d.id,"summary":d.summary,"resolution":d.resolution,"draft_response":d.draft_response,"confidence":d.confidence,"decision":d.decision,"evidence":d.evidence,"verification":d.verification} if d else None)}

@router.get("/analytics/overview")
async def analytics(db:AsyncSession=Depends(get_db)):
    tickets=await db.scalar(select(func.count()).select_from(Ticket)) or 0
    resolutions=await db.scalar(select(func.count()).select_from(Resolution)) or 0
    feedback=await db.scalar(select(func.count()).select_from(Feedback)) or 0
    approved=await db.scalar(select(func.count()).select_from(Feedback).where(Feedback.decision.in_(["approved","edited"]))) or 0
    return {"tickets":tickets,"resolutions":resolutions,"feedback":feedback,"acceptance_rate":round(approved/feedback,3) if feedback else 0}

@router.get("/analytics/knowledge-gaps")
async def gaps(db:AsyncSession=Depends(get_db)):
    rows=(await db.execute(select(KnowledgeGap).order_by(KnowledgeGap.count.desc()).limit(20))).scalars().all(); return [{"cluster_id":x.cluster_id,"label":x.label,"count":x.count,"examples":x.examples} for x in rows]
