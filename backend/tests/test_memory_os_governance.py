from pathlib import Path

from nion.memory_os.governance import (
    GOVERNANCE_ACTION_ACCEPT,
    GOVERNANCE_ACTION_FREEZE,
    GOVERNANCE_ACTION_REJECT,
    GOVERNANCE_ACTION_RESUME,
)
from nion.memory_os.learning import create_learning_topic
from nion.memory_os.procedures import create_procedure_draft
from nion.memory_os.repository import MemoryOSRepository


def test_governance_action_constants_are_stable():
    assert GOVERNANCE_ACTION_ACCEPT == "accept"
    assert GOVERNANCE_ACTION_REJECT == "reject"
    assert GOVERNANCE_ACTION_FREEZE == "freeze"
    assert GOVERNANCE_ACTION_RESUME == "resume"


def test_growth_helpers_create_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    learning = create_learning_topic(repo, title="财务表达", summary="重复出现")
    procedure = create_procedure_draft(repo, title="财务周报结构", summary="三段式")

    assert learning["domain"] == "learning"
    assert procedure["domain"] == "procedure"
