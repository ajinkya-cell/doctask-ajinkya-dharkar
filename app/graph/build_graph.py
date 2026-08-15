from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from app.graph.state import GraphState
from app.graph.nodes import (
    classify_node,
    extract_facts_node,
    detect_conflicts_node,
    check_rules_node,
    draft_register_node,
    commit_node
)
from app.graph.edges import should_retry_or_continue

# Global Checkpointer for state persistence and crash recovery (Behavior #2)
checkpointer = MemorySaver()

def create_pipeline_graph():
    builder = StateGraph(GraphState)
    
    # Add Nodes
    builder.add_node("classify", classify_node)
    builder.add_node("extract_facts", extract_facts_node)
    builder.add_node("detect_conflicts", detect_conflicts_node)
    builder.add_node("check_rules", check_rules_node)
    builder.add_node("draft_register", draft_register_node)
    builder.add_node("commit", commit_node)
    
    # Add Edges
    builder.set_entry_point("classify")
    builder.add_edge("classify", "extract_facts")
    
    builder.add_conditional_edges(
        "extract_facts",
        should_retry_or_continue,
        {
            "continue": "detect_conflicts",
            "escalate_to_human": "draft_register"
        }
    )
    
    builder.add_edge("detect_conflicts", "check_rules")
    builder.add_edge("check_rules", "draft_register")
    builder.add_edge("draft_register", "commit")
    builder.add_edge("commit", END)
    
    return builder.compile(checkpointer=checkpointer)

pipeline_graph = create_pipeline_graph()
