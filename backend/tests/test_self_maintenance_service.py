from nion.self_maintenance.service import SelfMaintenanceService


def test_self_maintenance_service_generates_agent_only_proposals(tmp_path):
    service = SelfMaintenanceService(base_dir=tmp_path)
    result = service.run(trigger="manual", query="recent memory drift")

    assert result.entry.summary
    assert result.entry.sources
    assert "notebook" not in result.entry.sources
    assert isinstance(result.action_proposals, list)
    assert isinstance(result.self_upgrade_proposals, list)
