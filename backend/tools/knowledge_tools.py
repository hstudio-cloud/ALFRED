from typing import Any, Dict

from services.knowledge_base_service import KnowledgeBaseService


_knowledge_base = KnowledgeBaseService()


async def search_internal_knowledge(query: str) -> Dict[str, Any]:
    return _knowledge_base.search(query=query, limit=5)
