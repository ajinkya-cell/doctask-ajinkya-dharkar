from app.graph.state import GraphState

def should_retry_or_continue(state: GraphState) -> str:
    """
    Conditional routing edge from extract_facts node.
    """
    facts = state.get("extracted_facts", [])
    if not facts:
        # Route to retry or escalate
        return "escalate_to_human"
    return "continue"
