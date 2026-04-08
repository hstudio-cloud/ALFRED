import ast
from datetime import datetime
from typing import Any, Dict


def current_date_time() -> Dict[str, Any]:
    now = datetime.utcnow()
    return {"utc_iso": now.isoformat(), "date": now.strftime("%Y-%m-%d"), "time": now.strftime("%H:%M:%S")}


def calculator(expression: str) -> Dict[str, Any]:
    """Very small safe calculator for +,-,*,/,(),**."""
    if not expression:
        return {"result": None, "error": "missing_expression"}

    allowed_nodes = (
        ast.Expression,
        ast.BinOp,
        ast.UnaryOp,
        ast.Num,
        ast.Constant,
        ast.Add,
        ast.Sub,
        ast.Mult,
        ast.Div,
        ast.Pow,
        ast.Mod,
        ast.UAdd,
        ast.USub,
        ast.Load,
    )
    try:
        tree = ast.parse(expression, mode="eval")
        for node in ast.walk(tree):
            if not isinstance(node, allowed_nodes):
                return {"result": None, "error": "unsafe_expression"}
        result = eval(compile(tree, "<calc>", "eval"), {"__builtins__": {}}, {})
        return {"result": result}
    except Exception:
        return {"result": None, "error": "invalid_expression"}

