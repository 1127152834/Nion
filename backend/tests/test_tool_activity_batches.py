from nion.tools.activity_summary import summarize_tool_batch


def test_read_batch_summarizes_to_project_file_inspection():
    summary = summarize_tool_batch(["read_file", "ls", "read_file"])
    assert summary.summary_label == "Inspected project files"


def test_task_batch_summarizes_to_subtask_tracking():
    summary = summarize_tool_batch(["task", "task"])
    assert summary.summary_label == "Delegated and tracked subtasks"
