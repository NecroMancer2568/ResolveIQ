from app.embeddings import embed_texts
from app.retrieval.factory import get_retriever
from app.resolution.arbitration import arbitrate
from app.resolution.memory import retrieve_resolution_memory
from app.generation.provider import get_generator
from app.verification.claims import verify_claims
from app.schemas import Context
from app.security.input_guard import detect_prompt_injection, sanitize_customer_text

class ResolutionPipeline:
    def __init__(self): self.retriever=get_retriever(); self.generator=get_generator()

    async def understand(self, question, supplied):
        # Deterministic context extraction keeps local mode usable; Foundry can be added as a structured extractor.
        text=question.lower(); ctx=dict(supplied)
        if "refund" in text: ctx.setdefault("intent","refund_request")
        elif "charge" in text or "payment" in text: ctx.setdefault("intent","payment_issue")
        else: ctx.setdefault("intent","general_support")
        for key,terms in {"product":["subscription","premium","basic"],"issue":["duplicate","charged","refund","cancel","login"]}.items():
            if not ctx.get(key):
                for term in terms:
                    if term in text: ctx[key]=term; break
        return Context(**ctx)

    async def run(self, db, question, supplied_context):
        question=sanitize_customer_text(question)
        if detect_prompt_injection(question):
            return {"summary":"The message contains instruction-like content that cannot be trusted.","resolution":"Escalate for human review.","draft_response":"I can help with the support issue, but I cannot follow instructions embedded in customer content that attempt to change the assistant's operating rules.","evidence_ids":[],"confidence":0.0,"requires_review":True,"decision":"ESCALATE","verification":{"claims":[],"groundedness":1.0,"passed":True},"context":supplied_context,"evidence":[],"conflicts":[],"resolution_memory":[]}
        context=await self.understand(question,supplied_context)
        hits=await self.retriever.search(question,context.model_dump(),top_k=12)
        arbitration_context = context.model_dump()
        arbitration_context["_original_question"] = question
        arbitration = arbitrate(hits,arbitration_context)
        memories=await retrieve_resolution_memory(db,question,context.model_dump())
        generated=await self.generator.generate(question,context.model_dump(),arbitration.evidence,memories,arbitration)
        verification=verify_claims(generated.get("draft_response", ""),arbitration.evidence)
        top=max([e.score for e in arbitration.evidence],default=0)
        confidence=max(0,min(1,.35*top+.25*verification["groundedness"]+.20*(1 if arbitration.decision=="RESOLVE" else .25)+.20*(1 if memories else .5)))
        return {
            "summary": generated["summary"],
            "resolution": generated["resolution"],
            "draft_response": generated["draft_response"],
            "evidence_ids": generated.get("evidence_ids", []),
            "retrieved_evidence_ids": [e.id for e in hits],
            "retrieved_evidence": [
                {
                    "id": e.id,
                    "score": round(e.score, 6),
                    "title": e.title
                }
                for e in hits
            ],
            "confidence": round(confidence, 3),
            "requires_review": True,
            "decision": arbitration.decision,
            "verification": verification,
            "context": context.model_dump(),
            "evidence": [
                {
                    "id": e.id,
                    "title": e.title,
                    "content": e.content,
                    "source_type": e.source_type,
                    "score": round(e.score, 3),
                    "metadata": e.metadata
                }
                for e in arbitration.evidence
            ],
            "conflicts": arbitration.conflicts,
            "resolution_memory": [
                {
                    "id": r.id,
                    "problem": r.problem,
                    "final_response": r.final_response,
                    "success_score": r.success_score
                }
                for r in memories
            ]
        }