import json
import re
from pathlib import Path
from typing import Any, Dict, List


class KnowledgeBaseService:
    """Loads markdown/json knowledge files and provides simple ranked search."""

    def __init__(self, knowledge_dir: str | None = None) -> None:
        base_dir = Path(knowledge_dir) if knowledge_dir else Path(__file__).parent.parent / "knowledge"
        self.knowledge_dir = base_dir

    def search(self, query: str, limit: int = 5) -> Dict[str, Any]:
        text = (query or "").strip().lower()
        if not text:
            return {"items": [], "source": "internal_knowledge"}

        entries = self._load_entries()
        query_terms = self._tokenize(text)
        scored: List[Dict[str, Any]] = []

        for entry in entries:
            score = 0
            title = str(entry.get("title") or "")
            content = str(entry.get("content") or "")
            keywords = [str(item).lower() for item in entry.get("keywords") or []]

            for keyword in keywords:
                if keyword in text:
                    score += 4

            title_terms = self._tokenize(title.lower())
            content_terms = self._tokenize(content.lower())
            score += len(query_terms & title_terms) * 3
            score += len(query_terms & content_terms)

            if text in title.lower():
                score += 3
            if text in content.lower():
                score += 2

            if score > 0:
                scored.append(
                    {
                        "score": score,
                        "title": title,
                        "content": content,
                        "source_file": entry.get("source_file"),
                    }
                )

        scored.sort(key=lambda row: row["score"], reverse=True)
        items = [
            {
                "title": item["title"],
                "content": item["content"],
                "source_file": item.get("source_file"),
            }
            for item in scored[:limit]
        ]
        return {"items": items, "source": "internal_knowledge"}

    def _load_entries(self) -> List[Dict[str, Any]]:
        if not self.knowledge_dir.exists():
            return []

        entries: List[Dict[str, Any]] = []
        for path in sorted(self.knowledge_dir.glob("*")):
            if path.suffix.lower() == ".json":
                entries.extend(self._load_json(path))
            elif path.suffix.lower() == ".md":
                item = self._load_markdown(path)
                if item:
                    entries.append(item)
        return entries

    def _load_json(self, path: Path) -> List[Dict[str, Any]]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return []

        if isinstance(payload, dict):
            payload = payload.get("items") or []
        if not isinstance(payload, list):
            return []

        normalized = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or "").strip()
            content = str(item.get("content") or "").strip()
            if not title or not content:
                continue
            normalized.append(
                {
                    "title": title,
                    "content": content,
                    "keywords": item.get("keywords") or [],
                    "source_file": path.name,
                }
            )
        return normalized

    def _load_markdown(self, path: Path) -> Dict[str, Any] | None:
        try:
            raw = path.read_text(encoding="utf-8").strip()
        except Exception:
            return None
        if not raw:
            return None

        lines = raw.splitlines()
        title = path.stem.replace("-", " ").replace("_", " ").title()
        if lines and lines[0].startswith("#"):
            title = lines[0].lstrip("#").strip() or title
            content = "\n".join(lines[1:]).strip()
        else:
            content = raw

        keywords = self._tokenize(path.stem.replace("-", " ").replace("_", " "))
        return {
            "title": title,
            "content": content,
            "keywords": sorted(keywords),
            "source_file": path.name,
        }

    @staticmethod
    def _tokenize(value: str) -> set[str]:
        return {
            token
            for token in re.split(r"[^a-z0-9áéíóúãõç]+", value.lower())
            if len(token) >= 3
        }
