from typing import Any, Dict


def navigate_to_section(section: str, label: str | None = None) -> Dict[str, Any]:
    return {
        "section": section,
        "label": label or section,
        "action": "navigate",
    }


def workspace_context(workspace: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "workspace_id": workspace.get("id"),
        "workspace_name": workspace.get("name"),
        "subdomain": workspace.get("subdomain"),
    }

